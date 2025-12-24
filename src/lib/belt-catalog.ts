/**
 * Belt Catalog Types (v1.11 Phase 3A)
 *
 * Shared type definitions for belt catalog and material profiles.
 * These types are used by:
 * - API routes (app/api/belts)
 * - Calculator UI (belt selection)
 * - Admin UI (belt management)
 *
 * Phase 3A adds head tension banding support fields.
 */

/**
 * Belt Material Profile (v1)
 *
 * Optional structured data for belt material specifications.
 * When present, min_dia fields override the legacy flat columns.
 */
export interface BeltMaterialProfile {
  /** Material family (e.g., "PVC", "PU", "Rubber") */
  material_family: string;

  /** Optional construction notes (e.g., "2-ply", "fabric reinforced") */
  construction?: string;

  /**
   * Minimum pulley diameter without V-guide (inches)
   * When present, overrides belt_catalog.min_pulley_dia_no_vguide_in
   */
  min_dia_no_vguide_in?: number;

  /**
   * Minimum pulley diameter with V-guide (inches)
   * When present, overrides belt_catalog.min_pulley_dia_with_vguide_in
   */
  min_dia_with_vguide_in?: number;

  /** Additional notes about the material */
  notes?: string;

  /** Reference document or source (e.g., "Belting Specs Aug 2022") */
  source_ref?: string;

  // =========================================================================
  // Phase 3A: Head Tension Banding Support
  // =========================================================================

  /**
   * Whether this belt supports head tension banding.
   * Must be true for banding_min_dia_* fields to be valid.
   */
  supports_banding?: boolean;

  /**
   * Minimum pulley diameter without V-guide when head tension banding is used (inches).
   * Only valid when supports_banding is true.
   * Typically larger than base min_dia due to increased belt stress.
   */
  banding_min_dia_no_vguide_in?: number;

  /**
   * Minimum pulley diameter with V-guide when head tension banding is used (inches).
   * Only valid when supports_banding is true.
   */
  banding_min_dia_with_vguide_in?: number;
}

/**
 * Belt Catalog Item
 *
 * Represents a belt entry in the catalog with optional material profile.
 */
export interface BeltCatalogItem {
  id: string;
  catalog_key: string;
  display_name: string;
  manufacturer: string | null;
  material: string;
  surface: string | null;
  food_grade: boolean;
  cut_resistant: boolean;
  oil_resistant: boolean;
  abrasion_resistant: boolean;
  antistatic: boolean;
  thickness_in: number | null;
  piw: number;
  pil: number;

  /** Legacy flat column - minimum pulley diameter without V-guide */
  min_pulley_dia_no_vguide_in: number;

  /** Legacy flat column - minimum pulley diameter with V-guide */
  min_pulley_dia_with_vguide_in: number;

  notes: string | null;
  tags: string[] | null;
  is_active: boolean;

  /**
   * Optional material profile (v1.11)
   * When present, min_dia fields override legacy flat columns.
   */
  material_profile?: BeltMaterialProfile | null;

  /** Material profile schema version (default: 1) */
  material_profile_version?: number;
}

/**
 * Banding information returned by getEffectiveMinPulleyDiameters
 */
export interface BandingInfo {
  /** Whether this belt supports head tension banding */
  supported: boolean;
  /** Minimum pulley diameter without V-guide when banding is used */
  minNoVguide?: number;
  /** Minimum pulley diameter with V-guide when banding is used */
  minWithVguide?: number;
}

/**
 * Get effective minimum pulley diameter from belt catalog item.
 *
 * Precedence:
 * 1. material_profile.min_dia_* (if present and defined)
 * 2. Legacy flat columns (min_pulley_dia_*)
 *
 * Also returns banding information if available in the profile.
 *
 * @param belt - Belt catalog item
 * @returns Object with effective min diameters and banding info
 */
export function getEffectiveMinPulleyDiameters(belt: BeltCatalogItem): {
  noVguide: number;
  withVguide: number;
  source: 'material_profile' | 'catalog';
  banding: BandingInfo;
} {
  const profile = belt.material_profile;

  // Check if material_profile has min values
  const profileNoVguide = profile?.min_dia_no_vguide_in;
  const profileWithVguide = profile?.min_dia_with_vguide_in;

  // Use profile values if present, otherwise fall back to legacy columns
  const noVguide = profileNoVguide ?? belt.min_pulley_dia_no_vguide_in;
  const withVguide = profileWithVguide ?? belt.min_pulley_dia_with_vguide_in;

  // Determine source (profile if either field came from profile)
  const source =
    profileNoVguide !== undefined || profileWithVguide !== undefined
      ? 'material_profile'
      : 'catalog';

  // Build banding info
  const banding: BandingInfo = {
    supported: profile?.supports_banding === true,
    minNoVguide: profile?.banding_min_dia_no_vguide_in,
    minWithVguide: profile?.banding_min_dia_with_vguide_in,
  };

  return { noVguide, withVguide, source, banding };
}

/**
 * Validate material profile data.
 *
 * @param profile - Material profile to validate
 * @returns Object with isValid flag and optional error messages
 */
export function validateMaterialProfile(profile: unknown): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (profile === null || profile === undefined) {
    return { isValid: true, errors: [] }; // null/undefined is valid (optional)
  }

  if (typeof profile !== 'object') {
    return { isValid: false, errors: ['Material profile must be an object'] };
  }

  const p = profile as Record<string, unknown>;

  // material_family is required if profile exists
  if (typeof p.material_family !== 'string' || p.material_family.trim() === '') {
    errors.push('material_family is required and must be a non-empty string');
  }

  // Validate base numeric fields if present
  const numericFields = ['min_dia_no_vguide_in', 'min_dia_with_vguide_in'] as const;
  for (const field of numericFields) {
    const value = p[field];
    if (value !== undefined && value !== null) {
      if (typeof value !== 'number') {
        errors.push(`${field} must be a number`);
      } else if (value < 0) {
        errors.push(`${field} must be >= 0`);
      } else if (value > 60) {
        errors.push(`${field} must be <= 60 inches`);
      }
    }
  }

  // Validate optional string fields
  const stringFields = ['construction', 'notes', 'source_ref'] as const;
  for (const field of stringFields) {
    const value = p[field];
    if (value !== undefined && value !== null && typeof value !== 'string') {
      errors.push(`${field} must be a string`);
    }
  }

  // =========================================================================
  // Phase 3A: Validate banding fields
  // =========================================================================

  // Validate supports_banding if present
  if (p.supports_banding !== undefined && p.supports_banding !== null) {
    if (typeof p.supports_banding !== 'boolean') {
      errors.push('supports_banding must be a boolean');
    }
  }

  // Validate banding min diameter fields
  const bandingNumericFields = [
    'banding_min_dia_no_vguide_in',
    'banding_min_dia_with_vguide_in',
  ] as const;

  for (const field of bandingNumericFields) {
    const value = p[field];
    if (value !== undefined && value !== null) {
      if (typeof value !== 'number') {
        errors.push(`${field} must be a number`);
      } else if (value < 0) {
        errors.push(`${field} must be >= 0`);
      } else if (value > 60) {
        errors.push(`${field} must be <= 60 inches`);
      }
    }
  }

  // Validate: banding_min_dia_* requires supports_banding === true
  const hasBandingMins =
    p.banding_min_dia_no_vguide_in !== undefined ||
    p.banding_min_dia_with_vguide_in !== undefined;

  if (hasBandingMins && p.supports_banding !== true) {
    errors.push('banding_min_dia_* fields require supports_banding to be true');
  }

  return { isValid: errors.length === 0, errors };
}
