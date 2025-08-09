import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Transaction } from '../interfaces';
import { TransactionType, RecurrenceFrequency } from '../enums';

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private transactions: Transaction[] = [];

  private getSampleTransactions(): Transaction[] {
    const today = new Date();
    return [
      {
        id: 'sample-1',
        date: new Date(today),
        description: 'Salary',
        amount: 3500,
        type: TransactionType.INCOME,
        category: 'Income',
        isRecurring: true,
        recurringPattern: {
          frequency: RecurrenceFrequency.BI_WEEKLY,
          interval: 1
        }
      },
      {
        id: 'sample-2',
        date: new Date(today),
        description: 'Rent',
        amount: 1200,
        type: TransactionType.EXPENSE,
        category: 'Housing',
        isRecurring: true,
        recurringPattern: {
          frequency: RecurrenceFrequency.MONTHLY,
          interval: 1
        }
      },
      {
        id: 'sample-3',
        date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5),
        description: 'Netflix',
        amount: 15.99,
        type: TransactionType.EXPENSE,
        category: 'Entertainment',
        isRecurring: true,
        recurringPattern: {
          frequency: RecurrenceFrequency.MONTHLY,
          interval: 1
        }
      },
      {
        id: 'sample-4',
        date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 8),
        description: 'Groceries',
        amount: 85,
        type: TransactionType.EXPENSE,
        category: 'Food',
        isRecurring: true,
        recurringPattern: {
          frequency: RecurrenceFrequency.WEEKLY,
          interval: 1
        }
      },
      {
        id: 'sample-5',
        date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10),
        description: 'Car Insurance',
        amount: 125,
        type: TransactionType.EXPENSE,
        category: 'Transportation',
        isRecurring: true,
        recurringPattern: {
          frequency: RecurrenceFrequency.MONTHLY,
          interval: 1
        }
      },
      {
        id: 'sample-6',
        date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 12),
        description: 'Spotify Premium',
        amount: 9.99,
        type: TransactionType.EXPENSE,
        category: 'Entertainment',
        isRecurring: true,
        recurringPattern: {
          frequency: RecurrenceFrequency.MONTHLY,
          interval: 1
        }
      },
      {
        id: 'sample-7',
        date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 15),
        description: 'Phone Bill',
        amount: 65,
        type: TransactionType.EXPENSE,
        category: 'Utilities',
        isRecurring: true,
        recurringPattern: {
          frequency: RecurrenceFrequency.MONTHLY,
          interval: 1
        }
      },
      {
        id: 'sample-8',
        date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 20),
        description: 'Freelance Project',
        amount: 800,
        type: TransactionType.INCOME,
        category: 'Income',
        isRecurring: true,
        recurringPattern: {
          frequency: RecurrenceFrequency.MONTHLY,
          interval: 1
        }
      }
    ];
  }

  private transactionsSubject = new BehaviorSubject<Transaction[]>(this.transactions);

  constructor() { }

  getTransactions(): Observable<Transaction[]> {
    return this.transactionsSubject.asObservable();
  }

  getSampleTransactionsData(): Transaction[] {
    return this.getSampleTransactions();
  }

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
