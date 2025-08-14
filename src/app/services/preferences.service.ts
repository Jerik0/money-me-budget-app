import { Injectable } from '@angular/core';
import { TransactionType } from '../enums';

export interface UserPreferences {
  lastTransactionType: TransactionType;
  lastCategory: string;
  lastAmount?: number;
  preferredCategories: string[];
}

@Injectable({
  providedIn: 'root'
})
export class PreferencesService {
  private readonly STORAGE_KEY = 'money-app-preferences';

  constructor() {}

  /**
   * Get user preferences from local storage
   */
  getPreferences(): UserPreferences {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.warn('Failed to parse stored preferences, using defaults');
      }
    }
    
    // Return sensible defaults
    return {
      lastTransactionType: TransactionType.EXPENSE,
      lastCategory: 'Uncategorized',
      preferredCategories: ['Uncategorized', 'Food', 'Transportation', 'Entertainment', 'Bills']
    };
  }

  /**
   * Save user preferences to local storage
   */
  savePreferences(preferences: Partial<UserPreferences>): void {
    const current = this.getPreferences();
    const updated = { ...current, ...preferences };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
  }

  /**
   * Update last transaction type
   */
  updateLastTransactionType(type: TransactionType): void {
    this.savePreferences({ lastTransactionType: type });
  }

  /**
   * Update last category
   */
  updateLastCategory(category: string): void {
    this.savePreferences({ lastCategory: category });
  }

  /**
   * Update last amount
   */
  updateLastAmount(amount: number): void {
    this.savePreferences({ lastAmount: amount });
  }

  /**
   * Add a new category to preferred list
   */
  addPreferredCategory(category: string): void {
    const current = this.getPreferences();
    if (!current.preferredCategories.includes(category)) {
      const updated = [...current.preferredCategories, category];
      this.savePreferences({ preferredCategories: updated });
    }
  }
}
