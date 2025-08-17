import { Injectable } from '@angular/core';
import { Transaction, TimelineItem, ProjectionPoint } from '../interfaces';
import { TransactionType, ProjectionType, ProjectionInterval, RecurrenceFrequency } from '../enums';
import { RecurrenceService } from './recurrence.service';

@Injectable({
  providedIn: 'root'
})
export class TimelineService {

  constructor(
    // eslint-disable-next-line no-unused-vars
    private recurrenceService: RecurrenceService
  ) {}

  /**
   * Calculates the complete timeline with transactions and projections
   */
  calculateTimeline(
    transactions: Transaction[],
    currentBalance: number,
    projectionInterval: ProjectionInterval
  ): (TimelineItem | ProjectionPoint)[] {
    console.log('🔄 TimelineService: calculateTimeline called with:', { transactions: transactions.length, currentBalance, projectionInterval });
    
    const timeline: (TimelineItem | ProjectionPoint)[] = [];
    let runningBalance = currentBalance;

    // Sort transactions by date first to ensure proper balance calculation order
    const sortedTransactions = [...transactions].sort((a, b) => a.date.getTime() - b.date.getTime());
    
    console.log('🔄 TimelineService: Starting balance:', currentBalance);

    // Use the transaction dates that were already created by TransactionService
    sortedTransactions.forEach((transaction, index) => {
      // Calculate balance impact (income adds to balance, expenses subtract from balance)
      const balanceImpact = transaction.type === TransactionType.INCOME ? transaction.amount : -transaction.amount;
      runningBalance += balanceImpact;
      
      console.log(`🔄 TimelineService: Transaction ${index + 1}: ${transaction.description} - ${transaction.type} $${transaction.amount} on ${transaction.date.toDateString()} -> Balance: $${runningBalance}`);
      
      timeline.push({
        ...transaction,
        date: transaction.date, // Use the transaction's date as-is (already converted)
        balance: runningBalance
      } as TimelineItem);
    });

    console.log('✅ TimelineService: Final balance:', runningBalance);
    console.log('✅ TimelineService: Returning timeline with', timeline.length, 'items');
    
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
   * Main method to calculate the complete timeline with transactions
   */
  calculateTimelineWithRecurring(
    transactions: Transaction[],
    currentBalance: number,
    projectionInterval: ProjectionInterval,
    startDate?: Date,
    onComplete?: (timeline: (TimelineItem | ProjectionPoint)[]) => void
  ): void {
    console.log('🔄 TimelineService: calculateTimelineWithRecurring called with:', { transactions: transactions.length, currentBalance, projectionInterval, startDate: startDate?.toDateString() });
    
    // Generate recurring transactions
    const allTransactions = this.generateRecurringTransactions(transactions, projectionInterval, startDate);
    console.log('🔄 TimelineService: Generated', allTransactions.length, 'total transactions (including recurring)');
    
    // Create timeline from all transactions (original + generated recurring)
    const timeline = this.calculateTimeline(allTransactions, currentBalance, projectionInterval);
    console.log('✅ TimelineService: Generated timeline with', timeline.length, 'items');
    
    // Call completion callback if provided
    if (onComplete) {
      onComplete(timeline);
    }
  }

  /**
   * Generates recurring transactions based on recurring patterns
   */
  private generateRecurringTransactions(transactions: Transaction[], projectionInterval: ProjectionInterval, startDate?: Date): Transaction[] {
    const allTransactions: Transaction[] = [];
    const projectionEndDate = this.recurrenceService.getProjectionEndDate(projectionInterval);
    
    console.log('🔄 TimelineService: Projection end date:', projectionEndDate.toDateString());
    console.log('🔄 TimelineService: Start date for recurring generation:', startDate?.toDateString() || 'today');
    
    // Use the effective start date for filtering
    const effectiveStartDate = startDate || new Date();
    effectiveStartDate.setHours(0, 0, 0, 0);
    
    // Only include original transactions that are relevant to the projection period
    const relevantOriginalTransactions = transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      return transactionDate >= effectiveStartDate;
    });
    
    console.log(`🔄 TimelineService: Original transactions: ${transactions.length}, Relevant to projection: ${relevantOriginalTransactions.length}`);
    
    // Add only relevant original transactions
    allTransactions.push(...relevantOriginalTransactions);
    
    // Generate recurring transactions
    let totalRecurringGenerated = 0;
    transactions.forEach(transaction => {
      if (transaction.isRecurring && transaction.recurringPattern) {
        console.log(`🔄 TimelineService: Generating recurring for: ${transaction.description} (${transaction.recurringPattern.frequency})`);
        const recurringTransactions = this.generateRecurringInstances(transaction, projectionEndDate, startDate);
        console.log(`🔄 TimelineService: Generated ${recurringTransactions.length} recurring instances for ${transaction.description}`);
        allTransactions.push(...recurringTransactions);
        totalRecurringGenerated += recurringTransactions.length;
      }
    });
    
    console.log(`🔄 TimelineService: Total recurring transactions generated: ${totalRecurringGenerated}`);
    console.log(`🔄 TimelineService: Total transactions (original + recurring): ${allTransactions.length}`);
    
    return allTransactions;
  }

  /**
   * Generates recurring instances of a transaction up to the projection end date
   */
  private generateRecurringInstances(transaction: Transaction, endDate: Date, startDate?: Date): Transaction[] {
    const instances: Transaction[] = [];
    const originalTransactionDate = new Date(transaction.date);
    
    console.log(`🔄 TimelineService: Generating instances for ${transaction.description}`);
    console.log(`🔄 TimelineService: Original date: ${originalTransactionDate.toDateString()}`);
    console.log(`🔄 TimelineService: End date: ${endDate.toDateString()}`);
    
    // Start generating from the original transaction date to ensure all recurring instances are captured
    let currentDate = new Date(originalTransactionDate);
    
    // Generate instances for the entire projection period from the original date
    while (currentDate <= endDate) {
      if (this.recurrenceService.shouldOccurOnDate(transaction, currentDate)) {
        // Skip the original transaction date to avoid duplicates
        // The original transaction is already added separately in generateRecurringTransactions
        if (currentDate.getTime() === originalTransactionDate.getTime()) {
          console.log(`🔄 TimelineService: Skipping original date ${currentDate.toDateString()} to avoid duplicate`);
          // Move to next date and continue
          currentDate = this.getNextDateForFrequency(currentDate, transaction.recurringPattern);
          continue;
        }
        
        const instance: Transaction = {
          ...transaction,
          id: `${transaction.id}_${currentDate.getTime()}`, // Unique ID for this instance
          date: new Date(currentDate),
          originalDatabaseId: transaction.id // Preserve the original database ID for editing
        };
        instances.push(instance);
        console.log(`🔄 TimelineService: Generated instance for ${currentDate.toDateString()}`);
      }
      
      // Use frequency-based date increments instead of incrementing by 1 day
      currentDate = this.getNextDateForFrequency(currentDate, transaction.recurringPattern);
    }
    
    console.log(`🔄 TimelineService: Total instances generated: ${instances.length}`);
    return instances;
  }

  /**
   * Gets the next date to check based on the recurring frequency
   */
  private getNextDateForFrequency(currentDate: Date, recurringPattern: any): Date {
    const nextDate = new Date(currentDate);
    const interval = recurringPattern.interval || 1;
    
    switch (recurringPattern.frequency) {
      case RecurrenceFrequency.DAILY:
        nextDate.setDate(nextDate.getDate() + interval);
        break;
      case RecurrenceFrequency.WEEKLY:
        nextDate.setDate(nextDate.getDate() + (7 * interval));
        break;
      case RecurrenceFrequency.BI_WEEKLY:
        nextDate.setDate(nextDate.getDate() + (14 * interval));
        break;
      case RecurrenceFrequency.MONTHLY:
        // Preserve the day of the month when incrementing months
        // Use dayOfMonth from monthly_options if available, otherwise use the current date's day
        let targetDay = currentDate.getDate();
        if (recurringPattern.dayOfMonth && recurringPattern.dayOfMonth > 0) {
          targetDay = recurringPattern.dayOfMonth;
        }
        
        nextDate.setMonth(nextDate.getMonth() + interval);
        
        // Handle edge case: if the target day doesn't exist in the new month,
        // use the last day of that month instead
        const lastDayOfNewMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
        if (targetDay > lastDayOfNewMonth) {
          nextDate.setDate(lastDayOfNewMonth);
        } else {
          nextDate.setDate(targetDay);
        }
        break;
      case RecurrenceFrequency.YEARLY:
        nextDate.setFullYear(nextDate.getFullYear() + interval);
        break;
      default:
        // Fallback to daily increment if frequency is unknown
        nextDate.setDate(nextDate.getDate() + 1);
    }
    
    return nextDate;
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
