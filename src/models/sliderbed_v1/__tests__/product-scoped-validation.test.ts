/**
 * Product-Scoped Validation Tests
 *
 * Tests that validation rules are correctly scoped to product types:
 * - Belt conveyor products require belt selection
 * - Magnetic conveyor products do NOT require belt selection
 */

import { runCalculation } from '../../../lib/calculator/engine';
import { buildDefaultInputs } from '../schema';
import { requiresBeltValidation, validateInputs } from '../rules';

describe('Product-Scoped Validation', () => {
  describe('requiresBeltValidation helper', () => {
    it('should return true for belt_conveyor_v1', () => {
      expect(requiresBeltValidation('belt_conveyor_v1')).toBe(true);
    });

    it('should return true for sliderbed_conveyor_v1', () => {
      expect(requiresBeltValidation('sliderbed_conveyor_v1')).toBe(true);
    });

    it('should return true for rollerbed_conveyor_v1', () => {
      expect(requiresBeltValidation('rollerbed_conveyor_v1')).toBe(true);
    });

    it('should return false for magnetic_conveyor_v1', () => {
      expect(requiresBeltValidation('magnetic_conveyor_v1')).toBe(false);
    });

    it('should return true for undefined (backward compatibility)', () => {
      expect(requiresBeltValidation(undefined)).toBe(true);
    });

    it('should return false for unknown product keys', () => {
      // Unknown products should not require belt validation
      expect(requiresBeltValidation('some_other_product_v1')).toBe(false);
    });
  });

  describe('validateInputs with productKey', () => {
    // Create minimal inputs without any belt selection (matches core.test.ts approach)
    // Must set material_form to avoid early return in validation
    const createNoBeltInputs = () => {
      const inputs = buildDefaultInputs();
      // Use object spread with explicit undefined to match core.test.ts approach
      return {
        ...inputs,
        // Required for validation to proceed past material_form check
        material_form: 'PARTS',
        part_weight_lbs: 5,
        part_length_in: 12,
        part_width_in: 6,
        // Clear ALL belt selection options
        belt_catalog_key: undefined,
        belt_piw: undefined,
        belt_pil: undefined,
        belt_piw_override: undefined,
        belt_pil_override: undefined,
        belt_coeff_piw: undefined,
        belt_coeff_pil: undefined,
      };
    };

    it('should require belt selection for belt_conveyor_v1', () => {
      const inputs = createNoBeltInputs();

      const errors = validateInputs(inputs, 'belt_conveyor_v1');
      const beltError = errors.find(e => e.message.includes('Belt selection is required'));
      expect(beltError).toBeDefined();
    });

    it('should NOT require belt selection for magnetic_conveyor_v1', () => {
      const inputs = createNoBeltInputs();

      const errors = validateInputs(inputs, 'magnetic_conveyor_v1');
      const beltError = errors.find(e => e.message.includes('Belt selection is required'));
      expect(beltError).toBeUndefined();
    });

    it('should require belt selection when productKey is undefined (backward compat)', () => {
      const inputs = createNoBeltInputs();

      const errors = validateInputs(inputs);
      const beltError = errors.find(e => e.message.includes('Belt selection is required'));
      expect(beltError).toBeDefined();
    });
  });

  describe('runCalculation with productKey', () => {
    // Create minimal inputs without any belt selection
    // Must set material_form to avoid early return in validation
    const createNoBeltInputs = () => {
      const inputs = buildDefaultInputs();
      return {
        ...inputs,
        // Required for validation to proceed past material_form check
        material_form: 'PARTS',
        part_weight_lbs: 5,
        part_length_in: 12,
        part_width_in: 6,
        // Clear ALL belt selection options
        belt_catalog_key: undefined,
        belt_piw: undefined,
        belt_pil: undefined,
        belt_piw_override: undefined,
        belt_pil_override: undefined,
        belt_coeff_piw: undefined,
        belt_coeff_pil: undefined,
      };
    };

    it('should fail for belt_conveyor_v1 without belt selection', () => {
      const inputs = createNoBeltInputs();

      const result = runCalculation({ inputs, productKey: 'belt_conveyor_v1' });
      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.message.includes('Belt selection is required'))).toBe(true);
    });

    it('should NOT fail for magnetic_conveyor_v1 without belt selection', () => {
      const inputs = createNoBeltInputs();

      const result = runCalculation({ inputs, productKey: 'magnetic_conveyor_v1' });
      // Should not have belt selection error
      const hasBeltError = result.errors?.some(e => e.message.includes('Belt selection is required'));
      expect(hasBeltError).toBeFalsy();
    });

    it('should succeed for belt_conveyor_v1 with belt coefficients', () => {
      const inputs = buildDefaultInputs();
      // Provide belt coefficients
      inputs.belt_coeff_piw = 0.109;
      inputs.belt_coeff_pil = 0.109;

      const result = runCalculation({ inputs, productKey: 'belt_conveyor_v1' });
      const hasBeltError = result.errors?.some(e => e.message.includes('Belt selection is required'));
      expect(hasBeltError).toBeFalsy();
    });

    it('should succeed for belt_conveyor_v1 with belt catalog key', () => {
      const inputs = buildDefaultInputs();
      // Provide belt catalog key (simulating belt selection)
      inputs.belt_catalog_key = 'TEST_BELT';

      const result = runCalculation({ inputs, productKey: 'belt_conveyor_v1' });
      const hasBeltError = result.errors?.some(e => e.message.includes('Belt selection is required'));
      expect(hasBeltError).toBeFalsy();
    });
  });

  describe('Legacy Application Handling', () => {
    it('should handle legacy applications without productKey', () => {
      const inputs = buildDefaultInputs();
      // Provide belt coefficients (legacy apps have this)
      inputs.belt_coeff_piw = 0.109;
      inputs.belt_coeff_pil = 0.109;

      // No productKey passed (simulates legacy application load)
      const result = runCalculation({ inputs });
      const hasBeltError = result.errors?.some(e => e.message.includes('Belt selection is required'));
      expect(hasBeltError).toBeFalsy();
    });
  });
});
