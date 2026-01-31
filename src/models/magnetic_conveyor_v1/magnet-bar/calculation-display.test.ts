/**
 * CALCULATION DISPLAY TESTS
 *
 * Tests for the calculation breakdown display helpers.
 */

import {
  getCalculationBreakdown,
  getMagnetContributions,
  getSaturationFactor,
  getMarginStatus,
  formatNumber,
  getMarginStatusClass,
  ConveyorContext,
} from './calculation-display';
import { MagnetMaterialType } from './schema';

describe('getMagnetContributions', () => {
  it('should return ceramic contribution', () => {
    const contributions = getMagnetContributions(3, 0);

    expect(contributions).toHaveLength(1);
    expect(contributions[0].type).toBe(MagnetMaterialType.Ceramic);
    expect(contributions[0].count).toBe(3);
    expect(contributions[0].totalCapacity).toBeCloseTo(0.362, 2);
  });

  it('should return neo contribution', () => {
    const contributions = getMagnetContributions(0, 2);

    expect(contributions).toHaveLength(1);
    expect(contributions[0].type).toBe(MagnetMaterialType.Neo);
    expect(contributions[0].count).toBe(2);
    expect(contributions[0].totalCapacity).toBeCloseTo(0.596, 2);
  });

  it('should return both contributions', () => {
    const contributions = getMagnetContributions(2, 1);

    expect(contributions).toHaveLength(2);
    expect(contributions[0].type).toBe(MagnetMaterialType.Ceramic);
    expect(contributions[1].type).toBe(MagnetMaterialType.Neo);
  });

  it('should return empty for no magnets', () => {
    const contributions = getMagnetContributions(0, 0);
    expect(contributions).toHaveLength(0);
  });
});

describe('getSaturationFactor', () => {
  it('should return 1.0 for ceramic only', () => {
    const factor = getSaturationFactor(3, 0, 12);
    expect(factor).toBe(1.0);
  });

  it('should return 1.0 for low neo count', () => {
    const factor = getSaturationFactor(1, 2, 12);
    expect(factor).toBe(1.0);
  });

  it('should return 1.0 for wide bars', () => {
    const factor = getSaturationFactor(0, 5, 24);
    expect(factor).toBe(1.0);
  });

  it('should return 1.0 when mixed with ceramic', () => {
    const factor = getSaturationFactor(1, 3, 12);
    expect(factor).toBe(1.0);
  });
});

describe('getMarginStatus', () => {
  it('should return good for margin >= 1.5', () => {
    expect(getMarginStatus(1.5)).toBe('good');
    expect(getMarginStatus(2.0)).toBe('good');
  });

  it('should return warning for margin 1.25-1.5', () => {
    expect(getMarginStatus(1.25)).toBe('warning');
    expect(getMarginStatus(1.4)).toBe('warning');
  });

  it('should return insufficient for margin < 1.25', () => {
    expect(getMarginStatus(1.0)).toBe('insufficient');
    expect(getMarginStatus(0.5)).toBe('insufficient');
  });
});

describe('formatNumber', () => {
  it('should format small numbers with decimals', () => {
    expect(formatNumber(0.362)).toBe('0.362');
    expect(formatNumber(1.5, 2)).toBe('1.50');
  });

  it('should format large numbers with commas', () => {
    expect(formatNumber(1205)).toBe('1,205');
    expect(formatNumber(10000)).toBe('10,000');
  });
});

describe('getMarginStatusClass', () => {
  it('should return correct classes', () => {
    expect(getMarginStatusClass('good')).toContain('green');
    expect(getMarginStatusClass('warning')).toContain('yellow');
    expect(getMarginStatusClass('insufficient')).toContain('red');
  });
});

describe('getCalculationBreakdown', () => {
  it('should return breakdown for ceramic only', () => {
    const breakdown = getCalculationBreakdown(3, 0, 12);

    expect(breakdown.magnetContributions).toHaveLength(1);
    expect(breakdown.saturationFactor).toBe(1.0);
    expect(breakdown.barCapacity).toBeCloseTo(0.362, 2);
    expect(breakdown.formulas).toBeDefined();
  });

  it('should include throughput when context provided', () => {
    const context: ConveyorContext = {
      qtyMagnets: 22,
      beltSpeedFpm: 30,
      magnetCentersIn: 12,
      loadLbsPerHr: 500,
      patternMode: 'All Same',
    };

    const breakdown = getCalculationBreakdown(3, 0, 12, context);

    expect(breakdown.throughput).toBeDefined();
    expect(breakdown.throughput!.chipLoad).toBeGreaterThan(0);
    expect(breakdown.throughput!.achievedThroughput).toBeGreaterThan(0);
    expect(breakdown.throughput!.margin).toBeGreaterThan(0);
    expect(breakdown.totalBars).toBe(22);
    expect(breakdown.patternMode).toBe('All Same');
  });

  it('should calculate correct throughput values', () => {
    const context: ConveyorContext = {
      qtyMagnets: 22,
      beltSpeedFpm: 30,
      magnetCentersIn: 12,
      loadLbsPerHr: 500,
    };

    const breakdown = getCalculationBreakdown(3, 0, 12, context);

    // Chip load = barCapacity × qtyMagnets / 2
    const expectedChipLoad = breakdown.barCapacity * 22 / 2;
    expect(breakdown.throughput!.chipLoad).toBeCloseTo(expectedChipLoad, 2);

    // Achieved = barCapacity × qtyMagnets × beltSpeed × 60 / magnetCenters
    const expectedAchieved = (breakdown.barCapacity * 22 * 30 * 60) / 12;
    expect(breakdown.throughput!.achievedThroughput).toBeCloseTo(expectedAchieved, 0);
  });
});
