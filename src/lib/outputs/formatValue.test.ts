/**
 * Tests for formatValue utilities
 */

import { formatValue, formatPercent, formatRatio } from '../../../app/components/outputs/shared/formatValue';

describe('formatValue', () => {
  describe('number formatting', () => {
    it('formats numbers with precision', () => {
      expect(formatValue(123.456, { precision: 2 })).toBe('123.46');
      expect(formatValue(100, { precision: 1 })).toBe('100.0');
      expect(formatValue(0, { precision: 0 })).toBe('0');
    });

    it('formats numbers with units', () => {
      expect(formatValue(100, { unit: 'lb' })).toBe('100 lb');
      expect(formatValue(123.456, { precision: 1, unit: 'in-lb' })).toBe('123.5 in-lb');
    });

    it('formats integers without precision', () => {
      expect(formatValue(42)).toBe('42');
    });
  });

  describe('null/undefined handling', () => {
    it('returns dash for null', () => {
      expect(formatValue(null)).toBe('—');
    });

    it('returns dash for undefined', () => {
      expect(formatValue(undefined)).toBe('—');
    });

    it('uses custom fallback', () => {
      expect(formatValue(null, { fallback: 'N/A' })).toBe('N/A');
      expect(formatValue(undefined, { fallback: '-' })).toBe('-');
    });
  });

  describe('special number handling', () => {
    it('returns fallback for NaN', () => {
      expect(formatValue(NaN)).toBe('—');
    });

    it('returns fallback for Infinity', () => {
      expect(formatValue(Infinity)).toBe('—');
      expect(formatValue(-Infinity)).toBe('—');
    });
  });

  describe('boolean formatting', () => {
    it('formats true as Yes', () => {
      expect(formatValue(true)).toBe('Yes');
    });

    it('formats false as No', () => {
      expect(formatValue(false)).toBe('No');
    });
  });

  describe('string formatting', () => {
    it('returns strings as-is', () => {
      expect(formatValue('test')).toBe('test');
    });

    it('appends unit to strings', () => {
      expect(formatValue('test', { unit: 'mm' })).toBe('test mm');
    });
  });
});

describe('formatPercent', () => {
  it('converts decimal to percentage', () => {
    expect(formatPercent(0.5)).toBe('50.0%');
    expect(formatPercent(1.0)).toBe('100.0%');
    expect(formatPercent(0.123)).toBe('12.3%');
  });

  it('uses custom precision', () => {
    expect(formatPercent(0.5, 0)).toBe('50%');
    expect(formatPercent(0.123, 2)).toBe('12.30%');
  });

  it('handles values over 100%', () => {
    expect(formatPercent(1.25, 0)).toBe('125%');
  });

  it('handles null/undefined', () => {
    expect(formatPercent(null)).toBe('—');
    expect(formatPercent(undefined)).toBe('—');
  });
});

describe('formatRatio', () => {
  it('formats as ratio', () => {
    expect(formatRatio(5)).toBe('5.00:1');
    expect(formatRatio(10.5)).toBe('10.50:1');
  });

  it('uses custom precision', () => {
    expect(formatRatio(5.123, 1)).toBe('5.1:1');
    expect(formatRatio(10, 0)).toBe('10:1');
  });

  it('handles null/undefined', () => {
    expect(formatRatio(null)).toBe('—');
    expect(formatRatio(undefined)).toBe('—');
  });
});
