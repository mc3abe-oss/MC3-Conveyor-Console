/**
 * Environment Factors v1.9 Tests
 *
 * Tests for:
 * - normalizeEnvironmentFactors helper
 * - prepareEnvironmentFactorsForSave helper
 * - Backward compatibility with legacy single-string format
 */

import {
  normalizeEnvironmentFactors,
  prepareEnvironmentFactorsForSave,
  EnvironmentFactors,
} from './schema';

describe('normalizeEnvironmentFactors', () => {
  describe('array inputs', () => {
    it('should return array as-is when already valid', () => {
      const input = ['Indoor', 'Washdown'];
      const result = normalizeEnvironmentFactors(input);
      expect(result).toEqual(['Indoor', 'Washdown']);
    });

    it('should deduplicate array values', () => {
      const input = ['Indoor', 'Indoor', 'Washdown'];
      const result = normalizeEnvironmentFactors(input);
      expect(result).toEqual(['Indoor', 'Washdown']);
    });

    it('should sort array values alphabetically', () => {
      const input = ['Washdown', 'Indoor', 'Dusty'];
      const result = normalizeEnvironmentFactors(input);
      expect(result).toEqual(['Dusty', 'Indoor', 'Washdown']);
    });

    it('should filter out empty strings', () => {
      const input = ['Indoor', '', 'Washdown', '   '];
      const result = normalizeEnvironmentFactors(input);
      expect(result).toEqual(['Indoor', 'Washdown']);
    });

    it('should filter out non-string values', () => {
      const input = ['Indoor', null, 123, 'Washdown', undefined];
      const result = normalizeEnvironmentFactors(input as unknown as string[]);
      expect(result).toEqual(['Indoor', 'Washdown']);
    });

    it('should return default for empty array', () => {
      const result = normalizeEnvironmentFactors([]);
      expect(result).toEqual([EnvironmentFactors.Indoor]);
    });

    it('should return default for array with only invalid values', () => {
      const result = normalizeEnvironmentFactors(['', '   ']);
      expect(result).toEqual([EnvironmentFactors.Indoor]);
    });
  });

  describe('string inputs (legacy backward compatibility)', () => {
    it('should convert single string to array', () => {
      const result = normalizeEnvironmentFactors('Washdown');
      expect(result).toEqual(['Washdown']);
    });

    it('should handle EnvironmentFactors enum value', () => {
      const result = normalizeEnvironmentFactors(EnvironmentFactors.Dusty);
      expect(result).toEqual(['Dusty']);
    });

    it('should return default for empty string', () => {
      const result = normalizeEnvironmentFactors('');
      expect(result).toEqual([EnvironmentFactors.Indoor]);
    });

    it('should return default for whitespace-only string', () => {
      const result = normalizeEnvironmentFactors('   ');
      expect(result).toEqual([EnvironmentFactors.Indoor]);
    });
  });

  describe('null/undefined/invalid inputs', () => {
    it('should return default for null', () => {
      const result = normalizeEnvironmentFactors(null);
      expect(result).toEqual([EnvironmentFactors.Indoor]);
    });

    it('should return default for undefined', () => {
      const result = normalizeEnvironmentFactors(undefined);
      expect(result).toEqual([EnvironmentFactors.Indoor]);
    });

    it('should return default for number', () => {
      const result = normalizeEnvironmentFactors(123);
      expect(result).toEqual([EnvironmentFactors.Indoor]);
    });

    it('should return default for object', () => {
      const result = normalizeEnvironmentFactors({ foo: 'bar' });
      expect(result).toEqual([EnvironmentFactors.Indoor]);
    });
  });
});

describe('prepareEnvironmentFactorsForSave', () => {
  it('should deduplicate and sort factors', () => {
    const input = ['Washdown', 'Indoor', 'Indoor'];
    const result = prepareEnvironmentFactorsForSave(input);
    expect(result).toEqual(['Indoor', 'Washdown']);
  });

  it('should return default for empty array', () => {
    const result = prepareEnvironmentFactorsForSave([]);
    expect(result).toEqual([EnvironmentFactors.Indoor]);
  });

  it('should return default for invalid input', () => {
    const result = prepareEnvironmentFactorsForSave(null as unknown as string[]);
    expect(result).toEqual([EnvironmentFactors.Indoor]);
  });

  it('should handle single-element array', () => {
    const result = prepareEnvironmentFactorsForSave(['Dusty']);
    expect(result).toEqual(['Dusty']);
  });
});

describe('backward compatibility integration', () => {
  it('should handle legacy config with single Indoor value', () => {
    // Simulates loading old config: { environment_factors: "Indoor" }
    const legacyValue = 'Indoor';
    const normalized = normalizeEnvironmentFactors(legacyValue);
    expect(normalized).toEqual(['Indoor']);
  });

  it('should handle legacy config with Washdown value', () => {
    const legacyValue = 'Washdown';
    const normalized = normalizeEnvironmentFactors(legacyValue);
    expect(normalized).toEqual(['Washdown']);
  });

  it('should handle new config with array value', () => {
    const newValue = ['Indoor', 'Dusty'];
    const normalized = normalizeEnvironmentFactors(newValue);
    expect(normalized).toEqual(['Dusty', 'Indoor']); // sorted
  });

  it('should preserve single-factor behavior after normalization', () => {
    // A single-element array should behave like the old single string
    const legacyNormalized = normalizeEnvironmentFactors('Washdown');
    const newNormalized = normalizeEnvironmentFactors(['Washdown']);
    expect(legacyNormalized).toEqual(newNormalized);
  });
});
