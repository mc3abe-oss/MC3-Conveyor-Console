/**
 * Tests for lagging pattern types and validation
 */

import {
  LaggingPattern,
  LAGGING_PATTERN_LABELS,
  VALID_LAGGING_PATTERNS,
  isValidLaggingPattern,
} from './lagging-patterns';

describe('LaggingPattern', () => {
  describe('LAGGING_PATTERN_LABELS', () => {
    it('has labels for all valid patterns', () => {
      for (const pattern of VALID_LAGGING_PATTERNS) {
        expect(LAGGING_PATTERN_LABELS[pattern]).toBeDefined();
        expect(typeof LAGGING_PATTERN_LABELS[pattern]).toBe('string');
      }
    });

    it('has expected labels', () => {
      expect(LAGGING_PATTERN_LABELS.none).toBe('None');
      expect(LAGGING_PATTERN_LABELS.smooth).toBe('Smooth');
      expect(LAGGING_PATTERN_LABELS.herringbone_clockwise).toBe('Herringbone (Clockwise)');
      expect(LAGGING_PATTERN_LABELS.herringbone_counterclockwise).toBe('Herringbone (Counter-Clockwise)');
      expect(LAGGING_PATTERN_LABELS.straight_grooves).toBe('Straight Grooves');
      expect(LAGGING_PATTERN_LABELS.diamond).toBe('Diamond');
      expect(LAGGING_PATTERN_LABELS.custom).toBe('Custom');
    });
  });

  describe('isValidLaggingPattern', () => {
    it('returns true for valid patterns', () => {
      expect(isValidLaggingPattern('none')).toBe(true);
      expect(isValidLaggingPattern('smooth')).toBe(true);
      expect(isValidLaggingPattern('herringbone_clockwise')).toBe(true);
      expect(isValidLaggingPattern('herringbone_counterclockwise')).toBe(true);
      expect(isValidLaggingPattern('straight_grooves')).toBe(true);
      expect(isValidLaggingPattern('diamond')).toBe(true);
      expect(isValidLaggingPattern('custom')).toBe(true);
    });

    it('returns false for invalid patterns', () => {
      expect(isValidLaggingPattern('invalid')).toBe(false);
      expect(isValidLaggingPattern('NONE')).toBe(false); // Case sensitive
      expect(isValidLaggingPattern('')).toBe(false);
      expect(isValidLaggingPattern('herringbone')).toBe(false); // Partial match
    });
  });

  describe('Validation rules', () => {
    it('custom pattern requires notes (documented behavior)', () => {
      // This test documents the expected validation behavior:
      // When lagging_pattern is 'custom', lagging_pattern_notes must be provided
      // Actual validation is done in the API route
      const customPattern: LaggingPattern = 'custom';
      expect(customPattern).toBe('custom');
      // The API should reject: { lagging_pattern: 'custom', lagging_pattern_notes: '' }
    });

    it('lagging disabled forces pattern none (documented behavior)', () => {
      // This test documents the expected validation behavior:
      // When lagging_type is 'NONE', lagging_pattern must be 'none'
      // Actual validation is done in the API route
      const nonePattern: LaggingPattern = 'none';
      expect(nonePattern).toBe('none');
      // The API should reject: { lagging_type: 'NONE', lagging_pattern: 'herringbone_clockwise' }
    });
  });
});
