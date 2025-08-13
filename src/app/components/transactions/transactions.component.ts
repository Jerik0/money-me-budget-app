import { Component, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { NgbDatepicker, NgbDate } from '@ng-bootstrap/ng-bootstrap';
import { RecurrenceFrequency, ProjectionInterval, TransactionType, ProjectionType } from '../../enums';
import { BalanceProjectionChartComponent } from '../balance-projection-chart/balance-projection-chart.component';
import { Transaction, ProjectionPoint, TimelineItem } from '../../interfaces';
import { TransactionService } from '../../services/transaction.service';
import { StorageService } from '../../services/storage.service';
import { TimelineService } from '../../services/timeline.service';
import { CustomDropdownComponent, DropdownOption } from '../shared/custom-dropdown/custom-dropdown.component';
import { CustomModalComponent } from '../shared/custom-modal/custom-modal.component';

@Component({
    selector: 'app-transactions',
    standalone: true,
    imports: [CommonModule, FormsModule, HttpClientModule, NgbDatepicker, BalanceProjectionChartComponent, CustomDropdownComponent, CustomModalComponent],
    templateUrl: './transactions.component.html',
    styleUrls: ['./transactions.component.scss']
})
export class TransactionsComponent implements OnInit {
  @ViewChild('descriptionInput') descriptionInput!: ElementRef;
  @ViewChild('startDatePicker') startDatePicker!: NgbDatepicker;
  @ViewChild('endDatePicker') endDatePicker!: NgbDatepicker;

  currentBalance: number = 0;
  lastBalanceUpdate: Date = new Date();
  transactions: Transaction[] = [];
  allTransactions: Transaction[] = []; // Actual database transactions
  timeline: (TimelineItem | ProjectionPoint)[] = [];
  projectionInterval: ProjectionInterval = ProjectionInterval.MONTHLY;
  lowestProjections: ProjectionPoint[] = [];
  groupedTransactions: { date: Date, transactions: TimelineItem[] }[] = [];
  
  // Calendar navigation
  currentViewMonth: Date = new Date();
  visibleMonths: { month: Date, transactions: { date: Date, transactions: TimelineItem[] }[] }[] = [];
  maxVisibleMonths: number = 6; // Keep 6 months in memory

  // Properties for view/edit mode
  showViewEditMode: boolean = false;

  // Date picker properties
  startDate: NgbDate | null = null;
  startDateString: string = '';
  showDatePicker: boolean = false;
  endDate: NgbDate | null = null;
  endDateString: string = '';
  showEndDatePicker: boolean = false;

  // Dropdown options
  transactionTypeOptions: DropdownOption[] = [
    { value: TransactionType.EXPENSE, label: 'Expense' },
    { value: TransactionType.INCOME, label: 'Income' }
  ];

  frequencyOptions: DropdownOption[] = [
    { value: RecurrenceFrequency.ONCE, label: 'Once' },
    { value: RecurrenceFrequency.DAILY, label: 'Daily' },
    { value: RecurrenceFrequency.WEEKLY, label: 'Weekly' },
    { value: RecurrenceFrequency.BI_WEEKLY, label: 'Bi-weekly' },
    { value: RecurrenceFrequency.MONTHLY, label: 'Monthly' },
    { value: RecurrenceFrequency.YEARLY, label: 'Yearly' }
  ];

  categoryOptions: DropdownOption[] = [
    { value: 'Uncategorized', label: 'Uncategorized' },
    { value: 'Income', label: 'Income' },
    { value: 'Housing', label: 'Housing' },
    { value: 'Entertainment', label: 'Entertainment' },
    { value: 'Food', label: 'Food' },
    { value: 'Transportation', label: 'Transportation' },
    { value: 'Utilities', label: 'Utilities' },
    { value: 'Healthcare', label: 'Healthcare' },
    { value: 'Shopping', label: 'Shopping' },
    { value: 'Education', label: 'Education' },
    { value: 'Other', label: 'Other' }
  ];

  newRecurringTransaction: Partial<Transaction> = {
    description: '',
    amount: 0,
    type: TransactionType.EXPENSE,
    category: '',
    isRecurring: true,
    recurringPattern: {
      frequency: RecurrenceFrequency.MONTHLY,
      interval: null,
      endDate: undefined,
      lastDayOfMonth: false,
      lastWeekdayOfMonth: false
    }
  };

  showAddForm = false;
  isEditingBalance = false;
  componentInitialized = false;

  // View mode toggle: 'grid' for current card view, 'list' for compact list view
  viewMode: 'grid' | 'list' = 'grid';

  constructor(
    private transactionService: TransactionService,
    private storageService: StorageService,
    private timelineService: TimelineService
  ) {}

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
        // Don't call calculateTimeline here - it will be called by loadMonthData
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
    
    // Load month data for the current view
    this.loadMonthData();
    
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
      this.resetForm();
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

  addRecurringTransaction() {
    if (!this.newRecurringTransaction.description || !this.newRecurringTransaction.amount) {
      return;
    }

    const transaction: Transaction = {
      id: Date.now().toString(),
      date: new Date(),
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

    this.transactions.push(transaction);
    this.calculateTimeline();
    this.resetForm();

    // Slide form back after successful addition
    this.showAddForm = false;
  }

  onLastDayOptionChange(option: 'lastDay' | 'lastWeekday', event: Event) {
    const target = event.target as HTMLInputElement;
    const isChecked = target.checked;

    if (option === 'lastDay') {
      this.newRecurringTransaction.recurringPattern!.lastDayOfMonth = isChecked;
      if (isChecked) {
        // Uncheck the other option (mutual exclusivity)
        this.newRecurringTransaction.recurringPattern!.lastWeekdayOfMonth = false;
      }
    } else if (option === 'lastWeekday') {
      this.newRecurringTransaction.recurringPattern!.lastWeekdayOfMonth = isChecked;
      if (isChecked) {
        // Uncheck the other option (mutual exclusivity)
        this.newRecurringTransaction.recurringPattern!.lastDayOfMonth = false;
      }
    }
  }

  private resetForm() {
    this.newRecurringTransaction = {
      description: '',
      amount: 0,
      type: TransactionType.EXPENSE,
      category: '',
      isRecurring: true,
      recurringPattern: {
        frequency: RecurrenceFrequency.MONTHLY,
        interval: null,
        endDate: undefined,
        lastDayOfMonth: false,
        lastWeekdayOfMonth: false
      }
    };
    // Reset date picker
    this.startDate = null;
    this.startDateString = '';
    this.showDatePicker = false;
    this.endDate = null;
    this.endDateString = '';
    this.showEndDatePicker = false;
  }

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
      // Convert NgbDate to Date and set it as the start date for the transaction
      const jsDate = new Date(date.year, date.month - 1, date.day);
      this.newRecurringTransaction.date = jsDate;
      // Hide the date picker after selection
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
      // Convert NgbDate to Date and set it as the end date for the recurring pattern
      const jsDate = new Date(date.year, date.month - 1, date.day);
      this.newRecurringTransaction.recurringPattern!.endDate = jsDate;
      // Hide the date picker after selection
      this.showEndDatePicker = false;
    }
  }

  clearEndDate() {
    this.endDate = null;
    this.endDateString = '';
    this.newRecurringTransaction.recurringPattern!.endDate = undefined;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    // Close date pickers when clicking outside
    if (this.showDatePicker && !this.isClickInsideDatePicker(event, 'start')) {
      this.showDatePicker = false;
    }
    if (this.showEndDatePicker && !this.isClickInsideDatePicker(event, 'end')) {
      this.showEndDatePicker = false;
    }
  }

  // Prevent date picker from closing when clicking inside the calendar
  onDatePickerClick(event: Event) {
    event.stopPropagation();
  }

    // Check if the transaction form is valid
  isTransactionFormValid(): boolean {
    const transaction = this.newRecurringTransaction;

    // Check required fields
    if (!transaction.description || !transaction.description.trim()) {
      return false;
    }

    if (!transaction.amount || transaction.amount <= 0) {
      return false;
    }

    if (!transaction.category || !transaction.category.trim()) {
      return false;
    }

    // Check if start date is selected
    if (!transaction.date) {
      return false;
    }

    // Check if frequency is selected
    if (!transaction.recurringPattern?.frequency) {
      return false;
    }

    return true;
  }

  // Add new category to the options
  onCategoryAdded(newCategory: string): void {
    // Add the new category to the options if it doesn't exist
    if (!this.categoryOptions.find(option => option.value === newCategory)) {
      this.categoryOptions.push({ value: newCategory, label: newCategory });
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

  private isClickInsideDatePicker(event: Event, pickerType: 'start' | 'end'): boolean {
    const target = event.target as HTMLElement;
    
    if (pickerType === 'start') {
      // Check if click is inside the start date input or its date picker
      const startDateInput = target.closest('.start-date-container');
      const startDatePicker = target.closest('ngb-datepicker');
      return !!(startDateInput || startDatePicker);
    } else {
      // Check if click is inside the end date input or its date picker
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
        // Don't call calculateTimeline here - it will be called by loadMonthData
      } else {
        console.log('No real transactions from service');
        // Don't call calculateTimeline here - it will be called by loadMonthData
      }
    });
  }

  private saveTransactions() {
    this.storageService.saveTransactions(this.transactions);
    this.storageService.saveCurrentBalance(this.currentBalance);
  }

  calculateTimeline() {
    this.timeline = this.timelineService.calculateTimeline(
      this.transactions,
      this.currentBalance,
      this.projectionInterval
    );
    this.saveTransactions();
    this.updateLowestProjections();
    this.updateGroupedTransactions();
  }

  deleteTransaction(id: string) {
    this.transactions = this.transactions.filter(t => t.id !== id);
    this.calculateTimeline();
  }

  isTransaction(item: any): item is TimelineItem {
    return this.timelineService.isTransaction(item);
  }

  isProjectionPoint(item: any): item is ProjectionPoint {
    return this.timelineService.isProjectionPoint(item);
  }

  trackByDate(index: number, item: any): string {
    return item.date.toISOString();
  }

  private updateLowestProjections(): void {
    this.lowestProjections = this.timelineService.calculateLowestProjections(
      this.timeline,
      this.currentBalance,
      this.projectionInterval
    );
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

  private updateGroupedTransactions(): void {
    this.groupedTransactions = this.timelineService.groupTransactionsByDate(this.timeline);
  }

  getGroupedTransactions(): { date: Date, transactions: TimelineItem[] }[] {
    return this.groupedTransactions;
  }

  // Calendar navigation methods
  navigateMonth(direction: 'prev' | 'next'): void {
    console.log(`Navigating ${direction} from ${this.currentViewMonth.toLocaleDateString()}`);
    
    if (direction === 'prev') {
      this.currentViewMonth = new Date(this.currentViewMonth.getFullYear(), this.currentViewMonth.getMonth() - 1, 1);
    } else {
      this.currentViewMonth = new Date(this.currentViewMonth.getFullYear(), this.currentViewMonth.getMonth() + 1, 1);
    }
    
    console.log(`New view month: ${this.currentViewMonth.toLocaleDateString()}`);
    console.log(`Current transactions count: ${this.transactions.length}`);
    
    this.loadMonthData();
  }

  goToCurrentMonth(): void {
    this.currentViewMonth = new Date();
    this.loadMonthData();
  }



  private loadMonthData(): void {
    // Generate transactions for the current view month and surrounding months
    this.generateTransactionsForMonthRange(this.currentViewMonth);
    
    // Update visible months (keep only maxVisibleMonths in memory)
    this.updateVisibleMonths();
    
    // Timeline will be recalculated in the subscription after transactions are generated
  }

  private generateTransactionsForMonthRange(centerMonth: Date): void {
    // Generate transactions for 3 months: current, next, and next+1
    const months = [
      centerMonth,
      new Date(centerMonth.getFullYear(), centerMonth.getMonth() + 1, 1),
      new Date(centerMonth.getFullYear(), centerMonth.getMonth() + 2, 1)
    ];
    
    months.forEach(month => {
      this.generateTransactionsForMonth(month);
    });
  }

  private generateTransactionsForMonth(targetMonth: Date): void {
    const monthStart = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
    const monthEnd = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0);
    
    console.log(`Generating transactions for month: ${targetMonth.toLocaleDateString()}`);
    console.log(`Month range: ${monthStart.toLocaleDateString()} to ${monthEnd.toLocaleDateString()}`);
    
    // Check if transactions for this month already exist
    const monthKey = `${targetMonth.getFullYear()}-${targetMonth.getMonth()}`;
    const existingTransactionsForMonth = this.transactions.filter(t => {
      const transactionMonth = `${t.date.getFullYear()}-${t.date.getMonth()}`;
      return transactionMonth === monthKey;
    });
    
    if (existingTransactionsForMonth.length > 0) {
      console.log(`Transactions for month ${monthKey} already exist, skipping generation`);
      return;
    }
    
    // Get recurring transactions from the service (now returns Observable)
    this.transactionService.getRecurringTransactions().subscribe(recurringTransactions => {
      console.log('Recurring transactions found:', recurringTransactions.length);
      console.log('Recurring transactions data:', recurringTransactions);
      
      if (recurringTransactions.length === 0) {
        console.log('No recurring transactions available yet, skipping month generation');
        return;
      }
      
      // Generate transactions for this month
      const monthTransactions: Transaction[] = [];
      
      recurringTransactions.forEach(recurring => {
        console.log(`Processing recurring: ${recurring.description} (${recurring.frequency})`);
        
        if (recurring.frequency === 'monthly' && recurring.monthly_options?.dayOfMonth) {
          const dayOfMonth = recurring.monthly_options.dayOfMonth;
          const transactionDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), dayOfMonth);
          
          if (transactionDate >= monthStart && transactionDate <= monthEnd) {
            monthTransactions.push({
              id: `recurring-${recurring.id}-${targetMonth.getTime()}`,
              date: transactionDate,
              description: recurring.description,
              amount: Math.abs(parseFloat(recurring.amount)),
              type: TransactionType.EXPENSE,
              category: recurring.category || 'Uncategorized',
              isRecurring: true,
              recurringPattern: {
                frequency: this.mapFrequency(recurring.frequency),
                interval: 1
              }
            });
            console.log(`Added monthly transaction: ${recurring.description} on ${transactionDate.toLocaleDateString()}`);
          }
        } else if (recurring.frequency === 'weekly') {
          // Generate 4-5 weekly transactions for the month
          for (let week = 0; week < 5; week++) {
            const transactionDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1 + (week * 7));
            
            if (transactionDate >= monthStart && transactionDate <= monthEnd) {
              monthTransactions.push({
                id: `recurring-${recurring.id}-week-${week}-${targetMonth.getTime()}`,
                date: transactionDate,
                description: recurring.description,
                amount: Math.abs(parseFloat(recurring.amount)),
                type: TransactionType.EXPENSE,
                category: recurring.category || 'Uncategorized',
                isRecurring: true,
                recurringPattern: {
                  frequency: this.mapFrequency(recurring.frequency),
                  interval: 1
                }
              });
              console.log(`Added weekly transaction: ${recurring.description} on ${transactionDate.toLocaleDateString()}`);
            }
          }
        }
      });
      
      console.log(`Generated ${monthTransactions.length} transactions for month`);
      
      // Add to main transactions array
      this.transactions.push(...monthTransactions);
      
      // Recalculate timeline after adding transactions
      this.calculateTimeline();
    });
  }

  private updateVisibleMonths(): void {
    // Keep only the most recent months in memory
    if (this.visibleMonths.length > this.maxVisibleMonths) {
      this.visibleMonths = this.visibleMonths.slice(-this.maxVisibleMonths);
    }
    
    // Clean up old transactions to prevent memory issues
    this.cleanupOldTransactions();
  }

  private cleanupOldTransactions(): void {
    const currentDate = new Date();
    const threeMonthsAgo = new Date(currentDate.getFullYear(), currentDate.getMonth() - 3, 1);
    
    // Remove transactions older than 3 months
    this.transactions = this.transactions.filter(t => t.date >= threeMonthsAgo);
    
    console.log(`Cleaned up old transactions. Current count: ${this.transactions.length}`);
  }

  private mapFrequency(frequency: string): RecurrenceFrequency {
    switch (frequency.toLowerCase()) {
      case 'daily': return RecurrenceFrequency.DAILY;
      case 'weekly': return RecurrenceFrequency.WEEKLY;
      case 'monthly': return RecurrenceFrequency.MONTHLY;
      case 'yearly': return RecurrenceFrequency.YEARLY;
      default: return RecurrenceFrequency.MONTHLY;
    }
  }



  // Removed addSampleData method - now using real data from database

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

  // Get database transactions for Manage Transactions view
  getDatabaseTransactions(): Transaction[] {
    return this.allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  // Dynamic placeholder text for interval input based on frequency
  getIntervalPlaceholder(): string {
    const frequency = this.newRecurringTransaction.recurringPattern?.frequency;

    switch (frequency) {
      case RecurrenceFrequency.DAILY:
        return 'days'; // "every X days"
      case RecurrenceFrequency.WEEKLY:
        return 'every x weeks'; // "every X weeks" (supports "every other week" = 2)
      case RecurrenceFrequency.BI_WEEKLY:
        return 'every two weeks'; // Fixed for bi-weekly
      case RecurrenceFrequency.MONTHLY:
        return 'day of month'; // "day X of month"
      case RecurrenceFrequency.YEARLY:
        return 'years'; // "every X years"
      default:
        return '1';
    }
  }

  // View/Edit Transactions Methods
  startEditing(transaction: Transaction): void {
    // Store original values for potential rollback
    transaction.originalValues = {
      description: transaction.description,
      category: transaction.category,
      amount: transaction.amount
    };
    transaction.isEditing = true;
  }

  startEditingCategory(transaction: Transaction): void {
    transaction.originalValues = {
      description: transaction.description,
      category: transaction.category,
      amount: transaction.amount
    };
    transaction.isEditingCategory = true;
  }

  startEditingAmount(transaction: Transaction): void {
    transaction.originalValues = {
      description: transaction.description,
      category: transaction.category,
      amount: transaction.amount
    };
    transaction.isEditingAmount = true;
  }

  saveTransaction(transaction: Transaction): void {
    // Save changes to the transaction service
    this.transactionService.updateTransaction(transaction.id, {
      description: transaction.description,
      category: transaction.category,
      amount: transaction.amount
    });

    // Exit editing mode
    transaction.isEditing = false;
    transaction.isEditingCategory = false;
    transaction.isEditingAmount = false;
    delete transaction.originalValues;

    // Recalculate timeline to reflect changes
    this.calculateTimeline();
  }

  cancelEditing(transaction: Transaction): void {
    // Restore original values
    if (transaction.originalValues) {
      transaction.description = transaction.originalValues.description;
      transaction.category = transaction.originalValues.category;
      transaction.amount = transaction.originalValues.amount;
    }

    // Exit editing mode
    transaction.isEditing = false;
    transaction.isEditingCategory = false;
    transaction.isEditingAmount = false;
    delete transaction.originalValues;
  }

}
