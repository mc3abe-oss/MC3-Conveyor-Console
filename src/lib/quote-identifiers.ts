/**
 * Quote/Sales Order Identifier Helpers
 *
 * Numeric base_number with optional .line suffix.
 * Prefix (Q, SO) is derived from type, NOT stored.
 *
 * Examples:
 * - Quote 62633, line 2 => "Q62633.2"
 * - Quote 62633, no line => "Q62633"
 * - Sales Order 12345, line 1 => "SO12345.1"
 */

export type RefType = 'quote' | 'sales_order';

export interface ParsedRef {
  base: number;
  line: number | null;
}

export interface ParseError {
  error: string;
}

/**
 * Parse a user input string into base and line numbers.
 *
 * Accepted formats:
 * - "62633" => base 62633, line null
 * - "62633.2" => base 62633, line 2
 *
 * NOT accepted:
 * - "Q62633" (prefix not allowed)
 * - "62633." (trailing dot)
 * - ".2" (missing base)
 * - "62633.a" (non-numeric line)
 * - "abc" (non-numeric)
 */
export function parseBaseLine(input: string): ParsedRef | ParseError {
  if (!input || typeof input !== 'string') {
    return { error: 'Input is required' };
  }

  const trimmed = input.trim();

  // Reject if starts with letter (prefix not allowed)
  if (/^[a-zA-Z]/.test(trimmed)) {
    return { error: 'Prefix not allowed. Enter numeric value only (e.g., 62633 or 62633.2)' };
  }

  // Check for base.line format
  if (trimmed.includes('.')) {
    const parts = trimmed.split('.');

    // Must be exactly 2 parts
    if (parts.length !== 2) {
      return { error: 'Invalid format. Use: 62633 or 62633.2' };
    }

    const [basePart, linePart] = parts;

    // Validate base
    if (!basePart || !/^\d+$/.test(basePart)) {
      return { error: 'Base number must be numeric' };
    }

    // Validate line
    if (!linePart || !/^\d+$/.test(linePart)) {
      return { error: 'Line number must be numeric' };
    }

    const base = parseInt(basePart, 10);
    const line = parseInt(linePart, 10);

    if (base < 1) {
      return { error: 'Base number must be >= 1' };
    }

    if (line < 1) {
      return { error: 'Line number must be >= 1' };
    }

    return { base, line };
  }

  // Base only format
  if (!/^\d+$/.test(trimmed)) {
    return { error: 'Must be numeric (e.g., 62633 or 62633.2)' };
  }

  const base = parseInt(trimmed, 10);

  if (base < 1) {
    return { error: 'Base number must be >= 1' };
  }

  return { base, line: null };
}

/**
 * Check if a parse result is an error
 */
export function isParseError(result: ParsedRef | ParseError): result is ParseError {
  return 'error' in result;
}

/**
 * Format a reference for display.
 *
 * @param type - 'quote' or 'sales_order'
 * @param base - Base number (required)
 * @param line - Line number (optional)
 * @returns Formatted string like "Q62633" or "Q62633.2" or "SO12345.1"
 */
export function formatRef(type: RefType, base: number, line?: number | null): string {
  const prefix = type === 'quote' ? 'Q' : 'SO';
  const lineSuffix = line != null && line >= 1 ? `.${line}` : '';
  return `${prefix}${base}${lineSuffix}`;
}

/**
 * Get just the prefix for a type
 */
export function getPrefix(type: RefType): string {
  return type === 'quote' ? 'Q' : 'SO';
}

/**
 * Parse a formatted reference string back to parts.
 * This is for backward compatibility with existing formatted strings.
 *
 * Accepts: "Q62633", "Q62633.2", "SO12345", "SO12345.1"
 */
export function parseFormattedRef(input: string): { type: RefType; base: number; line: number | null } | ParseError {
  if (!input || typeof input !== 'string') {
    return { error: 'Input is required' };
  }

  const trimmed = input.trim().toUpperCase();

  let type: RefType;
  let remainder: string;

  if (trimmed.startsWith('SO')) {
    type = 'sales_order';
    remainder = trimmed.slice(2);
  } else if (trimmed.startsWith('Q')) {
    type = 'quote';
    remainder = trimmed.slice(1);
  } else {
    return { error: 'Invalid prefix. Must start with Q or SO' };
  }

  const parsed = parseBaseLine(remainder);
  if (isParseError(parsed)) {
    return parsed;
  }

  return { type, ...parsed };
}
