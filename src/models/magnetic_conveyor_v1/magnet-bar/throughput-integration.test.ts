/**
 * THROUGHPUT INTEGRATION TESTS
 *
 * Tests for bar configuration integration with throughput calculations.
 *
 * CHANGELOG:
 * v1.0 (2026-01-31): Initial implementation
 */

import {
  calculateThroughput,
  getBarCapacity,
  calculateConveyorTotalCapacity,
  calculate,
} from '../formulas';

import {
  MagneticInputs,
  ConveyorStyle,
  ConveyorClass,
  MagnetType,
  MaterialType,
  ChipType,
  BarConfigurationInput,
} from '../schema';

import { calculateBarCapacityFromCounts } from './bar-builder';
import { BarPatternMode } from './schema';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const createBasicInputs = (overrides?: Partial<MagneticInputs>): MagneticInputs => ({
  style: ConveyorStyle.B,
  conveyor_class: ConveyorClass.Standard,
  infeed_length_in: 36,
  discharge_height_in: 24,
  incline_angle_deg: 45,
  magnet_width_in: 12,
  magnet_type: MagnetType.Ceramic5,
  magnet_centers_in: 12,
  belt_speed_fpm: 30,
  load_lbs_per_hr: 500,
  material_type: MaterialType.Steel,
  chip_type: ChipType.Small,
  ...overrides,
});

// ============================================================================
// calculateThroughput TESTS
// ============================================================================

describe('calculateThroughput', () => {
  it('should return placeholder values when no bar capacity provided', () => {
    const result = calculateThroughput(49, 30, 12, 500, 0);

    expect(result.chip_load_lb).toBe(0);
    expect(result.achieved_throughput_lbs_hr).toBe(500); // Returns requested
    expect(result.throughput_margin).toBe(1.0); // Perfect margin
  });

  it('should calculate chip load correctly', () => {
    // chipLoad = removalPerBar × qtyMagnets / 2
    const barCapacity = 0.362; // Ceramic only 12" bar
    const qtyMagnets = 49;
    const result = calculateThroughput(qtyMagnets, 30, 12, 500, barCapacity);

    // Expected: 0.362 × 49 / 2 = 8.869
    expect(result.chip_load_lb).toBeCloseTo(8.869, 2);
  });

  it('should calculate achieved throughput correctly', () => {
    // achievedThroughput = removalPerBar × qtyMagnets × beltSpeed × 60 / magnetCenters
    const barCapacity = 0.362;
    const qtyMagnets = 49;
    const beltSpeed = 30;
    const magnetCenters = 12;

    const result = calculateThroughput(qtyMagnets, beltSpeed, magnetCenters, 500, barCapacity);

    // Expected: 0.362 × 49 × 30 × 60 / 12 = 2659.7
    const expected = (barCapacity * qtyMagnets * beltSpeed * 60) / magnetCenters;
    expect(result.achieved_throughput_lbs_hr).toBeCloseTo(expected, 1);
  });

  it('should calculate throughput margin correctly', () => {
    const barCapacity = 0.362;
    const result = calculateThroughput(49, 30, 12, 500, barCapacity);

    // Margin = achieved / required
    const expectedMargin = result.achieved_throughput_lbs_hr / 500;
    expect(result.throughput_margin).toBeCloseTo(expectedMargin, 4);
  });

  it('should handle zero required throughput', () => {
    const result = calculateThroughput(49, 30, 12, 0, 0.362);

    expect(result.throughput_margin).toBe(0);
  });
});

// ============================================================================
// getBarCapacity TESTS
// ============================================================================

describe('getBarCapacity', () => {
  it('should use bar configuration when provided', () => {
    const barConfig: BarConfigurationInput = {
      bar_capacity_lb: 0.717,
      ceramic_count: 1,
      neo_count: 2,
    };

    const result = getBarCapacity(barConfig);

    expect(result.capacity).toBe(0.717);
    expect(result.ceramicCount).toBe(1);
    expect(result.neoCount).toBe(2);
  });

  // D1 ruling (2026-07-14): no estimation. With no configured bar the capacity
  // is 0 — the calc never invents a default bar. Bar estimation is a deferred
  // post-port feature.
  it('should return zero capacity when no config (D1: no estimation)', () => {
    const result = getBarCapacity(undefined);

    expect(result.capacity).toBe(0);
    expect(result.ceramicCount).toBe(0);
    expect(result.neoCount).toBe(0);
  });

  it('should return zero capacity when configured capacity is zero (D1)', () => {
    const barConfig: BarConfigurationInput = {
      bar_capacity_lb: 0,
      ceramic_count: 0,
      neo_count: 0,
    };

    const result = getBarCapacity(barConfig);

    expect(result.capacity).toBe(0);
    expect(result.ceramicCount).toBe(0);
    expect(result.neoCount).toBe(0);
  });
});

// ============================================================================
// calculateConveyorTotalCapacity TESTS
// ============================================================================

describe('calculateConveyorTotalCapacity', () => {
  it('should return 0 when no config provided', () => {
    const result = calculateConveyorTotalCapacity(undefined, 49);
    expect(result).toBe(0);
  });

  it('should calculate all-same pattern correctly', () => {
    const barConfig: BarConfigurationInput = {
      bar_capacity_lb: 0.362,
      ceramic_count: 3,
      neo_count: 0,
      pattern_mode: 'all_same',
    };

    const result = calculateConveyorTotalCapacity(barConfig, 10);

    // 10 bars × 0.362 = 3.62
    expect(result).toBeCloseTo(3.62, 2);
  });

  it('should calculate alternating pattern correctly', () => {
    const barConfig: BarConfigurationInput = {
      bar_capacity_lb: 0.4,
      ceramic_count: 3,
      neo_count: 0,
      pattern_mode: 'alternating',
      secondary_bar_capacity_lb: 0.2,
    };

    const result = calculateConveyorTotalCapacity(barConfig, 10);

    // 5 primary × 0.4 + 5 secondary × 0.2 = 2.0 + 1.0 = 3.0
    expect(result).toBeCloseTo(3.0, 2);
  });

  it('should calculate interval pattern correctly', () => {
    const barConfig: BarConfigurationInput = {
      bar_capacity_lb: 0.4,
      ceramic_count: 3,
      neo_count: 0,
      pattern_mode: 'interval',
      secondary_bar_capacity_lb: 0.2,
      interval_count: 4,
    };

    const result = calculateConveyorTotalCapacity(barConfig, 12);

    // 9 primary (positions 1,2,3,5,6,7,9,10,11) + 3 secondary (4,8,12)
    // 9 × 0.4 + 3 × 0.2 = 3.6 + 0.6 = 4.2
    expect(result).toBeCloseTo(4.2, 2);
  });
});

// ============================================================================
// FULL INTEGRATION TESTS
// ============================================================================

describe('calculate() integration', () => {
  it('should compute zero chip load without bar_configuration (D1: no estimation)', () => {
    const inputs = createBasicInputs();

    const outputs = calculate(inputs);

    // Should not throw and should have valid outputs
    expect(outputs.qty_magnets).toBeGreaterThan(0);
    // D1 ruling: no configured bar → capacity 0, chip load 0, achieved
    // throughput degenerates to requested (margin 1.0)
    expect(outputs.bar_capacity_lb).toBe(0);
    expect(outputs.bar_ceramic_count).toBe(0);
    expect(outputs.bar_neo_count).toBe(0);
    expect(outputs.chip_load_lb).toBe(0);
    expect(outputs.achieved_throughput_lbs_hr).toBe(500);
    expect(outputs.throughput_margin).toBe(1.0);
  });

  it('should use bar_configuration when provided', () => {
    const barConfig: BarConfigurationInput = {
      bar_capacity_lb: 0.717, // Higher capacity with Neo
      ceramic_count: 1,
      neo_count: 2,
    };

    const inputs = createBasicInputs({ bar_configuration: barConfig });
    const outputs = calculate(inputs);

    expect(outputs.bar_capacity_lb).toBe(0.717);
    expect(outputs.bar_ceramic_count).toBe(1);
    expect(outputs.bar_neo_count).toBe(2);
  });

  it('should calculate higher throughput with Neo configuration', () => {
    // Ceramic only — explicit config (D1: no config means chip 0, not a
    // ceramic bar, so the comparison needs both bars actually configured)
    const ceramicConfig: BarConfigurationInput = {
      bar_capacity_lb: 0.362, // 3 ceramic, 12" bar
      ceramic_count: 3,
      neo_count: 0,
    };
    const ceramicInputs = createBasicInputs({ bar_configuration: ceramicConfig });
    const ceramicOutputs = calculate(ceramicInputs);

    // With Neo
    const neoConfig: BarConfigurationInput = {
      bar_capacity_lb: 0.717, // w/ 2 Neo
      ceramic_count: 1,
      neo_count: 2,
    };
    const neoInputs = createBasicInputs({ bar_configuration: neoConfig });
    const neoOutputs = calculate(neoInputs);

    // Neo configuration should achieve higher throughput
    expect(neoOutputs.achieved_throughput_lbs_hr).toBeGreaterThan(
      ceramicOutputs.achieved_throughput_lbs_hr
    );
  });

  it('should include pattern mode in outputs', () => {
    const barConfig: BarConfigurationInput = {
      bar_capacity_lb: 0.362,
      ceramic_count: 3,
      neo_count: 0,
      pattern_mode: 'alternating',
      secondary_bar_capacity_lb: 0.2,
    };

    const inputs = createBasicInputs({ bar_configuration: barConfig });
    const outputs = calculate(inputs);

    expect(outputs.bar_pattern_mode).toBe('alternating');
    expect(outputs.total_conveyor_capacity_lb).toBeGreaterThan(0);
  });

  it('should calculate chip load with bar configuration', () => {
    const barConfig: BarConfigurationInput = {
      bar_capacity_lb: 0.5,
      ceramic_count: 2,
      neo_count: 1,
    };

    const inputs = createBasicInputs({ bar_configuration: barConfig });
    const outputs = calculate(inputs);

    // chip_load = bar_capacity × qty_magnets / 2
    const expectedChipLoad = 0.5 * outputs.qty_magnets / 2;
    expect(outputs.chip_load_lb).toBeCloseTo(expectedChipLoad, 2);
  });
});

// ============================================================================
// CAPACITY COMPARISON TESTS
// ============================================================================

describe('Capacity calculations match lookup tables', () => {
  it('should match 12" ceramic-only lookup within 5%', () => {
    const capacity = calculateBarCapacityFromCounts(3, 0, 12);
    const expected = 0.362;
    const error = Math.abs(capacity - expected) / expected;
    expect(error).toBeLessThan(0.05);
  });

  it('should match 12" w/ 1 Neo lookup within 5%', () => {
    const capacity = calculateBarCapacityFromCounts(2, 1, 12);
    const expected = 0.52;
    const error = Math.abs(capacity - expected) / expected;
    expect(error).toBeLessThan(0.05);
  });

  it('should match 12" w/ 2 Neo lookup within 20%', () => {
    const capacity = calculateBarCapacityFromCounts(1, 2, 12);
    const expected = 0.717;
    // Allow higher tolerance for mixed configs due to interaction effects
    const error = Math.abs(capacity - expected) / expected;
    expect(error).toBeLessThan(0.20);
  });

  it('should match 24" ceramic-only lookup within 5%', () => {
    const capacity = calculateBarCapacityFromCounts(6, 0, 24);
    const expected = 0.723;
    const error = Math.abs(capacity - expected) / expected;
    expect(error).toBeLessThan(0.05);
  });
});
