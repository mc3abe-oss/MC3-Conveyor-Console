/**
 * Cleat Catalog Library (v1.23)
 *
 * Single source of truth for cleat-related types, interfaces, and calculations.
 * This module handles:
 * - Type definitions for cleat patterns, styles, centers
 * - Interfaces for catalog items and center factors
 * - Lookup functions for base min pulley diameter
 * - Centers factor lookup and computation
 * - Cache management for API data
 * - React hook for client-side data fetching (v1.24)
 *
 * IMPORTANT: Do NOT bury cleat logic in belt-catalog.ts. Keep it dedicated here.
 */

import { useState, useEffect } from 'react';

// =============================================================================
// ENUMS & TYPES
// =============================================================================

/** Cleat pattern options */
export type CleatPattern = 'STRAIGHT_CROSS' | 'CURVED_90' | 'CURVED_120' | 'CURVED_150';

export const CLEAT_PATTERNS: CleatPattern[] = [
  'STRAIGHT_CROSS',
  'CURVED_90',
  'CURVED_120',
  'CURVED_150',
];

export const CLEAT_PATTERN_LABELS: Record<CleatPattern, string> = {
  STRAIGHT_CROSS: 'Straight Cross',
  CURVED_90: '90° Curved',
  CURVED_120: '120° Curved',
  CURVED_150: '150° Curved',
};

/** Cleat style options */
export type CleatStyle = 'SOLID' | 'DRILL_SIPED_1IN';

export const CLEAT_STYLES: CleatStyle[] = ['SOLID', 'DRILL_SIPED_1IN'];

export const CLEAT_STYLE_LABELS: Record<CleatStyle, string> = {
  SOLID: 'Solid',
  DRILL_SIPED_1IN: 'Drill & Siped (1")',
};

/** Standard center-to-center spacing values */
export const CLEAT_CENTERS_OPTIONS = [12, 8, 6, 4] as const;
export type CleatCenters = (typeof CLEAT_CENTERS_OPTIONS)[number];

/** Default material family */
export const DEFAULT_CLEAT_MATERIAL_FAMILY = 'PVC_HOT_WELDED';

/** Default rounding increment for min pulley diameter */
export const DEFAULT_ROUNDING_INCREMENT_IN = 0.5;

/**
 * Map user-specified cleat centers to the applicable bucket for min pulley diameter calc.
 *
 * The buckets (12, 8, 6, 4) are used ONLY for min pulley diameter calculation.
 * This function determines which bucket applies based on the user's desired spacing.
 *
 * Mapping:
 * - centers <= 4  → bucket 4  (tightest, highest min pulley)
 * - centers <= 6  → bucket 6
 * - centers <= 8  → bucket 8
 * - centers > 8   → bucket 12 (loosest, lowest min pulley)
 *
 * @param centersIn - User's desired cleat centers in inches
 * @returns The applicable bucket value (4, 6, 8, or 12)
 */
export function getCentersBucket(centersIn: number): CleatCenters {
  if (centersIn <= 4) return 4;
  if (centersIn <= 6) return 6;
  if (centersIn <= 8) return 8;
  return 12;
}

/**
 * Get human-readable label for a centers bucket
 */
export function getCentersBucketLabel(bucket: CleatCenters): string {
  return `${bucket}" bucket`;
}

// =============================================================================
// INTERFACES
// =============================================================================

export interface CleatCatalogItem {
  id: string;
  material_family: string;
  cleat_profile: string;
  cleat_size: string;
  cleat_pattern: CleatPattern;
  min_pulley_dia_12in_solid_in: number;
  min_pulley_dia_12in_drill_siped_in: number | null;
  notes: string | null;
  source_doc: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CleatCenterFactor {
  id: string;
  material_family: string;
  centers_in: number;
  factor: number;
  notes: string | null;
  is_active: boolean;
}

// =============================================================================
// LOOKUP RESULT INTERFACES
// =============================================================================

export interface CleatBaseMinLookupResult {
  success: boolean;
  baseMinDia12In: number | null;
  ruleSource: string;
  error?: string;
}

export interface CleatsMinPulleyResult {
  success: boolean;
  baseMinDia12In: number | null;
  centersFactor: number;
  adjustedMinDia: number | null;
  roundedMinDia: number | null;
  ruleSource: string;
  drillSipedCaution: boolean;
  error?: string;
}

// =============================================================================
// LOOKUP FUNCTIONS
// =============================================================================

/**
 * Look up base minimum pulley diameter @ 12" centers from cleat catalog
 *
 * @param catalog - Array of cleat catalog items
 * @param materialFamily - Material family key (e.g., 'PVC_HOT_WELDED')
 * @param profile - Cleat profile (e.g., 'T-Cleat')
 * @param size - Cleat size (e.g., '1"')
 * @param pattern - Cleat pattern (e.g., 'STRAIGHT_CROSS')
 * @param style - Cleat style ('SOLID' or 'DRILL_SIPED_1IN')
 * @returns Lookup result with base min diameter or error
 */
export function lookupCleatBaseMinDia12(
  catalog: CleatCatalogItem[],
  materialFamily: string,
  profile: string,
  size: string,
  pattern: CleatPattern,
  style: CleatStyle
): CleatBaseMinLookupResult {
  // Find matching catalog entry
  const entry = catalog.find(
    (c) =>
      c.is_active &&
      c.material_family === materialFamily &&
      c.cleat_profile === profile &&
      c.cleat_size === size &&
      c.cleat_pattern === pattern
  );

  if (!entry) {
    return {
      success: false,
      baseMinDia12In: null,
      ruleSource: '',
      error: `Cleat combination not found: ${profile} ${size} ${pattern} (${materialFamily})`,
    };
  }

  // Get base min pulley dia based on style
  let baseMin: number | null;

  if (style === 'DRILL_SIPED_1IN') {
    baseMin = entry.min_pulley_dia_12in_drill_siped_in;
    if (baseMin === null) {
      return {
        success: false,
        baseMinDia12In: null,
        ruleSource: '',
        error: `Drill & Siped style not supported for ${profile} ${size} ${pattern}. Select Solid style or choose a different cleat configuration.`,
      };
    }
  } else {
    baseMin = entry.min_pulley_dia_12in_solid_in;
  }

  const ruleSource = entry.source_doc
    ? `${entry.source_doc}: ${profile} ${size} ${pattern}`
    : `Cleat Catalog: ${profile} ${size} ${pattern}`;

  return {
    success: true,
    baseMinDia12In: baseMin,
    ruleSource,
  };
}

/**
 * Get centers factor from cleat_center_factors table
 *
 * @param centerFactors - Array of center factor items
 * @param materialFamily - Material family key
 * @param centersIn - Center-to-center spacing in inches
 * @returns Factor value or error
 */
export function getCentersFactor(
  centerFactors: CleatCenterFactor[],
  materialFamily: string,
  centersIn: number
): { success: boolean; factor: number; error?: string } {
  const factorEntry = centerFactors.find(
    (f) => f.is_active && f.material_family === materialFamily && f.centers_in === centersIn
  );

  if (!factorEntry) {
    return {
      success: false,
      factor: 1.0,
      error: `Centers factor not found for ${centersIn}" spacing (${materialFamily})`,
    };
  }

  return {
    success: true,
    factor: factorEntry.factor,
  };
}

/**
 * Compute final cleats minimum pulley diameter
 *
 * @param baseMinDia12In - Base minimum diameter at 12" centers
 * @param centersFactor - Multiplier for centers spacing
 * @param roundingIncrementIn - Rounding increment (default 0.5")
 * @returns Computed adjusted and rounded minimum diameter
 */
export function computeCleatsMinPulleyDia(
  baseMinDia12In: number,
  centersFactor: number,
  roundingIncrementIn: number = DEFAULT_ROUNDING_INCREMENT_IN
): { adjusted: number; roundedUp: number } {
  const adjusted = baseMinDia12In * centersFactor;
  const roundedUp = Math.ceil(adjusted / roundingIncrementIn) * roundingIncrementIn;
  return { adjusted, roundedUp };
}

/**
 * Full cleat minimum pulley diameter lookup and calculation
 *
 * Combines:
 * 1. Base min diameter lookup from catalog
 * 2. Centers factor lookup
 * 3. Final computation with rounding
 *
 * @returns Complete result with all intermediate values for UI display
 */
export function lookupCleatsMinPulleyDia(
  catalog: CleatCatalogItem[],
  centerFactors: CleatCenterFactor[],
  materialFamily: string,
  profile: string,
  size: string,
  pattern: CleatPattern,
  style: CleatStyle,
  centersIn: CleatCenters,
  roundingIncrementIn: number = DEFAULT_ROUNDING_INCREMENT_IN
): CleatsMinPulleyResult {
  const drillSipedCaution = style === 'DRILL_SIPED_1IN';

  // Step 1: Lookup base min diameter
  const baseResult = lookupCleatBaseMinDia12(catalog, materialFamily, profile, size, pattern, style);

  if (!baseResult.success || baseResult.baseMinDia12In === null) {
    return {
      success: false,
      baseMinDia12In: null,
      centersFactor: 1.0,
      adjustedMinDia: null,
      roundedMinDia: null,
      ruleSource: baseResult.ruleSource,
      drillSipedCaution,
      error: baseResult.error,
    };
  }

  // Step 2: Lookup centers factor
  const factorResult = getCentersFactor(centerFactors, materialFamily, centersIn);

  if (!factorResult.success) {
    return {
      success: false,
      baseMinDia12In: baseResult.baseMinDia12In,
      centersFactor: 1.0,
      adjustedMinDia: null,
      roundedMinDia: null,
      ruleSource: baseResult.ruleSource,
      drillSipedCaution,
      error: factorResult.error,
    };
  }

  // Step 3: Compute final value
  const computed = computeCleatsMinPulleyDia(
    baseResult.baseMinDia12In,
    factorResult.factor,
    roundingIncrementIn
  );

  const fullRuleSource = `${baseResult.ruleSource} @ ${centersIn}" centers`;

  return {
    success: true,
    baseMinDia12In: baseResult.baseMinDia12In,
    centersFactor: factorResult.factor,
    adjustedMinDia: computed.adjusted,
    roundedMinDia: computed.roundedUp,
    ruleSource: fullRuleSource,
    drillSipedCaution,
  };
}

// =============================================================================
// CACHE MANAGEMENT
// =============================================================================

let cleatCatalogCache: CleatCatalogItem[] | null = null;
let cleatCenterFactorsCache: CleatCenterFactor[] | null = null;

export function setCachedCleatCatalog(items: CleatCatalogItem[]): void {
  cleatCatalogCache = items;
}

export function setCachedCleatCenterFactors(items: CleatCenterFactor[]): void {
  cleatCenterFactorsCache = items;
}

export function getCachedCleatCatalog(): CleatCatalogItem[] | null {
  return cleatCatalogCache;
}

export function getCachedCleatCenterFactors(): CleatCenterFactor[] | null {
  return cleatCenterFactorsCache;
}

export function clearCleatCatalogCache(): void {
  cleatCatalogCache = null;
  cleatCenterFactorsCache = null;
}

// =============================================================================
// UTILITY FUNCTIONS FOR UI DROPDOWNS
// =============================================================================

/**
 * Get unique cleat profiles from catalog (for dropdown)
 */
export function getUniqueCleatProfiles(catalog: CleatCatalogItem[]): string[] {
  const profiles = new Set(catalog.filter((c) => c.is_active).map((c) => c.cleat_profile));
  return Array.from(profiles).sort();
}

/**
 * Get cleat sizes for a given profile (for cascading dropdown)
 */
export function getCleatSizesForProfile(catalog: CleatCatalogItem[], profile: string): string[] {
  const sizes = new Set(
    catalog.filter((c) => c.is_active && c.cleat_profile === profile).map((c) => c.cleat_size)
  );
  // Sort sizes numerically (extract number from string like "1"", "1.5"")
  return Array.from(sizes).sort((a, b) => {
    const numA = parseFloat(a.replace('"', ''));
    const numB = parseFloat(b.replace('"', ''));
    return numA - numB;
  });
}

/**
 * Get cleat patterns for a given profile and size (for cascading dropdown)
 */
export function getCleatPatternsForProfileSize(
  catalog: CleatCatalogItem[],
  profile: string,
  size: string
): CleatPattern[] {
  const patterns = catalog
    .filter((c) => c.is_active && c.cleat_profile === profile && c.cleat_size === size)
    .map((c) => c.cleat_pattern);

  // Return in standard order
  return CLEAT_PATTERNS.filter((p) => patterns.includes(p));
}

/**
 * Check if drill & siped is supported for a given cleat configuration
 */
export function isDrillSipedSupported(
  catalog: CleatCatalogItem[],
  materialFamily: string,
  profile: string,
  size: string,
  pattern: CleatPattern
): boolean {
  const entry = catalog.find(
    (c) =>
      c.is_active &&
      c.material_family === materialFamily &&
      c.cleat_profile === profile &&
      c.cleat_size === size &&
      c.cleat_pattern === pattern
  );

  return entry?.min_pulley_dia_12in_drill_siped_in !== null && entry?.min_pulley_dia_12in_drill_siped_in !== undefined;
}

/**
 * Get catalog entry for a given configuration (for detailed info display)
 */
export function getCleatCatalogEntry(
  catalog: CleatCatalogItem[],
  materialFamily: string,
  profile: string,
  size: string,
  pattern: CleatPattern
): CleatCatalogItem | undefined {
  return catalog.find(
    (c) =>
      c.is_active &&
      c.material_family === materialFamily &&
      c.cleat_profile === profile &&
      c.cleat_size === size &&
      c.cleat_pattern === pattern
  );
}

/**
 * Alias for getUniqueCleatProfiles (v1.24: for modal consistency)
 */
export const getCleatProfiles = getUniqueCleatProfiles;

// =============================================================================
// REACT HOOK FOR CLEAT CATALOG DATA (v1.24)
// =============================================================================

interface UseCleatCatalogResult {
  cleatCatalog: CleatCatalogItem[];
  cleatCenterFactors: CleatCenterFactor[];
  isLoading: boolean;
  error: string | null;
}

/**
 * React hook to fetch and cache cleat catalog data
 *
 * @returns Cleat catalog and center factors with loading state
 */
export function useCleatCatalog(): UseCleatCatalogResult {
  const [cleatCatalog, setCleatCatalog] = useState<CleatCatalogItem[]>(
    getCachedCleatCatalog() ?? []
  );
  const [cleatCenterFactors, setCleatCenterFactors] = useState<CleatCenterFactor[]>(
    getCachedCleatCenterFactors() ?? []
  );
  const [isLoading, setIsLoading] = useState(
    getCachedCleatCatalog() === null
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Skip fetch if already cached
    if (getCachedCleatCatalog() !== null) {
      return;
    }

    const fetchCleatCatalog = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/cleats');
        if (response.ok) {
          const data = await response.json();
          const catalog = data.catalog || [];
          const factors = data.centerFactors || [];
          setCleatCatalog(catalog);
          setCleatCenterFactors(factors);
          setCachedCleatCatalog(catalog);
          setCachedCleatCenterFactors(factors);
        } else {
          setError('Failed to fetch cleat catalog');
        }
      } catch (err) {
        console.error('Failed to fetch cleat catalog:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCleatCatalog();
  }, []);

  return { cleatCatalog, cleatCenterFactors, isLoading, error };
}
