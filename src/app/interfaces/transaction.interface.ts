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
    interval: number;
    endDate?: Date;
    lastDayOfMonth?: boolean;
    lastWeekdayOfMonth?: boolean;
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
