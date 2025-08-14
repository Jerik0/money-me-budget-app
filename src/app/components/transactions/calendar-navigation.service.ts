import { Injectable } from '@angular/core';
import { MONTH_OPTIONS } from './transactions.constants';

@Injectable({
  providedIn: 'root'
})
export class CalendarNavigationService {

  constructor() {}

  /**
   * Month options for the month picker
   */
  getMonthOptions() {
    return MONTH_OPTIONS;
  }

  /**
   * Navigate to previous month
   */
  navigateToPreviousMonth(currentViewMonth: Date): Date {
    const newMonth = new Date(currentViewMonth.getFullYear(), currentViewMonth.getMonth() - 1, 1);
    return newMonth;
  }

  /**
   * Navigate to next month
   */
  navigateToNextMonth(currentViewMonth: Date): Date {
    const newMonth = new Date(currentViewMonth.getFullYear(), currentViewMonth.getMonth() + 1, 1);
    return newMonth;
  }

  /**
   * Go to current month
   */
  goToCurrentMonth(): Date {
    const currentMonth = new Date();
    return currentMonth;
  }

  /**
   * Select a specific month
   */
  selectMonth(currentViewMonth: Date, monthValue: number): Date {
    const newMonth = new Date(currentViewMonth.getFullYear(), monthValue, 1);
    return newMonth;
  }

  /**
   * Get month label for display
   */
  getMonthLabel(date: Date): string {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return monthNames[date.getMonth()];
  }

  /**
   * Get year for display
   */
  getYear(date: Date): number {
    return date.getFullYear();
  }

  /**
   * Calculate date range for 3-month view (current + 2 following months)
   */
  calculateDateRange(currentViewMonth: Date, startDate?: Date): { startMonth: Date, endMonth: Date } {
    // If a specific start date is provided, use it; otherwise start from the 1st of the month
    const startMonth = startDate || new Date(currentViewMonth.getFullYear(), currentViewMonth.getMonth(), 1);
    
    // Calculate end month properly, handling year boundaries
    let endYear = currentViewMonth.getFullYear();
    let endMonth = currentViewMonth.getMonth() + 2; // Current month + 2 more months
    
    if (endMonth > 11) {
      endMonth = endMonth - 12;
      endYear = endYear + 1;
    }
    
    const endMonthDate = new Date(endYear, endMonth + 1, 0); // Last day of the 3rd month
    
    return { startMonth, endMonth: endMonthDate };
  }

  /**
   * Check if a date is within the current view range
   */
  isDateInViewRange(date: Date, currentViewMonth: Date): boolean {
    const { startMonth, endMonth } = this.calculateDateRange(currentViewMonth);
    return date >= startMonth && date <= endMonth;
  }

  /**
   * Get formatted date range string for display
   */
  getFormattedDateRange(currentViewMonth: Date): string {
    const { startMonth, endMonth } = this.calculateDateRange(currentViewMonth);
    const startLabel = this.getMonthLabel(startMonth);
    const endLabel = this.getMonthLabel(endMonth);
    const startYear = startMonth.getFullYear();
    const endYear = endMonth.getFullYear();
    
    if (startYear === endYear) {
      return `${startLabel} ${startYear} + 2 months`;
    } else {
      return `${startLabel} ${startYear} - ${endLabel} ${endYear}`;
    }
  }
}
