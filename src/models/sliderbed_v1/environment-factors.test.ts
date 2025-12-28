/**
 * Environment Factors v1.9 Tests
 *
 * Tests for:
 * - normalizeEnvironmentFactors helper
 * - prepareEnvironmentFactorsForSave helper
 * - Backward compatibility with legacy single-string format
 * - Blocklist for legacy "Indoor" and variants
 */

import {
  normalizeEnvironmentFactors,
  prepareEnvironmentFactorsForSave,
  ENVIRONMENT_FACTOR_BLOCKLIST,
} from './schema';

describe('ENVIRONMENT_FACTOR_BLOCKLIST', () => {
  it('should include common Indoor variants', () => {
    expect(ENVIRONMENT_FACTOR_BLOCKLIST.has('indoor')).toBe(true);
    expect(ENVIRONMENT_FACTOR_BLOCKLIST.has('Indoor')).toBe(true);
    expect(ENVIRONMENT_FACTOR_BLOCKLIST.has('indoors')).toBe(true);
    expect(ENVIRONMENT_FACTOR_BLOCKLIST.has('Indoors')).toBe(true);
    expect(ENVIRONMENT_FACTOR_BLOCKLIST.has('indoor_inactive')).toBe(true);
    expect(ENVIRONMENT_FACTOR_BLOCKLIST.has('Indoor_Inactive')).toBe(true);
  });

  it('should not include valid factors', () => {
    expect(ENVIRONMENT_FACTOR_BLOCKLIST.has('Dusty')).toBe(false);
    expect(ENVIRONMENT_FACTOR_BLOCKLIST.has('Washdown')).toBe(false);
    expect(ENVIRONMENT_FACTOR_BLOCKLIST.has('Outdoor')).toBe(false);
  });
});

describe('normalizeEnvironmentFactors', () => {
  describe('blocklist removal', () => {
    it('should remove Indoor from array', () => {
      const input = ['Indoor', 'Dusty'];
      const result = normalizeEnvironmentFactors(input);
      expect(result).toEqual(['Dusty']);
    });

    it('should remove all Indoor variants from array', () => {
      const input = ['Indoor', 'indoor', 'Indoors', 'indoors', 'indoor_inactive', 'Dusty'];
      const result = normalizeEnvironmentFactors(input);
      expect(result).toEqual(['Dusty']);
    });

    it('should return empty array when only Indoor is present', () => {
      const result = normalizeEnvironmentFactors(['Indoor']);
      expect(result).toEqual([]);
    });

    it('should return empty array for Indoor string', () => {
      const result = normalizeEnvironmentFactors('Indoor');
      expect(result).toEqual([]);
    });

    it('should return empty array for legacy indoor_inactive', () => {
      const result = normalizeEnvironmentFactors(['indoor_inactive']);
      expect(result).toEqual([]);
    });
  });

  describe('array inputs', () => {
    it('should return valid factors sorted', () => {
      const input = ['Washdown', 'Dusty'];
      const result = normalizeEnvironmentFactors(input);
      expect(result).toEqual(['Dusty', 'Washdown']);
    });

    it('should deduplicate array values', () => {
      const input = ['Dusty', 'Dusty', 'Washdown'];
      const result = normalizeEnvironmentFactors(input);
      expect(result).toEqual(['Dusty', 'Washdown']);
    });

    it('should sort array values alphabetically', () => {
      const input = ['Washdown', 'Dusty', 'Corrosive'];
      const result = normalizeEnvironmentFactors(input);
      expect(result).toEqual(['Corrosive', 'Dusty', 'Washdown']);
    });

    it('should filter out empty strings', () => {
      const input = ['Dusty', '', 'Washdown', '   '];
      const result = normalizeEnvironmentFactors(input);
      expect(result).toEqual(['Dusty', 'Washdown']);
    });

    it('should filter out non-string values', () => {
      const input = ['Dusty', null, 123, 'Washdown', undefined];
      const result = normalizeEnvironmentFactors(input as unknown as string[]);
      expect(result).toEqual(['Dusty', 'Washdown']);
    });

    it('should return empty array for empty array', () => {
      const result = normalizeEnvironmentFactors([]);
      expect(result).toEqual([]);
    });

    it('should return empty array for array with only invalid values', () => {
      const result = normalizeEnvironmentFactors(['', '   ']);
      expect(result).toEqual([]);
    });
  });

  describe('string inputs (legacy backward compatibility)', () => {
    it('should convert single valid string to array', () => {
      const result = normalizeEnvironmentFactors('Washdown');
      expect(result).toEqual(['Washdown']);
    });

    it('should handle Dusty enum value', () => {
      const result = normalizeEnvironmentFactors('Dusty');
      expect(result).toEqual(['Dusty']);
    });

    it('should return empty array for empty string', () => {
      const result = normalizeEnvironmentFactors('');
      expect(result).toEqual([]);
    });

    it('should return empty array for whitespace-only string', () => {
      const result = normalizeEnvironmentFactors('   ');
      expect(result).toEqual([]);
    });
  });

  describe('null/undefined/invalid inputs', () => {
    it('should return empty array for null', () => {
      const result = normalizeEnvironmentFactors(null);
      expect(result).toEqual([]);
    });

    it('should return empty array for undefined', () => {
      const result = normalizeEnvironmentFactors(undefined);
      expect(result).toEqual([]);
    });

    it('should return empty array for number', () => {
      const result = normalizeEnvironmentFactors(123);
      expect(result).toEqual([]);
    });

    it('should return empty array for object', () => {
      const result = normalizeEnvironmentFactors({ foo: 'bar' });
      expect(result).toEqual([]);
    });
  });
});

describe('prepareEnvironmentFactorsForSave', () => {
  it('should deduplicate and sort factors', () => {
    const input = ['Washdown', 'Dusty', 'Dusty'];
    const result = prepareEnvironmentFactorsForSave(input);
    expect(result).toEqual(['Dusty', 'Washdown']);
  });

  it('should remove Indoor from saved factors', () => {
    const input = ['Indoor', 'Dusty'];
    const result = prepareEnvironmentFactorsForSave(input);
    expect(result).toEqual(['Dusty']);
  });

  it('should return empty array for empty array', () => {
    const result = prepareEnvironmentFactorsForSave([]);
    expect(result).toEqual([]);
  });

  it('should return empty array for null input', () => {
    const result = prepareEnvironmentFactorsForSave(null as unknown as string[]);
    expect(result).toEqual([]);
  });

  it('should handle single-element array', () => {
    const result = prepareEnvironmentFactorsForSave(['Dusty']);
    expect(result).toEqual(['Dusty']);
  });

  it('should return empty array when only blocked factors present', () => {
    const result = prepareEnvironmentFactorsForSave(['Indoor', 'indoor', 'Indoors']);
    expect(result).toEqual([]);
  });
});

describe('backward compatibility integration', () => {
  it('should strip Indoor from legacy config', () => {
    // Simulates loading old config: { environment_factors: "Indoor" }
    const legacyValue = 'Indoor';
    const normalized = normalizeEnvironmentFactors(legacyValue);
    expect(normalized).toEqual([]);
  });

  it('should handle legacy config with Washdown value', () => {
    const legacyValue = 'Washdown';
    const normalized = normalizeEnvironmentFactors(legacyValue);
    expect(normalized).toEqual(['Washdown']);
  });

  it('should strip Indoor from array but keep other factors', () => {
    // Old config had Indoor + Dusty, new config should only have Dusty
    const newValue = ['Indoor', 'Dusty'];
    const normalized = normalizeEnvironmentFactors(newValue);
    expect(normalized).toEqual(['Dusty']);
  });

  it('should preserve single-factor behavior after normalization', () => {
    // A single-element array should behave like the old single string
    const legacyNormalized = normalizeEnvironmentFactors('Washdown');
    const newNormalized = normalizeEnvironmentFactors(['Washdown']);
    expect(legacyNormalized).toEqual(newNormalized);
  });

  it('regression: given inputs with indoor and dusty, only dusty remains', () => {
    // This is the acceptance criteria from the requirements
    const input = ['indoor', 'dusty'];
    const result = normalizeEnvironmentFactors(input);
    expect(result).toEqual(['dusty']);
  });
});
