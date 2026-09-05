/**
 * Canonical Currency and Number Formatter for TorqueScout
 * Consistent display formatting across all Turkish and international surfaces.
 */

/**
 * Formats monetary amounts with appropriate currency symbol.
 * Defaults to 'TL' for Turkish Lira ('TRY' ISO code), while preserving
 * international currencies (USD, EUR, GBP).
 *
 * Example:
 *   formatCurrency(500000, 'TRY') => "500.000 TL"
 *   formatCurrency(25000, 'USD')  => "25.000 USD"
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  currency: string = 'TRY'
): string {
  if (amount === null || amount === undefined || amount === '') return '—';
  const num = typeof amount === 'number' ? amount : Number(amount);
  if (isNaN(num)) return '—';

  const formattedNum = num.toLocaleString('tr-TR');
  const displayCurrency = currency?.toUpperCase() === 'TRY' ? 'TL' : (currency || 'TL');

  return `${formattedNum} ${displayCurrency}`;
}

/**
 * Formats numbers into Turkish locale with dot thousand separators.
 */
export function formatNumber(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === '') return '0';
  const num = typeof val === 'number' ? val : Number(val);
  if (isNaN(num)) return '0';
  return num.toLocaleString('tr-TR');
}
