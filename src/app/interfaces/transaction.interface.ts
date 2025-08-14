import { RecurrenceFrequency, TransactionType, ProjectionType } from '../enums';

export interface Transaction {
  id: string;
  date: Date;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  isRecurring: boolean;
  recurringPattern?: {
    frequency: RecurrenceFrequency;
    interval: number | null;
    endDate?: Date;
    lastDayOfMonth?: boolean;
    lastWeekdayOfMonth?: boolean;
  };
  // Editing properties
  isEditing?: boolean;
  isEditingCategory?: boolean;
  isEditingAmount?: boolean;
  originalValues?: {
    description: string;
    category: string;
    amount: number;
  };
  editPosition?: {
    x: number;
    y: number;
  };
}

export interface ProjectionPoint {
  date: Date;
  balance: number;
  type: ProjectionType;
  label?: string;
}

export interface TimelineItem extends Transaction {
  balance: number;
}
