import { Injectable } from '@angular/core';
import { TimelineItem, ProjectionPoint } from '../../interfaces';
import { TimelineService } from '../../services/timeline.service';
import { CalendarNavigationService } from './calendar-navigation.service';

@Injectable({
  providedIn: 'root'
})
export class CalendarDataService {

  constructor(
    private timelineService: TimelineService,
    private calendarNavigationService: CalendarNavigationService
  ) {}

  /**
   * Caching for grouped transactions to prevent infinite loops
   */
  private cachedGroupedTransactions: { date: Date, transactions: TimelineItem[] }[] = [];
  private lastCachedMonth: string = '';

  /**
   * Calculate timeline with recurring transactions
   */
  calculateTimeline(
    transactions: any[],
    currentBalance: number,
    projectionInterval: any,
    timeline: (TimelineItem | ProjectionPoint)[]
  ): (TimelineItem | ProjectionPoint)[] {
    
    // Calculate base timeline
    const baseTimeline = this.timelineService.calculateTimeline(
      transactions,
      currentBalance,
      projectionInterval
    );
    
    // Store the base timeline temporarily
    const tempTimeline = [...baseTimeline];
    
    // Clear any existing recurring transactions from the timeline to prevent duplicates
    const filteredTimeline = timeline.filter(item => 
      !this.isTransaction(item) || !item.isRecurring
    );
    
    // Ensure the timeline has content before proceeding
    if (filteredTimeline.length === 0) {
      console.log('⚠️ Timeline is empty after generation, restoring base timeline');
      return tempTimeline;
    }
    
    return filteredTimeline;
  }

  /**
   * Get grouped transactions for the current view range
   */
  getGroupedTransactions(
    timeline: (TimelineItem | ProjectionPoint)[],
    currentViewMonth: Date
  ): { date: Date, transactions: TimelineItem[] }[] {
    
    if (!timeline || timeline.length === 0) {
      console.log('⚠️ Timeline is empty, returning empty array');
      return [];
    }

    // Check cache first
    const cacheKey = `${currentViewMonth.getFullYear()}-${currentViewMonth.getMonth()}`;
    if (this.lastCachedMonth === cacheKey && this.cachedGroupedTransactions.length > 0) {
      console.log('📋 Using cached grouped transactions');
      return this.cachedGroupedTransactions;
    }

    console.log('🔍 Filtering transactions:');
    console.log(`Current view month: ${currentViewMonth.toLocaleDateString()}`);
    
    const { startMonth, endMonth } = this.calendarNavigationService.calculateDateRange(currentViewMonth);
    console.log(`Start month: ${startMonth.toLocaleDateString()}`);
    console.log(`End month: ${endMonth.toLocaleDateString()}`);

    // Filter timeline items to only include transactions within the current view range
    const filteredTimeline = timeline.filter(item => {
      if (this.isTransaction(item)) {
        const itemDate = new Date(item.date);
        return itemDate >= startMonth && itemDate <= endMonth;
      }
      return false;
    }) as TimelineItem[];

    console.log(`Timeline items before filtering: ${timeline.length}`);
    console.log(`Filtered timeline items: ${filteredTimeline.length}`);

    // Group transactions by date
    const groupedByDate = new Map<string, TimelineItem[]>();
    
    filteredTimeline.forEach(transaction => {
      const dateKey = transaction.date.toDateString();
      if (!groupedByDate.has(dateKey)) {
        groupedByDate.set(dateKey, []);
      }
      groupedByDate.get(dateKey)!.push(transaction);
    });

    // Convert to array and sort by date
    const groupedTransactions = Array.from(groupedByDate.entries())
      .map(([dateString, transactions]) => ({
        date: new Date(dateString),
        transactions: transactions.sort((a, b) => a.date.getTime() - b.date.getTime())
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    console.log(`Final grouped transactions: ${groupedTransactions.length} groups`);

    // Update cache
    this.cachedGroupedTransactions = groupedTransactions;
    this.lastCachedMonth = cacheKey;

    return groupedTransactions;
  }

  /**
   * Clear cache when timeline is recalculated
   */
  clearCache(): void {
    this.cachedGroupedTransactions = [];
    this.lastCachedMonth = '';
    console.log('🗑️ Cleared grouped transactions cache');
  }

  /**
   * Get total transactions for current month range
   */
  getTotalTransactionsForCurrentMonthRange(groupedTransactions: { date: Date, transactions: TimelineItem[] }[]): number {
    return groupedTransactions.reduce((total, group) => total + group.transactions.length, 0);
  }

  /**
   * Update visible months for the calendar view
   */
  updateVisibleMonths(
    currentViewMonth: Date,
    groupedTransactions: { date: Date, transactions: TimelineItem[] }[]
  ): { month: Date, transactions: { date: Date, transactions: TimelineItem[] }[] }[] {
    
    const { startMonth, endMonth } = this.calendarNavigationService.calculateDateRange(currentViewMonth);
    const visibleMonths: { month: Date, transactions: { date: Date, transactions: TimelineItem[] }[] }[] = [];
    
    // Group transactions by month
    const monthGroups = new Map<string, { date: Date, transactions: TimelineItem[] }[]>();
    
    groupedTransactions.forEach(group => {
      const monthKey = `${group.date.getFullYear()}-${group.date.getMonth()}`;
      if (!monthGroups.has(monthKey)) {
        monthGroups.set(monthKey, []);
      }
      monthGroups.get(monthKey)!.push(group);
    });
    
    // Create month objects for the visible range
    let currentMonth = new Date(startMonth);
    while (currentMonth <= endMonth) {
      const monthKey = `${currentMonth.getFullYear()}-${currentMonth.getMonth()}`;
      const monthTransactions = monthGroups.get(monthKey) || [];
      
      visibleMonths.push({
        month: new Date(currentMonth),
        transactions: monthTransactions
      });
      
      // Move to next month
      currentMonth.setMonth(currentMonth.getMonth() + 1);
    }
    
    return visibleMonths;
  }

  /**
   * Helper method to determine if a row should have alternate background color
   */
  shouldHaveAlternateBackground(groupIndex: number, transactionIndex: number, groups: { date: Date, transactions: TimelineItem[] }[]): boolean {
    let totalRowIndex = 0;
    
    // Add up all transactions from previous groups
    for (let i = 0; i < groupIndex; i++) {
      totalRowIndex += groups[i].transactions.length;
    }
    
    // Add current transaction index
    totalRowIndex += transactionIndex;
    
    return totalRowIndex % 2 === 0;
  }

  /**
   * Helper method to check if an item is a transaction
   */
  private isTransaction(item: any): item is TimelineItem {
    return item && typeof item === 'object' && 'description' in item;
  }
}
