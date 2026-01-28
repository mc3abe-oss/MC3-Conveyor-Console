/**
 * Product Registry Tests
 *
 * Verifies the fail-closed gating behavior of the product registry.
 *
 * CRITICAL: These tests ensure that belt-specific cards cannot render
 * on magnetic conveyors, preventing incorrect results from being displayed.
 */

import {
  getProduct,
  getProductKeys,
  hasOutputKey,
  canRenderCard,
} from '../index';

describe('Product Registry', () => {
  describe('Product Registration', () => {
    it('should have magnetic_conveyor_v1 registered', () => {
      const keys = getProductKeys();
      expect(keys).toContain('magnetic_conveyor_v1');
    });

    it('should return the magnetic conveyor module via getProduct', () => {
      const product = getProduct('magnetic_conveyor_v1');
      expect(product).toBeDefined();
      expect(product?.key).toBe('magnetic_conveyor_v1');
      expect(product?.name).toBe('Magnetic Conveyor');
      expect(product?.version).toBe('1.0.0');
    });

    it('should return undefined for unknown product', () => {
      const product = getProduct('unknown_product');
      expect(product).toBeUndefined();
    });
  });

  describe('OutputsSchema - Magnetic Keys', () => {
    it('should have magnetic-specific output keys', () => {
      const product = getProduct('magnetic_conveyor_v1');
      expect(product).toBeDefined();

      const outputKeys = product!.outputsSchema.map((f) => f.key);

      // Magnetic-specific keys that MUST be present
      expect(outputKeys).toContain('total_torque_in_lb');
      expect(outputKeys).toContain('qty_magnets');
      expect(outputKeys).toContain('chain_length_in');
      expect(outputKeys).toContain('magnet_weight_each_lb');
      expect(outputKeys).toContain('total_magnet_weight_lb');
      expect(outputKeys).toContain('running_torque_in_lb');
      expect(outputKeys).toContain('required_rpm');
      expect(outputKeys).toContain('suggested_gear_ratio');
      expect(outputKeys).toContain('belt_pull_friction_lb');
      expect(outputKeys).toContain('belt_pull_gravity_lb');
      expect(outputKeys).toContain('throughput_margin');
    });

    it('should NOT have belt-specific output keys', () => {
      const product = getProduct('magnetic_conveyor_v1');
      expect(product).toBeDefined();

      const outputKeys = product!.outputsSchema.map((f) => f.key);

      // Belt-specific keys that MUST NOT be present in magnetic
      expect(outputKeys).not.toContain('effective_tension_lbf');
      expect(outputKeys).not.toContain('wrap_angle_deg');
      expect(outputKeys).not.toContain('tight_side_tension_lbf');
      expect(outputKeys).not.toContain('slack_side_tension_lbf');
      expect(outputKeys).not.toContain('pulley_diameter_in');
      expect(outputKeys).not.toContain('required_power_hp');
      expect(outputKeys).not.toContain('service_factor');
    });
  });

  describe('hasOutputKey', () => {
    it('should return true for magnetic keys', () => {
      expect(hasOutputKey('magnetic_conveyor_v1', 'total_torque_in_lb')).toBe(true);
      expect(hasOutputKey('magnetic_conveyor_v1', 'qty_magnets')).toBe(true);
      expect(hasOutputKey('magnetic_conveyor_v1', 'chain_length_in')).toBe(true);
    });

    it('should return false for belt keys', () => {
      expect(hasOutputKey('magnetic_conveyor_v1', 'effective_tension_lbf')).toBe(false);
      expect(hasOutputKey('magnetic_conveyor_v1', 'wrap_angle_deg')).toBe(false);
      expect(hasOutputKey('magnetic_conveyor_v1', 'tight_side_tension_lbf')).toBe(false);
    });

    it('should return false for unknown product', () => {
      expect(hasOutputKey('unknown_product', 'any_key')).toBe(false);
    });
  });

  describe('canRenderCard - FAIL-CLOSED Gate', () => {
    it('should return true for magnetic keys', () => {
      expect(canRenderCard('magnetic_conveyor_v1', ['total_torque_in_lb'])).toBe(true);
      expect(canRenderCard('magnetic_conveyor_v1', ['qty_magnets', 'chain_length_in'])).toBe(true);
      expect(canRenderCard('magnetic_conveyor_v1', [
        'total_belt_pull_lb',
        'running_torque_in_lb',
        'total_torque_in_lb',
        'required_rpm',
      ])).toBe(true);
    });

    it('should return FALSE for belt keys - THIS IS THE CRITICAL FAIL-CLOSED TEST', () => {
      // Single belt key should fail
      expect(canRenderCard('magnetic_conveyor_v1', ['effective_tension_lbf'])).toBe(false);
      expect(canRenderCard('magnetic_conveyor_v1', ['wrap_angle_deg'])).toBe(false);
      expect(canRenderCard('magnetic_conveyor_v1', ['tight_side_tension_lbf'])).toBe(false);
      expect(canRenderCard('magnetic_conveyor_v1', ['slack_side_tension_lbf'])).toBe(false);
      expect(canRenderCard('magnetic_conveyor_v1', ['pulley_diameter_in'])).toBe(false);
      expect(canRenderCard('magnetic_conveyor_v1', ['required_power_hp'])).toBe(false);
    });

    it('should return FALSE if ANY required key is missing (fail-closed)', () => {
      // Mixed keys: some magnetic, some belt - should FAIL
      expect(canRenderCard('magnetic_conveyor_v1', [
        'total_torque_in_lb',        // magnetic - OK
        'effective_tension_lbf',     // belt - MISSING
      ])).toBe(false);

      expect(canRenderCard('magnetic_conveyor_v1', [
        'qty_magnets',               // magnetic - OK
        'chain_length_in',           // magnetic - OK
        'wrap_angle_deg',            // belt - MISSING
      ])).toBe(false);
    });

    it('should return false for unknown product', () => {
      expect(canRenderCard('unknown_product', ['any_key'])).toBe(false);
      expect(canRenderCard('unknown_product', [])).toBe(false);
    });

    it('should return true for empty requirements', () => {
      expect(canRenderCard('magnetic_conveyor_v1', [])).toBe(true);
    });
  });

  describe('Product Module Functions', () => {
    it('should have getDefaultInputs that returns valid inputs', () => {
      const product = getProduct('magnetic_conveyor_v1');
      expect(product).toBeDefined();

      const defaults = product!.getDefaultInputs();
      expect(defaults).toBeDefined();
      expect(defaults.style).toBe('B');
      expect(defaults.conveyor_class).toBe('standard');
      expect(defaults.belt_speed_fpm).toBe(30);
    });

    it('should have calculate that produces valid outputs', () => {
      const product = getProduct('magnetic_conveyor_v1');
      expect(product).toBeDefined();

      const inputs = product!.getDefaultInputs();
      const outputs = product!.calculate(inputs);

      expect(outputs).toBeDefined();
      expect(typeof outputs.total_torque_in_lb).toBe('number');
      expect(typeof outputs.qty_magnets).toBe('number');
      expect(typeof outputs.chain_length_in).toBe('number');
      expect(outputs.warnings).toBeDefined();
      expect(outputs.errors).toBeDefined();
    });

    it('should have validate that returns validation results', () => {
      const product = getProduct('magnetic_conveyor_v1');
      expect(product).toBeDefined();

      const inputs = product!.getDefaultInputs();
      const results = product!.validate(inputs);

      expect(Array.isArray(results)).toBe(true);
    });

    it('should have buildOutputsV2 that produces v2 format', () => {
      const product = getProduct('magnetic_conveyor_v1');
      expect(product).toBeDefined();

      const inputs = product!.getDefaultInputs();
      const outputs = product!.calculate(inputs);
      const v2 = product!.buildOutputsV2(inputs, outputs) as Record<string, unknown>;

      expect(v2).toBeDefined();
      expect(v2.meta).toBeDefined();
      expect(v2.summary).toBeDefined();
      expect(v2.calc_results).toBeDefined();
    });
  });
});
