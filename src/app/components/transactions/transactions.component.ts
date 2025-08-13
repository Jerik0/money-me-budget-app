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
    this.showAddForm = false;
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
      const jsDate = new Date(date.year, date.month - 1, date.day);
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
    console.log('🔄 Starting timeline calculation...');
    console.log(`Current transactions count: ${this.transactions.length}`);
    console.log(`Current balance: ${this.currentBalance}`);
    
    // First, get the base timeline from existing transactions
    this.timeline = this.timelineService.calculateTimeline(
      this.transactions,
      this.currentBalance,
      this.projectionInterval
    );

    console.log(`Base timeline created with ${this.timeline.length} items`);

    // Store the base timeline temporarily
    const baseTimeline = [...this.timeline];

    // Clear any existing recurring transactions from the timeline to prevent duplicates
    this.timeline = this.timeline.filter(item =>
      !this.isTransaction(item) || !item.isRecurring
    );

    console.log(`Timeline after filtering recurring: ${this.timeline.length} items`);

    // Now generate recurring transactions for all months after starting dates
    // This is now async and will call the completion callback when done
    this.generateRecurringTransactionsForAllMonths(() => {
      // Ensure the timeline has content before proceeding
      if (this.timeline.length === 0) {
        console.log('⚠️ Timeline is empty after generation, restoring base timeline');
        this.timeline = baseTimeline;
      }

      console.log('✅ Timeline calculation complete!');
      console.log('Timeline calculated with recurring transactions:', this.timeline);
      console.log('Timeline length:', this.timeline.length);

      // Clear the cache when timeline changes
      this.calendarDataService.clearCache();

      this.saveTransactions();
      this.updateLowestProjections();
      this.updateGroupedTransactions();
    });
  }

  deleteTransaction(id: string) {
    this.transactions = this.transactions.filter(t => t.id !== id);
    this.calculateTimeline();
  }

  isTransaction(item: any): item is TimelineItem {
    return this.timelineService.isTransaction(item);
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
    console.log(`📅 Getting grouped transactions for month: ${this.currentViewMonth.toLocaleDateString()}`);
    console.log(`Timeline has ${this.timeline.length} items`);
    
    const grouped = this.calendarDataService.getGroupedTransactions(this.timeline, this.currentViewMonth);
    console.log(`📊 Calendar data service returned ${grouped.length} grouped date ranges`);
    
    return grouped;
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

  /**
   * Generates recurring transactions for all months after the starting date
   */
  private generateRecurringTransactionsForAllMonths(onComplete?: () => void): void {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    // Get recurring transactions once and process them for all months
    this.transactionService.getRecurringTransactions().subscribe(recurringTransactions => {
      console.log(`Processing ${recurringTransactions.length} recurring transactions for timeline generation`);
      
      // Generate for current year and next year
      this.generateTransactionsForYearRangeWithData(currentYear, currentYear + 1, currentMonth, recurringTransactions);
      
      // Ensure transactions for current view month range
      this.ensureTransactionsForCurrentMonthRangeWithData(recurringTransactions);
      
      // Sort timeline by date
      this.sortTimelineByDate();

      console.log(`Timeline generation complete. Total timeline items: ${this.timeline.length}`);

      // Call completion callback if provided
      if (onComplete) {
        onComplete();
      }
    });
  }

  /**
   * Generates transactions for a range of years
   */
  private generateTransactionsForYearRange(startYear: number, endYear: number, skipMonthsBefore: number): void {
    for (let year = startYear; year <= endYear; year++) {
      for (let month = 0; month < 12; month++) {
        if (year === startYear && month < skipMonthsBefore) {
          continue;
        }
        this.generateRecurringTransactionsForMonth(year, month);
      }
    }
  }

  /**
   * Generates transactions for a range of years with pre-loaded recurring data
   */
  private generateTransactionsForYearRangeWithData(
    startYear: number, 
    endYear: number, 
    skipMonthsBefore: number, 
    recurringTransactions: any[]
  ): void {
    for (let year = startYear; year <= endYear; year++) {
      for (let month = 0; month < 12; month++) {
        if (year === startYear && month < skipMonthsBefore) {
          continue;
        }
        this.generateRecurringTransactionsForMonthWithData(year, month, recurringTransactions);
      }
    }
  }

  /**
   * Sorts timeline by date
   */
  private sortTimelineByDate(): void {
    this.timeline.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Ensures transactions exist for the currently selected month range
   */
  private ensureTransactionsForCurrentMonthRange(): void {
    const startMonth = new Date(this.currentViewMonth.getFullYear(), this.currentViewMonth.getMonth(), 1);
    const endMonth = new Date(this.currentViewMonth.getFullYear(), this.currentViewMonth.getMonth() + 3, 0);

    this.generateTransactionsForDateRange(startMonth, endMonth);
  }

  /**
   * Ensures transactions exist for the currently selected month range with pre-loaded data
   */
  private ensureTransactionsForCurrentMonthRangeWithData(recurringTransactions: any[]): void {
    const startMonth = new Date(this.currentViewMonth.getFullYear(), this.currentViewMonth.getMonth(), 1);
    const endMonth = new Date(this.currentViewMonth.getFullYear(), this.currentViewMonth.getMonth() + 3, 0);

    this.generateTransactionsForDateRangeWithData(startMonth, endMonth, recurringTransactions);
  }

  /**
   * Generates transactions for a date range
   */
  private generateTransactionsForDateRange(startDate: Date, endDate: Date): void {
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      this.generateRecurringTransactionsForMonth(year, month);
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
  }

  /**
   * Generates transactions for a date range with pre-loaded data
   */
  private generateTransactionsForDateRangeWithData(startDate: Date, endDate: Date, recurringTransactions: any[]): void {
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      this.generateRecurringTransactionsForMonthWithData(year, month, recurringTransactions);
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
  }

  /**
   * Generates recurring transactions for a specific month
   */
  private generateRecurringTransactionsForMonth(year: number, month: number): void {
    // Get recurring transactions from the database
    this.transactionService.getRecurringTransactions().subscribe(recurringTransactions => {
      console.log(`Generating recurring transactions for ${year}-${month + 1}, found ${recurringTransactions.length} recurring transactions`);
      
      recurringTransactions.forEach(recurring => {
        if (this.shouldGenerateRecurringTransaction(recurring, year, month)) {
          const transactionDates = this.calculateAllRecurringTransactionDates(recurring, year, month);
          
          // Log generation details using helper
          this.recurringTransactionHelper.logTransactionGeneration(
            recurring.description, 
            recurring.frequency, 
            year, 
            month, 
            transactionDates
          );

          transactionDates.forEach(transactionDate => {
            // Check if transaction already exists using helper
            if (!this.recurringTransactionHelper.transactionExists(
              this.timeline.filter(item => this.isTransaction(item)), 
              recurring.description, 
              transactionDate
            )) {
              // Log weekly transaction details using helper
              if (recurring.frequency.toLowerCase() === 'weekly') {
                this.recurringTransactionHelper.logWeeklyTransaction(recurring.description, transactionDate);
              }

              // Create transaction using helper
              const transactionId = this.recurringTransactionHelper.generateTransactionId(recurring, transactionDate);
              const newTransaction = this.recurringTransactionHelper.createRecurringTransaction(
                recurring, 
                transactionDate, 
                transactionId
              );

              this.timeline.push(newTransaction);
              console.log(`Generated recurring transaction: ${recurring.description} on ${transactionDate.toLocaleDateString()}`);
            }
          });
        } else {
          console.log(`Skipping ${recurring.description} for ${year}-${month + 1} - should not generate`);
        }
      });
    });
  }

  /**
   * Generates recurring transactions for a specific month with pre-loaded data
   */
  private generateRecurringTransactionsForMonthWithData(year: number, month: number, recurringTransactions: any[]): void {
    console.log(`Generating recurring transactions for ${year}-${month + 1} with ${recurringTransactions.length} pre-loaded transactions`);
    
    recurringTransactions.forEach(recurring => {
      if (this.shouldGenerateRecurringTransaction(recurring, year, month)) {
        const transactionDates = this.calculateAllRecurringTransactionDates(recurring, year, month);
        
        // Log generation details using helper
        this.recurringTransactionHelper.logTransactionGeneration(
          recurring.description, 
          recurring.frequency, 
          year, 
          month, 
          transactionDates
        );

        transactionDates.forEach(transactionDate => {
          // Check if transaction already exists using helper
          if (!this.recurringTransactionHelper.transactionExists(
            this.timeline.filter(item => this.isTransaction(item)), 
            recurring.description, 
            transactionDate
          )) {
            // Log weekly transaction details using helper
            if (recurring.frequency.toLowerCase() === 'weekly') {
              this.recurringTransactionHelper.logWeeklyTransaction(recurring.description, transactionDate);
            }

            // Create transaction using helper
            const transactionId = this.recurringTransactionHelper.generateTransactionId(recurring, transactionDate);
            const newTransaction = this.recurringTransactionHelper.createRecurringTransaction(
              recurring, 
              transactionDate, 
              transactionId
            );

            this.timeline.push(newTransaction);
            console.log(`Generated recurring transaction: ${recurring.description} on ${transactionDate.toLocaleDateString()}`);
          }
        });
      } else {
        console.log(`Skipping ${recurring.description} for ${year}-${month + 1} - should not generate`);
      }
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
        const shouldGenerate = this.recurringTransactionHelper.shouldGenerateWeeklyTransaction(
          recurringStartDate, 
          year, 
          month
        );
        
        // Log decision using helper
        if (recurring.frequency.toLowerCase() === 'weekly') {
          const { start: monthStart, end: monthEnd } = this.recurringTransactionHelper.getMonthBoundaries(year, month);
          const firstOccurrence = this.recurringTransactionHelper.calculateFirstWeeklyOccurrence(recurringStartDate, monthStart);
          this.recurringTransactionHelper.logWeeklyGenerationDecision(
            recurring.description, 
            year, 
            month, 
            shouldGenerate, 
            firstOccurrence, 
            monthStart, 
            monthEnd
          );
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
        const monthlyDate = this.recurringTransactionHelper.calculateMonthlyTransactionDate(recurring, year, month);
        dates.push(monthlyDate);
        
        // Log using helper
        const dayOfMonth = recurring.monthly_options?.dayOfMonth || recurringStartDate.getDate();
        this.recurringTransactionHelper.logMonthlyTransaction(recurring.description, year, month, dayOfMonth);
        break;

      case 'weekly':
        const weeklyDates = this.recurringTransactionHelper.calculateWeeklyTransactionDates(
          recurringStartDate, 
          year, 
          month
        );
        dates.push(...weeklyDates);
        break;

      case 'yearly':
        const yearlyDate = this.recurringTransactionHelper.calculateYearlyTransactionDate(
          recurringStartDate, 
          year, 
          month
        );
        dates.push(yearlyDate);
        break;

      default:
        dates.push(new Date(year, month, recurringStartDate.getDate()));
        break;
    }

    return dates;
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
}
