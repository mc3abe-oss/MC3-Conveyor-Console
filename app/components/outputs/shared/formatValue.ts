/**
 * Value formatting utilities for output display.
 * Product-agnostic - works with any numeric/boolean/string values.
 */

export function formatValue(
  value: unknown,
  options?: {
    precision?: number;
    unit?: string;
    fallback?: string;
  }
): string {
  const { precision, unit, fallback = '—' } = options || {};

  if (value === null || value === undefined) {
    return fallback;
  }

  let formatted: string;

  if (typeof value === 'number') {
    if (Number.isNaN(value) || !Number.isFinite(value)) {
      return fallback;
    }
    formatted = precision !== undefined ? value.toFixed(precision) : value.toString();
  } else if (typeof value === 'boolean') {
    formatted = value ? 'Yes' : 'No';
  } else {
    formatted = String(value);
  }

  if (unit) {
    formatted = formatted + ' ' + unit;
  }

  return formatted;
}

export function formatPercent(value: number | null | undefined, precision: number = 1): string {
  if (value === null || value === undefined) return '—';
  return (value * 100).toFixed(precision) + '%';
}

export function formatRatio(value: number | null | undefined, precision: number = 2): string {
  if (value === null || value === undefined) return '—';
  return value.toFixed(precision) + ':1';
}
