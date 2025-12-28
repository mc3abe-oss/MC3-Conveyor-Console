/**
 * Pulley Catalog Types and Utilities (v1.15)
 *
 * Shared type definitions for pulley catalog.
 * These types are used by:
 * - API routes (app/api/pulleys)
 * - Calculator UI (pulley selection)
 * - Admin UI (pulley management)
 *
 * CRITICAL: Internal bearing pulleys are TAIL ONLY.
 * This is enforced at DB level, TS validation, and UI.
 */

// =============================================================================
// ENUMS
// =============================================================================

/**
 * Shaft arrangement - how pulley interfaces with shaft/bearings
 * INTERNAL_BEARINGS = tail only (hard constraint)
 */
export type ShaftArrangement =
  | 'THROUGH_SHAFT_EXTERNAL_BEARINGS'
  | 'STUB_SHAFT_EXTERNAL_BEARINGS'
  | 'INTERNAL_BEARINGS';

export const SHAFT_ARRANGEMENT_LABELS: Record<ShaftArrangement, string> = {
  THROUGH_SHAFT_EXTERNAL_BEARINGS: 'Through Shaft (External Bearings)',
  STUB_SHAFT_EXTERNAL_BEARINGS: 'Stub Shaft (External Bearings)',
  INTERNAL_BEARINGS: 'Internal Bearings (Tail Only)',
};

/**
 * Hub connection - how pulley hub attaches to shaft
 */
export type HubConnection =
  | 'KEYED'
  | 'KEYLESS_LOCKING_ASSEMBLY'
  | 'TAPER_LOCK'
  | 'QD_BUSHING'
  | 'SET_SCREW'
  | 'WELD_ON';

export const HUB_CONNECTION_LABELS: Record<HubConnection, string> = {
  KEYED: 'Keyed',
  KEYLESS_LOCKING_ASSEMBLY: 'Keyless Locking Assembly',
  TAPER_LOCK: 'Taper Lock',
  QD_BUSHING: 'QD Bushing',
  SET_SCREW: 'Set Screw',
  WELD_ON: 'Weld-On',
};

/**
 * Pulley construction type
 */
export type PulleyConstruction = 'DRUM' | 'WING' | 'SPIRAL' | 'MAGNETIC';

export const PULLEY_CONSTRUCTION_LABELS: Record<PulleyConstruction, string> = {
  DRUM: 'Drum',
  WING: 'Wing (Self-Cleaning)',
  SPIRAL: 'Spiral',
  MAGNETIC: 'Magnetic',
};

/**
 * Pulley station types
 */
export type PulleyStation = 'head_drive' | 'tail' | 'snub' | 'bend' | 'takeup';

export const PULLEY_STATION_LABELS: Record<PulleyStation, string> = {
  head_drive: 'Head/Drive',
  tail: 'Tail',
  snub: 'Snub',
  bend: 'Bend',
  takeup: 'Take-Up',
};

// =============================================================================
// MAIN INTERFACE
// =============================================================================

/**
 * Pulley Catalog Item
 */
export interface PulleyCatalogItem {
  id: string;
  catalog_key: string;
  display_name: string;
  manufacturer: string | null;
  part_number: string | null;

  // Physical specs
  diameter_in: number;
  face_width_max_in: number;
  face_width_min_in: number | null;
  crown_height_in: number;

  // Construction
  construction: PulleyConstruction;
  shell_material: string;

  // Lagging
  is_lagged: boolean;
  lagging_type: string | null;
  lagging_thickness_in: number | null;

  // Shaft interface
  shaft_arrangement: ShaftArrangement;
  hub_connection: HubConnection;

  // Station compatibility
  allow_head_drive: boolean;
  allow_tail: boolean;
  allow_snub: boolean;
  allow_bend: boolean;
  allow_takeup: boolean;
  dirty_side_ok: boolean;

  // Operating limits
  max_shaft_rpm: number | null;
  max_belt_speed_fpm: number | null;
  max_tension_pli: number | null;

  // Status
  is_preferred: boolean;
  is_active: boolean;
  notes: string | null;
  tags: string[] | null;

  // Audit
  created_at: string;
  updated_at: string;
}

// =============================================================================
// FILTERING TYPES
// =============================================================================

/**
 * Criteria for filtering pulleys
 */
export interface PulleyFilterCriteria {
  station: PulleyStation;
  face_width_required_in: number;
  belt_speed_fpm?: number;
  diameter_in?: number;              // Filter to specific diameter
  min_diameter_in?: number;          // Minimum diameter allowed (from belt)
  construction?: PulleyConstruction;
  require_lagged?: boolean;
  require_crown?: boolean;
}

/**
 * Issue found during pulley filtering/validation
 */
export interface PulleyIssue {
  code: string;
  message: string;
  severity: 'error' | 'warning';
  field?: string;
}

/**
 * Result of filtering a single pulley
 */
export interface PulleyFilterResult {
  pulley: PulleyCatalogItem;
  issues: PulleyIssue[];
  effective_diameter_in: number;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get effective diameter including lagging thickness (both sides)
 */
export function getEffectiveDiameter(pulley: PulleyCatalogItem): number {
  const lagging =
    pulley.is_lagged && pulley.lagging_thickness_in
      ? pulley.lagging_thickness_in * 2
      : 0;
  return pulley.diameter_in + lagging;
}

/**
 * Check if pulley is compatible with a station based on flags
 */
export function isStationCompatible(
  pulley: PulleyCatalogItem,
  station: PulleyStation
): boolean {
  switch (station) {
    case 'head_drive':
      return pulley.allow_head_drive;
    case 'tail':
      return pulley.allow_tail;
    case 'snub':
      return pulley.allow_snub;
    case 'bend':
      return pulley.allow_bend;
    case 'takeup':
      return pulley.allow_takeup;
    default:
      return false;
  }
}

/**
 * Check if pulley has internal bearings (tail-only constraint)
 */
export function hasInternalBearings(pulley: PulleyCatalogItem): boolean {
  return pulley.shaft_arrangement === 'INTERNAL_BEARINGS';
}

/**
 * Filter pulleys by criteria and return with validation issues
 *
 * Returns all pulleys with their issues - caller decides what to show.
 * Errors = hard block, Warnings = show but allow selection.
 */
export function filterPulleys(
  pulleys: PulleyCatalogItem[],
  criteria: PulleyFilterCriteria
): PulleyFilterResult[] {
  const results: PulleyFilterResult[] = [];

  for (const pulley of pulleys) {
    if (!pulley.is_active) continue;

    const issues: PulleyIssue[] = [];
    const effectiveDia = getEffectiveDiameter(pulley);

    // =========================================================================
    // HARD ERRORS
    // =========================================================================

    // Station compatibility check
    if (!isStationCompatible(pulley, criteria.station)) {
      issues.push({
        code: 'STATION_INCOMPATIBLE',
        message: `Pulley not allowed at ${PULLEY_STATION_LABELS[criteria.station]} position`,
        severity: 'error',
        field: 'station',
      });
    }

    // INTERNAL_BEARINGS tail-only constraint (CRITICAL)
    if (hasInternalBearings(pulley) && criteria.station !== 'tail') {
      issues.push({
        code: 'INTERNAL_BEARINGS_TAIL_ONLY',
        message: 'Internal bearing pulleys can only be used at tail position',
        severity: 'error',
        field: 'shaft_arrangement',
      });
    }

    // Face width exceeded
    if (criteria.face_width_required_in > pulley.face_width_max_in) {
      issues.push({
        code: 'FACE_WIDTH_EXCEEDED',
        message: `Required face width ${criteria.face_width_required_in}" exceeds pulley max ${pulley.face_width_max_in}"`,
        severity: 'error',
        field: 'face_width_max_in',
      });
    }

    // Face width below minimum (if specified)
    if (
      pulley.face_width_min_in &&
      criteria.face_width_required_in < pulley.face_width_min_in
    ) {
      issues.push({
        code: 'FACE_WIDTH_BELOW_MIN',
        message: `Required face width ${criteria.face_width_required_in}" is below pulley min ${pulley.face_width_min_in}"`,
        severity: 'error',
        field: 'face_width_min_in',
      });
    }

    // Diameter too small for belt minimum
    if (criteria.min_diameter_in && effectiveDia < criteria.min_diameter_in) {
      issues.push({
        code: 'DIAMETER_TOO_SMALL',
        message: `Effective diameter ${effectiveDia}" is below belt minimum ${criteria.min_diameter_in}"`,
        severity: 'error',
        field: 'diameter_in',
      });
    }

    // =========================================================================
    // WARNINGS
    // =========================================================================

    // B105.1 speed limit warning
    if (
      criteria.belt_speed_fpm &&
      pulley.max_belt_speed_fpm &&
      criteria.belt_speed_fpm > pulley.max_belt_speed_fpm
    ) {
      issues.push({
        code: 'SPEED_LIMIT_EXCEEDED',
        message: `Belt speed ${criteria.belt_speed_fpm} fpm exceeds pulley limit ${pulley.max_belt_speed_fpm} fpm (B105.1)`,
        severity: 'warning',
        field: 'max_belt_speed_fpm',
      });
    }

    // Lagging requirement (soft)
    if (criteria.require_lagged && !pulley.is_lagged) {
      issues.push({
        code: 'LAGGING_RECOMMENDED',
        message: 'Lagged pulley recommended for this application',
        severity: 'warning',
        field: 'is_lagged',
      });
    }

    // Crown requirement (soft)
    if (criteria.require_crown && pulley.crown_height_in <= 0) {
      issues.push({
        code: 'CROWN_RECOMMENDED',
        message: 'Crowned pulley recommended for belt tracking',
        severity: 'warning',
        field: 'crown_height_in',
      });
    }

    // Skip if exact diameter specified and doesn't match
    if (criteria.diameter_in !== undefined && effectiveDia !== criteria.diameter_in) {
      continue;
    }

    // Skip if construction filter doesn't match
    if (criteria.construction && pulley.construction !== criteria.construction) {
      continue;
    }

    results.push({
      pulley,
      issues,
      effective_diameter_in: effectiveDia,
    });
  }

  // Sort: no errors first, then preferred, then by diameter
  return results.sort((a, b) => {
    const aHasError = a.issues.some((i) => i.severity === 'error');
    const bHasError = b.issues.some((i) => i.severity === 'error');

    // Errors go last
    if (aHasError !== bHasError) return aHasError ? 1 : -1;

    // Preferred first (among same error status)
    if (a.pulley.is_preferred !== b.pulley.is_preferred) {
      return a.pulley.is_preferred ? -1 : 1;
    }

    // Then by diameter ascending
    return a.effective_diameter_in - b.effective_diameter_in;
  });
}

/**
 * Get compatible pulleys for a station (no hard errors)
 */
export function getCompatiblePulleys(
  pulleys: PulleyCatalogItem[],
  criteria: PulleyFilterCriteria
): PulleyCatalogItem[] {
  return filterPulleys(pulleys, criteria)
    .filter((r) => !r.issues.some((i) => i.severity === 'error'))
    .map((r) => r.pulley);
}

/**
 * Find the best pulley for given criteria (preferred, smallest valid diameter)
 */
export function selectBestPulley(
  pulleys: PulleyCatalogItem[],
  criteria: PulleyFilterCriteria
): PulleyFilterResult | null {
  const results = filterPulleys(pulleys, criteria);
  const valid = results.filter((r) => !r.issues.some((i) => i.severity === 'error'));

  if (valid.length === 0) return null;

  // Already sorted: preferred first, then by diameter
  return valid[0];
}

// =============================================================================
// ADMIN VALIDATION
// =============================================================================

/**
 * Validate a pulley catalog item for admin save
 */
export function validatePulleyCatalogItem(
  pulley: Partial<PulleyCatalogItem>
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required fields
  if (!pulley.catalog_key?.trim()) {
    errors.push('Catalog key is required');
  }
  if (!pulley.display_name?.trim()) {
    errors.push('Display name is required');
  }
  if (!pulley.diameter_in || pulley.diameter_in <= 0) {
    errors.push('Diameter must be positive');
  }
  if (!pulley.face_width_max_in || pulley.face_width_max_in <= 0) {
    errors.push('Face width max must be positive');
  }

  // Face width range
  if (
    pulley.face_width_min_in !== undefined &&
    pulley.face_width_min_in !== null &&
    pulley.face_width_max_in &&
    pulley.face_width_min_in > pulley.face_width_max_in
  ) {
    errors.push('Face width min cannot exceed max');
  }

  // INTERNAL_BEARINGS constraint (CRITICAL)
  if (pulley.shaft_arrangement === 'INTERNAL_BEARINGS') {
    if (pulley.allow_head_drive) {
      errors.push('Internal bearing pulleys cannot be used as head/drive');
    }
    if (pulley.allow_snub) {
      errors.push('Internal bearing pulleys cannot be used as snub');
    }
    if (pulley.allow_bend) {
      errors.push('Internal bearing pulleys cannot be used as bend');
    }
    if (pulley.allow_takeup) {
      errors.push('Internal bearing pulleys cannot be used as takeup');
    }
    if (pulley.allow_tail === false) {
      errors.push('Internal bearing pulleys must allow tail position');
    }
  }

  // Lagging constraint
  if (pulley.is_lagged) {
    if (pulley.lagging_thickness_in === null || pulley.lagging_thickness_in === undefined) {
      errors.push('Lagging thickness required when lagged');
    } else if (pulley.lagging_thickness_in < 0) {
      errors.push('Lagging thickness must be non-negative');
    }
  }

  // Crown height non-negative
  if (pulley.crown_height_in !== undefined && pulley.crown_height_in < 0) {
    errors.push('Crown height must be non-negative');
  }

  return { isValid: errors.length === 0, errors };
}

// =============================================================================
// CACHE
// =============================================================================

let pulleyCatalogCache: PulleyCatalogItem[] | null = null;

export function clearPulleyCatalogCache(): void {
  pulleyCatalogCache = null;
}

export function setCachedPulleys(pulleys: PulleyCatalogItem[]): void {
  pulleyCatalogCache = pulleys;
}

export function getCachedPulleys(): PulleyCatalogItem[] | null {
  return pulleyCatalogCache;
}

/**
 * v1.16: Look up a pulley by catalog key and return its effective diameter.
 * Returns undefined if catalog key is not set, pulley not found, or cache not loaded.
 *
 * This is the SOURCE OF TRUTH for diameter when catalog is selected.
 */
export function getEffectiveDiameterByKey(catalogKey: string | undefined): number | undefined {
  if (!catalogKey) return undefined;

  const cache = getCachedPulleys();
  if (!cache) return undefined;

  const pulley = cache.find((p) => p.catalog_key === catalogKey);
  if (!pulley) return undefined;

  return getEffectiveDiameter(pulley);
}

/**
 * v1.16: Check if a catalog key exists in the loaded catalog.
 */
export function isPulleyKeyValid(catalogKey: string | undefined): boolean {
  if (!catalogKey) return false;

  const cache = getCachedPulleys();
  if (!cache) return false;

  return cache.some((p) => p.catalog_key === catalogKey);
}
