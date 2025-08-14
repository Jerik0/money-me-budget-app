import { Injectable } from '@angular/core';
import { Transaction, TimelineItem, ProjectionPoint } from '../interfaces';
import { TransactionType, ProjectionType, ProjectionInterval } from '../enums';
import { RecurrenceService } from './recurrence.service';

@Injectable({
  providedIn: 'root'
})
export class TimelineService {

  constructor(private recurrenceService: RecurrenceService) {}

  /**
   * Calculates the complete timeline with transactions and projections
   */
  calculateTimeline(
    transactions: Transaction[],
    currentBalance: number,
    projectionInterval: ProjectionInterval
  ): (TimelineItem | ProjectionPoint)[] {
    const timeline: (TimelineItem | ProjectionPoint)[] = [];
    let runningBalance = currentBalance;
    const today = new Date();
    const endDate = this.recurrenceService.getProjectionEndDate(projectionInterval);

    console.log('TimelineService: Processing transactions:', transactions.length);
    console.log('TimelineService: Current balance:', currentBalance);

    // Use the transaction dates that were already created by TransactionService
    transactions.forEach(transaction => {
      console.log(`TimelineService: Adding transaction ${transaction.description} on ${transaction.date.toDateString()}`);
      
      const amount = transaction.type === TransactionType.INCOME ? transaction.amount : -transaction.amount;
      runningBalance += amount;
      
      timeline.push({
        ...transaction,
        date: new Date(transaction.date), // Use the transaction's specific date
        balance: runningBalance
      } as TimelineItem);
    });

    // Sort timeline by date
    timeline.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    console.log('TimelineService: Total timeline items:', timeline.length);
    
    return timeline;
  }

  /**
   * Groups transactions by date for display
   */
  groupTransactionsByDate(timeline: (TimelineItem | ProjectionPoint)[]): { date: Date, transactions: TimelineItem[] }[] {
    const groups = new Map<string, TimelineItem[]>();
    
    // Group transactions by date
    timeline.forEach(item => {
      if (this.isTransaction(item)) {
        const dateKey = item.date.toDateString();
        if (!groups.has(dateKey)) {
          groups.set(dateKey, []);
        }
        groups.get(dateKey)!.push(item);
      }
    });
    
    // Convert to array and sort by date (most recent first)
    return Array.from(groups.entries())
      .map(([dateKey, transactions]) => ({
        date: new Date(dateKey),
        transactions: transactions.sort((a, b) => a.date.getTime() - b.date.getTime())
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Calculates the lowest projection points for warnings
   */
  calculateLowestProjections(
    timeline: (TimelineItem | ProjectionPoint)[],
    currentBalance: number,
    projectionInterval: ProjectionInterval
  ): ProjectionPoint[] {
    try {
      if (timeline.length === 0) {
        return [];
      }

      const projectionEndDate = this.recurrenceService.getProjectionEndDate(projectionInterval);
      
      // Get all transaction balance points within the chart time range
      const balancePoints: { date: Date, balance: number }[] = [];
      
      // Add current balance as starting point
      balancePoints.push({ date: new Date(), balance: currentBalance });
      
      // Add all transaction items within the projection range
      timeline.forEach(item => {
        if (item.date <= projectionEndDate && this.isTransaction(item)) {
          balancePoints.push({ date: item.date, balance: item.balance });
        }
      });
      
      // Sort by balance (lowest first) and take the 3 lowest
      return balancePoints
        .sort((a, b) => a.balance - b.balance)
        .slice(0, 3)
        .map(point => ({
          date: point.date,
          balance: point.balance,
          type: ProjectionType.SUMMARY,
          label: point.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        }));
    } catch (error) {
      console.error('Error calculating lowest projections:', error);
      return [];
    }
  }

  /**
   * Type guard to check if an item is a transaction
   */
  isTransaction(item: any): item is TimelineItem {
    return 'type' in item && 'amount' in item && 'description' in item;
  }

  /**
   * Type guard to check if an item is a projection point
   */
  isProjectionPoint(item: any): item is ProjectionPoint {
    return 'type' in item && !('amount' in item);
  }

  /**
   * Sorts timeline by date
   */
  sortTimelineByDate(timeline: (TimelineItem | ProjectionPoint)[]): void {
    timeline.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Updates lowest projections for the given timeline
   */
  updateLowestProjections(
    timeline: (TimelineItem | ProjectionPoint)[],
    currentBalance: number,
    projectionInterval: ProjectionInterval
  ): ProjectionPoint[] {
    return this.calculateLowestProjections(timeline, currentBalance, projectionInterval);
  }

  /**
   * Updates grouped transactions for the given timeline
   */
  updateGroupedTransactions(timeline: (TimelineItem | ProjectionPoint)[]): { date: Date, transactions: TimelineItem[] }[] {
    return this.groupTransactionsByDate(timeline);
  }
}
