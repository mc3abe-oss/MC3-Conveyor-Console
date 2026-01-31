/**
 * MAGNET BAR CONFIGURATION SYSTEM - SEED DATA
 *
 * Source of Truth: docs/reference/mc3-magnetic-conveyor-master-reference.md
 *
 * This file contains seed data that can reproduce the existing removal capacity
 * lookup tables from the reference document.
 *
 * Ceramic Magnet Dimensions:
 * | Type     | Dimensions (W×H×L)   | Part Number         | Typical Use             |
 * |----------|----------------------|---------------------|-------------------------|
 * | Standard | 1" × 1.38" × 3.5"    | MAG050100013753500  | Primary magnet (qty 2)  |
 * | Sweeper  | 1" × 1.38" × 2.5"    | MAG050100013752500  | Sweeper magnet (qty 1)  |
 * | Neo      | 1" × 2" × 1.375"     | MAGRARE0100200138   | Heavy duty (qty 8)      |
 *
 * IMPORTANT: Magnet Capacity Values
 * ---------------------------------
 * The hold_force_proxy_lb values represent EFFECTIVE removal capacity per magnet,
 * empirically derived from the existing lookup tables. No additional efficiency
 * factor is applied (efficiency_factor = 1.0).
 *
 * These values were reverse-engineered from the lookup tables:
 * | Type       | Size   | Effective lbs/magnet | Derivation                    |
 * |------------|--------|----------------------|-------------------------------|
 * | Ceramic 5  | 3.5"   | 0.1207               | 0.362 / 3 magnets (12" bar)   |
 * | Ceramic 5  | 2.5"   | 0.08                 | 0.10 × 0.8 (from ref doc)     |
 * | Neo 35/50  | 2"     | 0.298                | Back-calculated from tables   |
 * | Neo 35/50  | 1.375" | 0.298                | Same as 2" (per ref doc)      |
 *
 * CHANGELOG:
 * v1.0 (2026-01-31): Initial implementation
 * v1.1 (2026-01-31): Calibrated hold_force values to match lookup tables
 */

import {
  ConveyorMagnetFamily,
  MagnetCatalogItem,
  MagnetMaterialType,
  MagnetGrade,
  RemovalCapacityLookup,
} from './schema';

// ============================================================================
// LAYER 0: CONVEYOR MAGNET FAMILIES
// ============================================================================

/**
 * Standard family for C2040 chain conveyors.
 * Uses 1" × 1.38" cross-section magnets.
 */
export const STANDARD_MAGNET_FAMILY: Omit<ConveyorMagnetFamily, 'id' | 'created_at' | 'updated_at'> = {
  name: 'Standard Conveyor',
  slug: 'standard',
  description: 'Standard conveyor family using C2040 chain. Uses 1" × 1.38" cross-section magnets with 2.5" or 3.5" lengths.',
  cross_section_key: '1.00x1.38',
  magnet_width_in: 1.0,
  magnet_height_in: 1.38,
  allowed_lengths_in: [2.5, 3.5],
  max_magnets_per_bar: 12,
};

/**
 * Heavy Duty family for C2060H chain conveyors.
 * Uses 1" × 2" cross-section Neo magnets.
 */
export const HEAVY_DUTY_MAGNET_FAMILY: Omit<ConveyorMagnetFamily, 'id' | 'created_at' | 'updated_at'> = {
  name: 'Heavy Duty Conveyor',
  slug: 'heavy_duty',
  description: 'Heavy duty conveyor family using C2060H chain. Uses 1" × 2" cross-section Neo magnets.',
  cross_section_key: '1.00x2.00',
  magnet_width_in: 1.0,
  magnet_height_in: 2.0,
  allowed_lengths_in: [1.375, 2.0],
  max_magnets_per_bar: 16,
};

export const ALL_MAGNET_FAMILIES = [STANDARD_MAGNET_FAMILY, HEAVY_DUTY_MAGNET_FAMILY];

// ============================================================================
// LAYER 1: MAGNET CATALOG ITEMS
// ============================================================================

/**
 * Ceramic 5 - 3.5" length (standard primary magnet)
 * Part Number: MAG050100013753500
 *
 * Effective capacity: 0.1207 lbs/magnet (derived from 12" bar: 0.362 / 3 = 0.1207)
 */
export const CERAMIC_5_3_5: Omit<MagnetCatalogItem, 'id' | 'created_at' | 'updated_at'> = {
  part_number: 'MAG050100013753500',
  name: 'Ceramic 5 - 3.5" Standard',
  description: 'Standard ceramic grade 5 magnet, 3.5" length. Primary magnet for standard bars.',
  cross_section_key: '1.00x1.38',
  material_type: MagnetMaterialType.Ceramic,
  grade: MagnetGrade.Ceramic5,
  length_in: 3.5,
  width_in: 1.0,
  height_in: 1.38,
  weight_lb: 0.5, // Estimated
  hold_force_proxy_lb: 0.1207, // Effective capacity, no additional efficiency applied
  efficiency_factor: 1.0,
  is_active: true,
};

/**
 * Ceramic 5 - 2.5" length (sweeper magnet)
 * Part Number: MAG050100013752500
 *
 * Effective capacity: 0.08 lbs/magnet (from ref doc: 0.10 × 0.8 = 0.08)
 */
export const CERAMIC_5_2_5: Omit<MagnetCatalogItem, 'id' | 'created_at' | 'updated_at'> = {
  part_number: 'MAG050100013752500',
  name: 'Ceramic 5 - 2.5" Sweeper',
  description: 'Sweeper ceramic grade 5 magnet, 2.5" length. Used for sweeper bars.',
  cross_section_key: '1.00x1.38',
  material_type: MagnetMaterialType.Ceramic,
  grade: MagnetGrade.Ceramic5,
  length_in: 2.5,
  width_in: 1.0,
  height_in: 1.38,
  weight_lb: 0.35, // Estimated
  hold_force_proxy_lb: 0.08, // Effective capacity, no additional efficiency applied
  efficiency_factor: 1.0,
  is_active: true,
};

/**
 * Neo 35 - 1.375" length (heavy duty)
 * Part Number: MAGRARE0100200138
 *
 * Effective capacity: 0.298 lbs/magnet (from ref doc, no additional efficiency)
 */
export const NEO_35_1_375: Omit<MagnetCatalogItem, 'id' | 'created_at' | 'updated_at'> = {
  part_number: 'MAGRARE0100200138',
  name: 'Neo 35 - 1.375"',
  description: 'Neodymium grade 35 magnet, 1.375" length. High-strength magnet for heavy duty applications.',
  cross_section_key: '1.00x2.00',
  material_type: MagnetMaterialType.Neo,
  grade: MagnetGrade.Neo35,
  length_in: 1.375,
  width_in: 1.0,
  height_in: 2.0,
  weight_lb: 0.3, // Estimated
  hold_force_proxy_lb: 0.298, // Effective capacity, no additional efficiency applied
  efficiency_factor: 1.0,
  is_active: true,
};

/**
 * Neo 50 - 1.375" length (heavy duty, highest strength)
 * Same dimensions as Neo 35, higher grade
 *
 * Effective capacity: 0.298 lbs/magnet (same as Neo 35 per ref doc)
 */
export const NEO_50_1_375: Omit<MagnetCatalogItem, 'id' | 'created_at' | 'updated_at'> = {
  part_number: 'MAGRARE0100200138N50',
  name: 'Neo 50 - 1.375"',
  description: 'Neodymium grade 50 magnet, 1.375" length. Highest-strength magnet for demanding applications.',
  cross_section_key: '1.00x2.00',
  material_type: MagnetMaterialType.Neo,
  grade: MagnetGrade.Neo50,
  length_in: 1.375,
  width_in: 1.0,
  height_in: 2.0,
  weight_lb: 0.3, // Estimated
  hold_force_proxy_lb: 0.298, // Effective capacity, no additional efficiency applied
  efficiency_factor: 1.0,
  is_active: true,
};

/**
 * Neo 35 - 2" length (for mixing with ceramic on standard bars)
 * This is for the "Ceramic + Neo" configurations in the lookup tables
 *
 * Effective capacity: 0.298 lbs/magnet (back-calculated from lookup tables)
 */
export const NEO_35_2_0: Omit<MagnetCatalogItem, 'id' | 'created_at' | 'updated_at'> = {
  part_number: 'MAGRARE0100200200',
  name: 'Neo 35 - 2"',
  description: 'Neodymium grade 35 magnet, 2" length. Used for boost configurations on standard bars.',
  cross_section_key: '1.00x1.38', // Same cross-section as ceramic to allow mixing
  material_type: MagnetMaterialType.Neo,
  grade: MagnetGrade.Neo35,
  length_in: 2.0,
  width_in: 1.0,
  height_in: 1.38, // Same height as ceramic for mixing
  weight_lb: 0.25, // Estimated
  hold_force_proxy_lb: 0.298, // Effective capacity, no additional efficiency applied
  efficiency_factor: 1.0,
  is_active: true,
};

export const ALL_MAGNET_CATALOG_ITEMS = [
  CERAMIC_5_3_5,
  CERAMIC_5_2_5,
  NEO_35_1_375,
  NEO_50_1_375,
  NEO_35_2_0,
];

// ============================================================================
// REMOVAL CAPACITY LOOKUP TABLES (From Reference Doc)
// These are the target values we need to reproduce with our configuration system
// ============================================================================

/**
 * 12" Width Removal Capacities
 */
export const REMOVAL_CAPACITY_12: RemovalCapacityLookup[] = [
  { oal_in: 12, configuration: 'Ceramic 5 only', ceramic_count: 3, neo_count: 0, lbs_per_bar: 0.362 },
  { oal_in: 12, configuration: 'w/ 1 Neo', ceramic_count: 2, neo_count: 1, lbs_per_bar: 0.52 },
  { oal_in: 12, configuration: 'w/ 2 Neo', ceramic_count: 1, neo_count: 2, lbs_per_bar: 0.717 },
  { oal_in: 12, configuration: 'w/ 3 Neo', ceramic_count: 0, neo_count: 3, lbs_per_bar: 0.896 },
  { oal_in: 12, configuration: 'w/ 4 Neo', ceramic_count: 0, neo_count: 4, lbs_per_bar: 1.054 },
  { oal_in: 12, configuration: 'w/ 5 Neo', ceramic_count: 0, neo_count: 5, lbs_per_bar: 1.192 },
];

/**
 * 15" Width Removal Capacities
 */
export const REMOVAL_CAPACITY_15: RemovalCapacityLookup[] = [
  { oal_in: 15, configuration: 'Ceramic 5 only', ceramic_count: 4, neo_count: 0, lbs_per_bar: 0.48 },
  { oal_in: 15, configuration: 'w/ 1 Neo', ceramic_count: 3, neo_count: 1, lbs_per_bar: 0.621 },
  { oal_in: 15, configuration: 'w/ 2 Neo', ceramic_count: 2, neo_count: 2, lbs_per_bar: 0.818 },
  { oal_in: 15, configuration: 'w/ 3 Neo', ceramic_count: 1, neo_count: 3, lbs_per_bar: 0.976 },
  { oal_in: 15, configuration: 'w/ 4 Neo', ceramic_count: 0, neo_count: 4, lbs_per_bar: 1.155 },
  { oal_in: 15, configuration: 'w/ 5 Neo', ceramic_count: 0, neo_count: 5, lbs_per_bar: 1.352 },
];

/**
 * 18" Width Removal Capacities
 */
export const REMOVAL_CAPACITY_18: RemovalCapacityLookup[] = [
  { oal_in: 18, configuration: 'Ceramic 5 only', ceramic_count: 5, neo_count: 0, lbs_per_bar: 0.542 },
  { oal_in: 18, configuration: 'w/ 1 Neo', ceramic_count: 4, neo_count: 1, lbs_per_bar: 0.739 },
  { oal_in: 18, configuration: 'w/ 2 Neo', ceramic_count: 3, neo_count: 2, lbs_per_bar: 0.88 },
  { oal_in: 18, configuration: 'w/ 3 Neo', ceramic_count: 2, neo_count: 3, lbs_per_bar: 1.077 },
  { oal_in: 18, configuration: 'w/ 4 Neo', ceramic_count: 1, neo_count: 4, lbs_per_bar: 1.274 },
];

/**
 * 24" Width Removal Capacities
 */
export const REMOVAL_CAPACITY_24: RemovalCapacityLookup[] = [
  { oal_in: 24, configuration: 'Ceramic 5 only', ceramic_count: 6, neo_count: 0, lbs_per_bar: 0.723 },
  { oal_in: 24, configuration: 'w/ 1 Neo', ceramic_count: 5, neo_count: 1, lbs_per_bar: 0.92 },
  { oal_in: 24, configuration: 'w/ 2 Neo', ceramic_count: 4, neo_count: 2, lbs_per_bar: 1.061 },
  { oal_in: 24, configuration: 'w/ 3 Neo', ceramic_count: 3, neo_count: 3, lbs_per_bar: 1.258 },
  { oal_in: 24, configuration: 'w/ 4 Neo', ceramic_count: 2, neo_count: 4, lbs_per_bar: 1.454 },
];

/**
 * All removal capacity lookup data
 */
export const ALL_REMOVAL_CAPACITY_LOOKUPS: RemovalCapacityLookup[] = [
  ...REMOVAL_CAPACITY_12,
  ...REMOVAL_CAPACITY_15,
  ...REMOVAL_CAPACITY_18,
  ...REMOVAL_CAPACITY_24,
];

// ============================================================================
// HELPER FUNCTIONS FOR SEED DATA GENERATION
// ============================================================================

/**
 * Generate SQL INSERT statements for conveyor magnet families.
 */
export function generateFamiliesInsertSQL(): string {
  const values = ALL_MAGNET_FAMILIES.map(
    (f) => `(
    '${f.name}',
    '${f.slug}',
    ${f.description ? `'${f.description.replace(/'/g, "''")}'` : 'NULL'},
    '${f.cross_section_key}',
    ${f.magnet_width_in},
    ${f.magnet_height_in},
    ARRAY[${f.allowed_lengths_in.join(', ')}]::NUMERIC(6,3)[],
    ${f.max_magnets_per_bar}
  )`
  ).join(',\n');

  return `INSERT INTO conveyor_magnet_families (
  name,
  slug,
  description,
  cross_section_key,
  magnet_width_in,
  magnet_height_in,
  allowed_lengths_in,
  max_magnets_per_bar
) VALUES
${values};`;
}

/**
 * Generate SQL INSERT statements for magnet catalog items.
 */
export function generateCatalogInsertSQL(): string {
  const values = ALL_MAGNET_CATALOG_ITEMS.map(
    (m) => `(
    '${m.part_number}',
    '${m.name}',
    ${m.description ? `'${m.description.replace(/'/g, "''")}'` : 'NULL'},
    '${m.cross_section_key}',
    '${m.material_type}',
    '${m.grade}',
    ${m.length_in},
    ${m.width_in},
    ${m.height_in},
    ${m.weight_lb},
    ${m.hold_force_proxy_lb},
    ${m.efficiency_factor},
    ${m.is_active}
  )`
  ).join(',\n');

  return `INSERT INTO magnet_catalog (
  part_number,
  name,
  description,
  cross_section_key,
  material_type,
  grade,
  length_in,
  width_in,
  height_in,
  weight_lb,
  hold_force_proxy_lb,
  efficiency_factor,
  is_active
) VALUES
${values};`;
}

/**
 * Compute the expected bar hold force for a given configuration.
 * This helps verify our model matches the reference lookup tables.
 *
 * @param ceramicCount Number of ceramic magnets
 * @param neoCount Number of neo magnets
 * @returns Expected hold force in lbs
 */
export function computeExpectedHoldForce(ceramicCount: number, neoCount: number): number {
  const ceramicCapacity = CERAMIC_5_3_5.hold_force_proxy_lb * CERAMIC_5_3_5.efficiency_factor;
  const neoCapacity = NEO_35_2_0.hold_force_proxy_lb * NEO_35_2_0.efficiency_factor;

  return ceramicCount * ceramicCapacity + neoCount * neoCapacity;
}

/**
 * Validate that our computed values match the reference lookup tables.
 * Returns any discrepancies found.
 */
export function validateAgainstReferenceTables(): Array<{
  lookup: RemovalCapacityLookup;
  computed: number;
  difference: number;
  percentError: number;
}> {
  const discrepancies: Array<{
    lookup: RemovalCapacityLookup;
    computed: number;
    difference: number;
    percentError: number;
  }> = [];

  for (const lookup of ALL_REMOVAL_CAPACITY_LOOKUPS) {
    const computed = computeExpectedHoldForce(lookup.ceramic_count, lookup.neo_count);
    const difference = Math.abs(computed - lookup.lbs_per_bar);
    const percentError = (difference / lookup.lbs_per_bar) * 100;

    // Flag anything with >10% error
    if (percentError > 10) {
      discrepancies.push({
        lookup,
        computed,
        difference,
        percentError,
      });
    }
  }

  return discrepancies;
}

// ============================================================================
// CONSTANTS FOR BAR FILL CALCULATIONS
// ============================================================================

/**
 * Default gap between magnets in inches.
 */
export const DEFAULT_GAP_IN = 0.25;

/**
 * Default end clearance in inches.
 */
export const DEFAULT_END_CLEARANCE_IN = 0;

/**
 * Default leftover tolerance in inches.
 */
export const DEFAULT_LEFTOVER_TOLERANCE_IN = 0.25;

/**
 * Compute how many magnets of a given length fit in a target OAL.
 *
 * Formula: n = floor((target_oal - end_clearance + gap) / (length + gap))
 *
 * @param targetOalIn Target overall length to fill
 * @param magnetLengthIn Length of each magnet
 * @param gapIn Gap between magnets (default 0.25")
 * @param endClearanceIn Clearance at each end (default 0)
 * @returns Object with count, achieved OAL, and leftover
 */
export function computeMagnetCount(
  targetOalIn: number,
  magnetLengthIn: number,
  gapIn: number = DEFAULT_GAP_IN,
  endClearanceIn: number = DEFAULT_END_CLEARANCE_IN
): { count: number; achievedOalIn: number; leftoverIn: number } {
  if (magnetLengthIn <= 0 || targetOalIn <= 0) {
    return { count: 0, achievedOalIn: 0, leftoverIn: targetOalIn };
  }

  // Formula: n = floor((OAL - 2×endClearance + gap) / (length + gap))
  const availableSpace = targetOalIn - 2 * endClearanceIn + gapIn;
  const count = Math.floor(availableSpace / (magnetLengthIn + gapIn));

  if (count <= 0) {
    return { count: 0, achievedOalIn: 2 * endClearanceIn, leftoverIn: targetOalIn - 2 * endClearanceIn };
  }

  // achieved = n × length + (n-1) × gap + 2 × endClearance
  const achievedOalIn =
    count * magnetLengthIn + (count - 1) * gapIn + 2 * endClearanceIn;
  const leftoverIn = targetOalIn - achievedOalIn;

  return { count, achievedOalIn, leftoverIn };
}

/**
 * Compute the number of bars on a chain given belt length and center spacing.
 *
 * Formula: qty = floor(beltLength × 12 / centers) - 1
 *
 * @param beltLengthFt Belt length in feet
 * @param centerSpacingIn Center spacing in inches
 * @returns Number of bars
 */
export function computeBarCount(beltLengthFt: number, centerSpacingIn: number): number {
  if (centerSpacingIn <= 0 || beltLengthFt <= 0) {
    return 0;
  }

  return Math.floor((beltLengthFt * 12) / centerSpacingIn) - 1;
}
