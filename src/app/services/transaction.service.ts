import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Transaction } from '../interfaces';
import { TransactionType } from '../enums';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private transactions: Transaction[] = [];
  private allTransactions: Transaction[] = []; // For actual database transactions

  private transactionsSubject = new BehaviorSubject<Transaction[]>([]);
  private allTransactionsSubject = new BehaviorSubject<Transaction[]>([]);
  constructor(
    // eslint-disable-next-line no-unused-vars
    private apiService: ApiService
  ) { 
    this.loadAllTransactions();
  }

  getTransactions(): Observable<Transaction[]> {
    return this.transactionsSubject.asObservable();
  }

  getAllTransactions(): Observable<Transaction[]> {
    return this.allTransactionsSubject.asObservable();
  }



  private loadAllTransactions(): void {
    console.log('🔄 Loading transactions from API...');
    this.apiService.get<any[]>('/transactions').pipe(
      tap(data => {
        console.log('📊 API Response:', data);
        this.allTransactions = this.convertApiDataToTransactions(data);
        console.log('✅ Converted transactions:', this.allTransactions);
        this.allTransactionsSubject.next(this.allTransactions);
      }),
      catchError((error) => {
        console.error('❌ Error loading transactions:', error);
        return of([]);
      })
    ).subscribe();
  }

  private convertApiDataToTransactions(apiData: any[]): Transaction[] {
    return apiData.map(item => {
      const amount = parseFloat(item.amount);
      const type = item.type === 'income' ? TransactionType.INCOME : TransactionType.EXPENSE;
      
      // Handle timezone conversion properly
      // The database stores dates as UTC, but we want to preserve the local date
      const dbDate = new Date(item.date);
      const localDate = new Date(dbDate.getFullYear(), dbDate.getMonth(), dbDate.getDate(), 12, 0, 0, 0);
      
      // Convert recurring pattern from database format to frontend format
      let recurringPattern = undefined;
      if (item.is_recurring && item.frequency) {
        const monthlyOptions = item.monthly_options || {};
        recurringPattern = {
          frequency: item.frequency as any, // The enum values match the database strings
          interval: monthlyOptions.interval || 1,
          lastDayOfMonth: monthlyOptions.lastDayOfMonth || false,
          lastWeekdayOfMonth: monthlyOptions.lastWeekdayOfMonth || false,
          dayOfMonth: monthlyOptions.dayOfMonth || null
        };
      }
      
      return {
        id: item.id.toString(),
        date: localDate,
        description: item.description,
        amount: Math.abs(amount), // Always store as positive, TimelineService will handle the sign
        type: type,
        category: item.category || 'Uncategorized',
        isRecurring: item.is_recurring || false,
        recurringPattern: recurringPattern
      };
    });
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

  updateTransactionInDatabase(id: string, updates: Partial<Transaction>): Observable<any> {
    return this.apiService.put<any>(`/transactions/${id}`, updates).pipe(
      tap(() => {
        // Update local state immediately for better UX
        const index = this.allTransactions.findIndex(t => t.id === id);
        if (index !== -1) {
          this.allTransactions[index] = { ...this.allTransactions[index], ...updates };
          this.allTransactionsSubject.next([...this.allTransactions]);
        }
        // Also refresh from database to ensure consistency
        this.loadAllTransactions();
      }),
      catchError((error) => {
        console.error('Failed to update transaction:', error);
        return of(null);
      })
    );
  }

  updateFullTransaction(transaction: Transaction): Observable<any> {
    return this.apiService.put<any>(`/transactions/${transaction.id}`, transaction).pipe(
      tap(() => {
        // Update local state immediately for better UX
        const index = this.allTransactions.findIndex(t => t.id === transaction.id);
        if (index !== -1) {
          this.allTransactions[index] = { ...transaction };
          this.allTransactionsSubject.next([...this.allTransactions]);
        }
        // Don't immediately refresh from database to avoid race conditions
        // The component will handle the refresh timing
      }),
      catchError((error) => {
        console.error('Failed to update transaction:', error);
        return of(null);
      })
    );
  }

  deleteTransaction(id: string): void {
    this.transactions = this.transactions.filter(t => t.id !== id);
    this.transactionsSubject.next([...this.transactions]);
  }

  deleteTransactionFromDatabase(id: string): Observable<any> {
    return this.apiService.delete<any>(`/transactions/${id}`).pipe(
      tap(() => {
        // Update local state immediately for better UX
        this.allTransactions = this.allTransactions.filter(t => t.id !== id);
        this.allTransactionsSubject.next([...this.allTransactions]);
        // Also refresh from database to ensure consistency
        this.loadAllTransactions();
      }),
      catchError((error) => {
        console.error('Failed to delete transaction:', error);
        return of(null);
      })
    );
  }

  refreshTransactions(): void {
    this.loadAllTransactions();
  }

  loadTransactions(): void {
    this.loadAllTransactions();
  }

  getTransactionById(id: string): Transaction | undefined {
    return this.allTransactions.find(t => t.id === id);
  }

  getRecentTransactions(limit: number = 5): Transaction[] {
    return this.allTransactions.slice(0, limit);
  }

  getTotalIncome(): number {
    return this.allTransactions
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((sum, t) => sum + t.amount, 0);
  }

  getTotalExpenses(): number {
    return this.allTransactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + t.amount, 0);
  }

  getBalance(): number {
    return this.getTotalIncome() - this.getTotalExpenses();
  }

  /**
   * Calculate balance for a specific date based on all transactions up to that date
   */
  getBalanceForDate(targetDate: Date, startingBalance: number = 0): number {
    const targetTime = targetDate.getTime();
    
    // Get all transactions up to the target date (inclusive)
    const relevantTransactions = this.allTransactions.filter(t => {
      const transactionTime = new Date(t.date).getTime();
      return transactionTime <= targetTime;
    });

    // Calculate running balance
    let balance = startingBalance;
    relevantTransactions.forEach(transaction => {
      if (transaction.type === TransactionType.INCOME) {
        balance += transaction.amount;
      } else {
        balance -= transaction.amount;
      }
    });

    return balance;
  }

  /**
   * Calculate daily balance changes for a range of dates
   */
  getDailyBalances(startDate: Date, endDate: Date, startingBalance: number = 0): Map<string, number> {
    const dailyBalances = new Map<string, number>();
    let currentBalance = startingBalance;
    
    // Sort transactions by date
    const sortedTransactions = [...this.allTransactions].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculate balance for each day in the range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateKey = currentDate.toDateString();
      
      // Find transactions for this specific date
      const dayTransactions = sortedTransactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate.toDateString() === dateKey;
      });

      // Apply day's transactions to balance
      dayTransactions.forEach(transaction => {
        if (transaction.type === TransactionType.INCOME) {
          currentBalance += transaction.amount;
        } else {
          currentBalance -= transaction.amount;
        }
      });

      dailyBalances.set(dateKey, currentBalance);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dailyBalances;
  }

  /**
   * Saves transactions to storage
   */
  saveTransactions(transactions: Transaction[]): void {
    // Save to local storage or other persistence mechanism
    localStorage.setItem('transactions', JSON.stringify(transactions));
  }

  /**
   * Adds a new transaction to the database
   */
  addTransactionToDatabase(transaction: Omit<Transaction, 'id'>): Observable<any> {
    const newTransaction: Transaction = {
      ...transaction,
      id: Date.now().toString()
    };
    
    return this.apiService.post<any>('/transactions', newTransaction).pipe(
      tap(() => {
        // Refresh the transactions list after adding
        this.loadAllTransactions();
      }),
      catchError(() => {
        return of(null);
      })
    );
  }

}
