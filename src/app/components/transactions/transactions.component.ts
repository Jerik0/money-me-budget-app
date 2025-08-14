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
import { PreferencesService } from '../../services/preferences.service';
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
  @ViewChild('calendarSection') calendarSection!: ElementRef;
  @ViewChild('balanceInput') balanceInput!: ElementRef;

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
    private transactionManagementService: TransactionManagementService,
    private preferencesService: PreferencesService
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

  // Form state management
  isSaving = false;
  saveSuccess = false;
  saveError: string | null = null;

  // Validation state
  validationErrors: { [key: string]: string } = {};
  isFormValid = false;

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
    // Validate form before proceeding
    if (!this.validateForm()) {
      return;
    }

    // Set saving state
    this.isSaving = true;
    this.saveError = null;

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



    // Save the transaction to the database first
    this.transactionService.addTransactionToDatabase(transaction).subscribe({
      next: (result) => {
        if (result) {
          
          // Save user preferences for next time
          this.preferencesService.updateLastTransactionType(transaction.type);
          this.preferencesService.updateLastCategory(transaction.category);
          this.preferencesService.updateLastAmount(transaction.amount);
          this.preferencesService.addPreferredCategory(transaction.category);
          
          // Show success state
          this.isSaving = false;
          this.saveSuccess = true;
          
          // Wait a moment to show success, then proceed
          setTimeout(() => {
            // Force a complete refresh of all data from the database
            this.transactionService.refreshTransactions();
            
            // Wait a moment for the refresh to complete, then recalculate timeline
            setTimeout(() => {
              this.calculateTimeline();
              this.calendarDataService.clearCachePreserveStartDate();
              
              // Force a manual refresh of the calendar data
              setTimeout(() => {
                this.refreshCalendarData();
              }, 100);
            }, 1000);
            
            // Reset form and close modal
            this.resetForm();
            this.showAddForm = false;
            this.saveSuccess = false;
            

          }, 1500); // Show success for 1.5 seconds
        }
      },
      error: (error) => {
        console.error('❌ Failed to save transaction to database:', error);
        
        // Show error state
        this.isSaving = false;
        this.saveError = 'Failed to save transaction. Please try again.';
        
        // Clear error after 5 seconds
        setTimeout(() => {
          this.saveError = null;
        }, 5000);
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
    
    // Reset form states
    this.isSaving = false;
    this.saveSuccess = false;
    this.saveError = null;
    
    // Reset validation
    this.validationErrors = {};
    this.isFormValid = false;
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
      
      // Validate form after date change
      this.validateForm();
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
        this.transactions = transactions;
        this.allTransactions = transactions; // Assign to allTransactions
        // Calculate timeline to populate the timeline array for filtering
        this.calculateTimeline();
      } else {
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

    });

    // Mark component as initialized
    this.componentInitialized = true;
  }

  updateBalance() {
    this.lastBalanceUpdate = new Date();
    this.calculateTimeline();
  }

  startEditingBalance() {
    this.isEditingBalance = true;
    // Use setTimeout to ensure the input is rendered before focusing
    setTimeout(() => {
      if (this.balanceInput) {
        this.balanceInput.nativeElement.focus();
        this.balanceInput.nativeElement.select();
      }
    }, 0);
  }

  selectBalanceInput() {
    // Select all text when the input is clicked
    if (this.balanceInput) {
      this.balanceInput.nativeElement.select();
    }
  }

  // Inline editing methods
  startInlineEdit(transaction: Transaction, field: 'description' | 'amount' | 'category', event: MouseEvent) {
    // Store original values
    transaction.originalValues = {
      description: transaction.description,
      category: transaction.category,
      amount: transaction.amount
    };
    
    // Clear all editing states first
    transaction.isEditing = false;
    transaction.isEditingAmount = false;
    transaction.isEditingCategory = false;
    
    // Set specific editing state
    if (field === 'description') transaction.isEditing = true;
    if (field === 'amount') transaction.isEditingAmount = true;
    if (field === 'category') transaction.isEditingCategory = true;
    
    // Store click position for positioning the container
    transaction.editPosition = {
      x: event.clientX,
      y: event.clientY
    };
    
    // Focus the input after a short delay
    setTimeout(() => {
      const inputElement = document.querySelector(`[data-edit-field="${field}"][data-transaction-id="${transaction.id}"]`) as HTMLInputElement;
      if (inputElement) {
        inputElement.focus();
        inputElement.select();
      }
    }, 10);
  }

  saveInlineEdit(transaction: Transaction) {
    // Update the transaction in the database
    this.transactionService.updateFullTransaction(transaction).subscribe({
      next: (updatedTransaction) => {
        this.cancelInlineEdit(transaction);
        this.calculateTimeline(); // Refresh timeline
      },
      error: (error) => {
        console.error('❌ Failed to update transaction:', error);
        // Revert to original values on error
        if (transaction.originalValues) {
          transaction.description = transaction.originalValues.description;
          transaction.category = transaction.originalValues.category;
          transaction.amount = transaction.originalValues.amount;
        }
        this.cancelInlineEdit(transaction);
      }
    });
  }

  cancelInlineEdit(transaction: Transaction) {
    // Revert to original values
    if (transaction.originalValues) {
      transaction.description = transaction.originalValues.description;
      transaction.category = transaction.originalValues.category;
      transaction.amount = transaction.originalValues.amount;
    }
    
    // Clear editing state
    transaction.isEditing = false;
    transaction.isEditingAmount = false;
    transaction.isEditingCategory = false;
    transaction.originalValues = undefined;
    transaction.editPosition = undefined;
  }

  onInlineEditKeydown(event: KeyboardEvent, transaction: Transaction) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.saveInlineEdit(transaction);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelInlineEdit(transaction);
    }
  }

  toggleAddForm() {
    if (this.showAddForm) {
      // If form is open and we're closing it (canceling), clear the form
      this.transactionManagementService.resetForm({});
      this.showAddForm = false;
    } else {
      // If form is closed and we're opening it
      this.showAddForm = true;
      // Pre-fill with user preferences
      this.prefillFormWithPreferences();
      // Validate the form after pre-filling
      this.validateForm();
      // Auto-focus the description input after the animation completes
      setTimeout(() => {
        if (this.descriptionInput) {
          this.descriptionInput.nativeElement.focus();
        }
      }, 550); // Slightly after the 500ms transition
    }
  }

  /**
   * Pre-fill the form with user preferences
   */
  private prefillFormWithPreferences(): void {
    const preferences = this.preferencesService.getPreferences();
    
    // Set today's date as default
    const today = new Date();
    this.startDate = new NgbDate(today.getFullYear(), today.getMonth() + 1, today.getDate());
    this.startDateString = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
    this.newRecurringTransaction.date = today;
    
    // Pre-fill with last used values
    this.newRecurringTransaction.type = preferences.lastTransactionType;
    this.newRecurringTransaction.category = preferences.lastCategory;
    
    // Don't pre-fill amount - let user enter it fresh
    this.newRecurringTransaction.amount = 0;
    this.newRecurringTransaction.description = '';
  }

  /**
   * Get CSS classes for the save button based on current state
   */
  getSaveButtonClasses(): string {
    if (this.isSaving) {
      return 'px-6 py-2 bg-teal-600 text-white font-medium rounded-lg focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 shadow-sm transition-colors duration-200 cursor-not-allowed';
    }
    
    if (this.saveSuccess) {
      return 'px-6 py-2 bg-green-600 text-white font-medium rounded-lg focus:ring-2 focus:ring-green-500 focus:ring-offset-2 shadow-sm transition-colors duration-200';
    }
    
    if (this.isFormValid) {
      return 'px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 shadow-sm hover:shadow-md transition-colors duration-200';
    }
    
    return 'px-6 py-2 bg-gray-400 text-gray-200 font-medium rounded-lg cursor-not-allowed transition-colors duration-200';
  }

  /**
   * Validate the transaction form
   */
  validateForm(): boolean {
    this.validationErrors = {};
    
    // Description validation
    if (!this.newRecurringTransaction.description || this.newRecurringTransaction.description.trim().length === 0) {
      this.validationErrors['description'] = 'Description is required';
    } else if (this.newRecurringTransaction.description.trim().length < 3) {
      this.validationErrors['description'] = 'Description must be at least 3 characters';
    }
    
    // Amount validation
    if (!this.newRecurringTransaction.amount && this.newRecurringTransaction.amount !== 0) {
      this.validationErrors['amount'] = 'Amount is required';
    } else if (this.newRecurringTransaction.amount <= 0) {
      this.validationErrors['amount'] = 'Amount must be greater than 0';
    } else if (this.newRecurringTransaction.amount > 999999) {
      this.validationErrors['amount'] = 'Amount cannot exceed $999,999';
    }
    
    // Category validation
    if (!this.newRecurringTransaction.category || this.newRecurringTransaction.category.trim().length === 0) {
      this.validationErrors['category'] = 'Category is required';
    }
    
    // Date validation
    if (!this.newRecurringTransaction.date) {
      this.validationErrors['date'] = 'Start date is required';
    } else {
      const selectedDate = new Date(this.newRecurringTransaction.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        this.validationErrors['date'] = 'Start date cannot be in the past';
      }
      
      // Check if date is more than 10 years in the future
      const maxDate = new Date();
      maxDate.setFullYear(maxDate.getFullYear() + 10);
      if (selectedDate > maxDate) {
        this.validationErrors['date'] = 'Start date cannot be more than 10 years in the future';
      }
    }
    
    this.isFormValid = Object.keys(this.validationErrors).length === 0;
    return this.isFormValid;
  }

  /**
   * Get validation error for a specific field
   */
  getFieldError(fieldName: string): string | null {
    return this.validationErrors[fieldName] || null;
  }

  /**
   * Check if a field has validation errors
   */
  hasFieldError(fieldName: string): boolean {
    return !!this.validationErrors[fieldName];
  }

  toggleViewMode() {
    const oldMode = this.viewMode;
    this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
    console.log('🔄 View mode changed from', oldMode, 'to', this.viewMode);
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
        this.calendarDataService.clearCachePreserveStartDate();

        // Save transactions and update projections
        this.transactionService.saveTransactions(this.allTransactions);
        this.lowestProjections = this.timelineService.updateLowestProjections(this.timeline, this.currentBalance, this.projectionInterval);
        

      }
    );
  }

  deleteTransaction(id: string) {
    
    // Call the backend DELETE endpoint
    this.transactionService.deleteTransactionFromDatabase(id).subscribe({
      next: (result) => {
        if (result) {
          
          // Force a complete refresh of all data from the database
          this.transactionService.refreshTransactions();
          
          // Wait a moment for the refresh to complete, then recalculate timeline
          setTimeout(() => {
            this.calculateTimeline();
            this.calendarDataService.clearCachePreserveStartDate();
          }, 500);
        }
      },
      error: (error) => {
        console.error('❌ Failed to delete transaction from database:', error);
        // Fallback: remove from local arrays
        this.transactions = this.transactions.filter(t => t.id !== id);
        this.allTransactions = this.allTransactions.filter(t => t.id !== id);
        this.calculateTimeline();
        this.calendarDataService.clearCachePreserveStartDate();
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

  onChartClick(clickedDate: Date) {
    
    // Set the current view month to the clicked date (not just the 1st of the month)
    this.currentViewMonth = new Date(clickedDate);
    
    // Set the specific start date to the clicked date
    this.calendarDataService.setSpecificStartDate(clickedDate);
    
    // Force a refresh of the calendar data
    this.refreshCalendarData();
    
    // Switch to grid view to show the calendar
    this.viewMode = 'grid';
    
    // Scroll to the calendar section after a short delay to ensure the view has updated
    setTimeout(() => {
      if (this.calendarSection) {
        this.calendarSection.nativeElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }
    }, 100);
    

  }

  getGroupedTransactions(): { date: Date, transactions: TimelineItem[] }[] {
    const grouped = this.calendarDataService.getGroupedTransactions(this.timeline, this.currentViewMonth);
    return grouped;
  }

  getTotalTransactionCount(): number {
    const groups = this.getGroupedTransactions();
    return groups.reduce((sum, group) => sum + group.transactions.length, 0);
  }

  goToCurrentMonth(): void {
    this.currentViewMonth = new Date();
    // Clear specific start date since this is normal navigation
    this.calendarDataService.setSpecificStartDate(undefined);
    // Force refresh of calendar data
    this.refreshCalendarData();
  }

  /**
   * Force refresh of calendar data
   */
  refreshCalendarData(): void {
    // Clear cache but preserve specific start date
    this.calendarDataService.clearCachePreserveStartDate();
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

    // Clear specific start date since this is normal navigation
    this.calendarDataService.setSpecificStartDate(undefined);

    // Recalculate timeline to ensure we have transactions for the new month range
    this.calculateTimeline();
  }

  goToPreviousYear(): void {
    this.currentViewMonth = new Date(this.currentViewMonth.getFullYear() - 1, this.currentViewMonth.getMonth(), 1);
    // Clear specific start date since this is normal navigation
    this.calendarDataService.setSpecificStartDate(undefined);
    // Recalculate timeline to ensure we have transactions for the new year
    this.calculateTimeline();
  }

  goToNextYear(): void {
    this.currentViewMonth = new Date(this.currentViewMonth.getFullYear() + 1, this.currentViewMonth.getMonth(), 1);
    // Clear specific start date since this is normal navigation
    this.calendarDataService.setSpecificStartDate(undefined);
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
