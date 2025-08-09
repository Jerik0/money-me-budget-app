import { Injectable } from '@angular/core';
import { Transaction } from '../interfaces';
import { RecurrenceFrequency, ProjectionInterval } from '../enums';

@Injectable({
  providedIn: 'root'
})
export class RecurrenceService {

  constructor() {}

  /**
   * Determines if a recurring transaction should occur on a specific date
   */
  shouldOccurOnDate(transaction: Transaction, date: Date): boolean {
    if (!transaction.recurringPattern) return false;
    
    const pattern = transaction.recurringPattern;
    const startDate = transaction.date;
    
    // Don't generate transactions before the start date
    if (date < startDate) return false;
    
    switch (pattern.frequency) {
      case RecurrenceFrequency.DAILY:
        const daysDiff = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysDiff >= 0 && daysDiff % (pattern.interval || 1) === 0;
        
      case RecurrenceFrequency.WEEKLY:
        const weeksDiff = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
        return weeksDiff >= 0 && weeksDiff % (pattern.interval || 1) === 0;
        
      case RecurrenceFrequency.BI_WEEKLY:
        const daysDiffBiWeekly = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysDiffBiWeekly >= 0 && daysDiffBiWeekly % (14 * (pattern.interval || 1)) === 0;
        
      case RecurrenceFrequency.MONTHLY:
        const monthsDiff = (date.getFullYear() - startDate.getFullYear()) * 12 + date.getMonth() - startDate.getMonth();
        if (monthsDiff < 0 || monthsDiff % (pattern.interval || 1) !== 0) return false;
        
        // Check if this should occur on the last day of the month
        if (pattern.lastDayOfMonth) {
          const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
          return date.getDate() === lastDayOfMonth;
        }
        
        // Check if this should occur on the last weekday of the month
        if (pattern.lastWeekdayOfMonth) {
          const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
          let lastWeekday = new Date(lastDayOfMonth);
          
          // Find the last weekday (Monday-Friday) of the month
          while (lastWeekday.getDay() === 0 || lastWeekday.getDay() === 6) {
            lastWeekday.setDate(lastWeekday.getDate() - 1);
          }
          
          return date.getDate() === lastWeekday.getDate();
        }
        
        // Regular monthly occurrence on specific date
        return date.getDate() === startDate.getDate();
        
      case RecurrenceFrequency.YEARLY:
        const yearsDiff = date.getFullYear() - startDate.getFullYear();
        return yearsDiff >= 0 && yearsDiff % (pattern.interval || 1) === 0 && 
               date.getMonth() === startDate.getMonth() && 
               date.getDate() === startDate.getDate();
               
      default:
        return false;
    }
  }

  /**
   * Gets the projection end date based on the interval
   */
  getProjectionEndDate(projectionInterval: ProjectionInterval): Date {
    const today = new Date();
    const endDate = new Date(today);
    
    switch (projectionInterval) {
      case ProjectionInterval.DAILY:
        endDate.setDate(today.getDate() + 30); // 1 month
        break;
      case ProjectionInterval.WEEKLY:
        endDate.setDate(today.getDate() + 90); // 3 months
        break;
      case ProjectionInterval.BI_WEEKLY:
        endDate.setDate(today.getDate() + 90); // 3 months (same as weekly)
        break;
      case ProjectionInterval.MONTHLY:
        endDate.setFullYear(today.getFullYear() + 1); // 1 year
        break;
      case ProjectionInterval.QUARTERLY:
        endDate.setFullYear(today.getFullYear() + 1); // 1 year
        break;
      case ProjectionInterval.YEARLY:
        endDate.setFullYear(today.getFullYear() + 2); // 2 years
        break;
      default:
        endDate.setFullYear(today.getFullYear() + 1);
    }
    
    return endDate;
  }

  /**
   * Determines if a projection point should be added on a specific date
   */
  shouldAddProjectionPoint(date: Date, projectionInterval: ProjectionInterval): boolean {
    const today = new Date();
    if (date <= today) return false;

    switch (projectionInterval) {
      case ProjectionInterval.DAILY:
        return true; // Every day
      case ProjectionInterval.WEEKLY:
        return date.getDay() === 0; // Every Sunday
      case ProjectionInterval.BI_WEEKLY:
        const daysSinceEpoch = Math.floor(date.getTime() / (1000 * 60 * 60 * 24));
        return daysSinceEpoch % 14 === 0; // Every 14 days
      case ProjectionInterval.MONTHLY:
        return date.getDate() === 1;
      case ProjectionInterval.QUARTERLY:
        return date.getDate() === 1 && [0, 3, 6, 9].includes(date.getMonth());
      case ProjectionInterval.YEARLY:
        return date.getDate() === 1 && date.getMonth() === 0;
      default:
        return false;
    }
  }

  /**
   * Gets a label for projection points based on the interval
   */
  getProjectionLabel(date: Date, projectionInterval: ProjectionInterval): string {
    switch (projectionInterval) {
      case ProjectionInterval.DAILY:
        return `${date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })} Projection`;
      case ProjectionInterval.WEEKLY:
        return `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} Projection`;
      case ProjectionInterval.BI_WEEKLY:
        return `Bi-weekly ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} Projection`;
      case ProjectionInterval.MONTHLY:
        return `${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Projection`;
      case ProjectionInterval.QUARTERLY:
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        return `Q${quarter} ${date.getFullYear()} Projection`;
      case ProjectionInterval.YEARLY:
        return `${date.getFullYear()} Projection`;
      default:
        return 'Projection';
    }
  }
}
