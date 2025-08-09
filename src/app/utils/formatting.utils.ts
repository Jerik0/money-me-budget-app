/**
 * Utility functions for formatting currency and dates
 */

/**
 * Formats a number as currency in USD
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

/**
 * Formats a date in a human-friendly relative format
 */
export function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - new Date(date).getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return new Date(date).toLocaleDateString();
}

/**
 * Formats a date for display in projections
 */
export function formatProjectionDate(date: Date, options?: {
  weekday?: 'long' | 'short';
  month?: 'long' | 'short' | 'numeric';
  day?: 'numeric';
  year?: 'numeric';
}): string {
  const defaultOptions = {
    weekday: 'long' as const,
    month: 'short' as const,
    day: 'numeric' as const,
    year: 'numeric' as const
  };
  
  return date.toLocaleDateString('en-US', { ...defaultOptions, ...options });
}
