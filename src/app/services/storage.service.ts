import { Injectable } from '@angular/core';
import { Transaction } from '../interfaces';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly TRANSACTIONS_KEY = 'transactions';
  private readonly CURRENT_BALANCE_KEY = 'currentBalance';

  constructor() {}

  saveTransactions(transactions: Transaction[]): void {
    if (this.isLocalStorageAvailable()) {
      localStorage.setItem(this.TRANSACTIONS_KEY, JSON.stringify(transactions));
    }
  }

  loadTransactions(): Transaction[] {
    if (!this.isLocalStorageAvailable()) {
      return [];
    }

    const saved = localStorage.getItem(this.TRANSACTIONS_KEY);
    if (!saved) {
      return [];
    }

    try {
      return JSON.parse(saved).map((t: any) => ({
        ...t,
        date: new Date(t.date)
      }));
    } catch (error) {
      console.error('Error parsing saved transactions:', error);
      return [];
    }
  }

  saveCurrentBalance(balance: number): void {
    if (this.isLocalStorageAvailable()) {
      localStorage.setItem(this.CURRENT_BALANCE_KEY, balance.toString());
    }
  }

  loadCurrentBalance(): number {
    if (!this.isLocalStorageAvailable()) {
      return 0;
    }

    const saved = localStorage.getItem(this.CURRENT_BALANCE_KEY);
    if (!saved) {
      return 0;
    }

    try {
      return parseFloat(saved);
    } catch (error) {
      console.error('Error parsing saved balance:', error);
      return 0;
    }
  }

  clearAllData(): void {
    if (this.isLocalStorageAvailable()) {
      localStorage.removeItem(this.TRANSACTIONS_KEY);
      localStorage.removeItem(this.CURRENT_BALANCE_KEY);
    }
  }

  hasExistingData(): boolean {
    if (!this.isLocalStorageAvailable()) {
      return false;
    }

    const existingData = localStorage.getItem(this.TRANSACTIONS_KEY);
    return existingData !== null && JSON.parse(existingData).length > 0;
  }

  private isLocalStorageAvailable(): boolean {
    return typeof localStorage !== 'undefined';
  }
}
