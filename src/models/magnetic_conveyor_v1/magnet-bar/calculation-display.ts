/**
 * CALCULATION DISPLAY HELPERS
 *
 * Functions to generate human-readable calculation breakdowns
 * for the magnet bar configuration UI.
 *
 * CHANGELOG:
 * v1.0 (2026-01-31): Initial implementation
 */

import { MagnetMaterialType } from './schema';
import { applySaturationCorrection } from './bar-builder';
import { CERAMIC_5_3_5, NEO_35_2_0 } from './seed-data';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Individual calculation step for display.
 */
export interface CalculationStep {
  /** Human-readable label */
  label: string;
  /** Optional formula expression */
  formula?: string;
  /** Input values used */
  inputs?: Record<string, number | string>;
  /** Calculated result */
  result: number;
  /** Unit for display */
  unit: string;
  /** Indentation level (0, 1, 2) */
  indent?: number;
  /** Optional note */
  note?: string;
}

/**
 * Section of related calculation steps.
 */
export interface CalculationSection {
  /** Section title */
  title: string;
  /** Steps in this section */
  steps: CalculationStep[];
}

/**
 * Magnet contribution to capacity.
 */
export interface MagnetContribution {
  type: MagnetMaterialType;
  name: string;
  count: number;
  capacityEach: number;
  totalCapacity: number;
}

/**
 * Full calculation breakdown result.
 */
export interface CalculationBreakdown {
  /** Magnet contributions */
  magnetContributions: MagnetContribution[];
  /** Raw capacity before correction */
  rawCapacity: number;
  /** Saturation correction factor (1.0 if none) */
  saturationFactor: number;
  /** Final bar capacity */
  barCapacity: number;
  /** Pattern mode name */
  patternMode: string;
  /** Total bars on conveyor */
  totalBars: number;
  /** Total conveyor capacity */
  totalConveyorCapacity: number;
  /** Throughput breakdown (if conveyor inputs provided) */
  throughput?: {
    chipLoad: number;
    achievedThroughput: number;
    requiredThroughput: number;
    margin: number;
    marginStatus: 'good' | 'warning' | 'insufficient';
  };
  /** Formula display data */
  formulas: {
    barCapacity: string;
    chipLoad: string;
    achievedThroughput: string;
    margin: string;
  };
}

/**
 * Conveyor context for throughput calculations.
 */
export interface ConveyorContext {
  qtyMagnets: number;
  beltSpeedFpm: number;
  magnetCentersIn: number;
  loadLbsPerHr: number;
  patternMode?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Effective capacity per ceramic magnet (3.5") */
const CERAMIC_CAPACITY = CERAMIC_5_3_5.hold_force_proxy_lb * CERAMIC_5_3_5.efficiency_factor;
/** Effective capacity per Neo magnet (2.0") */
const NEO_CAPACITY = NEO_35_2_0.hold_force_proxy_lb * NEO_35_2_0.efficiency_factor;

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Get magnet contributions breakdown.
 */
export function getMagnetContributions(
  ceramicCount: number,
  neoCount: number
): MagnetContribution[] {
  const contributions: MagnetContribution[] = [];

  if (ceramicCount > 0) {
    contributions.push({
      type: MagnetMaterialType.Ceramic,
      name: 'Ceramic 5 (3.5")',
      count: ceramicCount,
      capacityEach: CERAMIC_CAPACITY,
      totalCapacity: ceramicCount * CERAMIC_CAPACITY,
    });
  }

  if (neoCount > 0) {
    contributions.push({
      type: MagnetMaterialType.Neo,
      name: 'Neo 35 (2.0")',
      count: neoCount,
      capacityEach: NEO_CAPACITY,
      totalCapacity: neoCount * NEO_CAPACITY,
    });
  }

  return contributions;
}

/**
 * Get saturation factor for given configuration.
 */
export function getSaturationFactor(
  ceramicCount: number,
  neoCount: number,
  barWidthIn: number
): number {
  // Calculate raw and corrected to find the factor
  const rawNeoCapacity = neoCount * NEO_CAPACITY;
  const rawCeramicCapacity = ceramicCount * CERAMIC_CAPACITY;
  const rawTotal = rawNeoCapacity + rawCeramicCapacity;

  if (rawTotal === 0 || neoCount <= 2 || barWidthIn >= 18 || ceramicCount > 0) {
    return 1.0;
  }

  // Apply saturation logic from bar-builder
  const corrected = applySaturationCorrection(rawTotal, neoCount, ceramicCount, barWidthIn);
  return rawTotal > 0 ? corrected / rawTotal : 1.0;
}

/**
 * Calculate throughput margin status.
 */
export function getMarginStatus(margin: number): 'good' | 'warning' | 'insufficient' {
  if (margin >= 1.5) return 'good';
  if (margin >= 1.25) return 'warning';
  return 'insufficient';
}

/**
 * Generate full calculation breakdown.
 */
export function getCalculationBreakdown(
  ceramicCount: number,
  neoCount: number,
  barWidthIn: number,
  conveyorContext?: ConveyorContext
): CalculationBreakdown {
  // Magnet contributions
  const magnetContributions = getMagnetContributions(ceramicCount, neoCount);

  // Raw capacity
  const rawCapacity = magnetContributions.reduce(
    (sum, c) => sum + c.totalCapacity,
    0
  );

  // Saturation factor
  const saturationFactor = getSaturationFactor(ceramicCount, neoCount, barWidthIn);

  // Final bar capacity
  const barCapacity = rawCapacity * saturationFactor;

  // Pattern and totals (default if no context)
  const patternMode = conveyorContext?.patternMode ?? 'All Same';
  const totalBars = conveyorContext?.qtyMagnets ?? 0;
  const totalConveyorCapacity = barCapacity * totalBars;

  // Throughput calculation
  let throughput: CalculationBreakdown['throughput'];
  if (conveyorContext && barCapacity > 0) {
    const chipLoad = (barCapacity * conveyorContext.qtyMagnets) / 2;
    const achievedThroughput =
      (barCapacity *
        conveyorContext.qtyMagnets *
        conveyorContext.beltSpeedFpm *
        60) /
      conveyorContext.magnetCentersIn;
    const margin =
      conveyorContext.loadLbsPerHr > 0
        ? achievedThroughput / conveyorContext.loadLbsPerHr
        : 0;

    throughput = {
      chipLoad,
      achievedThroughput,
      requiredThroughput: conveyorContext.loadLbsPerHr,
      margin,
      marginStatus: getMarginStatus(margin),
    };
  }

  // Formula strings
  const formulas = {
    barCapacity: 'Bar Capacity = Σ(magnet_count × capacity_each) × saturation_factor',
    chipLoad: 'Chip Load = bar_capacity × qty_magnets / 2',
    achievedThroughput:
      'Achieved = bar_capacity × qty_magnets × belt_speed × 60 / magnet_centers',
    margin: 'Margin = achieved_throughput / required_throughput',
  };

  return {
    magnetContributions,
    rawCapacity,
    saturationFactor,
    barCapacity,
    patternMode,
    totalBars,
    totalConveyorCapacity,
    throughput,
    formulas,
  };
}

/**
 * Format number for display with appropriate precision.
 */
export function formatNumber(value: number, decimals: number = 3): string {
  if (value >= 1000) {
    return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
  return value.toFixed(decimals);
}

/**
 * Get CSS class for margin status.
 */
export function getMarginStatusClass(status: 'good' | 'warning' | 'insufficient'): string {
  switch (status) {
    case 'good':
      return 'text-green-600 bg-green-50';
    case 'warning':
      return 'text-yellow-600 bg-yellow-50';
    case 'insufficient':
      return 'text-red-600 bg-red-50';
  }
}

/**
 * Get icon for margin status.
 */
export function getMarginStatusIcon(status: 'good' | 'warning' | 'insufficient'): string {
  switch (status) {
    case 'good':
      return '✓';
    case 'warning':
      return '⚠';
    case 'insufficient':
      return '✗';
  }
}
