import { Injectable } from '@angular/core';
import { RecurrenceFrequency, TransactionType } from '../../enums';
import { Transaction } from '../../interfaces';
import { TransactionService } from '../../services/transaction.service';

@Injectable({
  providedIn: 'root'
})
export class TransactionManagementService {

  constructor(
    // eslint-disable-next-line no-unused-vars
    private transactionService: TransactionService
  ) {}

  /**
   * Get database transactions for Manage Transactions view
   */
  getDatabaseTransactions(allTransactions: Transaction[]): Transaction[] {
    // Filter out generated recurring instances (those with '_' in their ID)
    // Only return original database transactions
    const originalTransactions = allTransactions.filter(transaction => 
      !transaction.id.includes('_') // Original transactions have simple numeric IDs
    );
    
    return originalTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  /**
   * Dynamic placeholder text for interval input based on frequency
   */
  getIntervalPlaceholder(frequency: string): string {
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

  /**
   * Start editing a transaction
   */
  startEditing(transaction: Transaction): void {
    // Store original values for potential rollback
    transaction.originalValues = {
      description: transaction.description,
      category: transaction.category,
      amount: transaction.amount
    };
    transaction.isEditing = true;
  }

  /**
   * Start editing category for a transaction
   */
  startEditingCategory(transaction: Transaction): void {
    transaction.originalValues = {
      description: transaction.description,
      category: transaction.category,
      amount: transaction.amount
    };
    transaction.isEditingCategory = true;
  }

  /**
   * Start editing amount for a transaction
   */
  startEditingAmount(transaction: Transaction): void {
    transaction.originalValues = {
      description: transaction.description,
      category: transaction.category,
      amount: transaction.amount
    };
    transaction.isEditingAmount = true;
  }

  /**
   * Save transaction changes
   */
  saveTransaction(transaction: Transaction, onComplete?: () => void): void {
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

    // Call completion callback if provided
    if (onComplete) {
      onComplete();
    }
  }

  /**
   * Cancel editing and restore original values
   */
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

  /**
   * Delete a transaction
   */
  deleteTransaction(transactionId: string, onComplete?: () => void): void {
    this.transactionService.deleteTransactionFromDatabase(transactionId).subscribe({
      next: () => {
        if (onComplete) {
          onComplete();
        }
      },
      error: () => {
        // Handle error silently
      }
    });
  }

  /**
   * Add a new category to the options
   */
  addNewCategory(categoryName: string, categoryOptions: { value: string; label: string }[]): void {
    if (categoryName && !categoryOptions.find(option => option.value === categoryName)) {
      categoryOptions.push({ value: categoryName, label: categoryName });
    }
  }

  /**
   * Reset form to default values
   */
  resetForm(formData: any): void {
    formData.description = '';
    formData.amount = '';
    formData.category = 'Uncategorized';
    formData.type = TransactionType.EXPENSE;
    formData.frequency = RecurrenceFrequency.MONTHLY;
    formData.startDate = '';
    formData.endDate = '';
    formData.interval = 1;
    formData.dayOfMonth = 1;
    formData.dayOfWeek = 1;
  }

  /**
   * Validate transaction form data
   */
  validateTransactionForm(formData: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!formData.description || formData.description.trim() === '') {
      errors.push('Description is required');
    }

    if (!formData.amount || isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
      errors.push('Amount must be a positive number');
    }

    if (!formData.startDate) {
      errors.push('Start date is required');
    }

    if (formData.frequency === RecurrenceFrequency.MONTHLY && 
        (!formData.dayOfMonth || formData.dayOfMonth < 1 || formData.dayOfMonth > 31)) {
      errors.push('Day of month must be between 1 and 31');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if transaction form is valid
   */
  isTransactionFormValid(transaction: Partial<Transaction>): boolean {
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

  /**
   * Validate the transaction form with detailed error tracking
   */
  validateForm(transaction: Partial<Transaction>): { isValid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};
    
    // Description validation
    if (!transaction.description || transaction.description.trim().length === 0) {
      errors['description'] = 'Description is required';
    } else if (transaction.description.trim().length < 3) {
      errors['description'] = 'Description must be at least 3 characters';
    }
    
    // Amount validation
    if (!transaction.amount && transaction.amount !== 0) {
      errors['amount'] = 'Amount is required';
    } else if (transaction.amount <= 0) {
      errors['amount'] = 'Amount must be greater than 0';
    } else if (transaction.amount > 999999) {
      errors['amount'] = 'Amount cannot exceed $999,999';
    }
    
    // Category validation
    if (!transaction.category || transaction.category.trim().length === 0) {
      errors['category'] = 'Category is required';
    }
    
    // Date validation
    if (!transaction.date) {
      errors['date'] = 'Start date is required';
    } else {
      const selectedDate = new Date(transaction.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        errors['date'] = 'Start date cannot be in the past';
      }
      
      // Check if date is more than 10 years in the future
      const maxDate = new Date();
      maxDate.setFullYear(maxDate.getFullYear() + 10);
      if (selectedDate > maxDate) {
        errors['date'] = 'Start date cannot be more than 10 years in the future';
      }
    }
    
    const isValid = Object.keys(errors).length === 0;
    return { isValid, errors };
  }

  /**
   * Get validation error for a specific field
   */
  getFieldError(errors: Record<string, string>, fieldName: string): string | null {
    return errors[fieldName] || null;
  }

  /**
   * Check if a field has validation errors
   */
  hasFieldError(errors: Record<string, string>, fieldName: string): boolean {
    return !!errors[fieldName];
  }

  /**
   * Get CSS classes for the save button based on current state
   */
  getSaveButtonClasses(isSaving: boolean, saveSuccess: boolean, isFormValid: boolean): string {
    if (isSaving) {
      return 'px-6 py-2 bg-teal-600 text-white font-medium rounded-lg focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 shadow-sm transition-colors duration-200 cursor-not-allowed';
    }
    
    if (saveSuccess) {
      return 'px-6 py-2 bg-green-600 text-white font-medium rounded-lg focus:ring-2 focus:ring-green-500 focus:ring-offset-2 shadow-sm transition-colors duration-200';
    }
    
    if (isFormValid) {
      return 'px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 shadow-sm hover:shadow-md transition-colors duration-200';
    }
    
    return 'px-6 py-2 bg-gray-400 text-gray-200 font-medium rounded-lg cursor-not-allowed transition-colors duration-200';
  }

  /**
   * Handle start date change
   */
  onStartDateChange(date: any, transaction: Partial<Transaction>): Date | null {
    if (date) {
      // Create date at noon to avoid timezone issues
      const jsDate = new Date(date.year, date.month - 1, date.day, 12, 0, 0, 0);
      transaction.date = jsDate;
      return jsDate;
    }
    return null;
  }

  /**
   * Clear start date
   */
  clearStartDate(transaction: Partial<Transaction>): void {
    transaction.date = undefined;
  }

  /**
   * Handle end date change
   */
  onEndDateChange(date: any, transaction: Partial<Transaction>): Date | null {
    if (date) {
      const jsDate = new Date(date.year, date.month - 1, date.day);
      if (transaction.recurringPattern) {
        transaction.recurringPattern.endDate = jsDate;
      }
      return jsDate;
    }
    return null;
  }

  /**
   * Clear end date
   */
  clearEndDate(transaction: Partial<Transaction>): void {
    if (transaction.recurringPattern) {
      transaction.recurringPattern.endDate = undefined;
    }
  }

  /**
   * Pre-fill form with user preferences
   */
  prefillFormWithPreferences(transaction: Partial<Transaction>, preferences: any): void {
    // Set today's date as default
    const today = new Date();
    transaction.date = today;
    
    // Pre-fill with last used values
    if (preferences.lastTransactionType) {
      transaction.type = preferences.lastTransactionType;
    }
    if (preferences.lastCategory) {
      transaction.category = preferences.lastCategory;
    }
    
    // Don't pre-fill amount - let user enter it fresh
    transaction.amount = 0;
    transaction.description = '';
  }
}
