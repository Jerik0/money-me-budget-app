import { Component, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { NgbDatepicker, NgbDate } from '@ng-bootstrap/ng-bootstrap';
import { ProjectionInterval, RecurrenceFrequency, TransactionType } from '../../enums';
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
    // eslint-disable-next-line no-unused-vars
    private transactionService: TransactionService,
    // eslint-disable-next-line no-unused-vars
    private storageService: StorageService,
    // eslint-disable-next-line no-unused-vars
    private timelineService: TimelineService,
    // eslint-disable-next-line no-unused-vars
    private calendarDataService: CalendarDataService,
    // eslint-disable-next-line no-unused-vars
    private transactionManagementService: TransactionManagementService,
    // eslint-disable-next-line no-unused-vars
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
  newTransaction: Partial<Transaction> = {
    description: '',
    amount: 0,
    type: 'expense' as TransactionType,
    category: '',
    isRecurring: false,
    recurringPattern: {
      frequency: RecurrenceFrequency.MONTHLY,
      interval: 1,
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
  addTransaction() {
    // Validate form before proceeding
    if (!this.validateForm()) {
      return;
    }

    // Set saving state
    this.isSaving = true;
    this.saveError = null;

    // Use the selected start date if available, otherwise use current date
    const transactionDate = this.newTransaction.date || new Date();

    const transaction: Transaction = {
      id: Date.now().toString(),
      date: transactionDate,
      description: this.newTransaction.description!,
      amount: this.newTransaction.amount!,
      type: this.newTransaction.type!,
      category: this.newTransaction.category!,
      isRecurring: false
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
      error: () => {
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
    this.newTransaction = {
      description: '',
      amount: 0,
      type: 'expense' as TransactionType,
      category: '',
      isRecurring: false,
      recurringPattern: {
        frequency: RecurrenceFrequency.MONTHLY,
        interval: 1,
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
      this.newTransaction.recurringPattern!.lastDayOfMonth = isChecked;
      if (isChecked) {
        this.newTransaction.recurringPattern!.lastWeekdayOfMonth = false;
      }
    } else if (option === 'lastWeekday') {
      this.newTransaction.recurringPattern!.lastWeekdayOfMonth = isChecked;
      if (isChecked) {
        this.newTransaction.recurringPattern!.lastDayOfMonth = false;
      }
    }
  }

  isTransactionFormValid(): boolean {
    const transaction = this.newTransaction;

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

  onCategoryAdded(newCategory: unknown): void {
    const category = String(newCategory);
    if (!this.categoryOptions.find(option => option.value === category)) {
      this.categoryOptions.push({ value: category, label: category });
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
      this.newTransaction.date = jsDate;
      this.showDatePicker = false;
      
      // Validate form after date change
      this.validateForm();
    }
  }

  clearStartDate() {
    this.startDate = null;
    this.startDateString = '';
    this.newTransaction.date = undefined;
  }

  onEndDateChange(date: NgbDate | null) {
    if (date) {
      this.endDate = date;
      this.endDateString = `${date.month}/${date.day}/${date.year}`;
      const jsDate = new Date(date.year, date.month - 1, date.day);
      this.newTransaction.recurringPattern!.endDate = jsDate;
      this.showEndDatePicker = false;
    }
  }

  clearEndDate() {
    this.endDate = null;
    this.endDateString = '';
    this.newTransaction.recurringPattern!.endDate = undefined;
  }

  onDatePickerClick(event: Event) {
    event.stopPropagation();
  }

  ngOnInit(): void {
    // Load balance from storage
    this.currentBalance = this.storageService.loadCurrentBalance();
    
    // Set a default balance if none is saved
    if (this.currentBalance === 0) {
      this.currentBalance = 5000; // Default starting balance
      this.storageService.saveCurrentBalance(this.currentBalance);
    }
    
    this.lastBalanceUpdate = new Date(); // For now, use current date

    // Set the calendar to start with today's date by default
    const today = new Date();
    this.calendarDataService.setSpecificStartDate(today);
    
    // Set the current view month to the month containing today's date
    // This ensures the calendar shows the correct month range starting from today
    this.currentViewMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Subscribe to all transactions from database
    this.transactionService.getAllTransactions().subscribe(transactions => {
      console.log('🏠 Component received transactions:', transactions);
      this.allTransactions = transactions;
      this.transactions = transactions; // Also assign to transactions for backward compatibility
      
      if (transactions && transactions.length > 0) {
        // Calculate timeline to populate the timeline array for filtering
        this.calculateTimeline();
        // Force refresh of calendar data to ensure the specific start date is applied
        setTimeout(() => {
          this.refreshCalendarData();
        }, 100);
      }
    });



    // Mark component as initialized
    this.componentInitialized = true;
  }

  updateBalance() {
    // Save the current balance to storage
    this.storageService.saveCurrentBalance(this.currentBalance);
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

  /**
   * Start inline editing for calendar view transactions
   */
  startCalendarInlineEdit(transaction: Transaction, field: 'description' | 'amount', event: MouseEvent) {
    console.log('🔄 startCalendarInlineEdit called for:', transaction.description, 'field:', field, 'ID:', transaction.id);
    
    // If this is a recurring instance (has '_' in ID), find the original transaction
    let originalTransaction = null;
    if (transaction.id.includes('_')) {
      // This is a generated recurring instance, find the original transaction
      const originalId = transaction.id.split('_')[0];
      originalTransaction = this.allTransactions.find(t => t.id === originalId);
      if (originalTransaction) {
        console.log(`🔄 Calendar edit: Found original transaction ${originalId} for recurring instance ${transaction.id}`);
      } else {
        console.warn(`⚠️ Calendar edit: Could not find original transaction ${originalId} for recurring instance ${transaction.id}`);
      }
    }
    
    // Store the original transaction reference for later use
    if (originalTransaction) {
      transaction.originalDatabaseId = originalTransaction.id;
    }
    
    // Store original values on the clicked transaction (for UI display)
    transaction.originalValues = {
      description: transaction.description,
      category: transaction.category,
      amount: transaction.amount
    };
    
    // Set editing state on the clicked transaction (for UI display)
    if (field === 'description') {
      transaction.isEditing = true;
      console.log('✅ Set isEditing = true for transaction:', transaction.id);
    }
    if (field === 'amount') {
      transaction.isEditingAmount = true;
      console.log('✅ Set isEditingAmount = true for transaction:', transaction.id);
    }
    
    console.log('🔍 Transaction state after setting editing:', {
      id: transaction.id,
      isEditing: transaction.isEditing,
      isEditingAmount: transaction.isEditingAmount,
      description: transaction.description
    });
    
    // Also update the timeline array to ensure the UI reflects the changes
    const timelineIndex = this.timeline.findIndex(item => 
      this.isTransaction(item) && item.id === transaction.id
    );
    if (timelineIndex !== -1) {
      const timelineItem = this.timeline[timelineIndex] as TimelineItem;
      if (field === 'description') {
        timelineItem.isEditing = true;
      }
      if (field === 'amount') {
        timelineItem.isEditingAmount = true;
      }
      timelineItem.originalValues = { ...transaction.originalValues };
      if (originalTransaction) {
        timelineItem.originalDatabaseId = originalTransaction.id;
      }
      console.log('✅ Updated timeline item editing state for:', timelineItem.id);
    } else {
      console.warn('⚠️ Transaction not found in timeline array:', transaction.id);
    }
    
    // Prevent event bubbling
    event.stopPropagation();
    
    // Focus the input after a short delay
    setTimeout(() => {
      const inputElement = document.querySelector(`[data-calendar-edit-field="${field}"][data-transaction-id="${transaction.id}"]`) as HTMLInputElement;
      if (inputElement) {
        inputElement.focus();
        inputElement.select();
        console.log('✅ Input element focused:', inputElement);
      } else {
        console.warn('⚠️ Input element not found for:', field, 'transaction ID:', transaction.id);
      }
    }, 10);
  }

  saveInlineEdit(transaction: Transaction) {
    console.log('🚀 EDITING: Starting inline edit for:', transaction.description);
    
    // If this is a recurring instance (has '_' in ID), find the original transaction to update
    let transactionToUpdate = transaction;
    if (transaction.id.includes('_')) {
      // This is a generated recurring instance, find the original transaction
      const originalId = transaction.id.split('_')[0];
      const originalTransaction = this.allTransactions.find(t => t.id === originalId);
      if (originalTransaction) {
        transactionToUpdate = originalTransaction;
        // Copy the edited values to the original transaction
        transactionToUpdate.description = transaction.description;
        transactionToUpdate.amount = transaction.amount;
        console.log(`🔄 Calendar save: Updating original transaction ${originalId} for recurring instance ${transaction.id}`);
      } else {
        console.warn(`⚠️ Calendar save: Could not find original transaction ${originalId} for recurring instance ${transaction.id}`);
        // Fall back to updating the current transaction
        transactionToUpdate = transaction;
      }
    }
    
    // Update the transaction in the database
    this.transactionService.updateFullTransaction(transactionToUpdate).subscribe({
      next: (result) => {
        // Check if the update was actually successful
        if (result === null) {
          console.log('⚠️ WARNING: Database update returned null result');
          // Revert to original values
          if (transactionToUpdate.originalValues) {
            transactionToUpdate.description = transactionToUpdate.originalValues.description;
            transactionToUpdate.category = transactionToUpdate.originalValues.category;
            transactionToUpdate.amount = transactionToUpdate.originalValues.amount;
          }
          this.cancelInlineEdit(transactionToUpdate);
          alert('Failed to update transaction. Please try again.');
          return;
        }
        
        console.log('✅ SUCCESS: Database update completed');
        
        this.cancelInlineEdit(transactionToUpdate);
        
        // Update the local transaction in allTransactions array
        const index = this.allTransactions.findIndex(t => t.id === transactionToUpdate.id);
        if (index !== -1) {
          this.allTransactions[index] = { ...transactionToUpdate };
          console.log('🔄 LOCAL: Transaction updated in local array');
        } else {
          console.log('⚠️ WARNING: Transaction not found in local array');
        }
        
        // Clear calendar cache to force refresh
        this.calendarDataService.clearCachePreserveStartDate();
        
        // Recalculate timeline with updated data
        this.calculateTimeline();
        
        // Don't immediately refresh calendar data - let the user see the changes
        // The timeline recalculation should handle updating the display
        console.log('🔄 REFRESH: Timeline recalculated, calendar should update automatically');
      },
      error: (error) => {
        console.error('❌ ERROR: Database update failed:', error);
        // Revert to original values on error
        if (transactionToUpdate.originalValues) {
          transactionToUpdate.description = transactionToUpdate.originalValues.description;
          transactionToUpdate.category = transactionToUpdate.originalValues.category;
          transactionToUpdate.amount = transactionToUpdate.originalValues.amount;
        }
        this.cancelInlineEdit(transactionToUpdate);
        alert('Failed to update transaction. Please try again.');
      }
    });
  }

  cancelInlineEdit(transaction: Transaction) {
    console.log('🔄 cancelInlineEdit called for:', transaction.description, 'ID:', transaction.id);
    
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
    
    // Also clear editing state from the timeline array
    const timelineIndex = this.timeline.findIndex(item => 
      this.isTransaction(item) && item.id === transaction.id
    );
    if (timelineIndex !== -1) {
      const timelineItem = this.timeline[timelineIndex] as TimelineItem;
      timelineItem.isEditing = false;
      timelineItem.isEditingAmount = false;
      timelineItem.isEditingCategory = false;
      timelineItem.originalValues = undefined;
      timelineItem.editPosition = undefined;
      console.log('✅ Cleared timeline item editing state for:', timelineItem.id);
    }
    
    console.log('✅ Editing state cleared for transaction:', transaction.id);
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
    this.newTransaction.date = today;
    
    // Pre-fill with last used values
    this.newTransaction.type = preferences.lastTransactionType;
    this.newTransaction.category = preferences.lastCategory;
    
    // Don't pre-fill amount - let user enter it fresh
    this.newTransaction.amount = 0;
    this.newTransaction.description = '';
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
    if (!this.newTransaction.description || this.newTransaction.description.trim().length === 0) {
      this.validationErrors['description'] = 'Description is required';
    } else if (this.newTransaction.description.trim().length < 3) {
      this.validationErrors['description'] = 'Description must be at least 3 characters';
    }
    
    // Amount validation
    if (!this.newTransaction.amount && this.newTransaction.amount !== 0) {
      this.validationErrors['amount'] = 'Amount is required';
    } else if (this.newTransaction.amount <= 0) {
      this.validationErrors['amount'] = 'Amount must be greater than 0';
    } else if (this.newTransaction.amount > 999999) {
      this.validationErrors['amount'] = 'Amount cannot exceed $999,999';
    }
    
    // Category validation
    if (!this.newTransaction.category || this.newTransaction.category.trim().length === 0) {
      this.validationErrors['category'] = 'Category is required';
    }
    
    // Date validation
    if (!this.newTransaction.date) {
      this.validationErrors['date'] = 'Start date is required';
    } else {
      const selectedDate = new Date(this.newTransaction.date);
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

  onCategoryChange(transaction: Transaction, newCategory: unknown): void {
    // Update the transaction category
    const category = String(newCategory);
    transaction.category = category;

    // Save the change to the database
    this.transactionService.updateTransactionInDatabase(transaction.id, { category: category }).subscribe();
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
        this.transactions = transactions;
        this.allTransactions = transactions; // Assign to allTransactions
        // Calculate timeline to populate the timeline array for filtering
        this.calculateTimeline();
      }
      // No transactions to calculate timeline for
    });
  }

  calculateTimeline() {
    // Get the specific start date from the calendar data service
    const specificStartDate = this.calendarDataService.getSpecificStartDate();
    
    // Use the TimelineService to calculate the complete timeline with recurring transactions
    this.timelineService.calculateTimelineWithRecurring(
      this.allTransactions,
      this.currentBalance,
      this.projectionInterval,
      specificStartDate,
      (updatedTimeline) => {
        // Update the component's timeline with the updated version
        this.timeline = updatedTimeline;
        
        // Post-processing callback
        // Clear the cache when timeline changes
        this.calendarDataService.clearCachePreserveStartDate();

        // Don't save transactions here during inline editing to avoid conflicts
        // this.transactionService.saveTransactions(this.allTransactions);
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
      error: () => {
        // Fallback: remove from local arrays
        this.transactions = this.transactions.filter(t => t.id !== id);
        this.allTransactions = this.allTransactions.filter(t => t.id !== id);
        this.calculateTimeline();
        this.calendarDataService.clearCachePreserveStartDate();
      }
    });
  }

  isTransaction(item: TimelineItem | ProjectionPoint): item is TimelineItem {
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
