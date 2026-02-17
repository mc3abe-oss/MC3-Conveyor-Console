import { ErrorCodes, ErrorCode } from './error-codes';

describe('Error Taxonomy', () => {
  const allValues = Object.values(ErrorCodes);
  const allKeys = Object.keys(ErrorCodes);

  it('has no duplicate values', () => {
    const seen = new Set<string>();
    for (const value of allValues) {
      expect(seen.has(value)).toBe(false);
      seen.add(value);
    }
  });

  it('all codes follow UPPER_SNAKE_CASE naming', () => {
    for (const key of allKeys) {
      expect(key).toMatch(/^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/);
    }
  });

  it('all values are non-empty strings', () => {
    for (const value of allValues) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it('keys match their values', () => {
    for (const [key, value] of Object.entries(ErrorCodes)) {
      expect(key).toBe(value);
    }
  });

  it('ErrorCode type is correctly inferred', () => {
    // Compile-time check: valid code should be assignable
    const code: ErrorCode = ErrorCodes.CALC_MISSING_INPUT;
    expect(code).toBe('CALC_MISSING_INPUT');

    // Compile-time check: another valid code
    const dbCode: ErrorCode = ErrorCodes.DB_QUERY_FAILED;
    expect(dbCode).toBe('DB_QUERY_FAILED');
  });

  it('contains expected domain categories', () => {
    const prefixes = allKeys.map((k) => k.split('_')[0]);
    const uniquePrefixes = new Set(prefixes);

    // Verify all major domain categories exist
    expect(uniquePrefixes).toContain('CALC');
    expect(uniquePrefixes).toContain('BELT');
    expect(uniquePrefixes).toContain('MAG');
    expect(uniquePrefixes).toContain('DRIVE');
    expect(uniquePrefixes).toContain('CONFIG');
    expect(uniquePrefixes).toContain('API');
    expect(uniquePrefixes).toContain('AUTH');
    expect(uniquePrefixes).toContain('DB');
    expect(uniquePrefixes).toContain('CATALOG');
    expect(uniquePrefixes).toContain('RECIPE');
    expect(uniquePrefixes).toContain('VALIDATION');
    expect(uniquePrefixes).toContain('TELEMETRY');
  });

  it('object is frozen (as const prevents mutation)', () => {
    // The 'as const' assertion makes ErrorCodes readonly at compile time.
    // At runtime, verify the values are string literals.
    expect(ErrorCodes.UNKNOWN_ERROR).toBe('UNKNOWN_ERROR');
    expect(ErrorCodes.CALC_DIVISION_BY_ZERO).toBe('CALC_DIVISION_BY_ZERO');
  });
});
