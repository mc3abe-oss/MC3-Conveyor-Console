/**
 * Pulley Families & Variants Types and Utilities
 *
 * This module defines the new "families + variants" model for pulleys.
 * - Families define the shell/construction (shell_od_in, face_width_in, v_groove specs)
 * - Variants define bore/hub/lagging options and finished_od_in
 *
 * Key concepts:
 * - pulley_shell_od_in: Always the family's shell_od_in
 * - pulley_finished_od_in: Variant's finished_od_in if set, else family's shell_od_in
 */

// =============================================================================
// INTERFACES
// =============================================================================

/**
 * Pulley Family - defines shell/construction specs
 */
export interface PulleyFamily {
  pulley_family_key: string;
  manufacturer: string;
  style: string;
  material: string;
  shell_od_in: number;
  face_width_in: number;
  shell_wall_in: number | null;
  is_crowned: boolean;
  crown_type: string | null;
  v_groove_section: string | null;
  v_groove_top_width_in: number | null;
  v_groove_bottom_width_in: number | null;
  v_groove_depth_in: number | null;
  version: number;
  source: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Pulley Variant - defines bore/hub/lagging options
 */
export interface PulleyVariant {
  pulley_variant_key: string;
  pulley_family_key: string;
  bore_in: number | null;
  hub_style: string | null;
  bearing_type: string | null;
  lagging_type: string | null;
  lagging_thickness_in: number | null;
  lagging_durometer_shore_a: number | null;
  finished_od_in: number | null;
  runout_max_in: number | null;
  paint_spec: string | null;
  version: number;
  source: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Pulley Variant with Family data (joined for display)
 */
export interface PulleyVariantWithFamily extends PulleyVariant {
  family: PulleyFamily;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get the shell OD from a family
 */
export function getShellOdIn(family: PulleyFamily): number {
  return family.shell_od_in;
}

/**
 * Get the finished OD from a variant (falls back to family shell_od_in)
 */
export function getFinishedOdIn(variant: PulleyVariant, family: PulleyFamily): number {
  return variant.finished_od_in ?? family.shell_od_in;
}

/**
 * Get finished OD from a variant with embedded family
 */
export function getVariantFinishedOdIn(variantWithFamily: PulleyVariantWithFamily): number {
  return variantWithFamily.finished_od_in ?? variantWithFamily.family.shell_od_in;
}

/**
 * Get display label for a variant (for dropdowns)
 */
export function getVariantDisplayLabel(
  variant: PulleyVariant,
  family: PulleyFamily
): string {
  const finishedOd = getFinishedOdIn(variant, family);
  const lagging = variant.lagging_type && variant.lagging_type !== 'none'
    ? ` + ${variant.lagging_type} lagging`
    : '';
  const bearingInfo = variant.bearing_type ? ` (${variant.bearing_type})` : '';

  return `${family.manufacturer} ${family.style} ${finishedOd}"${lagging}${bearingInfo}`;
}

/**
 * Get short display label for a variant (for compact display)
 */
export function getVariantShortLabel(
  variant: PulleyVariant,
  family: PulleyFamily
): string {
  const finishedOd = getFinishedOdIn(variant, family);
  const isLagged = variant.lagging_type && variant.lagging_type !== 'none';
  return `${finishedOd}" ${family.style}${isLagged ? ' Lagged' : ''}`;
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate a pulley family for admin save
 */
export function validatePulleyFamily(
  family: Partial<PulleyFamily>
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required fields
  if (!family.pulley_family_key?.trim()) {
    errors.push('Family key is required');
  }
  if (!family.manufacturer?.trim()) {
    errors.push('Manufacturer is required');
  }
  if (!family.style?.trim()) {
    errors.push('Style is required');
  }
  if (!family.shell_od_in || family.shell_od_in <= 0) {
    errors.push('Shell OD must be positive');
  }
  if (!family.face_width_in || family.face_width_in <= 0) {
    errors.push('Face width must be positive');
  }

  // Optional field validation
  if (family.shell_wall_in !== undefined && family.shell_wall_in !== null && family.shell_wall_in < 0) {
    errors.push('Shell wall thickness cannot be negative');
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate a pulley variant for admin save
 */
export function validatePulleyVariant(
  variant: Partial<PulleyVariant>
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required fields
  if (!variant.pulley_variant_key?.trim()) {
    errors.push('Variant key is required');
  }
  if (!variant.pulley_family_key?.trim()) {
    errors.push('Family key is required');
  }

  // Optional field validation
  if (variant.bore_in !== undefined && variant.bore_in !== null && variant.bore_in <= 0) {
    errors.push('Bore must be positive');
  }
  if (variant.lagging_thickness_in !== undefined && variant.lagging_thickness_in !== null && variant.lagging_thickness_in < 0) {
    errors.push('Lagging thickness cannot be negative');
  }
  if (variant.finished_od_in !== undefined && variant.finished_od_in !== null && variant.finished_od_in <= 0) {
    errors.push('Finished OD must be positive');
  }
  if (variant.lagging_durometer_shore_a !== undefined && variant.lagging_durometer_shore_a !== null) {
    if (variant.lagging_durometer_shore_a < 0 || variant.lagging_durometer_shore_a > 100) {
      errors.push('Durometer must be between 0 and 100');
    }
  }

  return { isValid: errors.length === 0, errors };
}

// =============================================================================
// CACHE
// =============================================================================

let pulleyFamiliesCache: PulleyFamily[] | null = null;
let pulleyVariantsCache: PulleyVariant[] | null = null;

export function clearPulleyFamiliesCache(): void {
  pulleyFamiliesCache = null;
  pulleyVariantsCache = null;
}

export function setCachedPulleyFamilies(families: PulleyFamily[]): void {
  pulleyFamiliesCache = families;
}

export function getCachedPulleyFamilies(): PulleyFamily[] | null {
  return pulleyFamiliesCache;
}

export function setCachedPulleyVariants(variants: PulleyVariant[]): void {
  pulleyVariantsCache = variants;
}

export function getCachedPulleyVariants(): PulleyVariant[] | null {
  return pulleyVariantsCache;
}

/**
 * Look up a family by key from cache
 */
export function getFamilyByKey(familyKey: string | undefined): PulleyFamily | undefined {
  if (!familyKey) return undefined;
  const cache = getCachedPulleyFamilies();
  if (!cache) return undefined;
  return cache.find((f) => f.pulley_family_key === familyKey);
}

/**
 * Look up a variant by key from cache
 */
export function getVariantByKey(variantKey: string | undefined): PulleyVariant | undefined {
  if (!variantKey) return undefined;
  const cache = getCachedPulleyVariants();
  if (!cache) return undefined;
  return cache.find((v) => v.pulley_variant_key === variantKey);
}

/**
 * Get finished OD by variant key (the main lookup function for calculator)
 * Returns undefined if variant not found or cache not loaded.
 */
export function getFinishedOdByVariantKey(variantKey: string | undefined): number | undefined {
  if (!variantKey) return undefined;

  const variant = getVariantByKey(variantKey);
  if (!variant) return undefined;

  const family = getFamilyByKey(variant.pulley_family_key);
  if (!family) return undefined;

  return getFinishedOdIn(variant, family);
}

/**
 * Get shell OD by variant key
 */
export function getShellOdByVariantKey(variantKey: string | undefined): number | undefined {
  if (!variantKey) return undefined;

  const variant = getVariantByKey(variantKey);
  if (!variant) return undefined;

  const family = getFamilyByKey(variant.pulley_family_key);
  if (!family) return undefined;

  return getShellOdIn(family);
}

/**
 * Check if a variant key is valid
 */
export function isVariantKeyValid(variantKey: string | undefined): boolean {
  if (!variantKey) return false;
  const cache = getCachedPulleyVariants();
  if (!cache) return false;
  return cache.some((v) => v.pulley_variant_key === variantKey);
}
