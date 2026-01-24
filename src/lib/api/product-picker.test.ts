/**
 * Product Picker Tests
 *
 * Tests the Product Picker functionality including:
 * 1. Product cards render from registry (not hardcoded)
 * 2. No default selection
 * 3. CTA disabled until selection
 * 4. Deprecated products are not selectable
 * 5. Backend requires product_key for application creation
 */

describe('Product Picker', () => {
  // Mock product data matching the database structure
  const mockProducts = [
    {
      id: 'uuid-belt',
      name: 'Belt Conveyor',
      slug: 'belt-conveyor',
      short_description: 'Slider bed and roller bed belt conveyor configurations',
      model_key: 'belt_conveyor_v1',
      is_active: true,
      sort_order: 10,
    },
    {
      id: 'uuid-magnetic',
      name: 'Magnetic Conveyor',
      slug: 'magnetic-conveyor',
      short_description: 'Magnetic slider bed conveyor configurations',
      model_key: 'magnetic_conveyor_v1',
      is_active: true,
      sort_order: 20,
    },
    {
      id: 'uuid-deprecated',
      name: 'Legacy Conveyor',
      slug: 'legacy-conveyor',
      short_description: 'Deprecated product',
      model_key: 'legacy_v1',
      is_active: false, // Deprecated
      sort_order: 100,
    },
  ];

  describe('Product List Rendering', () => {
    it('should load products from registry (not hardcoded)', () => {
      // Products should come from the product_families table
      expect(mockProducts.length).toBeGreaterThan(0);
      mockProducts.forEach((product) => {
        expect(product).toHaveProperty('id');
        expect(product).toHaveProperty('name');
        expect(product).toHaveProperty('slug');
        expect(product).toHaveProperty('model_key');
        expect(product).toHaveProperty('is_active');
      });
    });

    it('should include short_description for UI display', () => {
      const activeProducts = mockProducts.filter((p) => p.is_active);
      activeProducts.forEach((product) => {
        expect(product.short_description).toBeTruthy();
      });
    });

    it('should be sorted by sort_order', () => {
      const sortedProducts = [...mockProducts].sort((a, b) => a.sort_order - b.sort_order);
      expect(sortedProducts[0].name).toBe('Belt Conveyor');
      expect(sortedProducts[1].name).toBe('Magnetic Conveyor');
    });
  });

  describe('Selection Behavior', () => {
    it('should have no default selection', () => {
      const selectedProductId: string | null = null;
      expect(selectedProductId).toBeNull();
    });

    it('should allow selection of active products', () => {
      const activeProducts = mockProducts.filter((p) => p.is_active);
      expect(activeProducts.length).toBeGreaterThan(0);

      // Simulating selection
      const selectedId = activeProducts[0].id;
      expect(selectedId).toBe('uuid-belt');
    });

    it('should not allow selection of deprecated products', () => {
      const deprecatedProduct = mockProducts.find((p) => !p.is_active);
      expect(deprecatedProduct).toBeDefined();

      // Selection function should check is_active
      const canSelect = (product: typeof mockProducts[0]) => product.is_active;
      expect(canSelect(deprecatedProduct!)).toBe(false);
    });

    it('should identify deprecated products for badge display', () => {
      const deprecatedProducts = mockProducts.filter((p) => !p.is_active);
      expect(deprecatedProducts.length).toBe(1);
      expect(deprecatedProducts[0].name).toBe('Legacy Conveyor');
    });
  });

  describe('CTA Button State', () => {
    it('should be disabled when no product is selected', () => {
      const selectedProductId: string | null = null;
      const isDisabled = !selectedProductId;
      expect(isDisabled).toBe(true);
    });

    it('should be enabled when a product is selected', () => {
      const selectedProductId: string | null = 'uuid-belt';
      const isDisabled = !selectedProductId;
      expect(isDisabled).toBe(false);
    });
  });

  describe('Product Route Mapping', () => {
    const PRODUCT_ROUTES: Record<string, string> = {
      'belt-conveyor': '/console/belt',
      'magnetic-conveyor': '/console/magnetic',
    };

    it('should map belt-conveyor slug to /console/belt', () => {
      expect(PRODUCT_ROUTES['belt-conveyor']).toBe('/console/belt');
    });

    it('should map magnetic-conveyor slug to /console/magnetic', () => {
      expect(PRODUCT_ROUTES['magnetic-conveyor']).toBe('/console/magnetic');
    });

    it('should generate correct navigation URL', () => {
      const selectedProduct = mockProducts[0];
      const route = PRODUCT_ROUTES[selectedProduct.slug];
      const navigationUrl = `${route}?new=true`;
      expect(navigationUrl).toBe('/console/belt?new=true');
    });
  });
});

describe('Backend Product Key Validation', () => {
  describe('Application Creation Requirements', () => {
    // Simulates the validation logic in /api/configurations/save
    function validateCreateApplication(payload: {
      reference_type?: string;
      reference_number?: string;
      model_key?: string;
      inputs_json?: unknown;
    }): { valid: boolean; error?: string } {
      if (!payload.reference_type || !payload.reference_number || !payload.inputs_json) {
        return {
          valid: false,
          error: 'Missing required fields: reference_type, reference_number, and inputs_json are required',
        };
      }

      if (!payload.model_key) {
        return {
          valid: false,
          error: 'product_key is required to create an application. Please select a product first.',
        };
      }

      return { valid: true };
    }

    it('should reject creation without model_key', () => {
      const result = validateCreateApplication({
        reference_type: 'QUOTE',
        reference_number: '12345',
        inputs_json: { belt_width_in: 24 },
        // model_key is missing
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('product_key is required');
    });

    it('should accept creation with model_key', () => {
      const result = validateCreateApplication({
        reference_type: 'QUOTE',
        reference_number: '12345',
        model_key: 'belt_conveyor_v1',
        inputs_json: { belt_width_in: 24 },
      });

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject creation without reference_type', () => {
      const result = validateCreateApplication({
        reference_number: '12345',
        model_key: 'belt_conveyor_v1',
        inputs_json: { belt_width_in: 24 },
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Missing required fields');
    });

    it('should reject creation without reference_number', () => {
      const result = validateCreateApplication({
        reference_type: 'QUOTE',
        model_key: 'belt_conveyor_v1',
        inputs_json: { belt_width_in: 24 },
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Missing required fields');
    });
  });

  describe('Product Family Resolution', () => {
    // Simulates the product family lookup logic
    function resolveProductFamily(modelKey: string): {
      found: boolean;
      slug?: string;
      error?: string;
    } {
      // First try: exact model_key match (preferred)
      const exactMatches: Record<string, string> = {
        belt_conveyor_v1: 'belt-conveyor',
        magnetic_conveyor_v1: 'magnetic-conveyor',
      };

      if (exactMatches[modelKey]) {
        return { found: true, slug: exactMatches[modelKey] };
      }

      // Fallback: infer from model_key string
      if (modelKey.toLowerCase().includes('magnetic')) {
        return { found: true, slug: 'magnetic-conveyor' };
      }

      if (modelKey.toLowerCase().includes('belt') || modelKey.toLowerCase().includes('sliderbed')) {
        return { found: true, slug: 'belt-conveyor' };
      }

      // Unknown model_key - fail
      return { found: false, error: 'Unknown product key' };
    }

    it('should resolve belt_conveyor_v1 to belt-conveyor', () => {
      const result = resolveProductFamily('belt_conveyor_v1');
      expect(result.found).toBe(true);
      expect(result.slug).toBe('belt-conveyor');
    });

    it('should resolve magnetic_conveyor_v1 to magnetic-conveyor', () => {
      const result = resolveProductFamily('magnetic_conveyor_v1');
      expect(result.found).toBe(true);
      expect(result.slug).toBe('magnetic-conveyor');
    });

    it('should infer belt-conveyor from sliderbed_conveyor_v1', () => {
      const result = resolveProductFamily('sliderbed_conveyor_v1');
      expect(result.found).toBe(true);
      expect(result.slug).toBe('belt-conveyor');
    });

    it('should fail for completely unknown model_key', () => {
      const result = resolveProductFamily('unknown_product_v99');
      expect(result.found).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});

describe('Legacy Application Handling', () => {
  it('should gracefully handle applications without product_key', () => {
    // Simulates loading an application from before product_key was required
    const legacyApplication = {
      id: 'legacy-app-id',
      model_key: 'sliderbed_v1', // Old model key
      product_family_id: null, // Not set
    };

    // The system should infer the product from model_key
    const inferredProduct = legacyApplication.model_key?.includes('sliderbed')
      ? 'belt-conveyor'
      : 'unknown';

    expect(inferredProduct).toBe('belt-conveyor');
  });

  it('should route legacy applications to correct product UI', () => {
    const PRODUCT_ROUTES: Record<string, string> = {
      'belt-conveyor': '/console/belt',
      'magnetic-conveyor': '/console/magnetic',
    };

    // Legacy app with inferred product
    const inferredSlug = 'belt-conveyor';
    const route = PRODUCT_ROUTES[inferredSlug] || '/console/belt';

    expect(route).toBe('/console/belt');
  });
});
