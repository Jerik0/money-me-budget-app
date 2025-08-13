import { Component, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
    imports: [CommonModule, FormsModule, NgbDatepicker, BalanceProjectionChartComponent, CustomDropdownComponent, CustomModalComponent],
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
  timeline: (TimelineItem | ProjectionPoint)[] = [];
  projectionInterval: ProjectionInterval = ProjectionInterval.MONTHLY;
  lowestProjections: ProjectionPoint[] = [];
  groupedTransactions: { date: Date, transactions: TimelineItem[] }[] = [];

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

  ngOnInit() {
    this.loadTransactions();
    // Removed addSampleData() - now using real data from database
    this.calculateTimeline();
    // Set initialization flag after a brief delay to allow component to settle
    setTimeout(() => {
      this.componentInitialized = true;
    }, 100);
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
  onCategoryAdded(newCategory: string) {
    // Don't allow adding "Uncategorized" as it's reserved
    if (newCategory.toLowerCase() === 'uncategorized') {
      return;
    }
    
    // Check if category already exists
    const existingCategory = this.categoryOptions.find(option => 
      option.value.toLowerCase() === newCategory.toLowerCase()
    );
    
    if (!existingCategory) {
      // Add new category to the beginning of the list (after Uncategorized)
      this.categoryOptions.splice(1, 0, { value: newCategory, label: newCategory });
    }
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
    this.currentBalance = 0;
    
    // Subscribe to real data from the service
    this.transactionService.getTransactions().subscribe(transactions => {
      if (transactions && transactions.length > 0) {
        console.log('Loaded real transactions from service:', transactions);
        this.transactions = transactions;
        this.calculateTimeline();
      } else {
        console.log('No real transactions from service');
        this.calculateTimeline();
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

}
