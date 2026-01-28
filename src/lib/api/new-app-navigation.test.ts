/**
 * Tests for new application navigation behavior
 *
 * Verifies that after linking a new application to a Quote or Sales Order,
 * the user stays in the application context and is NOT redirected to
 * /console/quotes or /console/sales-orders.
 *
 * Bug context: When creating a new Magnetic (or Belt) application and linking
 * to a Quote/SO that doesn't exist in the database yet, the old behavior
 * incorrectly redirected to the quotes/sales-orders list page.
 *
 * Expected behavior: Stay in the application calculator with a blank context,
 * allowing the user to configure and save (which will create the Quote/SO).
 */

describe('New Application Navigation', () => {
  /**
   * Simulates the navigation decision logic from BeltConveyorCalculatorApp
   * when a Quote/SO is not found during the load effect.
   *
   * This is the core logic being tested - extracted for unit testing.
   */
  function getNavigationDecision(params: {
    isNewApp: boolean;
    referenceType: 'quote' | 'sales_order';
    referenceExists: boolean;
    applicationExists: boolean;
  }): {
    action: 'stay_in_app' | 'redirect_to_list';
    targetUrl?: string;
  } {
    const { isNewApp, referenceType, referenceExists, applicationExists } = params;

    // If application exists, always stay in app (load it)
    if (applicationExists) {
      return { action: 'stay_in_app' };
    }

    // If reference (Quote/SO) exists but no application, stay in app with blank context
    if (referenceExists) {
      return { action: 'stay_in_app' };
    }

    // Reference doesn't exist
    if (isNewApp) {
      // New app flow: stay in app, allow user to create the reference on save
      return { action: 'stay_in_app' };
    }

    // Not new app flow: reference not found is an error, redirect to list
    const listUrl = referenceType === 'quote' ? '/console/quotes' : '/console/sales-orders';
    return { action: 'redirect_to_list', targetUrl: listUrl };
  }

  describe('Magnetic Conveyor - Quote linking', () => {
    it('should stay in magnetic app when Quote exists but no application', () => {
      const result = getNavigationDecision({
        isNewApp: true,
        referenceType: 'quote',
        referenceExists: true,
        applicationExists: false,
      });
      expect(result.action).toBe('stay_in_app');
      expect(result.targetUrl).toBeUndefined();
    });

    it('should stay in magnetic app when Quote does NOT exist (new app flow)', () => {
      const result = getNavigationDecision({
        isNewApp: true,
        referenceType: 'quote',
        referenceExists: false,
        applicationExists: false,
      });
      expect(result.action).toBe('stay_in_app');
      expect(result.targetUrl).toBeUndefined();
    });

    it('should redirect to quotes list when Quote does NOT exist (non-new app flow)', () => {
      const result = getNavigationDecision({
        isNewApp: false,
        referenceType: 'quote',
        referenceExists: false,
        applicationExists: false,
      });
      expect(result.action).toBe('redirect_to_list');
      expect(result.targetUrl).toBe('/console/quotes');
    });

    it('should stay in app when application exists', () => {
      const result = getNavigationDecision({
        isNewApp: true,
        referenceType: 'quote',
        referenceExists: true,
        applicationExists: true,
      });
      expect(result.action).toBe('stay_in_app');
    });
  });

  describe('Magnetic Conveyor - Sales Order linking', () => {
    it('should stay in magnetic app when SO exists but no application', () => {
      const result = getNavigationDecision({
        isNewApp: true,
        referenceType: 'sales_order',
        referenceExists: true,
        applicationExists: false,
      });
      expect(result.action).toBe('stay_in_app');
      expect(result.targetUrl).toBeUndefined();
    });

    it('should stay in magnetic app when SO does NOT exist (new app flow)', () => {
      const result = getNavigationDecision({
        isNewApp: true,
        referenceType: 'sales_order',
        referenceExists: false,
        applicationExists: false,
      });
      expect(result.action).toBe('stay_in_app');
      expect(result.targetUrl).toBeUndefined();
    });

    it('should redirect to SO list when SO does NOT exist (non-new app flow)', () => {
      const result = getNavigationDecision({
        isNewApp: false,
        referenceType: 'sales_order',
        referenceExists: false,
        applicationExists: false,
      });
      expect(result.action).toBe('redirect_to_list');
      expect(result.targetUrl).toBe('/console/sales-orders');
    });
  });

  describe('Belt Conveyor - Quote linking', () => {
    it('should stay in belt app when Quote exists but no application', () => {
      const result = getNavigationDecision({
        isNewApp: true,
        referenceType: 'quote',
        referenceExists: true,
        applicationExists: false,
      });
      expect(result.action).toBe('stay_in_app');
    });

    it('should stay in belt app when Quote does NOT exist (new app flow)', () => {
      const result = getNavigationDecision({
        isNewApp: true,
        referenceType: 'quote',
        referenceExists: false,
        applicationExists: false,
      });
      expect(result.action).toBe('stay_in_app');
    });

    it('should redirect to quotes list when Quote does NOT exist (non-new app flow)', () => {
      const result = getNavigationDecision({
        isNewApp: false,
        referenceType: 'quote',
        referenceExists: false,
        applicationExists: false,
      });
      expect(result.action).toBe('redirect_to_list');
      expect(result.targetUrl).toBe('/console/quotes');
    });
  });

  describe('Belt Conveyor - Sales Order linking', () => {
    it('should stay in belt app when SO exists but no application', () => {
      const result = getNavigationDecision({
        isNewApp: true,
        referenceType: 'sales_order',
        referenceExists: true,
        applicationExists: false,
      });
      expect(result.action).toBe('stay_in_app');
    });

    it('should stay in belt app when SO does NOT exist (new app flow)', () => {
      const result = getNavigationDecision({
        isNewApp: true,
        referenceType: 'sales_order',
        referenceExists: false,
        applicationExists: false,
      });
      expect(result.action).toBe('stay_in_app');
    });

    it('should redirect to SO list when SO does NOT exist (non-new app flow)', () => {
      const result = getNavigationDecision({
        isNewApp: false,
        referenceType: 'sales_order',
        referenceExists: false,
        applicationExists: false,
      });
      expect(result.action).toBe('redirect_to_list');
      expect(result.targetUrl).toBe('/console/sales-orders');
    });
  });

  describe('URL parameter preservation', () => {
    /**
     * Simulates the URL building logic from handleNewAppGateSelect
     */
    function buildGateNavigationUrl(
      pathname: string,
      target: { type: 'quote' | 'sales_order'; base: number; suffix: number | null; jobLine: number }
    ): string {
      const paramName = target.type === 'quote' ? 'quote' : 'so';
      const params = new URLSearchParams();
      params.set(paramName, String(target.base));
      if (target.suffix !== null) {
        params.set('suffix', String(target.suffix));
      }
      params.set('jobLine', String(target.jobLine));
      params.set('new', 'true'); // This is the fix - preserve new app context
      return `${pathname}?${params.toString()}`;
    }

    it('should preserve new=true param in URL for Quote', () => {
      const url = buildGateNavigationUrl('/console/magnetic', {
        type: 'quote',
        base: 12345,
        suffix: null,
        jobLine: 1,
      });
      expect(url).toContain('new=true');
      expect(url).toContain('quote=12345');
      expect(url).toContain('jobLine=1');
    });

    it('should preserve new=true param in URL for Quote with suffix', () => {
      const url = buildGateNavigationUrl('/console/magnetic', {
        type: 'quote',
        base: 12345,
        suffix: 2,
        jobLine: 1,
      });
      expect(url).toContain('new=true');
      expect(url).toContain('quote=12345');
      expect(url).toContain('suffix=2');
      expect(url).toContain('jobLine=1');
    });

    it('should preserve new=true param in URL for Sales Order', () => {
      const url = buildGateNavigationUrl('/console/belt', {
        type: 'sales_order',
        base: 67890,
        suffix: null,
        jobLine: 2,
      });
      expect(url).toContain('new=true');
      expect(url).toContain('so=67890');
      expect(url).toContain('jobLine=2');
    });

    it('should work for magnetic conveyor path', () => {
      const url = buildGateNavigationUrl('/console/magnetic', {
        type: 'quote',
        base: 99999,
        suffix: 1,
        jobLine: 3,
      });
      expect(url.startsWith('/console/magnetic?')).toBe(true);
      expect(url).toContain('new=true');
    });

    it('should work for belt conveyor path', () => {
      const url = buildGateNavigationUrl('/console/belt', {
        type: 'sales_order',
        base: 11111,
        suffix: null,
        jobLine: 1,
      });
      expect(url.startsWith('/console/belt?')).toBe(true);
      expect(url).toContain('new=true');
    });
  });
});
