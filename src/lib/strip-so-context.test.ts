/**
 * Tests for stripSoContextFromSearchParams utility
 *
 * This helper strips SO/Quote context query params from URLs when
 * the user clicks "Clear" to start a fresh application.
 */

import { stripSoContextFromSearchParams, SO_CONTEXT_PARAMS } from './strip-so-context';

describe('stripSoContextFromSearchParams', () => {
  it('should remove "so" param from search params', () => {
    const params = new URLSearchParams('so=30884');
    const result = stripSoContextFromSearchParams(params);
    expect(result).toBe('');
  });

  it('should remove "quote" param from search params', () => {
    const params = new URLSearchParams('quote=12345');
    const result = stripSoContextFromSearchParams(params);
    expect(result).toBe('');
  });

  it('should remove "app" param from search params', () => {
    const params = new URLSearchParams('app=abc-123-uuid');
    const result = stripSoContextFromSearchParams(params);
    expect(result).toBe('');
  });

  it('should remove "suffix" param from search params', () => {
    const params = new URLSearchParams('suffix=2');
    const result = stripSoContextFromSearchParams(params);
    expect(result).toBe('');
  });

  it('should remove "jobLine" param from search params', () => {
    const params = new URLSearchParams('jobLine=1');
    const result = stripSoContextFromSearchParams(params);
    expect(result).toBe('');
  });

  it('should remove all SO context params at once', () => {
    const params = new URLSearchParams('so=30884&suffix=1&jobLine=2&app=xyz');
    const result = stripSoContextFromSearchParams(params);
    expect(result).toBe('');
  });

  it('should preserve non-SO params', () => {
    const params = new URLSearchParams('so=30884&tab=results&debug=true');
    const result = stripSoContextFromSearchParams(params);
    expect(result).toBe('tab=results&debug=true');
  });

  it('should preserve order of remaining params', () => {
    const params = new URLSearchParams('debug=true&so=30884&tab=results');
    const result = stripSoContextFromSearchParams(params);
    expect(result).toBe('debug=true&tab=results');
  });

  it('should handle empty search params', () => {
    const params = new URLSearchParams('');
    const result = stripSoContextFromSearchParams(params);
    expect(result).toBe('');
  });

  it('should not modify the original URLSearchParams object', () => {
    const params = new URLSearchParams('so=30884&tab=results');
    stripSoContextFromSearchParams(params);
    // Original should still have 'so'
    expect(params.get('so')).toBe('30884');
    expect(params.get('tab')).toBe('results');
  });
});
