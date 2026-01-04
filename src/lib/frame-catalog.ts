/**
 * Frame Catalog (v1.14, updated v1.50)
 *
 * Lookup tables for frame construction materials.
 * - Sheet metal gauge → thickness (in)
 * - Structural channel series → web thickness (in)
 *
 * Values are industry-standard references.
 * Full precision stored; round only for display.
 *
 * v1.50: Now uses unified Thickness Library internally.
 * Frame and Pulley dropdowns show the SAME options.
 */

import type {
  SheetMetalGauge,
  StructuralChannelSeries,
} from '../models/sliderbed_v1/schema';
import {
  getAllThicknessOptions,
  legacyGaugeToThicknessKey,
  getThicknessOption,
  formatThickness,
  type ThicknessOption,
} from './thickness';

// ============================================================================
// SHEET METAL GAUGE THICKNESS (inches)
// v1.50: Now derived from Thickness Library for consistency
// ============================================================================

/**
 * Sheet metal gauge to thickness lookup (standard steel gauge)
 *
 * Source: Manufacturers' Standard Gauge for Steel Sheet (via Thickness Library)
 * Values in inches, full precision.
 *
 * COMPATIBILITY: This object is preserved for backward compatibility.
 * New code should use getAllThicknessOptions().
 */
export const SHEET_METAL_GAUGE_THICKNESS: Record<SheetMetalGauge, number> = {
  '10_GA': 0.1345,
  '12_GA': 0.1046,
  '14_GA': 0.0747,
  '16_GA': 0.0598,
  '18_GA': 0.0478,
};

/**
 * All sheet metal gauge values in order (thickest to thinnest)
 *
 * COMPATIBILITY: This array is preserved for backward compatibility.
 * New code should use getAllThicknessOptions().
 */
export const SHEET_METAL_GAUGES: SheetMetalGauge[] = [
  '10_GA',
  '12_GA',
  '14_GA',
  '16_GA',
  '18_GA',
];

/**
 * Get ALL thickness options from unified library
 * Returns the SAME options for both frame and pulley dropdowns.
 * Sorted by sort_order (thickest to thinnest)
 */
export function getSheetMetalThicknessOptions(): ThicknessOption[] {
  return getAllThicknessOptions();
}

// ============================================================================
// STRUCTURAL CHANNEL THICKNESS (inches)
// ============================================================================

/**
 * Structural channel series to web thickness lookup
 *
 * Source: AISC Steel Construction Manual
 * Values are web thickness (t_w) in inches.
 *
 * C-channels: American Standard Channel
 * MC-channels: Miscellaneous Channel
 */
export const STRUCTURAL_CHANNEL_THICKNESS: Record<StructuralChannelSeries, number> = {
  C3: 0.170,   // C3x4.1 web thickness
  C4: 0.184,   // C4x5.4 web thickness
  C5: 0.190,   // C5x6.7 web thickness
  C6: 0.200,   // C6x8.2 web thickness
  MC6: 0.180,  // MC6x12 web thickness
  MC8: 0.190,  // MC8x8.5 web thickness
};

/**
 * All structural channel series values
 */
export const STRUCTURAL_CHANNEL_SERIES: StructuralChannelSeries[] = [
  'C3',
  'C4',
  'C5',
  'C6',
  'MC6',
  'MC8',
];

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get thickness for a sheet metal gauge
 * @param gauge - Sheet metal gauge (e.g., '12_GA')
 * @returns Thickness in inches, or undefined if gauge not found
 */
export function getSheetMetalThickness(gauge: SheetMetalGauge): number | undefined {
  return SHEET_METAL_GAUGE_THICKNESS[gauge];
}

/**
 * Get web thickness for a structural channel series
 * @param series - Channel series (e.g., 'C4')
 * @returns Web thickness in inches, or undefined if series not found
 */
export function getStructuralChannelThickness(series: StructuralChannelSeries): number | undefined {
  return STRUCTURAL_CHANNEL_THICKNESS[series];
}

/**
 * Format gauge label with thickness for UI display
 * @param gauge - Sheet metal gauge
 * @returns Formatted string from canonical Thickness Library
 *
 * v1.50: Now uses Thickness Library for consistent formatting.
 */
export function formatGaugeWithThickness(gauge: SheetMetalGauge): string {
  // Use thickness library if available
  const thicknessKey = legacyGaugeToThicknessKey(gauge);
  if (thicknessKey) {
    const option = getThicknessOption(thicknessKey);
    if (option) {
      return formatThickness(option);
    }
  }

  // Fallback to legacy format (should not happen with valid gauges)
  const thickness = SHEET_METAL_GAUGE_THICKNESS[gauge];
  if (thickness === undefined) {
    return gauge.replace('_GA', ' ga');
  }
  const gaugeNum = gauge.replace('_GA', '');
  return `${gaugeNum} ga (${thickness.toFixed(3)}")`;
}

/**
 * Format channel series label for UI display
 * @param series - Structural channel series
 * @returns Formatted string like "C4 (0.184" web)"
 */
export function formatChannelWithThickness(series: StructuralChannelSeries): string {
  const thickness = STRUCTURAL_CHANNEL_THICKNESS[series];
  if (thickness === undefined) {
    return series;
  }
  return `${series} (${thickness.toFixed(3)}" web)`;
}
