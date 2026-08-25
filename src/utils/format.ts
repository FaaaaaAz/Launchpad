/** Símbolos de las monedas que la app muestra de forma abreviada. */
const CURRENCY_SYMBOLS: Record<string, string> = {
  BOB: 'Bs.',
  USD: '$',
  EUR: '€',
};

/** Símbolo corto de una moneda: 'Bs.', '$', '€'. */
export function currencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] ?? currency;
}

/** 'Bs. 250' / 'Bs. 249,90' */
export function formatCurrency(amount: number, currency: string): string {
  const symbol = currencySymbol(currency);
  const value = Number.isInteger(amount)
    ? String(amount)
    : amount.toFixed(2).replace('.', ',');
  return `${symbol} ${value}`;
}

/** Convierte lo escrito en un input a número, aceptando coma decimal. */
export function parseAmount(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.');
  if (normalized === '') return null;
  const value = Number(normalized);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

/** Recorta un texto largo para que no rompa el layout de una card. */
export function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}

/** Iniciales para el avatar de reserva cuando una actividad no tiene foto. */
export function initials(value: string): string {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.charAt(0) ?? '';
  const last = words.length > 1 ? (words[words.length - 1]?.charAt(0) ?? '') : '';
  return (first + last).toUpperCase() || '?';
}
