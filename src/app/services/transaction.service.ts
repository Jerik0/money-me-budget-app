import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Transaction } from '../interfaces';
import { TransactionType, RecurrenceFrequency } from '../enums';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private transactions: Transaction[] = [];

  // Removed getSampleTransactions method - now using real data from database

  private transactionsSubject = new BehaviorSubject<Transaction[]>([]);
  private recurringTransactionsSubject = new BehaviorSubject<any[]>([]);

  constructor(private apiService: ApiService) { 
    this.loadRecurringTransactions();
  }

  getTransactions(): Observable<Transaction[]> {
    return this.transactionsSubject.asObservable();
  }

  private loadRecurringTransactions(): void {
    this.apiService.get<any[]>('/transactions?is_recurring=true').pipe(
      tap(data => {
        console.log('Loaded recurring transactions from API:', data);
        this.recurringTransactionsSubject.next(data);
        // Convert recurring transactions to display format
        this.convertRecurringToTransactions(data);
      }),
      catchError(error => {
        console.error('Error loading recurring transactions:', error);
        return of([]);
      })
    ).subscribe();
  }

  private convertRecurringToTransactions(recurringData: any[]): void {
    const transactions: Transaction[] = [];
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    console.log('Converting recurring data:', recurringData);
    console.log('Current month/year:', currentMonth, currentYear);
    
    recurringData.forEach(recurring => {
      const amount = parseFloat(recurring.amount);
      console.log(`Processing: ${recurring.description} (${recurring.frequency})`);
      
      if (recurring.frequency === 'monthly' && recurring.monthly_options?.dayOfMonth) {
        // Monthly transactions with specific day of month
        const dayOfMonth = recurring.monthly_options.dayOfMonth;
        const transactionDate = new Date(currentYear, currentMonth, dayOfMonth);
        
        console.log(`  Monthly transaction on day ${dayOfMonth}: ${transactionDate.toDateString()}`);
        
        // Always add monthly transactions for the current month (ignore start_date)
        const transaction: Transaction = {
          id: `recurring-${recurring.id}`,
          date: transactionDate,
          description: recurring.description,
          amount: Math.abs(amount), // Always positive for display
          type: TransactionType.EXPENSE, // These are all expenses
          category: recurring.category || 'Uncategorized',
          isRecurring: true,
          recurringPattern: {
            frequency: this.mapFrequency(recurring.frequency),
            interval: 1
          }
        };
        transactions.push(transaction);
        console.log(`  Added monthly transaction: ${recurring.description} on ${transactionDate.toDateString()}`);
        
      } else if (recurring.frequency === 'weekly') {
        // Weekly transactions - show on multiple days
        console.log(`  Weekly transaction - creating 4 instances`);
        for (let week = 0; week < 4; week++) {
          const transactionDate = new Date(currentYear, currentMonth, 1 + (week * 7));
          
          const transaction: Transaction = {
            id: `recurring-${recurring.id}-week-${week}`,
            date: transactionDate,
            description: recurring.description,
            amount: Math.abs(amount), // Always positive for display
            type: TransactionType.EXPENSE, // These are all expenses
            category: recurring.category || 'Uncategorized',
            isRecurring: true,
            recurringPattern: {
              frequency: this.mapFrequency(recurring.frequency),
              interval: 1
            }
          };
          transactions.push(transaction);
          console.log(`  Added weekly transaction: ${recurring.description} on ${transactionDate.toDateString()}`);
        }
      } else {
        console.log(`  Skipping transaction: ${recurring.description} - frequency: ${recurring.frequency}, monthly_options:`, recurring.monthly_options);
      }
    });
    
    // Sort transactions by date
    transactions.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    console.log(`Total transactions created: ${transactions.length}`);
    this.transactionsSubject.next(transactions);
  }

  private mapFrequency(frequency: string): RecurrenceFrequency {
    switch (frequency.toLowerCase()) {
      case 'daily': return RecurrenceFrequency.DAILY;
      case 'weekly': return RecurrenceFrequency.WEEKLY;
      case 'monthly': return RecurrenceFrequency.MONTHLY;
      case 'yearly': return RecurrenceFrequency.YEARLY;
      default: return RecurrenceFrequency.MONTHLY;
    }
  }

  // Removed getSampleTransactionsData method - now using real data from database

  addTransaction(transaction: Omit<Transaction, 'id'>): void {
    const newTransaction: Transaction = {
      ...transaction,
      id: Date.now().toString()
    };
    this.transactions.unshift(newTransaction);
    this.transactionsSubject.next([...this.transactions]);
  }

  updateTransaction(id: string, updates: Partial<Transaction>): void {
    const index = this.transactions.findIndex(t => t.id === id);
    if (index !== -1) {
      this.transactions[index] = { ...this.transactions[index], ...updates };
      this.transactionsSubject.next([...this.transactions]);
    }
  }

  deleteTransaction(id: string): void {
    this.transactions = this.transactions.filter(t => t.id !== id);
    this.transactionsSubject.next([...this.transactions]);
  }

  getTransactionById(id: string): Transaction | undefined {
    return this.transactions.find(t => t.id === id);
  }

  getRecentTransactions(limit: number = 5): Transaction[] {
    return this.transactions.slice(0, limit);
  }

  getTotalIncome(): number {
    return this.transactions
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((sum, t) => sum + t.amount, 0);
  }

  getTotalExpenses(): number {
    return this.transactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + t.amount, 0);
  }

  getBalance(): number {
    return this.getTotalIncome() - this.getTotalExpenses();
  }
}
