/**
 * MAGNETIC CONVEYOR v1.0 - MAGNET CALCULATIONS
 *
 * Source of Truth: docs/reference/mc3-magnetic-conveyor-master-reference.md
 *
 * Pure functions for magnet calculations:
 * - Magnet bar weight (REV-1 formula)
 * - Magnet quantity
 * - Total magnet weight
 *
 * All functions are pure (no side effects) and individually testable.
 *
 * CHANGELOG:
 * v1.0 (2026-01-23): Initial implementation
 */

import { MAGNET_WEIGHT_INTERCEPT, MAGNET_WEIGHT_SLOPE } from './constants';

// ============================================================================
// MAGNET WEIGHT CALCULATION
// ============================================================================

/**
 * Calculate weight of a single magnet bar.
 *
 * Formula (REV-1): magnetWeight = 0.22 + (magnetWidth × 0.5312)
 *
 * This formula was determined to be the most accurate from the REV-1 Calculator
 * spreadsheet analysis. Earlier versions (Rev10, Rev15) used different coefficients.
 *
 * @param magnetWidthIn - Magnet bar width in inches
 * @returns Weight of one magnet bar in lbs
 */
export function calculateMagnetWeight(magnetWidthIn: number): number {
  return MAGNET_WEIGHT_INTERCEPT + (magnetWidthIn * MAGNET_WEIGHT_SLOPE);
}

/**
 * Calculate weight of a single magnet bar using custom coefficients.
 *
 * This function allows overriding the default REV-1 coefficients for
 * testing or special cases.
 *
 * @param magnetWidthIn - Magnet bar width in inches
 * @param intercept - Y-intercept of linear formula (default: 0.22)
 * @param slope - Slope of linear formula (default: 0.5312)
 * @returns Weight of one magnet bar in lbs
 */
export function calculateMagnetWeightCustom(
  magnetWidthIn: number,
  intercept: number,
  slope: number
): number {
  return intercept + (magnetWidthIn * slope);
}

// ============================================================================
// MAGNET QUANTITY CALCULATION
// ============================================================================

/**
 * Calculate quantity of magnets on the belt.
 *
 * Formula: qtyMagnets = floor((beltLength × 12) / magnetCenters) - 1
 *
 * The -1 accounts for the gap at the chain joint/master link.
 *
 * @param beltLengthFt - Belt length in feet (both sides of chain)
 * @param magnetCentersIn - Spacing between magnet bars in inches (12, 18, 24, or 36)
 * @returns Number of magnet bars on the belt
 */
export function calculateMagnetQuantity(
  beltLengthFt: number,
  magnetCentersIn: number
): number {
  if (magnetCentersIn <= 0) {
    return 0;
  }

  const beltLengthIn = beltLengthFt * 12;
  const rawCount = Math.floor(beltLengthIn / magnetCentersIn);

  // Subtract 1 for the chain joint gap
  return Math.max(0, rawCount - 1);
}

// ============================================================================
// TOTAL MAGNET WEIGHT CALCULATION
// ============================================================================

/**
 * Calculate total weight of all magnets on the belt.
 *
 * Formula: totalMagnetWeight = magnetWeight × qtyMagnets
 *
 * @param magnetWeightEachLb - Weight of one magnet bar in lbs
 * @param qtyMagnets - Number of magnet bars on the belt
 * @returns Total magnet weight in lbs
 */
export function calculateTotalMagnetWeight(
  magnetWeightEachLb: number,
  qtyMagnets: number
): number {
  return magnetWeightEachLb * qtyMagnets;
}

// ============================================================================
// COMPOSITE CALCULATION
// ============================================================================

/**
 * Result of all magnet calculations.
 */
export interface MagnetResult {
  /** Weight of each magnet bar in lbs */
  magnet_weight_each_lb: number;
  /** Quantity of magnets on belt */
  qty_magnets: number;
  /** Total magnet weight in lbs */
  total_magnet_weight_lb: number;
}

/**
 * Calculate all magnet values in one call.
 *
 * This is a convenience function that calls all individual magnet
 * functions in the correct order.
 *
 * @param magnetWidthIn - Magnet bar width in inches
 * @param beltLengthFt - Belt length in feet
 * @param magnetCentersIn - Spacing between magnet bars in inches
 * @returns All magnet calculation results
 */
export function calculateMagnets(
  magnetWidthIn: number,
  beltLengthFt: number,
  magnetCentersIn: number
): MagnetResult {
  const magnet_weight_each_lb = calculateMagnetWeight(magnetWidthIn);
  const qty_magnets = calculateMagnetQuantity(beltLengthFt, magnetCentersIn);
  const total_magnet_weight_lb = calculateTotalMagnetWeight(
    magnet_weight_each_lb,
    qty_magnets
  );

  return {
    magnet_weight_each_lb,
    qty_magnets,
    total_magnet_weight_lb,
  };
}
