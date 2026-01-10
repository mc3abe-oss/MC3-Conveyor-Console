/**
 * Tests for Application Code Helpers
 */

import {
  normalizeApplicationCode,
  parseApplicationCode,
  isApplicationCodeError,
  isValidApplicationCode,
  compareApplicationCodes,
  getApplicationCodeError,
  APPLICATION_CODE_HELP,
} from './applicationCode';

describe('normalizeApplicationCode', () => {
  it('trims whitespace', () => {
    expect(normalizeApplicationCode('  32853  ')).toBe('32853');
    expect(normalizeApplicationCode(' 32853.1 ')).toBe('32853.1');
    expect(normalizeApplicationCode('\t32853\n')).toBe('32853');
  });

  it('returns empty string for invalid input', () => {
    expect(normalizeApplicationCode('')).toBe('');
    expect(normalizeApplicationCode(null as any)).toBe('');
    expect(normalizeApplicationCode(undefined as any)).toBe('');
  });
});

describe('parseApplicationCode', () => {
  describe('valid base-only codes', () => {
    it('parses 5-digit base', () => {
      const result = parseApplicationCode('32853');
      expect(result).toEqual({
        code: '32853',
        base: '32853',
        releaseIndex: null,
      });
    });

    it('parses with leading zeros in base', () => {
      const result = parseApplicationCode('00001');
      expect(result).toEqual({
        code: '00001',
        base: '00001',
        releaseIndex: null,
      });
    });

    it('trims whitespace', () => {
      const result = parseApplicationCode('  32853  ');
      expect(result).toEqual({
        code: '32853',
        base: '32853',
        releaseIndex: null,
      });
    });
  });

  describe('valid base+release codes', () => {
    it('parses .1 release', () => {
      const result = parseApplicationCode('32853.1');
      expect(result).toEqual({
        code: '32853.1',
        base: '32853',
        releaseIndex: 1,
      });
    });

    it('parses .2 release', () => {
      const result = parseApplicationCode('32853.2');
      expect(result).toEqual({
        code: '32853.2',
        base: '32853',
        releaseIndex: 2,
      });
    });

    it('parses .10 release (double digit)', () => {
      const result = parseApplicationCode('32853.10');
      expect(result).toEqual({
        code: '32853.10',
        base: '32853',
        releaseIndex: 10,
      });
    });

    it('parses large release index', () => {
      const result = parseApplicationCode('32853.999');
      expect(result).toEqual({
        code: '32853.999',
        base: '32853',
        releaseIndex: 999,
      });
    });

    it('trims whitespace with release', () => {
      const result = parseApplicationCode(' 32853.1 ');
      expect(result).toEqual({
        code: '32853.1',
        base: '32853',
        releaseIndex: 1,
      });
    });
  });

  describe('invalid codes', () => {
    it('rejects empty string', () => {
      const result = parseApplicationCode('');
      expect(isApplicationCodeError(result)).toBe(true);
      if (isApplicationCodeError(result)) {
        expect(result.error).toBe('Application code is required');
      }
    });

    it('accepts 4-digit base (backward compat)', () => {
      const result = parseApplicationCode('3285');
      expect(isApplicationCodeError(result)).toBe(false);
      if (!isApplicationCodeError(result)) {
        expect(result.base).toBe('3285');
        expect(result.releaseIndex).toBeNull();
      }
    });

    it('accepts 6-digit base (backward compat)', () => {
      const result = parseApplicationCode('328530');
      expect(isApplicationCodeError(result)).toBe(false);
      if (!isApplicationCodeError(result)) {
        expect(result.base).toBe('328530');
        expect(result.releaseIndex).toBeNull();
      }
    });

    it('rejects trailing dot', () => {
      const result = parseApplicationCode('32853.');
      expect(isApplicationCodeError(result)).toBe(true);
      if (isApplicationCodeError(result)) {
        expect(result.error).toBe('Release index must be numeric (e.g., .1, .2, .10)');
      }
    });

    it('rejects non-numeric release', () => {
      const result = parseApplicationCode('32853.A');
      expect(isApplicationCodeError(result)).toBe(true);
      if (isApplicationCodeError(result)) {
        expect(result.error).toBe('Release index must be numeric (e.g., .1, .2, .10)');
      }
    });

    it('rejects .0 release', () => {
      const result = parseApplicationCode('32853.0');
      expect(isApplicationCodeError(result)).toBe(true);
      if (isApplicationCodeError(result)) {
        expect(result.error).toBe('Release index must be >= 1');
      }
    });

    it('rejects leading zeros in release', () => {
      const result = parseApplicationCode('32853.01');
      expect(isApplicationCodeError(result)).toBe(true);
      if (isApplicationCodeError(result)) {
        expect(result.error).toBe('Release index cannot have leading zeros (use .1 not .01)');
      }
    });

    it('rejects multiple dots', () => {
      const result = parseApplicationCode('32853.1.2');
      expect(isApplicationCodeError(result)).toBe(true);
      if (isApplicationCodeError(result)) {
        expect(result.error).toContain('Invalid format');
      }
    });

    it('rejects letters in base', () => {
      const result = parseApplicationCode('3285A');
      expect(isApplicationCodeError(result)).toBe(true);
      if (isApplicationCodeError(result)) {
        expect(result.error).toBe('Application code must be numeric (e.g., 32853 or 32853.2)');
      }
    });

    it('accepts 4-digit base with release (backward compat)', () => {
      const result = parseApplicationCode('3285.1');
      expect(isApplicationCodeError(result)).toBe(false);
      if (!isApplicationCodeError(result)) {
        expect(result.base).toBe('3285');
        expect(result.releaseIndex).toBe(1);
      }
    });
  });
});

describe('isValidApplicationCode', () => {
  it('returns true for valid codes', () => {
    expect(isValidApplicationCode('32853')).toBe(true);
    expect(isValidApplicationCode('32853.1')).toBe(true);
    expect(isValidApplicationCode('32853.2')).toBe(true);
    expect(isValidApplicationCode('32853.10')).toBe(true);
    expect(isValidApplicationCode(' 32853.1 ')).toBe(true); // trims whitespace
    expect(isValidApplicationCode('3285')).toBe(true); // 4-digit backward compat
    expect(isValidApplicationCode('328530')).toBe(true); // 6-digit backward compat
    expect(isValidApplicationCode('3285.1')).toBe(true); // 4-digit with release
  });

  it('returns false for invalid codes', () => {
    expect(isValidApplicationCode('')).toBe(false);
    expect(isValidApplicationCode('32853.')).toBe(false);
    expect(isValidApplicationCode('32853.A')).toBe(false);
    expect(isValidApplicationCode('32853.0')).toBe(false);
    expect(isValidApplicationCode('32853.01')).toBe(false);
  });
});

describe('compareApplicationCodes', () => {
  it('sorts base-only before any releases', () => {
    expect(compareApplicationCodes('32853', '32853.1')).toBeLessThan(0);
    expect(compareApplicationCodes('32853.1', '32853')).toBeGreaterThan(0);
  });

  it('sorts releases numerically, not lexicographically', () => {
    // This is the critical test - .2 must come before .10
    expect(compareApplicationCodes('32853.2', '32853.10')).toBeLessThan(0);
    expect(compareApplicationCodes('32853.10', '32853.2')).toBeGreaterThan(0);
    expect(compareApplicationCodes('32853.1', '32853.2')).toBeLessThan(0);
    expect(compareApplicationCodes('32853.9', '32853.10')).toBeLessThan(0);
  });

  it('sorts by base first', () => {
    expect(compareApplicationCodes('32853.1', '32854.1')).toBeLessThan(0);
    expect(compareApplicationCodes('32854', '32853.10')).toBeGreaterThan(0);
  });

  it('returns 0 for equal codes', () => {
    expect(compareApplicationCodes('32853', '32853')).toBe(0);
    expect(compareApplicationCodes('32853.1', '32853.1')).toBe(0);
  });

  it('sorts a full array correctly', () => {
    const codes = ['32853.1', '32853.10', '32853.2', '32853', '32854.1'];
    const sorted = [...codes].sort(compareApplicationCodes);

    expect(sorted).toEqual([
      '32853',    // base-only first
      '32853.1',  // then .1
      '32853.2',  // then .2
      '32853.10', // then .10 (numeric, not lexicographic)
      '32854.1',  // different base
    ]);
  });

  it('handles invalid codes by sorting them to the end', () => {
    const codes = ['32853.1', 'invalid', '32853.2', ''];
    const sorted = [...codes].sort(compareApplicationCodes);

    expect(sorted[0]).toBe('32853.1');
    expect(sorted[1]).toBe('32853.2');
    // Invalid codes at the end
  });
});

describe('getApplicationCodeError', () => {
  it('returns null for valid codes', () => {
    expect(getApplicationCodeError('32853')).toBeNull();
    expect(getApplicationCodeError('32853.1')).toBeNull();
    expect(getApplicationCodeError('3285')).toBeNull(); // 4-digit now valid
  });

  it('returns error message for invalid codes', () => {
    expect(getApplicationCodeError('')).toBe('Application code is required');
    expect(getApplicationCodeError('32853.')).toBe('Release index must be numeric (e.g., .1, .2, .10)');
    expect(getApplicationCodeError('32853.A')).toBe('Release index must be numeric (e.g., .1, .2, .10)');
  });
});

describe('APPLICATION_CODE_HELP', () => {
  it('provides helpful text', () => {
    expect(APPLICATION_CODE_HELP).toContain('digits');
    expect(APPLICATION_CODE_HELP).toContain('.X');
  });
});
