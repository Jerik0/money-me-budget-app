import { Injectable } from '@angular/core';
import { Transaction, TimelineItem, ProjectionPoint } from '../interfaces';
import { TransactionType, ProjectionType, ProjectionInterval } from '../enums';
import { RecurrenceService } from './recurrence.service';
import { RecurringTransactionService } from '../components/transactions/recurring-transaction.service';

@Injectable({
  providedIn: 'root'
})
export class TimelineService {

  constructor(
    // eslint-disable-next-line no-unused-vars
    private recurrenceService: RecurrenceService,
    // eslint-disable-next-line no-unused-vars
    private recurringTransactionService: RecurringTransactionService
  ) {}

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



    // Use the transaction dates that were already created by TransactionService
    transactions.forEach(transaction => {
  
      
      // Calculate balance impact (income adds to balance, expenses subtract from balance)
      const balanceImpact = transaction.type === TransactionType.INCOME ? transaction.amount : -transaction.amount;
      runningBalance += balanceImpact;
      
      timeline.push({
        ...transaction,
        date: transaction.date, // Use the transaction's date as-is (already converted)
        balance: runningBalance
      } as TimelineItem);
    });

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
    } catch {
      return [];
    }
  }

  /**
   * Type guard to check if an item is a transaction
   */
  isTransaction(item: TimelineItem | ProjectionPoint): item is TimelineItem {
    return 'type' in item && 'amount' in item && 'description' in item;
  }

  /**
   * Type guard to check if an item is a projection point
   */
  isProjectionPoint(item: TimelineItem | ProjectionPoint): item is ProjectionPoint {
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

  /**
   * Main method to calculate the complete timeline with recurring transactions
   */
  calculateTimelineWithRecurring(
    transactions: Transaction[],
    currentBalance: number,
    projectionInterval: ProjectionInterval,
    onComplete?: (timeline: (TimelineItem | ProjectionPoint)[]) => void
  ): void {
    // Step 1: Create base timeline from existing transactions
    const baseTimeline = this.createBaseTimeline(transactions, currentBalance, projectionInterval);

    // Step 2: Start with non-recurring transactions from base timeline (preserving their balance calculations)
    const nonRecurringTransactions = baseTimeline.filter(item => 
      !this.isTransaction(item) || !item.isRecurring
    );
    const finalTimeline = [...nonRecurringTransactions];

    // Step 3: Generate recurring transactions for all months
    this.generateRecurringTransactionsForTimeline(finalTimeline, () => {
      // Step 4: Post-processing - ensure proper balance calculations
      this.performTimelinePostProcessing(finalTimeline, baseTimeline, currentBalance, onComplete);
    });
  }

  /**
   * Creates the base timeline from existing transactions
   */
  private createBaseTimeline(
    transactions: Transaction[],
    currentBalance: number,
    projectionInterval: ProjectionInterval
  ): (TimelineItem | ProjectionPoint)[] {
    return this.calculateTimeline(transactions, currentBalance, projectionInterval);
  }

  /**
   * Filters out existing recurring transactions to prevent duplicates
   */
  private filterOutExistingRecurringTransactions(
     
    timeline: (TimelineItem | ProjectionPoint)[]
  ): (TimelineItem | ProjectionPoint)[] {
    return timeline.filter(item =>
      !this.isTransaction(item) || !item.isRecurring
    );
  }

  /**
   * Generates recurring transactions for the timeline
   */
  private generateRecurringTransactionsForTimeline(
     
    timeline: (TimelineItem | ProjectionPoint)[],
    onComplete: () => void
  ): void {
    // Use the RecurringTransactionService to generate recurring transactions
    this.recurringTransactionService.generateRecurringTransactionsForAllMonthsWithCallback(timeline, onComplete);
  }

  /**
   * Performs post-processing tasks after timeline generation
   */
  private performTimelinePostProcessing(
    timeline: (TimelineItem | ProjectionPoint)[],
    baseTimeline: (TimelineItem | ProjectionPoint)[],
    currentBalance: number,
    onComplete?: (timeline: (TimelineItem | ProjectionPoint)[]) => void
  ): void {
    // Ensure the timeline has content before proceeding
    if (timeline.length === 0) {
      timeline = [...baseTimeline];
    }

    // Ensure proper balance calculations for the entire timeline
    this.ensureTimelineBalances(timeline, currentBalance);

    // Call completion callback if provided
    if (onComplete) {
      onComplete(timeline);
    }
  }

  /**
   * Ensures all timeline items have proper balance calculations
   */
  private ensureTimelineBalances(timeline: (TimelineItem | ProjectionPoint)[], currentBalance: number): void {
    // Sort timeline by date to ensure proper balance calculation order
    timeline.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    let runningBalance = currentBalance;
    
    timeline.forEach(item => {
      if (this.isTransaction(item)) {
        // Calculate the impact of this transaction on the balance
        const balanceImpact = item.type === TransactionType.INCOME ? item.amount : -item.amount;
        runningBalance += balanceImpact;
        item.balance = runningBalance;
      }
    });
    

  }
}
