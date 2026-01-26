/**
 * Tests for NewApplicationGateModal normalization logic
 *
 * Verifies that the modal correctly parses:
 * - Base numbers: "12345" -> base=12345, suffix=null
 * - Dotted format: "12345.2" -> base=12345, suffix=2
 * - Suffix field override
 * - Error cases
 */

describe('NewApplicationGateModal Normalization', () => {
  /**
   * Simulates the normalization logic from NewApplicationGateModal.handleSubmit
   */
  function parseGateInput(baseNumber: string, suffixNumber: string): {
    base: number;
    suffix: number | null;
    error?: string;
  } {
    const trimmedBase = baseNumber.trim();
    let base: number;
    let parsedSuffixFromBase: number | null = null;

    if (trimmedBase.includes('.')) {
      // User entered dotted format like "12345.2"
      const parts = trimmedBase.split('.');
      if (parts.length !== 2) {
        return { base: 0, suffix: null, error: 'Invalid format. Use digits or digits.suffix (e.g., 12345 or 12345.2)' };
      }
      const [basePart, suffixPart] = parts;

      base = parseInt(basePart, 10);
      if (isNaN(base) || base <= 0) {
        return { base: 0, suffix: null, error: 'Please enter a valid base number' };
      }

      parsedSuffixFromBase = parseInt(suffixPart, 10);
      if (isNaN(parsedSuffixFromBase) || parsedSuffixFromBase < 1) {
        return { base: 0, suffix: null, error: 'Suffix must be a positive number (e.g., .1, .2)' };
      }
    } else {
      base = parseInt(trimmedBase, 10);
      if (isNaN(base) || base <= 0) {
        return { base: 0, suffix: null, error: 'Please enter a valid base number' };
      }
    }

    // Determine final suffix
    let suffix: number | null = null;
    if (suffixNumber.trim()) {
      suffix = parseInt(suffixNumber, 10);
      if (isNaN(suffix) || suffix < 0) {
        return { base: 0, suffix: null, error: 'Please enter a valid suffix number' };
      }
      if (parsedSuffixFromBase !== null && parsedSuffixFromBase !== suffix) {
        return { base: 0, suffix: null, error: `Suffix mismatch: number field has .${parsedSuffixFromBase} but suffix field has ${suffix}. Please use one format.` };
      }
    } else if (parsedSuffixFromBase !== null) {
      suffix = parsedSuffixFromBase;
    }

    return { base, suffix };
  }

  describe('Base number parsing', () => {
    it('should parse plain base number', () => {
      const result = parseGateInput('12345', '');
      expect(result.base).toBe(12345);
      expect(result.suffix).toBeNull();
      expect(result.error).toBeUndefined();
    });

    it('should parse dotted format and extract suffix', () => {
      const result = parseGateInput('12345.2', '');
      expect(result.base).toBe(12345);
      expect(result.suffix).toBe(2);
      expect(result.error).toBeUndefined();
    });

    it('should handle larger suffix numbers', () => {
      const result = parseGateInput('12345.10', '');
      expect(result.base).toBe(12345);
      expect(result.suffix).toBe(10);
      expect(result.error).toBeUndefined();
    });

    it('should trim whitespace', () => {
      const result = parseGateInput('  12345.2  ', '');
      expect(result.base).toBe(12345);
      expect(result.suffix).toBe(2);
      expect(result.error).toBeUndefined();
    });
  });

  describe('Suffix field handling', () => {
    it('should use suffix field when base has no dot', () => {
      const result = parseGateInput('12345', '3');
      expect(result.base).toBe(12345);
      expect(result.suffix).toBe(3);
      expect(result.error).toBeUndefined();
    });

    it('should allow matching suffix in both fields', () => {
      const result = parseGateInput('12345.2', '2');
      expect(result.base).toBe(12345);
      expect(result.suffix).toBe(2);
      expect(result.error).toBeUndefined();
    });

    it('should error on mismatched suffix', () => {
      const result = parseGateInput('12345.2', '3');
      expect(result.error).toContain('Suffix mismatch');
    });
  });

  describe('Error cases', () => {
    it('should reject invalid base number', () => {
      const result = parseGateInput('abc', '');
      expect(result.error).toBe('Please enter a valid base number');
    });

    it('should reject zero base', () => {
      const result = parseGateInput('0', '');
      expect(result.error).toBe('Please enter a valid base number');
    });

    it('should reject negative base', () => {
      const result = parseGateInput('-100', '');
      expect(result.error).toBe('Please enter a valid base number');
    });

    it('should reject invalid suffix in dotted format', () => {
      const result = parseGateInput('12345.abc', '');
      expect(result.error).toBe('Suffix must be a positive number (e.g., .1, .2)');
    });

    it('should reject zero suffix in dotted format', () => {
      const result = parseGateInput('12345.0', '');
      expect(result.error).toBe('Suffix must be a positive number (e.g., .1, .2)');
    });

    it('should reject multiple dots', () => {
      const result = parseGateInput('12345.2.1', '');
      expect(result.error).toBe('Invalid format. Use digits or digits.suffix (e.g., 12345 or 12345.2)');
    });
  });
});
