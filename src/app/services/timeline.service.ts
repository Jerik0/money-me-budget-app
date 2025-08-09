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

    console.log('Calculating timeline with', transactions.length, 'transactions');
    console.log('Current balance:', currentBalance);
    console.log('Date range:', today, 'to', endDate);

    // Generate timeline with recurring transactions
    const currentDate = new Date(today);
    while (currentDate <= endDate) {
      // Add recurring transactions for this date
      const dailyTransactions = transactions
        .filter(t => t.isRecurring && this.recurrenceService.shouldOccurOnDate(t, currentDate));
      
      if (dailyTransactions.length > 0) {
        console.log('Date:', currentDate.toDateString(), 'has', dailyTransactions.length, 'transactions');
      }
      
      dailyTransactions.forEach(transaction => {
        const amount = transaction.type === TransactionType.INCOME ? transaction.amount : -transaction.amount;
        runningBalance += amount;
        
        timeline.push({
          ...transaction,
          date: new Date(currentDate),
          balance: runningBalance
        } as TimelineItem);
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Sort timeline by date
    timeline.sort((a, b) => a.date.getTime() - b.date.getTime());
    
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
}
