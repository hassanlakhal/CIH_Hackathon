/**
 * Format a numeric value as a currency string.
 * @param {number} value - The amount to format.
 * @param {string} currency - ISO currency code (default: "MAD").
 * @returns {string} Formatted currency string, e.g. "1 234,50 MAD".
 */
export function formatCurrency(value, currency = 'MAD') {
  if (value == null || isNaN(value)) return `— ${currency}`;

  const formatted = new Intl.NumberFormat('fr-MA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

  return `${formatted} ${currency}`;
}

/**
 * Format a compact currency value (no decimals for whole numbers).
 * @param {number} value
 * @param {string} currency
 * @returns {string}
 */
export function formatCurrencyCompact(value, currency = 'MAD') {
  if (value == null || isNaN(value)) return `— ${currency}`;

  const isWhole = value % 1 === 0;
  const formatted = new Intl.NumberFormat('fr-MA', {
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);

  return `${formatted} ${currency}`;
}
