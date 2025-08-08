import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RecurrenceFrequency, ProjectionInterval, TransactionType, ProjectionType } from '../../enums';
import { BalanceProjectionChartComponent } from '../balance-projection-chart/balance-projection-chart.component';
import { Transaction, ProjectionPoint, TimelineItem } from '../../interfaces';





@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule, BalanceProjectionChartComponent],
  templateUrl: './transactions.component.html',
  styleUrls: ['./transactions.component.scss']
})
export class TransactionsComponent implements OnInit {
  currentBalance: number = 0;
  lastBalanceUpdate: Date = new Date();
  transactions: Transaction[] = [];
  timeline: (TimelineItem | ProjectionPoint)[] = [];
  projectionInterval: ProjectionInterval = ProjectionInterval.MONTHLY;
  lowestProjections: ProjectionPoint[] = [];
  
  newRecurringTransaction: Partial<Transaction> = {
    description: '',
    amount: 0,
    type: TransactionType.EXPENSE,
    category: '',
    isRecurring: true,
    recurringPattern: {
      frequency: RecurrenceFrequency.MONTHLY,
      interval: 1
    }
  };

  showAddForm = false;

  ngOnInit() {
    this.loadTransactions();
    this.calculateTimeline();
  }

  updateBalance() {
    this.lastBalanceUpdate = new Date();
    this.calculateTimeline();
  }

  addRecurringTransaction() {
    if (!this.newRecurringTransaction.description || !this.newRecurringTransaction.amount) {
      return;
    }

    const transaction: Transaction = {
      id: Date.now().toString(),
      date: new Date(),
      description: this.newRecurringTransaction.description!,
      amount: this.newRecurringTransaction.amount!,
      type: this.newRecurringTransaction.type!,
      category: this.newRecurringTransaction.category!,
      isRecurring: true,
      recurringPattern: this.newRecurringTransaction.recurringPattern!
    };

    this.transactions.push(transaction);
    this.calculateTimeline();
    this.resetForm();
  }

  private resetForm() {
    this.newRecurringTransaction = {
      description: '',
      amount: 0,
      type: TransactionType.EXPENSE,
      category: '',
      isRecurring: true,
      recurringPattern: {
        frequency: RecurrenceFrequency.MONTHLY,
        interval: 1
      }
    };
    this.showAddForm = false;
  }

  private loadTransactions() {
    // Load from localStorage or service
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('transactions');
      if (saved) {
        this.transactions = JSON.parse(saved).map((t: any) => ({
          ...t,
          date: new Date(t.date)
        }));
      }

      const savedBalance = localStorage.getItem('currentBalance');
      if (savedBalance) {
        this.currentBalance = parseFloat(savedBalance);
      }
    }
  }

  private saveTransactions() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('transactions', JSON.stringify(this.transactions));
      localStorage.setItem('currentBalance', this.currentBalance.toString());
    }
  }

    calculateTimeline() {
    this.timeline = [];
    let runningBalance = this.currentBalance;
    const today = new Date();
    const endDate = this.getProjectionEndDate();

    // Add current balance as starting point
    this.timeline.push({
      date: today,
      balance: runningBalance,
      type: ProjectionType.CURRENT,
      label: 'Current Balance'
    });

    // Generate timeline with recurring transactions
    const currentDate = new Date(today);
    while (currentDate <= endDate) {
      // Add recurring transactions for this date
      this.transactions
        .filter(t => t.isRecurring && this.shouldOccurOnDate(t, currentDate))
        .forEach(transaction => {
          const amount = transaction.type === 'income' ? transaction.amount : -transaction.amount;
          runningBalance += amount;
          
                      this.timeline.push({
              ...transaction,
              date: new Date(currentDate),
              balance: runningBalance
            } as TimelineItem);
        });

      // Add projection points based on interval
      if (this.shouldAddProjectionPoint(currentDate)) {
        this.timeline.push({
          date: new Date(currentDate),
          balance: runningBalance,
          type: ProjectionType.SUMMARY,
          label: this.getProjectionLabel(currentDate)
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Sort timeline by date
    this.timeline.sort((a, b) => a.date.getTime() - b.date.getTime());
    this.saveTransactions();
    this.updateLowestProjections();
  }

  private shouldOccurOnDate(transaction: Transaction, date: Date): boolean {
    if (!transaction.recurringPattern) return false;
    
    const pattern = transaction.recurringPattern;
    const startDate = transaction.date;
    
    switch (pattern.frequency) {
      case RecurrenceFrequency.DAILY:
        return Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) % pattern.interval === 0;
      case RecurrenceFrequency.WEEKLY:
        return Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7)) % pattern.interval === 0;
      case RecurrenceFrequency.BI_WEEKLY:
        return Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 14)) % pattern.interval === 0;
      case RecurrenceFrequency.MONTHLY:
        const monthsDiff = (date.getFullYear() - startDate.getFullYear()) * 12 + date.getMonth() - startDate.getMonth();
        return monthsDiff % pattern.interval === 0 && date.getDate() === startDate.getDate();
      case RecurrenceFrequency.YEARLY:
        const yearsDiff = date.getFullYear() - startDate.getFullYear();
        return yearsDiff % pattern.interval === 0 && 
               date.getMonth() === startDate.getMonth() && 
               date.getDate() === startDate.getDate();
      default:
        return false;
    }
  }

  private shouldAddProjectionPoint(date: Date): boolean {
    const today = new Date();
    if (date <= today) return false;

    switch (this.projectionInterval) {
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

  private getProjectionLabel(date: Date): string {
    switch (this.projectionInterval) {
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

  deleteTransaction(id: string) {
    this.transactions = this.transactions.filter(t => t.id !== id);
    this.calculateTimeline();
  }

  isTransaction(item: any): item is TimelineItem {
    return 'type' in item && 'amount' in item && 'description' in item;
  }

  isProjectionPoint(item: any): item is ProjectionPoint {
    return 'type' in item && !('amount' in item);
  }

  trackByDate(index: number, item: any): string {
    return item.date.toISOString();
  }

  private updateLowestProjections(): void {
    try {
      if (this.timeline.length === 0) {
        this.lowestProjections = [];
        return;
      }

      const projectionEndDate = this.getProjectionEndDate();
      
      // Get all balance points (transactions and projections) within the chart time range
      const balancePoints: { date: Date, balance: number }[] = [];
      
      // Add current balance as starting point
      balancePoints.push({ date: new Date(), balance: this.currentBalance });
      
      // Add all timeline items within the projection range
      this.timeline.forEach(item => {
        if (item.date <= projectionEndDate) {
          if (this.isProjectionPoint(item)) {
            balancePoints.push({ date: item.date, balance: item.balance });
          } else if (this.isTransaction(item)) {
            balancePoints.push({ date: item.date, balance: item.balance });
          }
        }
      });
      
      // Sort by balance (lowest first) and take the 3 lowest
      this.lowestProjections = balancePoints
        .sort((a, b) => a.balance - b.balance)
        .slice(0, 3)
              .map(point => ({
        date: point.date,
        balance: point.balance,
        type: ProjectionType.SUMMARY,
        label: point.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }));
    } catch (error) {
      console.error('Error updating lowest projections:', error);
      this.lowestProjections = [];
    }
  }

  getLowestProjections(): ProjectionPoint[] {
    return this.lowestProjections;
  }

  // Expose enums to template
  get RecurrenceFrequency() { return RecurrenceFrequency; }
  get ProjectionInterval() { return ProjectionInterval; }
  get TransactionType() { return TransactionType; }

  private getProjectionEndDate(): Date {
    const today = new Date();
    const endDate = new Date(today);
    
    switch (this.projectionInterval) {
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


}
