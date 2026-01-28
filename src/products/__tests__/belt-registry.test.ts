/**
 * Belt Conveyor Product Registry Tests
 *
 * Verifies that:
 * 1. belt_conveyor_v1 is registered correctly
 * 2. Has belt-specific output keys (tensions, pulleys, HP)
 * 3. Does NOT have magnetic-specific keys (magnets, chain_length)
 * 4. canRenderCard works correctly for both products
 * 5. Cross-product isolation: belt keys blocked on magnetic, magnetic keys blocked on belt
 */

import { getProduct, canRenderCard, getProductKeys, hasOutputKey } from '../index';

describe('Belt Conveyor Product Registry', () => {
  describe('Product Registration', () => {
    it('should have belt_conveyor_v1 registered', () => {
      const keys = getProductKeys();
      expect(keys).toContain('belt_conveyor_v1');
    });

    it('should return the belt product module via getProduct', () => {
      const product = getProduct('belt_conveyor_v1');
      expect(product).toBeDefined();
      expect(product?.key).toBe('belt_conveyor_v1');
      expect(product?.name).toBe('Belt Conveyor');
    });

    it('should have both products registered', () => {
      const keys = getProductKeys();
      expect(keys).toContain('belt_conveyor_v1');
      expect(keys).toContain('magnetic_conveyor_v1');
      expect(keys.length).toBe(2);
    });
  });

  describe('Belt OutputsSchema - Belt-Specific Keys', () => {
    it('should have tension output keys', () => {
      const product = getProduct('belt_conveyor_v1');
      const outputKeys = product?.outputsSchema.map(f => f.key) || [];

      expect(outputKeys).toContain('drive_T1_lbf');
      expect(outputKeys).toContain('drive_T2_lbf');
      expect(outputKeys).toContain('total_belt_pull_lb');
      expect(outputKeys).toContain('friction_pull_lb');
    });

    it('should have pulley output keys', () => {
      const product = getProduct('belt_conveyor_v1');
      const outputKeys = product?.outputsSchema.map(f => f.key) || [];

      expect(outputKeys).toContain('drive_pulley_diameter_in');
      expect(outputKeys).toContain('tail_pulley_diameter_in');
      expect(outputKeys).toContain('pulley_face_length_in');
      expect(outputKeys).toContain('pulley_requires_crown');
    });

    it('should have drive output keys', () => {
      const product = getProduct('belt_conveyor_v1');
      const outputKeys = product?.outputsSchema.map(f => f.key) || [];

      expect(outputKeys).toContain('torque_drive_shaft_inlbf');
      expect(outputKeys).toContain('drive_shaft_rpm');
      expect(outputKeys).toContain('gear_ratio');
    });

    it('should have belt and geometry output keys', () => {
      const product = getProduct('belt_conveyor_v1');
      const outputKeys = product?.outputsSchema.map(f => f.key) || [];

      expect(outputKeys).toContain('total_belt_length_in');
      expect(outputKeys).toContain('belt_weight_lbf');
      expect(outputKeys).toContain('belt_speed_fpm');
    });
  });

  describe('Belt OutputsSchema - NOT Having Magnetic-Specific Keys', () => {
    it('should NOT have magnet output keys', () => {
      const product = getProduct('belt_conveyor_v1');
      const outputKeys = product?.outputsSchema.map(f => f.key) || [];

      expect(outputKeys).not.toContain('qty_magnets');
      expect(outputKeys).not.toContain('magnet_weight_each_lb');
      expect(outputKeys).not.toContain('total_magnet_weight_lb');
    });

    it('should NOT have magnetic chain output keys', () => {
      const product = getProduct('belt_conveyor_v1');
      const outputKeys = product?.outputsSchema.map(f => f.key) || [];

      expect(outputKeys).not.toContain('chain_length_in');
      expect(outputKeys).not.toContain('chain_weight_lb_per_ft_used');
    });

    it('should NOT have magnetic-style torque keys', () => {
      const product = getProduct('belt_conveyor_v1');
      const outputKeys = product?.outputsSchema.map(f => f.key) || [];

      // Magnetic uses total_torque_in_lb, belt uses torque_drive_shaft_inlbf
      expect(outputKeys).not.toContain('total_torque_in_lb');
      expect(outputKeys).not.toContain('running_torque_in_lb');
    });
  });

  describe('hasOutputKey Function', () => {
    it('should return true for belt-specific keys on belt', () => {
      expect(hasOutputKey('belt_conveyor_v1', 'drive_T1_lbf')).toBe(true);
      expect(hasOutputKey('belt_conveyor_v1', 'drive_pulley_diameter_in')).toBe(true);
      expect(hasOutputKey('belt_conveyor_v1', 'torque_drive_shaft_inlbf')).toBe(true);
    });

    it('should return false for magnetic-specific keys on belt', () => {
      expect(hasOutputKey('belt_conveyor_v1', 'qty_magnets')).toBe(false);
      expect(hasOutputKey('belt_conveyor_v1', 'chain_length_in')).toBe(false);
      expect(hasOutputKey('belt_conveyor_v1', 'total_torque_in_lb')).toBe(false);
    });
  });

  describe('canRenderCard - FAIL-CLOSED Gate', () => {
    it('should return true for belt keys on belt', () => {
      expect(canRenderCard('belt_conveyor_v1', ['drive_T1_lbf'])).toBe(true);
      expect(canRenderCard('belt_conveyor_v1', ['drive_pulley_diameter_in', 'tail_pulley_diameter_in'])).toBe(true);
      expect(canRenderCard('belt_conveyor_v1', ['torque_drive_shaft_inlbf', 'drive_shaft_rpm'])).toBe(true);
    });

    it('should return FALSE for magnetic keys on belt - THIS IS THE CRITICAL FAIL-CLOSED TEST', () => {
      expect(canRenderCard('belt_conveyor_v1', ['qty_magnets'])).toBe(false);
      expect(canRenderCard('belt_conveyor_v1', ['chain_length_in'])).toBe(false);
      expect(canRenderCard('belt_conveyor_v1', ['total_torque_in_lb'])).toBe(false);
    });

    it('should return FALSE if ANY required key is missing (fail-closed)', () => {
      // Mix of belt key and magnetic key - should fail because magnetic key is missing
      expect(canRenderCard('belt_conveyor_v1', ['drive_T1_lbf', 'qty_magnets'])).toBe(false);
      expect(canRenderCard('belt_conveyor_v1', ['torque_drive_shaft_inlbf', 'total_torque_in_lb'])).toBe(false);
    });

    it('should return true for empty requirements', () => {
      expect(canRenderCard('belt_conveyor_v1', [])).toBe(true);
    });
  });

  describe('Cross-Product Isolation', () => {
    it('belt keys should work on belt, fail on magnetic', () => {
      const beltKeys = ['drive_T1_lbf', 'drive_T2_lbf', 'drive_pulley_diameter_in'];

      // Should work on belt
      expect(canRenderCard('belt_conveyor_v1', beltKeys)).toBe(true);

      // Should fail on magnetic (magnetic doesn't have these keys)
      expect(canRenderCard('magnetic_conveyor_v1', beltKeys)).toBe(false);
    });

    it('magnetic keys should work on magnetic, fail on belt', () => {
      const magneticKeys = ['qty_magnets', 'total_torque_in_lb', 'chain_length_in'];

      // Should work on magnetic
      expect(canRenderCard('magnetic_conveyor_v1', magneticKeys)).toBe(true);

      // Should fail on belt (belt doesn't have these keys)
      expect(canRenderCard('belt_conveyor_v1', magneticKeys)).toBe(false);
    });

    it('each product has unique keys the other lacks', () => {
      // Belt-unique keys
      expect(hasOutputKey('belt_conveyor_v1', 'drive_T1_lbf')).toBe(true);
      expect(hasOutputKey('magnetic_conveyor_v1', 'drive_T1_lbf')).toBe(false);

      expect(hasOutputKey('belt_conveyor_v1', 'drive_pulley_diameter_in')).toBe(true);
      expect(hasOutputKey('magnetic_conveyor_v1', 'drive_pulley_diameter_in')).toBe(false);

      // Magnetic-unique keys
      expect(hasOutputKey('magnetic_conveyor_v1', 'qty_magnets')).toBe(true);
      expect(hasOutputKey('belt_conveyor_v1', 'qty_magnets')).toBe(false);

      expect(hasOutputKey('magnetic_conveyor_v1', 'chain_length_in')).toBe(true);
      expect(hasOutputKey('belt_conveyor_v1', 'chain_length_in')).toBe(false);
    });
  });

  describe('Product Module Functions', () => {
    it('should have getDefaultInputs that returns valid inputs', () => {
      const product = getProduct('belt_conveyor_v1');
      expect(product?.getDefaultInputs).toBeDefined();

      const defaults = product?.getDefaultInputs();
      expect(defaults).toBeDefined();
      expect(defaults?.conveyor_length_cc_in).toBe(120);
      expect(defaults?.belt_width_in).toBe(24);
      expect(defaults?.belt_speed_fpm).toBe(65);
    });

    it('should have calculate that produces valid outputs', () => {
      const product = getProduct('belt_conveyor_v1');
      expect(product?.calculate).toBeDefined();

      const inputs = product?.getDefaultInputs();
      const outputs = product?.calculate(inputs!);

      expect(outputs).toBeDefined();
      expect(outputs?.drive_shaft_rpm).toBeGreaterThan(0);
      expect(outputs?.total_belt_length_in).toBeGreaterThan(0);
    });

    it('should have validate that returns validation results', () => {
      const product = getProduct('belt_conveyor_v1');
      expect(product?.validate).toBeDefined();

      const inputs = product?.getDefaultInputs();
      const results = product?.validate(inputs!);

      expect(Array.isArray(results)).toBe(true);
    });
  });
});
