import { Component, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { NgbDatepicker, NgbDate } from '@ng-bootstrap/ng-bootstrap';
import { ProjectionInterval, ProjectionType, RecurrenceFrequency, TransactionType } from '../../enums';
import { BalanceProjectionChartComponent } from '../balance-projection-chart/balance-projection-chart.component';
import { Transaction, ProjectionPoint, TimelineItem } from '../../interfaces';
import { TransactionService } from '../../services/transaction.service';
import { StorageService } from '../../services/storage.service';
import { TimelineService } from '../../services/timeline.service';
import { CustomDropdownComponent } from '../shared/custom-dropdown/custom-dropdown.component';
import { CustomModalComponent } from '../shared/custom-modal/custom-modal.component';
import {
  MONTH_OPTIONS,
  TRANSACTION_TYPE_OPTIONS,
  FREQUENCY_OPTIONS,
  CATEGORY_OPTIONS,
  CALENDAR_CONFIG,
  RecurringTransactionService,
  RecurringTransactionHelperService,
  CalendarNavigationService,
  CalendarDataService,
  TransactionManagementService
} from './index';

@Component({
    selector: 'app-transactions',
    standalone: true,
    imports: [CommonModule, FormsModule, HttpClientModule, CustomDropdownComponent, CustomModalComponent, BalanceProjectionChartComponent, NgbDatepicker],
    templateUrl: './transactions.component.html',
    styleUrls: ['./transactions.component.scss']
})
export class TransactionsComponent implements OnInit {
  @ViewChild('descriptionInput') descriptionInput!: ElementRef;

  currentBalance: number = 0;
  lastBalanceUpdate: Date = new Date();
  transactions: Transaction[] = [];
  allTransactions: Transaction[] = []; // Actual database transactions
  timeline: (TimelineItem | ProjectionPoint)[] = [];
  projectionInterval: ProjectionInterval = ProjectionInterval.MONTHLY;
  lowestProjections: ProjectionPoint[] = [];

  // Calendar navigation
  currentViewMonth: Date = new Date();

  constructor(
    private transactionService: TransactionService,
    private storageService: StorageService,
    private timelineService: TimelineService,
    private recurringTransactionService: RecurringTransactionService,
    private recurringTransactionHelper: RecurringTransactionHelperService,
    private calendarNavigationService: CalendarNavigationService,
    private calendarDataService: CalendarDataService,
    private transactionManagementService: TransactionManagementService
  ) {}

  // Properties for view/edit mode
  showViewEditMode: boolean = false;

  // Month picker properties
  showMonthPicker: boolean = false;
  monthOptions = MONTH_OPTIONS;

  // Dropdown options
  transactionTypeOptions = TRANSACTION_TYPE_OPTIONS;
  frequencyOptions = FREQUENCY_OPTIONS;
  categoryOptions = CATEGORY_OPTIONS;

  showAddForm = false;
  componentInitialized = false;

  // Properties still needed by template
  isEditingBalance = false;
  newRecurringTransaction: Partial<Transaction> = {
    description: '',
    amount: 0,
    type: 'expense' as any,
    category: '',
    isRecurring: true,
    recurringPattern: {
      frequency: 'monthly' as any,
      interval: null,
      endDate: undefined,
      lastDayOfMonth: false,
      lastWeekdayOfMonth: false
    }
  };

  // Date picker properties still needed by template
  startDate: NgbDate | null = null;
  startDateString: string = '';
  showDatePicker: boolean = false;
  endDate: NgbDate | null = null;
  endDateString: string = '';
  showEndDatePicker: boolean = false;

  // View mode toggle: 'grid' for current card view, 'list' for compact list view
  viewMode: 'grid' | 'list' = 'grid';

  // Methods still needed by template
  addRecurringTransaction() {
    if (!this.newRecurringTransaction.description || !this.newRecurringTransaction.amount) {
      return;
    }

    // Use the selected start date if available, otherwise use current date
    const transactionDate = this.newRecurringTransaction.date || new Date();

    const transaction: Transaction = {
      id: Date.now().toString(),
      date: transactionDate,
      description: this.newRecurringTransaction.description!,
      amount: this.newRecurringTransaction.amount!,
      type: this.newRecurringTransaction.type!,
      category: this.newRecurringTransaction.category!,
      isRecurring: true,
      recurringPattern: {
        ...this.newRecurringTransaction.recurringPattern!,
        interval: this.newRecurringTransaction.recurringPattern!.interval || 1
      }
    };

    console.log('📤 Creating transaction object:', {
      description: transaction.description,
      amount: transaction.amount,
      type: transaction.type,
      date: transaction.date,
      category: transaction.category
    });

    // Save the transaction to the database first
    this.transactionService.addTransactionToDatabase(transaction).subscribe({
      next: (result) => {
        if (result) {
          console.log(`✅ Transaction saved to database: ${transaction.description}`);
          
          // Force a complete refresh of all data from the database
          this.transactionService.refreshTransactions();
          
          // Wait a moment for the refresh to complete, then recalculate timeline
          setTimeout(() => {
            console.log('🔄 Starting timeline recalculation...');
            this.calculateTimeline();
            this.calendarDataService.clearCache();
            console.log(`✅ Timeline recalculated after database refresh`);
            
            // Force a manual refresh of the calendar data
            setTimeout(() => {
              console.log('🔄 Forcing calendar data refresh...');
              this.refreshCalendarData();
            }, 100);
          }, 1000);
          
          // Reset form and close modal
          this.resetForm();
          this.showAddForm = false;
          
          console.log(`Added new recurring transaction: ${transaction.description} on ${transaction.date.toDateString()}`);
        }
      },
      error: (error) => {
        console.error('❌ Failed to save transaction to database:', error);
        // Still add to local arrays even if database save fails
        this.transactions.push(transaction);
        this.allTransactions.push(transaction);
        this.calculateTimeline();
        this.calendarDataService.clearCache();
        this.resetForm();
        this.showAddForm = false;
      }
    });
  }

  private resetForm() {
    this.newRecurringTransaction = {
      description: '',
      amount: 0,
      type: 'expense' as any,
      category: '',
      isRecurring: true,
      recurringPattern: {
        frequency: 'monthly' as any,
        interval: null,
        endDate: undefined,
        lastDayOfMonth: false,
        lastWeekdayOfMonth: false
      }
    };
  }

  onLastDayOptionChange(option: 'lastDay' | 'lastWeekday', event: Event) {
    const target = event.target as HTMLInputElement;
    const isChecked = target.checked;

    if (option === 'lastDay') {
      this.newRecurringTransaction.recurringPattern!.lastDayOfMonth = isChecked;
      if (isChecked) {
        this.newRecurringTransaction.recurringPattern!.lastWeekdayOfMonth = false;
      }
    } else if (option === 'lastWeekday') {
      this.newRecurringTransaction.recurringPattern!.lastWeekdayOfMonth = isChecked;
      if (isChecked) {
        this.newRecurringTransaction.recurringPattern!.lastDayOfMonth = false;
      }
    }
  }

  isTransactionFormValid(): boolean {
    const transaction = this.newRecurringTransaction;

    if (!transaction.description || !transaction.description.trim()) {
      return false;
    }

    if (!transaction.amount || transaction.amount <= 0) {
      return false;
    }

    if (!transaction.category || !transaction.category.trim()) {
      return false;
    }

    return true;
  }

  onCategoryAdded(newCategory: string): void {
    if (!this.categoryOptions.find(option => option.value === newCategory)) {
      this.categoryOptions.push({ value: newCategory, label: newCategory });
    }
  }

  getDatabaseTransactions(): Transaction[] {
    return this.transactionManagementService.getDatabaseTransactions(this.allTransactions);
  }

  // Date picker methods still needed by template
  toggleDatePicker() {
    this.showDatePicker = !this.showDatePicker;
  }

  toggleEndDatePicker() {
    this.showEndDatePicker = !this.showEndDatePicker;
  }

  onStartDateChange(date: NgbDate | null) {
    if (date) {
      this.startDate = date;
      this.startDateString = `${date.month}/${date.day}/${date.year}`;
      // Create date at noon to avoid timezone issues
      const jsDate = new Date(date.year, date.month - 1, date.day, 12, 0, 0, 0);
      this.newRecurringTransaction.date = jsDate;
      this.showDatePicker = false;
    }
  }

  clearStartDate() {
    this.startDate = null;
    this.startDateString = '';
    this.newRecurringTransaction.date = undefined;
  }

  onEndDateChange(date: NgbDate | null) {
    if (date) {
      this.endDate = date;
      this.endDateString = `${date.month}/${date.day}/${date.year}`;
      const jsDate = new Date(date.year, date.month - 1, date.day);
      this.newRecurringTransaction.recurringPattern!.endDate = jsDate;
      this.showEndDatePicker = false;
    }
  }

  clearEndDate() {
    this.endDate = null;
    this.endDateString = '';
    this.newRecurringTransaction.recurringPattern!.endDate = undefined;
  }

  onDatePickerClick(event: Event) {
    event.stopPropagation();
  }

  ngOnInit(): void {
    // Load balance from storage
    this.currentBalance = this.storageService.loadCurrentBalance();
    this.lastBalanceUpdate = new Date(); // For now, use current date

    // Subscribe to transaction service
    this.transactionService.getTransactions().subscribe(transactions => {
      if (transactions && transactions.length > 0) {
        console.log('Loaded real transactions from service:', transactions);
        this.transactions = transactions;
        this.allTransactions = transactions; // Assign to allTransactions
        // Calculate timeline to populate the timeline array for filtering
        this.calculateTimeline();
      } else {
        console.log('No transactions from service, loading from storage');
        this.loadTransactions();
      }
    });

    // Subscribe to all transactions from database
    this.transactionService.getAllTransactions().subscribe(transactions => {
      console.log('Loaded all transactions from database:', transactions);
      this.allTransactions = transactions;
    });

    // Subscribe to recurring transactions to see what's available
    this.transactionService.getRecurringTransactions().subscribe(recurringTransactions => {
      console.log('Available recurring transactions:', recurringTransactions);
      console.log('Recurring transactions count:', recurringTransactions.length);
    });

    // Mark component as initialized
    this.componentInitialized = true;
  }

  updateBalance() {
    this.lastBalanceUpdate = new Date();
    this.calculateTimeline();
  }

  toggleAddForm() {
    if (this.showAddForm) {
      // If form is open and we're closing it (canceling), clear the form
      this.transactionManagementService.resetForm({});
      this.showAddForm = false;
    } else {
      // If form is closed and we're opening it
      this.showAddForm = true;
      // Auto-focus the description input after the animation completes
      setTimeout(() => {
        if (this.descriptionInput) {
          this.descriptionInput.nativeElement.focus();
        }
      }, 550); // Slightly after the 500ms transition
    }
  }

  toggleViewMode() {
    this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
    // No additional calculations needed - view switching is now instant
  }

  // Toggle view/edit mode
  toggleViewEditMode(): void {
    this.showViewEditMode = !this.showViewEditMode;
    if (this.showViewEditMode) {
      // Close add form when switching to view/edit mode
      this.showAddForm = false;
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    // Close month picker when clicking outside
    if (this.showMonthPicker && !this.isClickInsideMonthPicker(event)) {
      this.showMonthPicker = false;
    }
    
    // Close date pickers when clicking outside
    if (this.showDatePicker && !this.isClickInsideDatePicker(event, 'start')) {
      this.showDatePicker = false;
    }
    
    if (this.showEndDatePicker && !this.isClickInsideDatePicker(event, 'end')) {
      this.showEndDatePicker = false;
    }
  }

  onCategoryChange(transaction: Transaction, newCategory: string): void {
    // Update the transaction category
    transaction.category = newCategory;

    // Save the change to the database
    this.transactionService.updateTransactionInDatabase(transaction.id, { category: newCategory }).subscribe();
  }

  deleteTransactionFromDatabase(id: string): void {
    // Delete the transaction from the database
    this.transactionService.deleteTransactionFromDatabase(id).subscribe();
  }

  private isClickInsideMonthPicker(event: Event): boolean {
    const target = event.target as HTMLElement;
    // Check if click is inside the month picker button or dropdown
    const monthPickerButton = target.closest('button[title="Select Month"]');
    const monthPickerDropdown = target.closest('.month-picker-dropdown');
    return !!(monthPickerButton || monthPickerDropdown);
  }

  private isClickInsideDatePicker(event: Event, pickerType: 'start' | 'end'): boolean {
    const target = event.target as HTMLElement;
    
    if (pickerType === 'start') {
      // Check if click is inside the start date input, calendar, or clear button
      const startDateInput = target.closest('.start-date-container');
      const startDatePicker = target.closest('ngb-datepicker');
      return !!(startDateInput || startDatePicker);
    } else {
      // Check if click is inside the end date input, calendar, or clear button
      const endDateInput = target.closest('.end-date-container');
      const endDatePicker = target.closest('ngb-datepicker');
      return !!(endDateInput || endDatePicker);
    }
  }

    private loadTransactions() {
    // Clear old mock data from localStorage
    this.storageService.clearAllData();

    // Initialize with empty arrays
    this.transactions = [];
    this.allTransactions = []; // Initialize allTransactions
    this.currentBalance = 0;

    // Subscribe to real data from the service
    this.transactionService.getTransactions().subscribe(transactions => {
      if (transactions && transactions.length > 0) {
        console.log('Loaded real transactions from service:', transactions);
        this.transactions = transactions;
        this.allTransactions = transactions; // Assign to allTransactions
        // Calculate timeline to populate the timeline array for filtering
        this.calculateTimeline();
      } else {
        console.log('No real transactions from service');
        // No transactions to calculate timeline for
      }
    });
  }

  calculateTimeline() {
    console.log(`🔄 calculateTimeline called with ${this.allTransactions.length} transactions from database`);
    
    // Use the TimelineService to calculate the complete timeline with recurring transactions
    this.timelineService.calculateTimelineWithRecurring(
      this.allTransactions,
      this.currentBalance,
      this.projectionInterval,
      (updatedTimeline) => {
        console.log(`✅ Timeline callback received ${updatedTimeline.length} items`);
        
        // Update the component's timeline with the updated version
        this.timeline = updatedTimeline;
        
        // Post-processing callback
        // Clear the cache when timeline changes
        this.calendarDataService.clearCache();

        // Save transactions and update projections
        this.transactionService.saveTransactions(this.allTransactions);
        this.lowestProjections = this.timelineService.updateLowestProjections(this.timeline, this.currentBalance, this.projectionInterval);
        
        console.log(`📊 Final timeline has ${this.timeline.length} items`);
        
        // Debug: Log the first transaction in the timeline
        if (this.timeline.length > 0) {
          const firstTransaction = this.timeline.find(item => this.isTransaction(item));
          if (firstTransaction) {
            console.log('🔍 Timeline Transaction Debug:', {
              description: firstTransaction.description,
              type: firstTransaction.type,
              amount: firstTransaction.amount,
              TransactionType_INCOME: TransactionType.INCOME,
              TransactionType_EXPENSE: TransactionType.EXPENSE
            });
          }
        }
      }
    );
  }

  deleteTransaction(id: string) {
    console.log(`🗑️ Deleting transaction with ID: ${id}`);
    
    // Call the backend DELETE endpoint
    this.transactionService.deleteTransactionFromDatabase(id).subscribe({
      next: (result) => {
        if (result) {
          console.log(`✅ Transaction deleted from database: ${id}`);
          
          // Force a complete refresh of all data from the database
          this.transactionService.refreshTransactions();
          
          // Wait a moment for the refresh to complete, then recalculate timeline
          setTimeout(() => {
            this.calculateTimeline();
            this.calendarDataService.clearCache();
            console.log(`🔄 Timeline recalculated after database deletion`);
          }, 500);
        }
      },
      error: (error) => {
        console.error('❌ Failed to delete transaction from database:', error);
        // Fallback: remove from local arrays
        this.transactions = this.transactions.filter(t => t.id !== id);
        this.allTransactions = this.allTransactions.filter(t => t.id !== id);
        this.calculateTimeline();
        this.calendarDataService.clearCache();
      }
    });
  }

  isTransaction(item: any): item is TimelineItem {
    return this.timelineService.isTransaction(item);
  }

  getLowestProjections(): ProjectionPoint[] {
    return this.lowestProjections;
  }

  // Expose enums to template
  get RecurrenceFrequency() { return RecurrenceFrequency; }
  get ProjectionInterval() { return ProjectionInterval; }
  get TransactionType() { return TransactionType; }

  onProjectionIntervalChange(interval: ProjectionInterval) {
    this.projectionInterval = interval;
    this.calculateTimeline();
  }

  getGroupedTransactions(): { date: Date, transactions: TimelineItem[] }[] {
    const grouped = this.calendarDataService.getGroupedTransactions(this.timeline, this.currentViewMonth);
    return grouped;
  }

  goToCurrentMonth(): void {
    this.currentViewMonth = new Date();
    // Force refresh of calendar data
    this.refreshCalendarData();
  }

  /**
   * Force refresh of calendar data
   */
  refreshCalendarData(): void {
    console.log('🔄 Forcing calendar data refresh...');
    this.calendarDataService.clearCache();
    this.calculateTimeline();
  }

  // Month picker methods
  toggleMonthPicker(): void {
    this.showMonthPicker = !this.showMonthPicker;
  }

  selectMonth(monthValue: number): void {
    // Create a new date with the selected month, keeping the current year
    this.currentViewMonth = new Date(this.currentViewMonth.getFullYear(), monthValue, 1);
    this.showMonthPicker = false;

    // Clear cache to force recalculation for new month
    this.calendarDataService.clearCache();

    // Recalculate timeline to ensure we have transactions for the new month range
    this.calculateTimeline();
  }

  goToPreviousYear(): void {
    this.currentViewMonth = new Date(this.currentViewMonth.getFullYear() - 1, this.currentViewMonth.getMonth(), 1);
    // Clear cache to force recalculation for new year
    this.calendarDataService.clearCache();
    // Recalculate timeline to ensure we have transactions for the new year
    this.calculateTimeline();
  }

  goToNextYear(): void {
    this.currentViewMonth = new Date(this.currentViewMonth.getFullYear() + 1, this.currentViewMonth.getMonth(), 1);
    // Clear cache to force recalculation for new year
    this.calendarDataService.clearCache();
    // Recalculate timeline to ensure we have transactions for the new year
    this.calculateTimeline();
  }

  getCurrentYear(): number {
    return this.currentViewMonth.getFullYear();
  }

  getCurrentMonthLabel(): string {
    return this.monthOptions[this.currentViewMonth.getMonth()].label;
  }

  // Helper method to determine if a row should have alternate background color
  isEvenRow(groupIndex: number, transactionIndex: number): boolean {
    // Calculate total row index across all groups
    let totalRowIndex = 0;
    const groups = this.getGroupedTransactions();

    // Add up all transactions from previous groups
    for (let i = 0; i < groupIndex; i++) {
      totalRowIndex += groups[i].transactions.length;
    }

    // Add current transaction index
    totalRowIndex += transactionIndex;

    return totalRowIndex % 2 === 0;
  }

  // Transaction editing methods
  startEditing(transaction: Transaction): void {
    this.transactionManagementService.startEditing(transaction);
  }

  saveTransaction(transaction: Transaction): void {
    this.transactionManagementService.saveTransaction(transaction, () => {
      // Refresh the timeline after saving
      this.calculateTimeline();
    });
  }

  cancelEditing(transaction: Transaction): void {
    this.transactionManagementService.cancelEditing(transaction);
  }
}
