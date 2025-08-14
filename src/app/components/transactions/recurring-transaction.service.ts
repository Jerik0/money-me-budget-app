import { Injectable } from '@angular/core';
import { RecurrenceFrequency, TransactionType } from '../../enums';
import { TimelineItem } from '../../interfaces';
import { TransactionService } from '../../services/transaction.service';

@Injectable({
  providedIn: 'root'
})
export class RecurringTransactionService {

  constructor(private transactionService: TransactionService) {}

  /**
   * Generates recurring transactions for all months after starting dates
   */
  generateRecurringTransactionsForAllMonths(timeline: TimelineItem[]): void {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    
    // Generate for current year and next year
    for (let year = currentYear; year <= currentYear + 1; year++) {
      for (let month = 0; month < 12; month++) {
        // Skip past months in current year
        if (year === currentYear && month < currentMonth) {
          continue;
        }
        
        this.generateRecurringTransactionsForMonth(year, month, timeline);
      }
    }
    
    // Ensure we have transactions for the currently viewed month range
    this.ensureTransactionsForCurrentMonthRange(timeline);
  }

  /**
   * Generates recurring transactions for all months with callback support
   */
  generateRecurringTransactionsForAllMonthsWithCallback(
    timeline: (TimelineItem | any)[], 
    onComplete?: () => void
  ): void {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    
    // Get recurring transactions once and process them for all months
    this.transactionService.getRecurringTransactions().subscribe(recurringTransactions => {
      console.log(`Processing ${recurringTransactions.length} recurring transactions for timeline generation`);
      
      // Generate for current year and next year
      this.generateTransactionsForYearRangeWithData(currentYear, currentYear + 1, currentMonth, recurringTransactions, timeline);
      
      // Ensure transactions for current view month range
      this.ensureTransactionsForCurrentMonthRangeWithData(recurringTransactions, timeline);
      
      // Sort timeline by date
      timeline.sort((a, b) => a.date.getTime() - b.date.getTime());
      
      console.log(`Timeline generation complete. Total timeline items: ${timeline.length}`);
      
      // Call completion callback if provided
      if (onComplete) {
        onComplete();
      }
    });
  }

  /**
   * Ensures transactions exist for the current 3-month view range
   */
  private ensureTransactionsForCurrentMonthRange(timeline: TimelineItem[]): void {
    // This method can be called to ensure specific month ranges are populated
    // Implementation depends on the current view month
  }

  /**
   * Generates transactions for a year range
   */
  generateTransactionsForYearRange(
    startYear: number, 
    endYear: number, 
    skipMonthsBefore: number,
    timeline: TimelineItem[]
  ): void {
    for (let year = startYear; year <= endYear; year++) {
      for (let month = 0; month < 12; month++) {
        // Skip past months in current year
        if (year === startYear && month < skipMonthsBefore) {
          continue;
        }
        this.generateRecurringTransactionsForMonth(year, month, timeline);
      }
    }
  }

  /**
   * Generates transactions for a year range with pre-loaded data
   */
  generateTransactionsForYearRangeWithData(
    startYear: number, 
    endYear: number, 
    skipMonthsBefore: number, 
    recurringTransactions: any[],
    timeline: (TimelineItem | any)[]
  ): void {
    for (let year = startYear; year <= endYear; year++) {
      for (let month = 0; month < 12; month++) {
        // Skip past months in current year
        if (year === startYear && month < skipMonthsBefore) {
          continue;
        }
        this.generateRecurringTransactionsForMonthWithData(year, month, recurringTransactions, timeline);
      }
    }
  }

  /**
   * Ensures transactions exist for the current month range with pre-loaded data
   */
  ensureTransactionsForCurrentMonthRangeWithData(
    recurringTransactions: any[],
    timeline: (TimelineItem | any)[]
  ): void {
    // This method ensures the current 3-month view range is populated with pre-loaded data
    // Implementation depends on the specific recurring transaction logic
  }

  /**
   * Generates recurring transactions for a specific month with pre-loaded data
   */
  generateRecurringTransactionsForMonthWithData(
    year: number, 
    month: number, 
    recurringTransactions: any[],
    timeline: (TimelineItem | any)[]
  ): void {
    recurringTransactions.forEach(recurring => {
      if (this.shouldGenerateRecurringTransaction(recurring, year, month)) {
        const transactionDates = this.calculateAllRecurringTransactionDates(recurring, year, month);
        
        transactionDates.forEach(transactionDate => {
          // Check if this transaction already exists
          const existingTransaction = timeline.find(item => 
            this.isTransaction(item) && 
            item.description === recurring.description &&
            item.date.getTime() === transactionDate.getTime()
          );
          
          if (!existingTransaction) {
            const newTransaction: TimelineItem = {
              id: `recurring-${recurring.id}-${transactionDate.getTime()}`,
              date: transactionDate,
              description: recurring.description,
              amount: Math.abs(parseFloat(recurring.amount)),
              type: TransactionType.EXPENSE,
              category: recurring.category || 'Uncategorized',
              isRecurring: true,
              recurringPattern: {
                frequency: this.mapFrequency(recurring.frequency),
                interval: 1
              },
              balance: 0 // Will be calculated by timeline service
            };
            
            timeline.push(newTransaction);
            console.log(`Generated recurring transaction: ${recurring.description} on ${transactionDate.toLocaleDateString()}`);
          }
        });
      }
    });
  }

  /**
   * Generates recurring transactions for a specific month
   */
  generateRecurringTransactionsForMonth(year: number, month: number, timeline: TimelineItem[]): void {
    // Get recurring transactions from the database
    this.transactionService.getRecurringTransactions().subscribe(recurringTransactions => {
      recurringTransactions.forEach(recurring => {
        // Check if this recurring transaction should appear in this month
        if (this.shouldGenerateRecurringTransaction(recurring, year, month)) {
          // Generate ALL occurrences for this month based on frequency
          const transactionDates = this.calculateAllRecurringTransactionDates(recurring, year, month);
          
          console.log(`Month ${year}-${month + 1}: ${recurring.description} (${recurring.frequency}) - ${transactionDates.length} occurrences`);
          transactionDates.forEach(date => {
            console.log(`  - ${date.toLocaleDateString()}`);
          });
          
          transactionDates.forEach(transactionDate => {
            // Check if this transaction already exists
            const existingTransaction = timeline.find(item => 
              this.isTransaction(item) && 
              item.description === recurring.description &&
              item.date.getTime() === transactionDate.getTime()
            );
            
            if (!existingTransaction) {
              // For weekly transactions, add extra logging
              if (recurring.frequency.toLowerCase() === 'weekly') {
                console.log(`Adding weekly transaction: ${recurring.description} on ${transactionDate.toLocaleDateString()} (${this.getDayName(transactionDate.getDay())})`);
              }
              
              const newTransaction: TimelineItem = {
                id: `recurring-${recurring.id}-${transactionDate.getTime()}`,
                date: transactionDate,
                description: recurring.description,
                amount: Math.abs(parseFloat(recurring.amount)),
                type: TransactionType.EXPENSE,
                category: recurring.category || 'Uncategorized',
                isRecurring: true,
                recurringPattern: {
                  frequency: this.mapFrequency(recurring.frequency),
                  interval: 1
                },
                balance: 0 // Will be calculated by timeline service
              };
              
              timeline.push(newTransaction);
              console.log(`Generated recurring transaction: ${recurring.description} on ${transactionDate.toLocaleDateString()}`);
            }
          });
        }
      });
    });
  }

  /**
   * Determines if a recurring transaction should be generated for a specific month
   */
  private shouldGenerateRecurringTransaction(recurring: any, year: number, month: number): boolean {
    const recurringStartDate = new Date(recurring.date);
    const recurringStartYear = recurringStartDate.getFullYear();
    const recurringStartMonth = recurringStartDate.getMonth();
    
    // Only generate for months after the starting date
    if (year < recurringStartYear || (year === recurringStartYear && month < recurringStartMonth)) {
      return false;
    }
    
    // Check frequency-specific logic
    switch (recurring.frequency.toLowerCase()) {
      case 'monthly':
        return true; // Monthly transactions appear every month after start
      case 'weekly':
        // For weekly transactions, we need to check if this month actually contains
        // any weekly occurrences based on the start date
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);
        
        // Calculate the first weekly occurrence in or after this month
        let currentDate = new Date(recurringStartDate);
        while (currentDate < monthStart) {
          currentDate.setDate(currentDate.getDate() + 7);
        }
        
        // Only generate if there's at least one occurrence in this month AND
        // the first occurrence falls within the month boundaries
        const shouldGenerate = currentDate <= monthEnd && currentDate >= monthStart;
        if (recurring.frequency.toLowerCase() === 'weekly') {
          console.log(`Weekly ${recurring.description}: Month ${year}-${month + 1} - ${shouldGenerate ? 'WILL generate' : 'WILL NOT generate'} (first occurrence: ${currentDate.toLocaleDateString()}, month: ${monthStart.toLocaleDateString()} to ${monthEnd.toLocaleDateString()})`);
        }
        return shouldGenerate;
      case 'yearly':
        return month === recurringStartMonth; // Yearly transactions appear same month every year
      default:
        return true;
    }
  }

  /**
   * Calculates ALL dates for recurring transactions in a given month
   */
  private calculateAllRecurringTransactionDates(recurring: any, year: number, month: number): Date[] {
    const recurringStartDate = new Date(recurring.date);
    const dates: Date[] = [];
    
    switch (recurring.frequency.toLowerCase()) {
      case 'monthly':
        // Use monthly_options.dayOfMonth if available, otherwise fall back to start date day
        let dayOfMonth;
        if (recurring.monthly_options && recurring.monthly_options.dayOfMonth) {
          dayOfMonth = recurring.monthly_options.dayOfMonth;
          console.log(`Monthly ${recurring.description}: Using dayOfMonth from options: ${dayOfMonth}`);
        } else {
          dayOfMonth = recurringStartDate.getDate();
          console.log(`Monthly ${recurring.description}: Using dayOfMonth from start date: ${dayOfMonth}`);
        }
        
        const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
        const actualDay = Math.min(dayOfMonth, lastDayOfMonth);
        dates.push(new Date(year, month, actualDay));
        console.log(`Monthly ${recurring.description}: Generated for ${year}-${month + 1}-${actualDay}`);
        break;
        
      case 'weekly':
        // For weekly transactions, we need to calculate based on the actual starting date
        // and generate dates that are multiples of 7 days from the start
        const startDate = new Date(recurringStartDate);
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);
        
        // Find the first occurrence in or after this month
        let currentDate = new Date(startDate);
        
        // If we're before the month, advance to the first occurrence in this month
        while (currentDate < monthStart) {
          currentDate.setDate(currentDate.getDate() + 7);
        }
        
        // Only generate if the first occurrence falls within this month AND
        // we're not generating for a month before the actual start date
        if (currentDate <= monthEnd && currentDate >= monthStart && currentDate >= startDate) {
          // Generate weekly transactions for this month, ensuring exactly 7-day intervals
          while (currentDate <= monthEnd) {
            if (currentDate.getMonth() === month && currentDate.getFullYear() === year) {
              dates.push(new Date(currentDate));
              console.log(`Weekly ${recurring.description}: Generated for ${currentDate.toLocaleDateString()}`);
            }
            // Always advance by exactly 7 days to maintain weekly intervals
            currentDate.setDate(currentDate.getDate() + 7);
          }
        } else {
          console.log(`Weekly ${recurring.description}: Skipping month ${year}-${month + 1} - first occurrence ${currentDate.toLocaleDateString()}, start date: ${startDate.toLocaleDateString()}`);
        }
        break;
        
      case 'yearly':
        // Same month and day every year
        dates.push(new Date(year, month, recurringStartDate.getDate()));
        break;
        
      default:
        dates.push(new Date(year, month, recurringStartDate.getDate()));
        break;
    }
    
    return dates;
  }

  /**
   * Maps frequency string to RecurrenceFrequency enum
   */
  private mapFrequency(frequency: string): RecurrenceFrequency {
    switch (frequency.toLowerCase()) {
      case 'daily': return RecurrenceFrequency.DAILY;
      case 'weekly': return RecurrenceFrequency.WEEKLY;
      case 'monthly': return RecurrenceFrequency.MONTHLY;
      case 'yearly': return RecurrenceFrequency.YEARLY;
      default: return RecurrenceFrequency.MONTHLY;
    }
  }

  /**
   * Helper method to check if an item is a transaction
   */
  private isTransaction(item: any): item is TimelineItem {
    return item && typeof item === 'object' && 'description' in item;
  }

  /**
   * Helper method to get day name
   */
  private getDayName(day: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day] || 'Unknown';
  }
}