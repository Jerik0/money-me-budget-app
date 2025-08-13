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
    imports: [CommonModule, FormsModule, HttpClientModule, CustomDropdownComponent, CustomModalComponent, BalanceProjectionChartComponent],
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
  groupedTransactions: { date: Date, transactions: TimelineItem[] }[] = [];
  
  // Calendar navigation
  currentViewMonth: Date = new Date();
  visibleMonths: { month: Date, transactions: { date: Date, transactions: TimelineItem[] }[] }[] = [];
  maxVisibleMonths: number = 6; // Keep 6 months in memory

  // Properties for view/edit mode
  showViewEditMode: boolean = false;

  // Month picker properties
  showMonthPicker: boolean = false;
  isMonthLoading: boolean = false;
  monthOptions: { value: number, label: string }[] = [
    { value: 0, label: 'January' },
    { value: 1, label: 'February' },
    { value: 2, label: 'March' },
    { value: 3, label: 'April' },
    { value: 4, label: 'May' },
    { value: 5, label: 'June' },
    { value: 6, label: 'July' },
    { value: 7, label: 'August' },
    { value: 8, label: 'September' },
    { value: 9, label: 'October' },
    { value: 10, label: 'November' },
    { value: 11, label: 'December' }
  ];

  // Caching for grouped transactions to prevent infinite loops
  private cachedGroupedTransactions: { date: Date, transactions: TimelineItem[] }[] = [];
  private lastCachedMonth: string = '';

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
    
    // Month data is now handled by filtering existing transactions
    
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
    
    // Close month picker when clicking outside
    if (this.showMonthPicker && !this.isClickInsideMonthPicker(event)) {
      this.showMonthPicker = false;
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

  private isClickInsideMonthPicker(event: Event): boolean {
    const target = event.target as HTMLElement;
    // Check if click is inside the month picker button or dropdown
    const monthPickerButton = target.closest('button[title="Select Month"]');
    const monthPickerDropdown = target.closest('.month-picker-dropdown');
    return !!(monthPickerButton || monthPickerDropdown);
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

  private saveTransactions() {
    this.storageService.saveTransactions(this.transactions);
    this.storageService.saveCurrentBalance(this.currentBalance);
  }

  calculateTimeline() {
    // First, get the base timeline from existing transactions
    this.timeline = this.timelineService.calculateTimeline(
      this.transactions,
      this.currentBalance,
      this.projectionInterval
    );
    
    // Store the base timeline temporarily
    const baseTimeline = [...this.timeline];
    
    // Clear any existing recurring transactions from the timeline to prevent duplicates
    this.timeline = this.timeline.filter(item => 
      !this.isTransaction(item) || !item.isRecurring
    );
    
    // Now generate recurring transactions for all months after starting dates
    this.generateRecurringTransactionsForAllMonths();
    
    // Ensure the timeline has content before proceeding
    if (this.timeline.length === 0) {
      console.log('⚠️ Timeline is empty after generation, restoring base timeline');
      this.timeline = baseTimeline;
    }
    
    console.log('Timeline calculated with recurring transactions:', this.timeline);
    console.log('Timeline length:', this.timeline.length);
    
    // Clear the cache when timeline changes
    this.cachedGroupedTransactions = [];
    this.lastCachedMonth = '';
    
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
    // Don't update groupedTransactions here - let getGroupedTransactions() handle the filtering
    // This method is kept for compatibility but no longer needed
  }

  getGroupedTransactions(): { date: Date, transactions: TimelineItem[] }[] {
    // Guard against empty timeline
    if (!this.timeline || this.timeline.length === 0) {
      console.log('⚠️ Timeline is empty, returning empty array');
      return [];
    }
    
    // Create a cache key for the current month
    const currentMonthKey = `${this.currentViewMonth.getFullYear()}-${this.currentViewMonth.getMonth()}`;
    
    // Return cached result if available and month hasn't changed
    if (this.cachedGroupedTransactions.length > 0 && this.lastCachedMonth === currentMonthKey) {
      return this.cachedGroupedTransactions;
    }
    
    // Filter transactions to show only the selected month range (current + next 2 months)
    const startMonth = new Date(this.currentViewMonth.getFullYear(), this.currentViewMonth.getMonth(), 1);
    
    // Calculate end month properly, handling year boundaries
    let endYear = this.currentViewMonth.getFullYear();
    let endMonth = this.currentViewMonth.getMonth() + 2; // Current month + 2 more months
    
    if (endMonth > 11) {
      endMonth = endMonth - 12;
      endYear = endYear + 1;
    }
    
    const endMonthDate = new Date(endYear, endMonth + 1, 0); // Last day of the 3rd month
    
    console.log('Filtering transactions:');
    console.log('Current view month:', this.currentViewMonth.toLocaleDateString());
    console.log('Start month:', startMonth.toLocaleDateString());
    console.log('End month:', endMonthDate.toLocaleDateString());
    console.log('Timeline items before filtering:', this.timeline.length);
    
    // Debug: Show what transactions exist in the timeline
    console.log('Timeline transactions:');
    this.timeline.forEach((item, index) => {
      if (this.isTransaction(item)) {
        console.log(`  ${index}: ${item.date.toLocaleDateString()} - ${item.description}`);
      }
    });
    
    const filteredTimeline = this.timeline.filter(item => {
      if (this.isTransaction(item)) {
        const itemDate = item.date;
        const isInRange = itemDate >= startMonth && itemDate <= endMonthDate;
        if (isInRange) {
          console.log('Included item:', itemDate.toLocaleDateString(), item.description);
        }
        return isInRange;
      }
      return false;
    });
    
    console.log('Filtered timeline items:', filteredTimeline.length);
    
    // Cache the result
    this.cachedGroupedTransactions = this.timelineService.groupTransactionsByDate(filteredTimeline);
    this.lastCachedMonth = currentMonthKey;
    
    console.log('Final grouped transactions:', this.cachedGroupedTransactions.length, 'groups');
    
    return this.cachedGroupedTransactions;
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
    
    // Month data is now handled by filtering existing transactions
  }

  goToCurrentMonth(): void {
    this.currentViewMonth = new Date();
    // Month data is now handled by filtering existing transactions
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
    this.cachedGroupedTransactions = [];
    this.lastCachedMonth = '';
    
    // Recalculate timeline to ensure we have transactions for the new month range
    this.calculateTimeline();
  }

  goToPreviousYear(): void {
    this.currentViewMonth = new Date(this.currentViewMonth.getFullYear() - 1, this.currentViewMonth.getMonth(), 1);
    // Clear cache to force recalculation for new year
    this.cachedGroupedTransactions = [];
    this.lastCachedMonth = '';
    // Recalculate timeline to ensure we have transactions for the new year
    this.calculateTimeline();
  }

  goToNextYear(): void {
    this.currentViewMonth = new Date(this.currentViewMonth.getFullYear() + 1, this.currentViewMonth.getMonth(), 1);
    // Clear cache to force recalculation for new year
    this.cachedGroupedTransactions = [];
    this.lastCachedMonth = '';
    // Recalculate timeline to ensure we have transactions for the new year
    this.calculateTimeline();
  }

  getCurrentYear(): number {
    return this.currentViewMonth.getFullYear();
  }

  getCurrentMonthLabel(): string {
    return this.monthOptions[this.currentViewMonth.getMonth()].label;
  }

  // Helper method to get total transactions for current month range
  getTotalTransactionsForCurrentRange(): number {
    const grouped = this.getGroupedTransactions();
    return grouped.reduce((total, group) => total + group.transactions.length, 0);
  }

  /**
   * Generates recurring transactions for all months after the starting date
   * This ensures that recurring transactions appear in all relevant months
   */
  private generateRecurringTransactionsForAllMonths(): void {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    
    // Generate transactions for current year and next year
    for (let year = currentYear; year <= currentYear + 1; year++) {
      for (let month = 0; month < 12; month++) {
        // Skip months before the current month in current year
        if (year === currentYear && month < currentMonth) {
          continue;
        }
        
        this.generateRecurringTransactionsForMonth(year, month);
      }
    }
    
    // Also ensure we have transactions for the currently selected month range
    this.ensureTransactionsForCurrentMonthRange();
    
    // Sort timeline by date after adding recurring transactions
    this.timeline.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Ensures transactions exist for the currently selected month range
   */
  private ensureTransactionsForCurrentMonthRange(): void {
    const startMonth = new Date(this.currentViewMonth.getFullYear(), this.currentViewMonth.getMonth(), 1);
    const endMonth = new Date(this.currentViewMonth.getFullYear(), this.currentViewMonth.getMonth() + 3, 0);
    
    // Generate transactions for each month in the range
    let currentDate = new Date(startMonth);
    while (currentDate <= endMonth) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      
      this.generateRecurringTransactionsForMonth(year, month);
      
      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
  }

  /**
   * Generates recurring transactions for a specific month
   */
  private generateRecurringTransactionsForMonth(year: number, month: number): void {
    // Get recurring transactions from the database
    this.transactionService.getRecurringTransactions().subscribe(recurringTransactions => {
      recurringTransactions.forEach(recurring => {
        // Check if this recurring transaction should appear in this month
        if (this.shouldGenerateRecurringTransaction(recurring, year, month)) {
          // Generate ALL occurrences for this month based on frequency
          const transactionDates = this.calculateAllRecurringTransactionDates(recurring, year, month);
          
          console.log(`Month ${year}-${month + 1}: ${recurring.description} (${recurring.frequency}) - ${transactionDates.length} occurrences`);
          transactionDates.forEach(date => {
            console.log(`  - ${date.toLocaleDateString()}`);
          });
          
          transactionDates.forEach(transactionDate => {
                      // Check if this transaction already exists
          const existingTransaction = this.timeline.find(item => 
            this.isTransaction(item) && 
            item.description === recurring.description &&
            item.date.getTime() === transactionDate.getTime()
          );
          
          if (!existingTransaction) {
            // For weekly transactions, add extra logging
            if (recurring.frequency.toLowerCase() === 'weekly') {
              console.log(`Adding weekly transaction: ${recurring.description} on ${transactionDate.toLocaleDateString()} (${transactionDate.getDay() === 0 ? 'Sunday' : transactionDate.getDay() === 1 ? 'Monday' : transactionDate.getDay() === 2 ? 'Tuesday' : transactionDate.getDay() === 3 ? 'Wednesday' : transactionDate.getDay() === 4 ? 'Thursday' : transactionDate.getDay() === 5 ? 'Friday' : 'Saturday'})`);
            }
              const newTransaction: TimelineItem = {
                id: `recurring-${recurring.id}-${transactionDate.getTime()}`,
                date: transactionDate,
                description: recurring.description,
                amount: Math.abs(parseFloat(recurring.amount)),
                type: TransactionType.EXPENSE,
                category: recurring.category || 'Uncategorized',
                isRecurring: true,
                recurringPattern: {
                  frequency: this.mapFrequency(recurring.frequency),
                  interval: 1
                },
                balance: 0 // Will be calculated by timeline service
              };
              
              this.timeline.push(newTransaction);
              console.log(`Generated recurring transaction: ${recurring.description} on ${transactionDate.toLocaleDateString()}`);
            }
          });
        }
      });
    });
  }

  /**
   * Determines if a recurring transaction should be generated for a specific month
   */
  private shouldGenerateRecurringTransaction(recurring: any, year: number, month: number): boolean {
    const recurringStartDate = new Date(recurring.date);
    const recurringStartYear = recurringStartDate.getFullYear();
    const recurringStartMonth = recurringStartDate.getMonth();
    
    // Only generate for months after the starting date
    if (year < recurringStartYear || (year === recurringStartYear && month < recurringStartMonth)) {
      return false;
    }
    
    // Check frequency-specific logic
    switch (recurring.frequency.toLowerCase()) {
      case 'monthly':
        return true; // Monthly transactions appear every month after start
      case 'weekly':
        // For weekly transactions, we need to check if this month actually contains
        // any weekly occurrences based on the start date
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);
        
        // Calculate the first weekly occurrence in or after this month
        let currentDate = new Date(recurringStartDate);
        while (currentDate < monthStart) {
          currentDate.setDate(currentDate.getDate() + 7);
        }
        
        // Only generate if there's at least one occurrence in this month AND
        // the first occurrence falls within the month boundaries
        const shouldGenerate = currentDate <= monthEnd && currentDate >= monthStart;
        if (recurring.frequency.toLowerCase() === 'weekly') {
          console.log(`Weekly ${recurring.description}: Month ${year}-${month + 1} - ${shouldGenerate ? 'WILL generate' : 'WILL NOT generate'} (first occurrence: ${currentDate.toLocaleDateString()}, month: ${monthStart.toLocaleDateString()} to ${monthEnd.toLocaleDateString()})`);
        }
        return shouldGenerate;
      case 'yearly':
        return month === recurringStartMonth; // Yearly transactions appear same month every year
      default:
        return true;
    }
  }

  /**
   * Calculates ALL dates for recurring transactions in a given month
   */
  private calculateAllRecurringTransactionDates(recurring: any, year: number, month: number): Date[] {
    const recurringStartDate = new Date(recurring.date);
    const dates: Date[] = [];
    
    switch (recurring.frequency.toLowerCase()) {
      case 'monthly':
        // Use monthly_options.dayOfMonth if available, otherwise fall back to start date day
        let dayOfMonth;
        if (recurring.monthly_options && recurring.monthly_options.dayOfMonth) {
          dayOfMonth = recurring.monthly_options.dayOfMonth;
          console.log(`Monthly ${recurring.description}: Using dayOfMonth from options: ${dayOfMonth}`);
        } else {
          dayOfMonth = recurringStartDate.getDate();
          console.log(`Monthly ${recurring.description}: Using dayOfMonth from start date: ${dayOfMonth}`);
        }
        
        const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
        const actualDay = Math.min(dayOfMonth, lastDayOfMonth);
        dates.push(new Date(year, month, actualDay));
        console.log(`Monthly ${recurring.description}: Generated for ${year}-${month + 1}-${actualDay}`);
        break;
        
      case 'weekly':
        // For weekly transactions, we need to calculate based on the actual starting date
        // and generate dates that are multiples of 7 days from the start
        const startDate = new Date(recurringStartDate);
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);
        
        // Find the first occurrence in or after this month
        let currentDate = new Date(startDate);
        
        // If we're before the month, advance to the first occurrence in this month
        while (currentDate < monthStart) {
          currentDate.setDate(currentDate.getDate() + 7);
        }
        
        // Only generate if the first occurrence falls within this month AND
        // we're not generating for a month before the actual start date
        if (currentDate <= monthEnd && currentDate >= monthStart && currentDate >= startDate) {
          // Generate weekly transactions for this month, ensuring exactly 7-day intervals
          while (currentDate <= monthEnd) {
            if (currentDate.getMonth() === month && currentDate.getFullYear() === year) {
              dates.push(new Date(currentDate));
              console.log(`Weekly ${recurring.description}: Generated for ${currentDate.toLocaleDateString()}`);
            }
            // Always advance by exactly 7 days to maintain weekly intervals
            currentDate.setDate(currentDate.getDate() + 7);
          }
        } else {
          console.log(`Weekly ${recurring.description}: Skipping month ${year}-${month + 1} - first occurrence ${currentDate.toLocaleDateString()}, start date: ${startDate.toLocaleDateString()}`);
        }
        break;
        
      case 'yearly':
        // Same month and day every year
        dates.push(new Date(year, month, recurringStartDate.getDate()));
        break;
        
      default:
        dates.push(new Date(year, month, recurringStartDate.getDate()));
        break;
    }
    
    return dates;
  }

  /**
   * Calculates the specific date for a recurring transaction in a given month
   * @deprecated Use calculateAllRecurringTransactionDates instead
   */
  private calculateRecurringTransactionDate(recurring: any, year: number, month: number): Date | null {
    const dates = this.calculateAllRecurringTransactionDates(recurring, year, month);
    return dates.length > 0 ? dates[0] : null;
  }


  private loadMonthData(): void {
    // This method is no longer used for month picker functionality
    // The month picker now just changes the view month and filters existing data
  }

  // Removed complex transaction generation methods to prevent infinite loops
  // The month picker now just changes the view month and filters existing data

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
