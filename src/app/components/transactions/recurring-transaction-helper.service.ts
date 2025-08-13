import { Injectable } from '@angular/core';
import { TimelineItem } from '../../interfaces';

@Injectable({
  providedIn: 'root'
})
export class RecurringTransactionHelperService {

  constructor() {}

  /**
   * Creates a new recurring transaction object
   */
  createRecurringTransaction(
    recurring: any, 
    transactionDate: Date, 
    transactionId: string
  ): TimelineItem {
    return {
      id: transactionId,
      date: transactionDate,
      description: recurring.description,
      amount: Math.abs(parseFloat(recurring.amount)),
      type: 'expense' as any,
      category: recurring.category || 'Uncategorized',
      isRecurring: true,
      recurringPattern: {
        frequency: recurring.frequency,
        interval: 1
      },
      balance: 0 // Will be calculated by timeline service
    };
  }

  /**
   * Generates transaction ID for recurring transactions
   */
  generateTransactionId(recurring: any, transactionDate: Date): string {
    return `recurring-${recurring.id}-${transactionDate.getTime()}`;
  }

  /**
   * Checks if a transaction already exists in the timeline
   */
  transactionExists(
    timeline: TimelineItem[], 
    description: string, 
    transactionDate: Date
  ): boolean {
    return timeline.some(item => 
      item.description === description &&
      item.date.getTime() === transactionDate.getTime()
    );
  }

  /**
   * Gets month boundaries for a given year/month
   */
  getMonthBoundaries(year: number, month: number): { start: Date; end: Date } {
    return {
      start: new Date(year, month, 1),
      end: new Date(year, month + 1, 0)
    };
  }

  /**
   * Calculates the first weekly occurrence in or after a given month
   */
  calculateFirstWeeklyOccurrence(startDate: Date, monthStart: Date): Date {
    let currentDate = new Date(startDate);
    while (currentDate < monthStart) {
      currentDate.setDate(currentDate.getDate() + 7);
    }
    return currentDate;
  }

  /**
   * Determines if a weekly transaction should generate for a specific month
   */
  shouldGenerateWeeklyTransaction(
    recurringStartDate: Date, 
    year: number, 
    month: number
  ): boolean {
    const { start: monthStart, end: monthEnd } = this.getMonthBoundaries(year, month);
    const firstOccurrence = this.calculateFirstWeeklyOccurrence(recurringStartDate, monthStart);
    
    return firstOccurrence <= monthEnd && firstOccurrence >= monthStart;
  }

  /**
   * Calculates monthly transaction date
   */
  calculateMonthlyTransactionDate(
    recurring: any, 
    year: number, 
    month: number
  ): Date {
    let dayOfMonth: number;
    
    if (recurring.monthly_options && recurring.monthly_options.dayOfMonth) {
      dayOfMonth = recurring.monthly_options.dayOfMonth;
    } else {
      dayOfMonth = new Date(recurring.date).getDate();
    }
    
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    const actualDay = Math.min(dayOfMonth, lastDayOfMonth);
    
    return new Date(year, month, actualDay);
  }

  /**
   * Calculates weekly transaction dates for a month
   */
  calculateWeeklyTransactionDates(
    recurringStartDate: Date, 
    year: number, 
    month: number
  ): Date[] {
    const { start: monthStart, end: monthEnd } = this.getMonthBoundaries(year, month);
    const dates: Date[] = [];
    
    // Find first occurrence in this month
    let currentDate = this.calculateFirstWeeklyOccurrence(recurringStartDate, monthStart);
    
    // Only generate if first occurrence falls within month boundaries
    if (currentDate <= monthEnd && currentDate >= monthStart && currentDate >= recurringStartDate) {
      while (currentDate <= monthEnd) {
        if (currentDate.getMonth() === month && currentDate.getFullYear() === year) {
          dates.push(new Date(currentDate));
        }
        currentDate.setDate(currentDate.getDate() + 7);
      }
    }
    
    return dates;
  }

  /**
   * Calculates yearly transaction date
   */
  calculateYearlyTransactionDate(
    recurringStartDate: Date, 
    year: number, 
    month: number
  ): Date {
    return new Date(year, month, recurringStartDate.getDate());
  }

  /**
   * Logs transaction generation details
   */
  logTransactionGeneration(
    description: string, 
    frequency: string, 
    year: number, 
    month: number, 
    dates: Date[]
  ): void {
    console.log(`Month ${year}-${month + 1}: ${description} (${frequency}) - ${dates.length} occurrences`);
    dates.forEach(date => {
      console.log(`  - ${date.toLocaleDateString()}`);
    });
  }

  /**
   * Logs weekly transaction details with day names
   */
  logWeeklyTransaction(description: string, date: Date): void {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[date.getDay()];
    console.log(`Adding weekly transaction: ${description} on ${date.toLocaleDateString()} (${dayName})`);
  }

  /**
   * Logs monthly transaction details
   */
  logMonthlyTransaction(description: string, year: number, month: number, day: number): void {
    console.log(`Monthly ${description}: Generated for ${year}-${month + 1}-${day}`);
  }

  /**
   * Logs weekly transaction generation decision
   */
  logWeeklyGenerationDecision(
    description: string, 
    year: number, 
    month: number, 
    shouldGenerate: boolean, 
    firstOccurrence: Date, 
    monthStart: Date, 
    monthEnd: Date
  ): void {
    console.log(`Weekly ${description}: Month ${year}-${month + 1} - ${shouldGenerate ? 'WILL generate' : 'WILL NOT generate'} (first occurrence: ${firstOccurrence.toLocaleDateString()}, month: ${monthStart.toLocaleDateString()} to ${monthEnd.toLocaleDateString()})`);
  }
}
