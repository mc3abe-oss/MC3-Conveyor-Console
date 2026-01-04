/**
 * Thickness Library
 *
 * Canonical library of thickness options for ALL dropdowns.
 *
 * IMPORTANT: Frame and Pulley dropdowns use the SAME options list
 * with the SAME label format. No filtering by context.
 *
 * Values are preserved from existing implementations to avoid calculation drift.
 */

import { ThicknessOption } from './types';

// ============================================================================
// THICKNESS OPTIONS LIBRARY (single source of truth)
// ============================================================================

/**
 * All available thickness options
 *
 * Sorted by sort_order (thinnest to thickest).
 * Both frame and pulley dropdowns show ALL active options.
 */
export const THICKNESS_OPTIONS: ThicknessOption[] = [
  // -------------------------------------------------------------------------
  // GAUGE THICKNESSES (thinnest first)
  // Uses industrial callout values (common in conveyor industry)
  // -------------------------------------------------------------------------
  {
    key: 'ga_18',
    system: 'gauge',
    thickness_in: 0.048,
    label: '18 ga (0.048")',
    sort_order: 10,
    is_active: true,
    notes: '18 gauge = 0.0478" (rounded to 0.048)',
  },
  {
    key: 'ga_16',
    system: 'gauge',
    thickness_in: 0.060,
    label: '16 ga (0.060")',
    sort_order: 20,
    is_active: true,
    notes: '16 gauge = 0.0598" (rounded to 0.060)',
  },
  {
    key: 'ga_14',
    system: 'gauge',
    thickness_in: 0.075,
    label: '14 ga (0.075")',
    sort_order: 30,
    is_active: true,
    notes: '14 gauge = 0.0747" (rounded to 0.075)',
  },
  {
    key: 'ga_12',
    system: 'gauge',
    thickness_in: 0.109,
    label: '12 ga (0.109")',
    sort_order: 40,
    is_active: true,
    notes: '12 gauge industrial callout = 0.109"',
  },
  {
    key: 'ga_10',
    system: 'gauge',
    thickness_in: 0.134,
    label: '10 ga (0.134")',
    sort_order: 50,
    is_active: true,
    notes: '10 gauge industrial callout = 0.134"',
  },
  {
    key: 'ga_8',
    system: 'gauge',
    thickness_in: 0.165,
    label: '8 ga (0.165")',
    sort_order: 60,
    is_active: true,
    notes: '8 gauge industrial callout = 0.165"',
  },

  // -------------------------------------------------------------------------
  // FRACTIONAL PLATE THICKNESSES (thickest)
  // -------------------------------------------------------------------------
  {
    key: 'frac_3_16',
    system: 'fraction',
    thickness_in: 0.188,
    label: '3/16" (0.188")',
    sort_order: 70,
    is_active: true,
    notes: '3/16" plate = 0.1875" (rounded to 0.188)',
  },
  {
    key: 'frac_1_4',
    system: 'fraction',
    thickness_in: 0.250,
    label: '1/4" (0.250")',
    sort_order: 80,
    is_active: true,
    notes: '1/4" plate = 0.25"',
  },
  {
    key: 'frac_3_8',
    system: 'fraction',
    thickness_in: 0.375,
    label: '3/8" (0.375")',
    sort_order: 90,
    is_active: true,
    notes: '3/8" plate = 0.375"',
  },
];

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get all active thickness options, sorted by sort_order
 * Returns the SAME list for BOTH frame and pulley dropdowns.
 */
export function getAllThicknessOptions(): ThicknessOption[] {
  return THICKNESS_OPTIONS
    .filter(opt => opt.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);
}

/**
 * Get a single thickness option by key
 */
export function getThicknessOption(key: string): ThicknessOption | undefined {
  return THICKNESS_OPTIONS.find(opt => opt.key === key);
}

/**
 * Get thickness option by thickness_in value
 * Uses tolerance for float comparison
 */
export function getThicknessOptionByValue(
  thickness_in: number,
  tolerance: number = 0.005
): ThicknessOption | undefined {
  return THICKNESS_OPTIONS.find(
    opt => opt.is_active && Math.abs(opt.thickness_in - thickness_in) < tolerance
  );
}

/**
 * Format thickness for display (uses canonical label)
 */
export function formatThickness(option: ThicknessOption): string {
  return option.label;
}

// ============================================================================
// LEGACY COMPATIBILITY MAPPINGS
// ============================================================================

/**
 * Map legacy frame_sheet_metal_gauge keys to new thickness library keys
 */
export const LEGACY_FRAME_GAUGE_MAP: Record<string, string> = {
  '10_GA': 'ga_10',
  '12_GA': 'ga_12',
  '14_GA': 'ga_14',
  '16_GA': 'ga_16',
  '18_GA': 'ga_18',
};

/**
 * Map new thickness library keys back to legacy frame_sheet_metal_gauge keys
 */
export const THICKNESS_KEY_TO_LEGACY_GAUGE: Record<string, string> = {
  'ga_10': '10_GA',
  'ga_12': '12_GA',
  'ga_14': '14_GA',
  'ga_16': '16_GA',
  'ga_18': '18_GA',
};

/**
 * Convert legacy frame gauge key to thickness library key
 */
export function legacyGaugeToThicknessKey(legacyGauge: string): string | undefined {
  return LEGACY_FRAME_GAUGE_MAP[legacyGauge];
}

/**
 * Convert thickness library key to legacy frame gauge key
 */
export function thicknessKeyToLegacyGauge(thicknessKey: string): string | undefined {
  return THICKNESS_KEY_TO_LEGACY_GAUGE[thicknessKey];
}

/**
 * Map legacy pulley wall thickness (number) to thickness library key
 * Uses tolerance-based matching
 */
export function legacyWallThicknessToKey(
  wallIn: number,
  tolerance: number = 0.005
): string | undefined {
  const option = getThicknessOptionByValue(wallIn, tolerance);
  return option?.key;
}

/**
 * Get thickness_in from thickness library key
 */
export function getThicknessInFromKey(key: string): number | undefined {
  const option = getThicknessOption(key);
  return option?.thickness_in;
}
