/**
 * Engine Dispatch Tests
 *
 * Verifies that the calculation engine correctly dispatches to
 * product-specific calculators based on productKey.
 */

import { runCalculation } from './engine';
import { getProduct } from '../../products';

describe('Calculation Engine Dispatch', () => {
  describe('dispatches to magnetic calculator when productKey is magnetic_conveyor_v1', () => {
    it('should produce magnetic-specific output keys', () => {
      // Arrange: Get default magnetic inputs from the product module
      const magneticProduct = getProduct('magnetic_conveyor_v1');
      expect(magneticProduct).toBeDefined();
      const magneticInputs = magneticProduct!.getDefaultInputs();

      // Act: Run calculation with magnetic productKey
      const result = runCalculation({
        inputs: magneticInputs,
        productKey: 'magnetic_conveyor_v1',
      });

      // Assert: Result should contain magnetic-specific output keys
      expect(result.outputs).toBeDefined();

      // Check for magnetic-specific keys used by MagneticDetailCards.tsx
      expect(result.outputs.chain_length_in).toBeDefined();
      expect(typeof result.outputs.chain_length_in).toBe('number');

      expect(result.outputs.qty_magnets).toBeDefined();
      expect(typeof result.outputs.qty_magnets).toBe('number');

      expect(result.outputs.total_torque_in_lb).toBeDefined();
      expect(typeof result.outputs.total_torque_in_lb).toBe('number');

      // Magnetic outputs should NOT have belt-specific keys
      expect(result.outputs.drive_T1_lbf).toBeUndefined();
      expect(result.outputs.drive_pulley_diameter_in).toBeUndefined();
    });
  });

  describe('falls back to belt when productKey is missing', () => {
    it('should produce belt-specific output keys', () => {
      // Arrange: Get default belt inputs from the product module
      const beltProduct = getProduct('belt_conveyor_v1');
      expect(beltProduct).toBeDefined();
      const beltInputs = beltProduct!.getDefaultInputs();

      // Act: Run calculation WITHOUT productKey (should fall back to belt)
      const result = runCalculation({
        inputs: beltInputs,
        // productKey intentionally omitted
      });

      // Assert: Result should contain belt-specific output keys
      expect(result.outputs).toBeDefined();

      // Check for belt-specific keys
      expect(result.outputs.drive_T1_lbf).toBeDefined();
      expect(typeof result.outputs.drive_T1_lbf).toBe('number');

      expect(result.outputs.drive_pulley_diameter_in).toBeDefined();
      expect(typeof result.outputs.drive_pulley_diameter_in).toBe('number');

      // Belt outputs should NOT have magnetic-specific keys
      expect(result.outputs.chain_length_in).toBeUndefined();
      expect(result.outputs.qty_magnets).toBeUndefined();
      expect(result.outputs.total_torque_in_lb).toBeUndefined();
    });
  });

  describe('falls back to belt for unknown productKey', () => {
    it('should produce belt-specific output keys for unknown product', () => {
      // Arrange: Get default belt inputs
      const beltProduct = getProduct('belt_conveyor_v1');
      const beltInputs = beltProduct!.getDefaultInputs();

      // Act: Run calculation with unknown productKey
      const result = runCalculation({
        inputs: beltInputs,
        productKey: 'unknown_product_xyz',
      });

      // Assert: Should fall back to belt and produce belt outputs
      expect(result.outputs).toBeDefined();
      expect(result.outputs.drive_T1_lbf).toBeDefined();
      expect(typeof result.outputs.drive_T1_lbf).toBe('number');
    });
  });

  describe('belt productKey explicitly dispatches to belt', () => {
    it('should produce belt-specific output keys with explicit belt_conveyor_v1', () => {
      // Arrange
      const beltProduct = getProduct('belt_conveyor_v1');
      const beltInputs = beltProduct!.getDefaultInputs();

      // Act: Run calculation with explicit belt productKey
      const result = runCalculation({
        inputs: beltInputs,
        productKey: 'belt_conveyor_v1',
      });

      // Assert
      expect(result.outputs).toBeDefined();
      expect(result.outputs.drive_T1_lbf).toBeDefined();
      expect(result.outputs.drive_pulley_diameter_in).toBeDefined();
    });
  });

  describe('magnetic calculation responds to input changes', () => {
    it('should produce different outputs when inputs change', () => {
      // Arrange: Get default magnetic inputs
      const magneticProduct = getProduct('magnetic_conveyor_v1');
      expect(magneticProduct).toBeDefined();
      const defaultInputs = magneticProduct!.getDefaultInputs();

      // Act: Calculate with default inputs
      const result1 = runCalculation({
        inputs: defaultInputs,
        productKey: 'magnetic_conveyor_v1',
      });

      // Modify inputs - increase infeed length
      const modifiedInputs = {
        ...defaultInputs,
        infeed_length_in: (defaultInputs as any).infeed_length_in + 50,
      };

      const result2 = runCalculation({
        inputs: modifiedInputs,
        productKey: 'magnetic_conveyor_v1',
      });

      // Assert: Outputs should be different
      expect(result1.outputs.chain_length_in).toBeDefined();
      expect(result2.outputs.chain_length_in).toBeDefined();
      // Chain length should increase with longer infeed
      expect(result2.outputs.chain_length_in).toBeGreaterThan(
        result1.outputs.chain_length_in as number
      );
    });

    it('should produce valid numeric outputs for all geometry fields', () => {
      // Arrange
      const magneticProduct = getProduct('magnetic_conveyor_v1');
      const inputs = magneticProduct!.getDefaultInputs();

      // Act
      const result = runCalculation({
        inputs,
        productKey: 'magnetic_conveyor_v1',
      });

      // Assert: All geometry outputs should be valid numbers (not NaN)
      expect(Number.isFinite(result.outputs.incline_length_in)).toBe(true);
      expect(Number.isFinite(result.outputs.incline_run_in)).toBe(true);
      expect(Number.isFinite(result.outputs.horizontal_length_in)).toBe(true);
      expect(Number.isFinite(result.outputs.path_length_ft)).toBe(true);
      expect(Number.isFinite(result.outputs.belt_length_ft)).toBe(true);
      expect(Number.isFinite(result.outputs.chain_length_in)).toBe(true);
    });
  });
});
