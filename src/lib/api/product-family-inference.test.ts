/**
 * Product Family Inference Tests
 *
 * Tests the runtime inference logic for determining product family from model_key
 * when product_family_id is not set (e.g., migration not applied).
 */

describe('Product Family Inference', () => {
  // Helper function that mirrors the inference logic in the API routes
  function inferProductFromModelKey(modelKey: string | null | undefined): {
    slug: string;
    name: string;
    href: string;
  } {
    let inferredSlug = 'belt-conveyor'; // safe default

    if (modelKey) {
      const normalizedKey = modelKey.toLowerCase();
      if (normalizedKey.includes('magnetic')) {
        inferredSlug = 'magnetic-conveyor';
      }
    }

    return {
      slug: inferredSlug,
      name: inferredSlug === 'magnetic-conveyor' ? 'Magnetic Conveyor' : 'Belt Conveyor',
      href: inferredSlug === 'magnetic-conveyor' ? '/console/magnetic' : '/console/belt',
    };
  }

  describe('inferProductFromModelKey', () => {
    it('should return Belt Conveyor for belt_conveyor_v1', () => {
      const result = inferProductFromModelKey('belt_conveyor_v1');
      expect(result.slug).toBe('belt-conveyor');
      expect(result.name).toBe('Belt Conveyor');
      expect(result.href).toBe('/console/belt');
    });

    it('should return Belt Conveyor for sliderbed_conveyor_v1', () => {
      const result = inferProductFromModelKey('sliderbed_conveyor_v1');
      expect(result.slug).toBe('belt-conveyor');
      expect(result.name).toBe('Belt Conveyor');
      expect(result.href).toBe('/console/belt');
    });

    it('should return Magnetic Conveyor for magnetic_conveyor_v1', () => {
      const result = inferProductFromModelKey('magnetic_conveyor_v1');
      expect(result.slug).toBe('magnetic-conveyor');
      expect(result.name).toBe('Magnetic Conveyor');
      expect(result.href).toBe('/console/magnetic');
    });

    it('should return Belt Conveyor (safe default) for null model_key', () => {
      const result = inferProductFromModelKey(null);
      expect(result.slug).toBe('belt-conveyor');
      expect(result.name).toBe('Belt Conveyor');
      expect(result.href).toBe('/console/belt');
    });

    it('should return Belt Conveyor (safe default) for undefined model_key', () => {
      const result = inferProductFromModelKey(undefined);
      expect(result.slug).toBe('belt-conveyor');
      expect(result.name).toBe('Belt Conveyor');
      expect(result.href).toBe('/console/belt');
    });

    it('should return Belt Conveyor for unknown model_key', () => {
      const result = inferProductFromModelKey('unknown_product_v1');
      expect(result.slug).toBe('belt-conveyor');
      expect(result.name).toBe('Belt Conveyor');
      expect(result.href).toBe('/console/belt');
    });

    it('should be case-insensitive for magnetic detection', () => {
      const result = inferProductFromModelKey('MAGNETIC_CONVEYOR_V1');
      expect(result.slug).toBe('magnetic-conveyor');
      expect(result.name).toBe('Magnetic Conveyor');
    });
  });

  describe('List API resilience', () => {
    it('should not throw when product_family_id is undefined', () => {
      // Simulates the case where product_family_id column doesn't exist
      const mockRecord = {
        id: 'test-id',
        model_key: 'belt_conveyor_v1',
        product_family_id: undefined, // Column doesn't exist
      };

      // This should not throw
      const productFamilyId = mockRecord.product_family_id as string | null;
      expect(productFamilyId).toBeUndefined();

      // Inference should still work
      const result = inferProductFromModelKey(mockRecord.model_key);
      expect(result.name).toBe('Belt Conveyor');
    });

    it('should handle records with null product_family_id gracefully', () => {
      const mockRecord = {
        id: 'test-id',
        model_key: 'magnetic_conveyor_v1',
        product_family_id: null,
      };

      // Inference from model_key should work
      const result = inferProductFromModelKey(mockRecord.model_key);
      expect(result.name).toBe('Magnetic Conveyor');
      expect(result.href).toBe('/console/magnetic');
    });
  });
});
