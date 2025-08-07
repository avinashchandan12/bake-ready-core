/**
 * Currency configuration and formatting utilities
 */

export const CURRENCY_CONFIG = {
  code: 'INR',
  symbol: '₹',
  locale: 'en-IN',
  name: 'Indian Rupee'
} as const;

/**
 * Format a number as Indian Rupee currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(CURRENCY_CONFIG.locale, {
    style: 'currency',
    currency: CURRENCY_CONFIG.code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a number as currency without the symbol (for inputs)
 */
export function formatCurrencyValue(amount: number): string {
  return new Intl.NumberFormat(CURRENCY_CONFIG.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Parse a currency string to number
 */
export function parseCurrency(value: string): number {
  // Remove currency symbol and commas, then parse
  const cleaned = value.replace(/[₹,\s]/g, '');
  return parseFloat(cleaned) || 0;
}