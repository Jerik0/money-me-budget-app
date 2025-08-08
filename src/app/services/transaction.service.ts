import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: Date;
  description?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private transactions: Transaction[] = [
    {
      id: '1',
      title: 'Grocery Store',
      amount: 85.50,
      type: 'expense',
      category: 'Food & Dining',
      date: new Date(),
      description: 'Weekly groceries'
    },
    {
      id: '2',
      title: 'Salary Deposit',
      amount: 3200.00,
      type: 'income',
      category: 'Salary',
      date: new Date(Date.now() - 24 * 60 * 60 * 1000),
      description: 'Monthly salary'
    },
    {
      id: '3',
      title: 'Gas Station',
      amount: 45.00,
      type: 'expense',
      category: 'Transportation',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      description: 'Fuel for car'
    },
    {
      id: '4',
      title: 'Coffee Shop',
      amount: 12.50,
      type: 'expense',
      category: 'Food & Dining',
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      description: 'Morning coffee'
    }
  ];

  private transactionsSubject = new BehaviorSubject<Transaction[]>(this.transactions);

  constructor() { }

  getTransactions(): Observable<Transaction[]> {
    return this.transactionsSubject.asObservable();
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
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }

  getTotalExpenses(): number {
    return this.transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }

  getBalance(): number {
    return this.getTotalIncome() - this.getTotalExpenses();
  }
}
