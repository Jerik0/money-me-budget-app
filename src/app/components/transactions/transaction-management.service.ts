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
    return allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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
  addNewCategory(categoryName: string, categoryOptions: unknown[]): void {
    if (categoryName && !categoryOptions.find(option => option.value === categoryName)) {
      categoryOptions.push({ value: categoryName, label: categoryName });
    }
  }

  /**
   * Reset form to default values
   */
  resetForm(formData: unknown): void {
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
  validateTransactionForm(formData: unknown): { isValid: boolean; errors: string[] } {
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
}
