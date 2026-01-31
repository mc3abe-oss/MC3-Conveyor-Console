/**
 * MAGNET BAR CONFIGURATION SYSTEM - TYPE DEFINITIONS
 *
 * Source of Truth: docs/reference/mc3-magnetic-conveyor-master-reference.md
 *
 * This file defines the 5-layer type system for magnet bar configuration:
 *
 * Layer 0: Conveyor Magnet Family (membership rules)
 *   - Defines which magnets are allowed for a given conveyor type/size
 *
 * Layer 1: Magnet Catalog Items
 *   - Individual magnets with specs (dimensions, weight, capacity)
 *
 * Layer 2: Bar Template (OAL-driven)
 *   - A bar configuration computed by filling available width with magnets + gaps
 *
 * Layer 3: Bar Pattern Along Chain
 *   - How bars repeat: all-same, alternating, interval
 *
 * Layer 4: Layout Application
 *   - Applied to a specific conveyor: center spacing, bar count, total capacity
 *
 * CHANGELOG:
 * v1.0 (2026-01-31): Initial implementation
 */

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Magnet material type.
 * Determines magnetic strength characteristics.
 */
export enum MagnetMaterialType {
  /** Ceramic (ferrite) magnet */
  Ceramic = 'ceramic',
  /** Neodymium (rare earth) magnet */
  Neo = 'neo',
}

export const MAGNET_MATERIAL_TYPE_LABELS: Record<MagnetMaterialType, string> = {
  [MagnetMaterialType.Ceramic]: 'Ceramic',
  [MagnetMaterialType.Neo]: 'Neodymium',
};

/**
 * Magnet grade within material type.
 * Higher grades = stronger magnets.
 */
export enum MagnetGrade {
  /** Ceramic Grade 5 (standard) */
  Ceramic5 = '5',
  /** Ceramic Grade 8 (stronger) */
  Ceramic8 = '8',
  /** Neo Grade 35 */
  Neo35 = '35',
  /** Neo Grade 50 (strongest) */
  Neo50 = '50',
}

export const MAGNET_GRADE_LABELS: Record<MagnetGrade, string> = {
  [MagnetGrade.Ceramic5]: 'Grade 5',
  [MagnetGrade.Ceramic8]: 'Grade 8',
  [MagnetGrade.Neo35]: 'Grade 35',
  [MagnetGrade.Neo50]: 'Grade 50',
};

/**
 * Bar pattern mode - how bars repeat along the chain.
 */
export enum BarPatternMode {
  /** All bars use the same template */
  AllSame = 'all_same',
  /** Bars alternate between primary and secondary templates */
  Alternating = 'alternating',
  /** Secondary template appears every N bars */
  Interval = 'interval',
}

export const BAR_PATTERN_MODE_LABELS: Record<BarPatternMode, string> = {
  [BarPatternMode.AllSame]: 'All Same',
  [BarPatternMode.Alternating]: 'Alternating',
  [BarPatternMode.Interval]: 'Interval (every Nth)',
};

/**
 * Cross-section key identifying a magnet's fixed dimensions.
 * Format: {material}_{width}x{height} in inches (e.g., "STD_1.00x1.38")
 */
export type CrossSectionKey = string;

// ============================================================================
// LAYER 0: CONVEYOR MAGNET FAMILY (Membership Rules)
// ============================================================================

/**
 * Conveyor Magnet Family.
 * Defines which magnets are allowed for a given conveyor type/size.
 *
 * Example families:
 * - Standard Conveyor: magnets must be 1.00" × 1.38" cross-section, lengths [2.5, 3.5]
 * - Heavy Duty Conveyor: magnets must be 1.50" × 2.00" cross-section, lengths [3.5, 4.5]
 */
export interface ConveyorMagnetFamily {
  /** Unique identifier (UUID) */
  id: string;

  /** Human-readable name (e.g., "Standard Conveyor") */
  name: string;

  /** URL-safe slug (e.g., "standard") */
  slug: string;

  /** Description of this family */
  description?: string;

  /**
   * Required magnet cross-section key.
   * All magnets in this family must match this cross-section.
   * Format: "{width}x{height}" in inches (e.g., "1.00x1.38")
   */
  cross_section_key: CrossSectionKey;

  /**
   * Magnet width in inches (fixed for this family).
   * This is the narrow dimension of the magnet.
   */
  magnet_width_in: number;

  /**
   * Magnet height in inches (fixed for this family).
   * This is the thick dimension of the magnet.
   */
  magnet_height_in: number;

  /**
   * Allowed magnet lengths in inches.
   * Only magnets with these lengths can be used in this family.
   */
  allowed_lengths_in: number[];

  /**
   * Maximum magnets per bar (physical constraint).
   * Prevents physically impossible configurations.
   */
  max_magnets_per_bar: number;

  /** Creation timestamp */
  created_at: string;

  /** Last update timestamp */
  updated_at: string;
}

// ============================================================================
// LAYER 1: MAGNET CATALOG ITEMS
// ============================================================================

/**
 * Magnet Catalog Item.
 * Individual magnet with full specifications.
 *
 * From reference doc - individual magnet capacities:
 * | Type       | Size  | Lbs/magnet | Efficiency | Actual lbs |
 * |------------|-------|------------|------------|------------|
 * | Ceramic 5  | 2.5"  | 0.10       | 0.8        | 0.08       |
 * | Ceramic 5  | 3.5"  | 0.126      | 0.8        | 0.1008     |
 * | Neo 35/50  | 2"    | 0.298      | 0.8        | 0.2384     |
 */
export interface MagnetCatalogItem {
  /** Unique identifier (UUID) */
  id: string;

  /** Part number (e.g., "MAG050100013753500") */
  part_number: string;

  /** Human-readable name */
  name: string;

  /** Description */
  description?: string;

  /**
   * Cross-section key for grouping.
   * Magnets with the same cross-section can be mixed on a bar.
   * Format: "{width}x{height}" in inches (e.g., "1.00x1.38")
   */
  cross_section_key: CrossSectionKey;

  /** Material type */
  material_type: MagnetMaterialType;

  /** Grade within material type */
  grade: MagnetGrade;

  /**
   * Magnet length in inches (variable dimension).
   * This is the dimension that runs along the bar direction.
   */
  length_in: number;

  /**
   * Magnet width in inches (fixed per cross-section).
   * This is the narrow dimension of the magnet.
   */
  width_in: number;

  /**
   * Magnet height in inches (fixed per cross-section).
   * This is the thick dimension of the magnet.
   */
  height_in: number;

  /** Weight in lbs */
  weight_lb: number;

  /**
   * Hold force proxy in lbs (removal capacity per magnet).
   * This is the theoretical removal capacity before efficiency is applied.
   * Actual capacity = hold_force_proxy_lb × efficiency_factor
   */
  hold_force_proxy_lb: number;

  /**
   * Efficiency factor (typically 0.8).
   * Applied to hold_force_proxy_lb to get actual removal capacity.
   */
  efficiency_factor: number;

  /** Whether this magnet is currently available */
  is_active: boolean;

  /** Creation timestamp */
  created_at: string;

  /** Last update timestamp */
  updated_at: string;
}

/**
 * Computed removal capacity for a magnet.
 */
export function getMagnetRemovalCapacity(magnet: MagnetCatalogItem): number {
  return magnet.hold_force_proxy_lb * magnet.efficiency_factor;
}

// ============================================================================
// LAYER 2: BAR TEMPLATE (OAL-Driven)
// ============================================================================

/**
 * Bar Slot - position of a magnet within a bar template.
 * Multiple slots make up a bar template.
 */
export interface BarSlot {
  /** Unique identifier (UUID) */
  id: string;

  /** Reference to the bar template this slot belongs to */
  bar_template_id: string;

  /** Reference to the magnet in this slot */
  magnet_id: string;

  /**
   * Position along the bar in inches (from left/start edge).
   * This is the start position of this magnet.
   */
  position_in: number;

  /** Sort order (0-indexed) */
  slot_index: number;

  /** Creation timestamp */
  created_at: string;
}

/**
 * Bar Template.
 * A bar configuration computed by filling available width (OAL) with magnets + gaps.
 *
 * The mental model: Bars are built by filling available width with magnets + gaps,
 * not by counting magnets.
 */
export interface BarTemplate {
  /** Unique identifier (UUID) */
  id: string;

  /** Human-readable name (e.g., "12-inch Standard Ceramic") */
  name: string;

  /** Description */
  description?: string;

  /**
   * Conveyor family this template belongs to.
   * Enforces membership rules for which magnets can be used.
   */
  family_id: string;

  /**
   * Target overall length (OAL) in inches.
   * This is the bar width we're trying to fill (matches magnet_width_in in existing schema).
   */
  target_oal_in: number;

  /**
   * Gap between magnets in inches.
   * Default: 0.25"
   */
  gap_in: number;

  /**
   * End clearance at each end of the bar in inches.
   * Default: 0
   */
  end_clearance_in: number;

  /**
   * Tolerance for leftover space in inches.
   * If leftover > tolerance, configuration is invalid.
   * Default: 0.25"
   */
  leftover_tolerance_in: number;

  /** Whether this is a sweeper bar (typically uses shorter magnets) */
  is_sweeper: boolean;

  /** Whether this template is currently available for use */
  is_active: boolean;

  /** Creation timestamp */
  created_at: string;

  /** Last update timestamp */
  updated_at: string;

  // =========================================================================
  // POPULATED RELATIONS (when loaded with slots)
  // =========================================================================

  /** Slots in this bar (populated when loaded with relations) */
  slots?: BarSlot[];
}

/**
 * Computed bar template values.
 * These are derived from the bar template and its slots.
 */
export interface BarTemplateComputed {
  /** Number of magnets on this bar */
  magnet_count: number;

  /** Achieved OAL in inches (what we actually filled) */
  achieved_oal_in: number;

  /** Leftover space in inches (unfilled) */
  leftover_in: number;

  /** Whether the bar is valid (leftover within tolerance) */
  is_valid: boolean;

  /** Total bar hold force in lbs (sum of magnet capacities) */
  bar_hold_force_lb: number;

  /** Total bar weight in lbs */
  bar_weight_lb: number;

  /** Validation errors if any */
  validation_errors: string[];
}

// ============================================================================
// LAYER 3: BAR PATTERN ALONG CHAIN
// ============================================================================

/**
 * Bar Pattern.
 * Defines how bars repeat along the chain.
 *
 * Modes:
 * - all_same: Every bar uses primary_template_id
 * - alternating: Bars alternate between primary and secondary
 * - interval: Secondary appears every Nth bar (e.g., sweeper every 4th)
 */
export interface BarPattern {
  /** Unique identifier (UUID) */
  id: string;

  /** Human-readable name */
  name: string;

  /** Description */
  description?: string;

  /** Pattern mode */
  mode: BarPatternMode;

  /** Primary bar template ID (used for most/all bars) */
  primary_template_id: string;

  /**
   * Secondary bar template ID (optional).
   * Required for alternating and interval modes.
   */
  secondary_template_id?: string;

  /**
   * For interval mode: secondary template appears every N bars.
   * E.g., secondary_every_n = 4 means every 4th bar is secondary.
   */
  secondary_every_n?: number;

  /** Whether this pattern is currently available for use */
  is_active: boolean;

  /** Creation timestamp */
  created_at: string;

  /** Last update timestamp */
  updated_at: string;

  // =========================================================================
  // POPULATED RELATIONS (when loaded)
  // =========================================================================

  /** Primary bar template (populated when loaded with relations) */
  primary_template?: BarTemplate;

  /** Secondary bar template (populated when loaded with relations) */
  secondary_template?: BarTemplate;
}

// ============================================================================
// LAYER 4: LAYOUT APPLICATION
// ============================================================================

/**
 * Magnet Layout.
 * Applied to a specific conveyor: center spacing, bar count, total capacity.
 *
 * This is the final application of bar configuration to a conveyor.
 */
export interface MagnetLayout {
  /** Unique identifier (UUID) */
  id: string;

  /** Human-readable name */
  name: string;

  /** Description */
  description?: string;

  /** Bar pattern ID to use */
  pattern_id: string;

  /**
   * Center spacing between bars in inches.
   * Standard options: 12, 18, 24, 36
   */
  center_spacing_in: number;

  /**
   * Chain/belt length in feet.
   * Used to calculate bar count.
   */
  chain_length_ft?: number;

  /** Whether this layout is currently available for use */
  is_active: boolean;

  /** Creation timestamp */
  created_at: string;

  /** Last update timestamp */
  updated_at: string;

  // =========================================================================
  // POPULATED RELATIONS (when loaded)
  // =========================================================================

  /** Bar pattern (populated when loaded with relations) */
  pattern?: BarPattern;
}

/**
 * Computed layout values.
 * These are derived from the layout and its pattern/templates.
 */
export interface MagnetLayoutComputed {
  /** Total number of bars on the chain */
  bar_qty_total: number;

  /** Number of primary template bars */
  bar_qty_primary: number;

  /** Number of secondary template bars */
  bar_qty_secondary: number;

  /** Total hold force in lbs (sum of all bars) */
  total_hold_force_lb: number;

  /** Total weight of all magnet bars in lbs */
  total_bar_weight_lb: number;
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

/**
 * Validation error for bar configuration.
 */
export interface BarValidationError {
  code: string;
  message: string;
  field?: string;
}

/**
 * Validation result for bar configuration.
 */
export interface BarValidationResult {
  is_valid: boolean;
  errors: BarValidationError[];
  warnings: BarValidationError[];
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Removal capacity lookup by configuration.
 * Used to validate against existing lookup tables.
 */
export interface RemovalCapacityLookup {
  /** OAL (bar width) in inches */
  oal_in: number;

  /** Configuration description (e.g., "Ceramic 5 only", "w/ 1 Neo") */
  configuration: string;

  /** Number of ceramic magnets */
  ceramic_count: number;

  /** Number of neo magnets */
  neo_count: number;

  /** Removal capacity per bar in lbs */
  lbs_per_bar: number;
}

/**
 * Supported OAL (bar width) values from reference doc.
 * Used for validation and dropdown options.
 */
export const SUPPORTED_OAL_VALUES_IN = [12, 15, 18, 24, 30] as const;
export type SupportedOAL = typeof SUPPORTED_OAL_VALUES_IN[number];

/**
 * Supported center spacing values.
 * Standard options for magnet bar spacing.
 */
export const SUPPORTED_CENTER_SPACING_IN = [12, 18, 24, 36] as const;
export type SupportedCenterSpacing = typeof SUPPORTED_CENTER_SPACING_IN[number];

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if a value is a valid MagnetMaterialType.
 */
export function isMagnetMaterialType(value: unknown): value is MagnetMaterialType {
  return (
    typeof value === 'string' &&
    Object.values(MagnetMaterialType).includes(value as MagnetMaterialType)
  );
}

/**
 * Type guard to check if a value is a valid MagnetGrade.
 */
export function isMagnetGrade(value: unknown): value is MagnetGrade {
  return (
    typeof value === 'string' &&
    Object.values(MagnetGrade).includes(value as MagnetGrade)
  );
}

/**
 * Type guard to check if a value is a valid BarPatternMode.
 */
export function isBarPatternMode(value: unknown): value is BarPatternMode {
  return (
    typeof value === 'string' &&
    Object.values(BarPatternMode).includes(value as BarPatternMode)
  );
}

/**
 * Type guard to check if a value is a supported OAL.
 */
export function isSupportedOAL(value: unknown): value is SupportedOAL {
  return (
    typeof value === 'number' &&
    SUPPORTED_OAL_VALUES_IN.includes(value as SupportedOAL)
  );
}

/**
 * Type guard to check if a value is a supported center spacing.
 */
export function isSupportedCenterSpacing(value: unknown): value is SupportedCenterSpacing {
  return (
    typeof value === 'number' &&
    SUPPORTED_CENTER_SPACING_IN.includes(value as SupportedCenterSpacing)
  );
}
