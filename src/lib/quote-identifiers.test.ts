/**
 * Tests for Quote/Sales Order Identifier Helpers
 */

import {
  parseBaseLine,
  isParseError,
  formatRef,
  parseFormattedRef,
  getPrefix,
} from './quote-identifiers';

describe('parseBaseLine', () => {
  describe('valid inputs', () => {
    it('parses base number only', () => {
      const result = parseBaseLine('62633');
      expect(isParseError(result)).toBe(false);
      if (!isParseError(result)) {
        expect(result.base).toBe(62633);
        expect(result.line).toBeNull();
      }
    });

    it('parses base.line format', () => {
      const result = parseBaseLine('62633.2');
      expect(isParseError(result)).toBe(false);
      if (!isParseError(result)) {
        expect(result.base).toBe(62633);
        expect(result.line).toBe(2);
      }
    });

    it('parses single digit values', () => {
      const result = parseBaseLine('1.1');
      expect(isParseError(result)).toBe(false);
      if (!isParseError(result)) {
        expect(result.base).toBe(1);
        expect(result.line).toBe(1);
      }
    });

    it('trims whitespace', () => {
      const result = parseBaseLine('  62633.2  ');
      expect(isParseError(result)).toBe(false);
      if (!isParseError(result)) {
        expect(result.base).toBe(62633);
        expect(result.line).toBe(2);
      }
    });
  });

  describe('invalid inputs', () => {
    it('rejects empty string', () => {
      const result = parseBaseLine('');
      expect(isParseError(result)).toBe(true);
      if (isParseError(result)) {
        expect(result.error).toContain('required');
      }
    });

    it('rejects prefix (Q)', () => {
      const result = parseBaseLine('Q62633');
      expect(isParseError(result)).toBe(true);
      if (isParseError(result)) {
        expect(result.error).toContain('Prefix not allowed');
      }
    });

    it('rejects prefix (SO)', () => {
      const result = parseBaseLine('SO12345');
      expect(isParseError(result)).toBe(true);
      if (isParseError(result)) {
        expect(result.error).toContain('Prefix not allowed');
      }
    });

    it('rejects trailing dot', () => {
      const result = parseBaseLine('62633.');
      expect(isParseError(result)).toBe(true);
      if (isParseError(result)) {
        expect(result.error).toContain('Line number must be numeric');
      }
    });

    it('rejects leading dot', () => {
      const result = parseBaseLine('.2');
      expect(isParseError(result)).toBe(true);
      if (isParseError(result)) {
        expect(result.error).toContain('Base number must be numeric');
      }
    });

    it('rejects non-numeric line', () => {
      const result = parseBaseLine('62633.a');
      expect(isParseError(result)).toBe(true);
      if (isParseError(result)) {
        expect(result.error).toContain('Line number must be numeric');
      }
    });

    it('rejects non-numeric base (starts with letter)', () => {
      const result = parseBaseLine('abc');
      expect(isParseError(result)).toBe(true);
      if (isParseError(result)) {
        expect(result.error).toContain('Prefix not allowed');
      }
    });

    it('rejects non-numeric base (contains special chars)', () => {
      const result = parseBaseLine('123-456');
      expect(isParseError(result)).toBe(true);
      if (isParseError(result)) {
        expect(result.error).toContain('Must be numeric');
      }
    });

    it('rejects multiple dots', () => {
      const result = parseBaseLine('62633.2.3');
      expect(isParseError(result)).toBe(true);
      if (isParseError(result)) {
        expect(result.error).toContain('Invalid format');
      }
    });

    it('rejects zero base', () => {
      const result = parseBaseLine('0');
      expect(isParseError(result)).toBe(true);
      if (isParseError(result)) {
        expect(result.error).toContain('must be >= 1');
      }
    });

    it('rejects zero line', () => {
      const result = parseBaseLine('62633.0');
      expect(isParseError(result)).toBe(true);
      if (isParseError(result)) {
        expect(result.error).toContain('Line number must be >= 1');
      }
    });
  });
});

describe('formatRef', () => {
  describe('quotes', () => {
    it('formats quote with base only', () => {
      expect(formatRef('quote', 62633)).toBe('Q62633');
    });

    it('formats quote with base and line', () => {
      expect(formatRef('quote', 62633, 2)).toBe('Q62633.2');
    });

    it('formats quote with null line', () => {
      expect(formatRef('quote', 62633, null)).toBe('Q62633');
    });

    it('formats quote with line 0 as no line', () => {
      expect(formatRef('quote', 62633, 0)).toBe('Q62633');
    });
  });

  describe('sales orders', () => {
    it('formats sales order with base only', () => {
      expect(formatRef('sales_order', 12345)).toBe('SO12345');
    });

    it('formats sales order with base and line', () => {
      expect(formatRef('sales_order', 12345, 1)).toBe('SO12345.1');
    });

    it('formats sales order with null line', () => {
      expect(formatRef('sales_order', 12345, null)).toBe('SO12345');
    });
  });
});

describe('parseFormattedRef', () => {
  describe('valid inputs', () => {
    it('parses Q62633', () => {
      const result = parseFormattedRef('Q62633');
      expect(isParseError(result)).toBe(false);
      if (!isParseError(result)) {
        expect(result.type).toBe('quote');
        expect(result.base).toBe(62633);
        expect(result.line).toBeNull();
      }
    });

    it('parses Q62633.2', () => {
      const result = parseFormattedRef('Q62633.2');
      expect(isParseError(result)).toBe(false);
      if (!isParseError(result)) {
        expect(result.type).toBe('quote');
        expect(result.base).toBe(62633);
        expect(result.line).toBe(2);
      }
    });

    it('parses SO12345', () => {
      const result = parseFormattedRef('SO12345');
      expect(isParseError(result)).toBe(false);
      if (!isParseError(result)) {
        expect(result.type).toBe('sales_order');
        expect(result.base).toBe(12345);
        expect(result.line).toBeNull();
      }
    });

    it('parses SO12345.1', () => {
      const result = parseFormattedRef('SO12345.1');
      expect(isParseError(result)).toBe(false);
      if (!isParseError(result)) {
        expect(result.type).toBe('sales_order');
        expect(result.base).toBe(12345);
        expect(result.line).toBe(1);
      }
    });

    it('handles lowercase', () => {
      const result = parseFormattedRef('q62633');
      expect(isParseError(result)).toBe(false);
      if (!isParseError(result)) {
        expect(result.type).toBe('quote');
        expect(result.base).toBe(62633);
      }
    });

    it('handles lowercase so', () => {
      const result = parseFormattedRef('so12345');
      expect(isParseError(result)).toBe(false);
      if (!isParseError(result)) {
        expect(result.type).toBe('sales_order');
        expect(result.base).toBe(12345);
      }
    });
  });

  describe('invalid inputs', () => {
    it('rejects empty string', () => {
      const result = parseFormattedRef('');
      expect(isParseError(result)).toBe(true);
    });

    it('rejects invalid prefix', () => {
      const result = parseFormattedRef('X12345');
      expect(isParseError(result)).toBe(true);
      if (isParseError(result)) {
        expect(result.error).toContain('Invalid prefix');
      }
    });

    it('rejects no prefix', () => {
      const result = parseFormattedRef('12345');
      expect(isParseError(result)).toBe(true);
      if (isParseError(result)) {
        expect(result.error).toContain('Invalid prefix');
      }
    });
  });
});

describe('getPrefix', () => {
  it('returns Q for quote', () => {
    expect(getPrefix('quote')).toBe('Q');
  });

  it('returns SO for sales_order', () => {
    expect(getPrefix('sales_order')).toBe('SO');
  });
});

describe('roundtrip', () => {
  it('format then parse matches original (quote)', () => {
    const formatted = formatRef('quote', 62633, 2);
    const parsed = parseFormattedRef(formatted);
    expect(isParseError(parsed)).toBe(false);
    if (!isParseError(parsed)) {
      expect(parsed.type).toBe('quote');
      expect(parsed.base).toBe(62633);
      expect(parsed.line).toBe(2);
    }
  });

  it('format then parse matches original (sales_order)', () => {
    const formatted = formatRef('sales_order', 12345, 1);
    const parsed = parseFormattedRef(formatted);
    expect(isParseError(parsed)).toBe(false);
    if (!isParseError(parsed)) {
      expect(parsed.type).toBe('sales_order');
      expect(parsed.base).toBe(12345);
      expect(parsed.line).toBe(1);
    }
  });

  it('format then parse matches original (no line)', () => {
    const formatted = formatRef('quote', 62633);
    const parsed = parseFormattedRef(formatted);
    expect(isParseError(parsed)).toBe(false);
    if (!isParseError(parsed)) {
      expect(parsed.type).toBe('quote');
      expect(parsed.base).toBe(62633);
      expect(parsed.line).toBeNull();
    }
  });
});
