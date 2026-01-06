/**
 * Tests for fixture filtering behavior.
 *
 * These tests verify that:
 * 1. Fixtures (is_fixture=true) appear in the recipes list
 * 2. Application snapshots (is_fixture=false) do NOT appear by default
 * 3. The promote flow sets is_fixture=true
 * 4. Promote is idempotent
 */

describe('Fixture Filtering Logic', () => {
  // Mock recipe data for testing filter logic
  const mockFixture = {
    id: 'fixture-1',
    name: 'Golden Test Case 1',
    recipe_type: 'golden',
    recipe_tier: 'regression',
    recipe_status: 'active',
    is_fixture: true,
    quote_id: null,
    sales_order_id: null,
  };

  const mockApplication = {
    id: 'app-1',
    name: 'SALES_ORDER 12345 Line 1',
    recipe_type: 'reference',
    recipe_tier: 'regression',
    recipe_status: 'draft',
    is_fixture: false,
    quote_id: null,
    sales_order_id: 'so-uuid-123',
  };

  const mockLinkedQuote = {
    id: 'quote-app-1',
    name: 'Q62633.1',
    recipe_type: 'reference',
    recipe_tier: 'longtail',
    recipe_status: 'draft',
    is_fixture: false,
    quote_id: 'quote-uuid-456',
    sales_order_id: null,
  };

  const mockAllRecords = [mockFixture, mockApplication, mockLinkedQuote];

  /**
   * Simulates the filter logic from /api/recipes GET handler.
   */
  function filterRecipes(
    records: typeof mockAllRecords,
    options: { includeApplications?: boolean } = {}
  ) {
    const { includeApplications = false } = options;

    if (!includeApplications) {
      return records.filter((r) => r.is_fixture === true);
    }
    return records;
  }

  describe('Default filter (fixtures only)', () => {
    it('should only return fixtures when is_fixture=true', () => {
      const result = filterRecipes(mockAllRecords);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('fixture-1');
      expect(result[0].is_fixture).toBe(true);
    });

    it('should NOT include application snapshots', () => {
      const result = filterRecipes(mockAllRecords);

      const appIds = result.map((r) => r.id);
      expect(appIds).not.toContain('app-1');
      expect(appIds).not.toContain('quote-app-1');
    });

    it('should return empty array when no fixtures exist', () => {
      const onlyApplications = [mockApplication, mockLinkedQuote];
      const result = filterRecipes(onlyApplications);

      expect(result).toHaveLength(0);
    });
  });

  describe('Include applications filter', () => {
    it('should return all records when includeApplications=true', () => {
      const result = filterRecipes(mockAllRecords, { includeApplications: true });

      expect(result).toHaveLength(3);
    });

    it('should include both fixtures and applications', () => {
      const result = filterRecipes(mockAllRecords, { includeApplications: true });

      const ids = result.map((r) => r.id);
      expect(ids).toContain('fixture-1');
      expect(ids).toContain('app-1');
      expect(ids).toContain('quote-app-1');
    });
  });

  describe('Promote logic', () => {
    /**
     * Simulates the promote action from /api/recipes/[id]/promote.
     */
    function promoteToFixture(
      record: typeof mockApplication,
      options: { name?: string; tier?: string } = {}
    ): { promoted: typeof mockApplication; alreadyPromoted: boolean } {
      // Idempotent: if already a fixture, return as-is
      if (record.is_fixture === true) {
        return { promoted: record, alreadyPromoted: true };
      }

      // Build promoted record
      const promoted = {
        ...record,
        is_fixture: true,
        recipe_tier: options.tier || 'regression',
        recipe_status: 'active',
      };

      // Optionally rename
      if (options.name) {
        promoted.name = options.name;
      } else if (
        record.name.startsWith('SALES_ORDER') ||
        record.name.startsWith('QUOTE') ||
        record.name.startsWith('SO') ||
        record.name.match(/^Q\d+/)
      ) {
        promoted.name = `${record.name} (Promoted)`;
      }

      return { promoted, alreadyPromoted: false };
    }

    it('should set is_fixture=true on promote', () => {
      const { promoted } = promoteToFixture(mockApplication);

      expect(promoted.is_fixture).toBe(true);
    });

    it('should set tier to regression by default', () => {
      const { promoted } = promoteToFixture(mockApplication);

      expect(promoted.recipe_tier).toBe('regression');
    });

    it('should allow custom tier on promote', () => {
      const { promoted } = promoteToFixture(mockApplication, { tier: 'smoke' });

      expect(promoted.recipe_tier).toBe('smoke');
    });

    it('should auto-rename SALES_ORDER applications with (Promoted) suffix', () => {
      const { promoted } = promoteToFixture(mockApplication);

      expect(promoted.name).toBe('SALES_ORDER 12345 Line 1 (Promoted)');
    });

    it('should auto-rename Q-prefixed applications with (Promoted) suffix', () => {
      const { promoted } = promoteToFixture(mockLinkedQuote);

      expect(promoted.name).toBe('Q62633.1 (Promoted)');
    });

    it('should use custom name when provided', () => {
      const { promoted } = promoteToFixture(mockApplication, {
        name: 'Heavy Load Regression Test',
      });

      expect(promoted.name).toBe('Heavy Load Regression Test');
    });

    it('should be idempotent - return success if already promoted', () => {
      const { promoted, alreadyPromoted } = promoteToFixture(mockFixture as any);

      expect(alreadyPromoted).toBe(true);
      expect(promoted.id).toBe('fixture-1');
    });

    it('should cause promoted record to appear in fixtures list', () => {
      const { promoted } = promoteToFixture(mockApplication);
      const allRecordsAfterPromote = [mockFixture, promoted, mockLinkedQuote];

      const result = filterRecipes(allRecordsAfterPromote);

      expect(result).toHaveLength(2);
      expect(result.map((r) => r.id)).toContain('app-1');
    });
  });

  describe('Edge cases', () => {
    it('should handle null is_fixture as false (non-fixture)', () => {
      const recordWithNullFixture = { ...mockApplication, is_fixture: null as any };
      const records = [mockFixture, recordWithNullFixture];

      // Strict equality check: null !== true
      const result = records.filter((r) => r.is_fixture === true);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('fixture-1');
    });

    it('should handle undefined is_fixture as false (non-fixture)', () => {
      const recordWithUndefinedFixture = { ...mockApplication, is_fixture: undefined as any };
      const records = [mockFixture, recordWithUndefinedFixture];

      const result = records.filter((r) => r.is_fixture === true);

      expect(result).toHaveLength(1);
    });
  });
});
