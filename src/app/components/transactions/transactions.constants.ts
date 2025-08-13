import { RecurrenceFrequency, TransactionType } from '../../enums';
import { DropdownOption } from '../shared/custom-dropdown/custom-dropdown.component';

// Month options for the month picker
export const MONTH_OPTIONS: { value: number, label: string }[] = [
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

// Transaction type options for dropdowns
export const TRANSACTION_TYPE_OPTIONS: DropdownOption[] = [
  { value: TransactionType.EXPENSE, label: 'Expense' },
  { value: TransactionType.INCOME, label: 'Income' }
];

// Frequency options for recurring transactions
export const FREQUENCY_OPTIONS: DropdownOption[] = [
  { value: RecurrenceFrequency.ONCE, label: 'Once' },
  { value: RecurrenceFrequency.DAILY, label: 'Daily' },
  { value: RecurrenceFrequency.WEEKLY, label: 'Weekly' },
  { value: RecurrenceFrequency.BI_WEEKLY, label: 'Bi-weekly' },
  { value: RecurrenceFrequency.MONTHLY, label: 'Monthly' },
  { value: RecurrenceFrequency.YEARLY, label: 'Yearly' }
];

// Category options for transactions
export const CATEGORY_OPTIONS: DropdownOption[] = [
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

// Calendar configuration
export const CALENDAR_CONFIG = {
  MAX_VISIBLE_MONTHS: 6,
  DEFAULT_PROJECTION_INTERVAL: 'monthly' as const
};
