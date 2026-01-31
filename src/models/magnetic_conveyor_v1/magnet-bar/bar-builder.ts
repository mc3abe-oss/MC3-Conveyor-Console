/**
 * MAGNET BAR CONFIGURATION SYSTEM - BAR BUILDER LOGIC
 *
 * Core calculation engine for building magnet bars.
 *
 * This module provides functions to:
 * - Compute how many magnets fit in a target OAL
 * - Build bar templates from magnet selections
 * - Calculate bar removal capacity with saturation correction
 * - Validate bar configurations against family rules
 *
 * Mental Model: Bars are filled left-to-right with magnets + gaps until OAL is reached:
 *   Bar OAL: 12"
 *   [Ceramic 3.5"][gap 0.25"][Ceramic 3.5"][gap 0.25"][Ceramic 3.5"] = 11.0"
 *   Remaining: 1.0" (within tolerance)
 *
 * CHANGELOG:
 * v1.0 (2026-01-31): Initial implementation
 */

import {
  MagnetCatalogItem,
  MagnetMaterialType,
  ConveyorMagnetFamily,
  BarTemplate,
  BarSlot,
  BarTemplateComputed,
  getMagnetRemovalCapacity,
} from './schema';

import {
  DEFAULT_GAP_IN,
  DEFAULT_END_CLEARANCE_IN,
  DEFAULT_LEFTOVER_TOLERANCE_IN,
} from './seed-data';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result of computing magnet fit.
 */
export interface MagnetFitResult {
  /** Number of magnets that fit */
  count: number;
  /** Achieved OAL in inches */
  achieved_oal: number;
  /** Remaining space in inches */
  remaining: number;
}

/**
 * Slot specification for building a bar.
 */
export interface SlotSpec {
  /** Magnet ID */
  magnet_id: string;
  /** Quantity of this magnet type */
  quantity: number;
}

/**
 * Validation result for bar configuration.
 */
export interface BarValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Compute how many magnets of a given length fit in target OAL.
 *
 * Formula: n = floor((OAL - 2×endClearance + gap) / (length + gap))
 *
 * @param target_oal_in Target overall length to fill
 * @param magnet_length_in Length of each magnet
 * @param gap_in Gap between magnets (default 0.25")
 * @param end_clearance_in Clearance at each end (default 0)
 * @returns Object with count, achieved OAL, and remaining space
 */
export function computeMagnetFit(
  target_oal_in: number,
  magnet_length_in: number,
  gap_in: number = DEFAULT_GAP_IN,
  end_clearance_in: number = DEFAULT_END_CLEARANCE_IN
): MagnetFitResult {
  if (magnet_length_in <= 0 || target_oal_in <= 0) {
    return { count: 0, achieved_oal: 0, remaining: target_oal_in };
  }

  // Formula: n = floor((OAL - 2×endClearance + gap) / (length + gap))
  const availableSpace = target_oal_in - 2 * end_clearance_in + gap_in;
  const count = Math.floor(availableSpace / (magnet_length_in + gap_in));

  if (count <= 0) {
    return {
      count: 0,
      achieved_oal: 2 * end_clearance_in,
      remaining: target_oal_in - 2 * end_clearance_in,
    };
  }

  // achieved = n × length + (n-1) × gap + 2 × endClearance
  const achieved_oal =
    count * magnet_length_in + (count - 1) * gap_in + 2 * end_clearance_in;
  const remaining = target_oal_in - achieved_oal;

  return { count, achieved_oal, remaining };
}

/**
 * Build a bar template from magnet selections.
 *
 * Takes slot specifications (magnet_id + quantity) and computes the bar layout.
 *
 * @param target_oal_in Target overall length
 * @param slots Array of slot specifications (magnet_id + quantity)
 * @param gap_in Gap between magnets
 * @param magnets Available magnet catalog items
 * @param family_id Family ID for the template
 * @returns Partial BarTemplate with computed slots (without DB IDs)
 */
export function buildBarTemplate(
  target_oal_in: number,
  slots: SlotSpec[],
  gap_in: number,
  magnets: MagnetCatalogItem[],
  family_id: string = ''
): Omit<BarTemplate, 'id' | 'created_at' | 'updated_at'> & {
  computed_slots: Array<Omit<BarSlot, 'id' | 'bar_template_id' | 'created_at'>>;
  computed: BarTemplateComputed;
} {
  // Build a magnet lookup map
  const magnetMap = new Map(magnets.map((m) => [m.id, m]));

  // Build slots with positions
  const computedSlots: Array<Omit<BarSlot, 'id' | 'bar_template_id' | 'created_at'>> = [];
  let position = 0;
  let slotIndex = 0;
  let totalHoldForce = 0;
  let totalWeight = 0;
  const validationErrors: string[] = [];

  for (const spec of slots) {
    const magnet = magnetMap.get(spec.magnet_id);
    if (!magnet) {
      validationErrors.push(`Magnet ${spec.magnet_id} not found in catalog`);
      continue;
    }

    for (let i = 0; i < spec.quantity; i++) {
      // Add gap before magnet (except for first)
      if (slotIndex > 0) {
        position += gap_in;
      }

      computedSlots.push({
        magnet_id: spec.magnet_id,
        position_in: position,
        slot_index: slotIndex,
      });

      position += magnet.length_in;
      totalHoldForce += getMagnetRemovalCapacity(magnet);
      totalWeight += magnet.weight_lb;
      slotIndex++;
    }
  }

  const achievedOal = position;
  const leftover = target_oal_in - achievedOal;
  const isValid = leftover >= 0 && leftover <= DEFAULT_LEFTOVER_TOLERANCE_IN && validationErrors.length === 0;

  if (leftover < 0) {
    validationErrors.push(`Bar overfill: ${Math.abs(leftover).toFixed(3)}" over target OAL`);
  } else if (leftover > DEFAULT_LEFTOVER_TOLERANCE_IN) {
    validationErrors.push(`Excessive leftover: ${leftover.toFixed(3)}" (tolerance: ${DEFAULT_LEFTOVER_TOLERANCE_IN}")`);
  }

  return {
    name: `${target_oal_in}" Bar Template`,
    family_id,
    target_oal_in,
    gap_in,
    end_clearance_in: DEFAULT_END_CLEARANCE_IN,
    leftover_tolerance_in: DEFAULT_LEFTOVER_TOLERANCE_IN,
    is_sweeper: false,
    is_active: true,
    computed_slots: computedSlots,
    computed: {
      magnet_count: computedSlots.length,
      achieved_oal_in: achievedOal,
      leftover_in: leftover,
      is_valid: isValid,
      bar_hold_force_lb: totalHoldForce,
      bar_weight_lb: totalWeight,
      validation_errors: validationErrors,
    },
  };
}

/**
 * Calculate total removal capacity for a bar template.
 *
 * Sums the capacity of all magnets and applies saturation correction
 * for high Neo counts.
 *
 * @param template Bar template with slots
 * @param magnets Available magnet catalog items
 * @returns Total removal capacity in lbs
 */
export function calculateBarCapacity(
  template: BarTemplate & { slots?: BarSlot[] },
  magnets: MagnetCatalogItem[]
): number {
  if (!template.slots || template.slots.length === 0) {
    return 0;
  }

  const magnetMap = new Map(magnets.map((m) => [m.id, m]));

  let ceramicCount = 0;
  let neoCount = 0;
  let baseCapacity = 0;

  for (const slot of template.slots) {
    const magnet = magnetMap.get(slot.magnet_id);
    if (!magnet) continue;

    baseCapacity += getMagnetRemovalCapacity(magnet);

    if (magnet.material_type === MagnetMaterialType.Ceramic) {
      ceramicCount++;
    } else if (magnet.material_type === MagnetMaterialType.Neo) {
      neoCount++;
    }
  }

  // Apply saturation correction for pure Neo configurations
  return applySaturationCorrection(baseCapacity, neoCount, ceramicCount, template.target_oal_in);
}

/**
 * Calculate bar capacity from magnet counts directly.
 *
 * Convenience function for quick capacity calculation without building a full template.
 *
 * @param ceramicCount Number of ceramic magnets
 * @param neoCount Number of neo magnets
 * @param barWidthIn Bar width in inches
 * @param ceramicCapacityEach Capacity per ceramic magnet (default from seed data)
 * @param neoCapacityEach Capacity per neo magnet (default from seed data)
 * @returns Total removal capacity in lbs
 */
export function calculateBarCapacityFromCounts(
  ceramicCount: number,
  neoCount: number,
  barWidthIn: number,
  ceramicCapacityEach: number = 0.1207,
  neoCapacityEach: number = 0.298
): number {
  const baseCapacity = ceramicCount * ceramicCapacityEach + neoCount * neoCapacityEach;
  return applySaturationCorrection(baseCapacity, neoCount, ceramicCount, barWidthIn);
}

// ============================================================================
// SATURATION CORRECTION
// ============================================================================

/**
 * Saturation correction factors for pure Neo configurations.
 *
 * Empirically derived from reference lookup tables.
 * Key insight: Magnetic interference increases with more Neo magnets on narrower bars.
 *
 * Pattern from Phase 1 analysis:
 * - 12" bar: 4 Neo = 88.4% efficiency, 5 Neo = 80% efficiency
 * - 15" bar: 4 Neo = 96.9% efficiency, 5 Neo = 90.7% efficiency
 * - Wider bars show minimal saturation
 */
const SATURATION_LOOKUP: Record<number, Record<number, number>> = {
  // bar_width_in -> neo_count -> efficiency_factor (1.0 = no correction)
  12: { 4: 0.884, 5: 0.80, 6: 0.72 },
  15: { 4: 0.969, 5: 0.907, 6: 0.85 },
  18: { 4: 0.99, 5: 0.95, 6: 0.90 },
  24: { 4: 1.0, 5: 0.98, 6: 0.95 },
};

/**
 * Neo count threshold below which no saturation correction is applied.
 */
const SATURATION_THRESHOLD = 3;

/**
 * Apply saturation correction for high Neo counts.
 *
 * Neo magnets create magnetic interference when packed closely on narrow bars.
 * This effect causes diminishing returns for configurations with many Neos.
 *
 * @param base_capacity Linear sum of magnet capacities
 * @param neo_count Number of neo magnets
 * @param ceramic_count Number of ceramic magnets
 * @param bar_width_in Bar width in inches
 * @returns Corrected capacity with saturation effect applied
 */
export function applySaturationCorrection(
  base_capacity: number,
  neo_count: number,
  ceramic_count: number,
  bar_width_in: number
): number {
  // No correction needed for low Neo counts or mixed configurations
  if (neo_count <= SATURATION_THRESHOLD || ceramic_count > 0) {
    return base_capacity;
  }

  // Get saturation factor from lookup or interpolate
  const factor = getSaturationFactor(bar_width_in, neo_count);
  return base_capacity * factor;
}

/**
 * Get saturation factor for a given bar width and Neo count.
 *
 * Uses lookup table with interpolation for unlisted values.
 */
function getSaturationFactor(barWidthIn: number, neoCount: number): number {
  // Find nearest bar widths for interpolation
  const widths = Object.keys(SATURATION_LOOKUP).map(Number).sort((a, b) => a - b);

  // Get bounding widths
  let lowerWidth = widths[0];
  let upperWidth = widths[widths.length - 1];

  for (let i = 0; i < widths.length - 1; i++) {
    if (barWidthIn >= widths[i] && barWidthIn <= widths[i + 1]) {
      lowerWidth = widths[i];
      upperWidth = widths[i + 1];
      break;
    }
  }

  // Clamp to table bounds
  if (barWidthIn <= lowerWidth) {
    return getFactorForWidth(lowerWidth, neoCount);
  }
  if (barWidthIn >= upperWidth) {
    return getFactorForWidth(upperWidth, neoCount);
  }

  // Interpolate between widths
  const lowerFactor = getFactorForWidth(lowerWidth, neoCount);
  const upperFactor = getFactorForWidth(upperWidth, neoCount);
  const t = (barWidthIn - lowerWidth) / (upperWidth - lowerWidth);

  return lowerFactor + t * (upperFactor - lowerFactor);
}

/**
 * Get saturation factor for an exact width from the lookup table.
 */
function getFactorForWidth(width: number, neoCount: number): number {
  const widthFactors = SATURATION_LOOKUP[width];
  if (!widthFactors) {
    return 1.0;
  }

  // Get factor for this Neo count, or extrapolate
  if (widthFactors[neoCount] !== undefined) {
    return widthFactors[neoCount];
  }

  // Extrapolate for higher Neo counts
  const maxNeo = Math.max(...Object.keys(widthFactors).map(Number));
  if (neoCount > maxNeo) {
    const extraReduction = (neoCount - maxNeo) * 0.08 * (12 / width);
    return Math.max(0.5, widthFactors[maxNeo] - extraReduction);
  }

  return 1.0;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate bar configuration against family membership rules.
 *
 * Checks:
 * - All magnets belong to the family (cross-section match)
 * - Magnet lengths are in the allowed list
 * - Magnet count doesn't exceed maximum
 * - OAL is within tolerance
 *
 * @param template Bar template to validate
 * @param family Conveyor magnet family with rules
 * @param magnets Available magnet catalog items
 * @returns Validation result with errors and warnings
 */
export function validateBarConfig(
  template: BarTemplate & { slots?: BarSlot[] },
  family: ConveyorMagnetFamily,
  magnets: MagnetCatalogItem[]
): BarValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!template.slots || template.slots.length === 0) {
    errors.push('Bar template has no slots');
    return { valid: false, errors, warnings };
  }

  const magnetMap = new Map(magnets.map((m) => [m.id, m]));

  // Check magnet count
  if (template.slots.length > family.max_magnets_per_bar) {
    errors.push(
      `Too many magnets: ${template.slots.length} exceeds max ${family.max_magnets_per_bar}`
    );
  }

  // Check each magnet
  let totalLength = 0;
  const gapCount = Math.max(0, template.slots.length - 1);

  for (const slot of template.slots) {
    const magnet = magnetMap.get(slot.magnet_id);
    if (!magnet) {
      errors.push(`Magnet ${slot.magnet_id} not found in catalog`);
      continue;
    }

    // Check cross-section match
    if (magnet.cross_section_key !== family.cross_section_key) {
      errors.push(
        `Magnet ${magnet.name} has wrong cross-section: ${magnet.cross_section_key} ` +
          `(family requires ${family.cross_section_key})`
      );
    }

    // Check allowed lengths
    if (!family.allowed_lengths_in.includes(magnet.length_in)) {
      warnings.push(
        `Magnet ${magnet.name} has non-standard length: ${magnet.length_in}" ` +
          `(family allows ${family.allowed_lengths_in.join(', ')}")`
      );
    }

    // Check active status
    if (!magnet.is_active) {
      warnings.push(`Magnet ${magnet.name} is inactive`);
    }

    totalLength += magnet.length_in;
  }

  // Check OAL
  const achievedOal = totalLength + gapCount * template.gap_in + 2 * template.end_clearance_in;
  const leftover = template.target_oal_in - achievedOal;

  if (leftover < 0) {
    errors.push(
      `Bar overfill: achieved ${achievedOal.toFixed(3)}" exceeds target ${template.target_oal_in}"`
    );
  } else if (leftover > template.leftover_tolerance_in) {
    warnings.push(
      `Excessive leftover: ${leftover.toFixed(3)}" (tolerance: ${template.leftover_tolerance_in}")`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Count magnets by type from a bar template.
 */
export function countMagnetsByType(
  template: BarTemplate & { slots?: BarSlot[] },
  magnets: MagnetCatalogItem[]
): { ceramic: number; neo: number; total: number } {
  if (!template.slots) {
    return { ceramic: 0, neo: 0, total: 0 };
  }

  const magnetMap = new Map(magnets.map((m) => [m.id, m]));
  let ceramic = 0;
  let neo = 0;

  for (const slot of template.slots) {
    const magnet = magnetMap.get(slot.magnet_id);
    if (!magnet) continue;

    if (magnet.material_type === MagnetMaterialType.Ceramic) {
      ceramic++;
    } else if (magnet.material_type === MagnetMaterialType.Neo) {
      neo++;
    }
  }

  return { ceramic, neo, total: ceramic + neo };
}

/**
 * Create slot specifications from magnet counts.
 *
 * Convenience function for building a bar from simple counts.
 *
 * @param ceramicMagnetId ID of ceramic magnet to use
 * @param ceramicCount Number of ceramic magnets
 * @param neoMagnetId ID of neo magnet to use
 * @param neoCount Number of neo magnets
 * @returns Array of slot specifications
 */
export function createSlotSpecsFromCounts(
  ceramicMagnetId: string,
  ceramicCount: number,
  neoMagnetId: string,
  neoCount: number
): SlotSpec[] {
  const specs: SlotSpec[] = [];

  if (ceramicCount > 0) {
    specs.push({ magnet_id: ceramicMagnetId, quantity: ceramicCount });
  }

  if (neoCount > 0) {
    specs.push({ magnet_id: neoMagnetId, quantity: neoCount });
  }

  return specs;
}

/**
 * Compute optimal magnet mix for a target OAL.
 *
 * Fills the bar with ceramic magnets first, then optionally adds neo magnets.
 *
 * @param target_oal_in Target overall length
 * @param ceramic_length_in Ceramic magnet length
 * @param neo_length_in Neo magnet length
 * @param gap_in Gap between magnets
 * @param neo_boost Number of ceramic magnets to replace with neo
 * @returns Optimal counts { ceramic, neo }
 */
export function computeOptimalMix(
  target_oal_in: number,
  ceramic_length_in: number,
  neo_length_in: number,
  gap_in: number = DEFAULT_GAP_IN,
  neo_boost: number = 0
): { ceramic: number; neo: number } {
  // Start with ceramic-only fill
  const ceramicFit = computeMagnetFit(target_oal_in, ceramic_length_in, gap_in);
  let ceramicCount = ceramicFit.count;
  let neoCount = 0;

  if (neo_boost <= 0 || neo_boost > ceramicCount) {
    return { ceramic: ceramicCount, neo: 0 };
  }

  // Replace some ceramics with neos
  // Each replacement changes length by (neo_length - ceramic_length)
  const lengthDelta = neo_length_in - ceramic_length_in;

  // Check if replacements fit
  let remaining = ceramicFit.remaining;
  for (let i = 0; i < neo_boost; i++) {
    remaining -= lengthDelta;
    if (remaining < -DEFAULT_LEFTOVER_TOLERANCE_IN) {
      // Can't fit this replacement
      break;
    }
    ceramicCount--;
    neoCount++;
  }

  return { ceramic: ceramicCount, neo: neoCount };
}
