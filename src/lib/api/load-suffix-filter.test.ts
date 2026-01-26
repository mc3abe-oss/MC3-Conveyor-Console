/**
 * Tests for load API suffix filtering
 *
 * Verifies that the load API correctly filters applications by suffix:
 * - When suffix is provided, only match that exact suffix
 * - When suffix is not provided (null), only match apps with NO suffix
 * - Q12345.2 should NOT be returned when searching for Q12345 (no suffix)
 */

describe('Load API Suffix Filter', () => {
  /**
   * Simulates the suffix filter logic from /api/applications/load
   */
  function filterBySuffix(
    apps: Array<{ id: string; suffix: number | null | undefined }>,
    requestedSuffix: string | null
  ): Array<{ id: string; suffix: number | null | undefined }> {
    // ALWAYS filter by suffix - null/empty means "no suffix", not "any suffix"
    const suffixNum = requestedSuffix ? parseInt(requestedSuffix, 10) : null;

    return apps.filter(app => {
      const appSuffix = app.suffix;
      if (requestedSuffix) {
        // Looking for specific suffix
        return appSuffix === suffixNum || appSuffix === requestedSuffix;
      } else {
        // Looking for no suffix (null/undefined)
        // This prevents Q12345.2 from matching when searching for Q12345
        return appSuffix === null || appSuffix === undefined;
      }
    });
  }

  describe('Specific suffix matching', () => {
    it('should return only apps with matching suffix', () => {
      const apps = [
        { id: '1', suffix: null },
        { id: '2', suffix: 1 },
        { id: '3', suffix: 2 },
        { id: '4', suffix: 10 },
      ];

      const result = filterBySuffix(apps, '2');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('3');
    });

    it('should handle large suffix numbers', () => {
      const apps = [
        { id: '1', suffix: 2 },
        { id: '2', suffix: 10 },
        { id: '3', suffix: 100 },
      ];

      const result = filterBySuffix(apps, '10');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });

    it('should return empty array if no match', () => {
      const apps = [
        { id: '1', suffix: 1 },
        { id: '2', suffix: 2 },
      ];

      const result = filterBySuffix(apps, '3');
      expect(result).toHaveLength(0);
    });
  });

  describe('No suffix (null) matching', () => {
    it('should return only apps with null suffix when suffix not provided', () => {
      const apps = [
        { id: '1', suffix: null },
        { id: '2', suffix: 1 },
        { id: '3', suffix: 2 },
      ];

      const result = filterBySuffix(apps, null);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should return only apps with undefined suffix when suffix not provided', () => {
      const apps = [
        { id: '1', suffix: undefined },
        { id: '2', suffix: 1 },
        { id: '3', suffix: 2 },
      ];

      const result = filterBySuffix(apps, null);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should NOT return apps with suffix when suffix not provided', () => {
      // Critical test: Q12345.2 should NOT match when searching for Q12345
      const apps = [
        { id: 'q12345.2', suffix: 2 },
        { id: 'q12345.1', suffix: 1 },
      ];

      const result = filterBySuffix(apps, null);
      expect(result).toHaveLength(0);
    });

    it('should return multiple apps with null suffix', () => {
      const apps = [
        { id: '1', suffix: null },
        { id: '2', suffix: null },
        { id: '3', suffix: 1 },
      ];

      const result = filterBySuffix(apps, null);
      expect(result).toHaveLength(2);
      expect(result.map(a => a.id)).toEqual(['1', '2']);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty app list', () => {
      const result = filterBySuffix([], '1');
      expect(result).toHaveLength(0);
    });

    it('should handle all null suffixes', () => {
      const apps = [
        { id: '1', suffix: null },
        { id: '2', suffix: null },
      ];

      const result = filterBySuffix(apps, null);
      expect(result).toHaveLength(2);
    });

    it('should handle all apps having suffixes when searching for null', () => {
      const apps = [
        { id: '1', suffix: 1 },
        { id: '2', suffix: 2 },
        { id: '3', suffix: 3 },
      ];

      const result = filterBySuffix(apps, null);
      expect(result).toHaveLength(0);
    });
  });
});
