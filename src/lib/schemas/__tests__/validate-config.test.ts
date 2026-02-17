import { z } from 'zod';
import { validateConfig } from '../validate-config';

const TestSchema = z.object({
  name: z.string(),
  value: z.number().min(0),
}).passthrough();

describe('validateConfig', () => {
  it('should return the original config on success', () => {
    const config = { name: 'test', value: 42 };
    const result = validateConfig(config, 'Test', TestSchema);
    expect(result).toBe(config); // same reference
  });

  it('should return the original config on failure (observe mode)', () => {
    const config = { name: 123, value: -1 }; // both fields invalid
    const result = validateConfig(config, 'Test', TestSchema);
    // OBSERVE MODE: returns original — does NOT throw
    expect(result).toBe(config);
  });

  it('should preserve extra keys (passthrough)', () => {
    const config = { name: 'test', value: 42, extra: true };
    const result = validateConfig(config, 'Test', TestSchema);
    expect(result).toEqual({ name: 'test', value: 42, extra: true });
  });

  it('should not throw on validation failure', () => {
    expect(() => {
      validateConfig({ bad: true }, 'Test', TestSchema);
    }).not.toThrow();
  });
});
