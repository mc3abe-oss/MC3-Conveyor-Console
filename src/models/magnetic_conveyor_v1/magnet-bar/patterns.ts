/**
 * MAGNET BAR CONFIGURATION SYSTEM - PATTERN LOGIC
 *
 * Defines how bar templates repeat along the conveyor chain.
 *
 * Pattern Modes:
 * - all-same: Every bar uses the same template [A][A][A][A]...
 * - alternating: Two templates alternate [A][B][A][B]...
 * - interval: Special template every N bars [A][A][A][B][A][A][A][B]...
 *
 * CHANGELOG:
 * v1.0 (2026-01-31): Initial implementation
 */

import {
  BarPattern,
  BarPatternMode,
  BarTemplate,
  MagnetCatalogItem,
} from './schema';
import { calculateBarCapacity } from './bar-builder';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Configuration for creating a pattern.
 */
export interface PatternConfig {
  mode: BarPatternMode;
  primary_template_id: string;
  secondary_template_id?: string;
  interval_count?: number;
}

/**
 * Result of applying a pattern to get bar sequence.
 */
export interface PatternSequence {
  /** Array of template IDs in order */
  template_ids: string[];
  /** Count of primary template uses */
  primary_count: number;
  /** Count of secondary template uses */
  secondary_count: number;
}

/**
 * Individual bar in the capacity calculation.
 */
export interface BarCapacityEntry {
  position: number;
  template_id: string;
  template_name: string;
  capacity_lb: number;
}

/**
 * Result of calculating conveyor capacity.
 */
export interface ConveyorCapacityResult {
  /** Total removal capacity in lbs */
  total_capacity_lb: number;
  /** Average capacity per bar */
  capacity_per_bar_avg: number;
  /** Detailed bar sequence with capacities */
  bar_sequence: BarCapacityEntry[];
  /** Count of primary template bars */
  primary_bar_count: number;
  /** Count of secondary template bars */
  secondary_bar_count: number;
}

/**
 * Validation result for pattern configuration.
 */
export interface PatternValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Apply a pattern to generate the sequence of bar template IDs.
 *
 * @param pattern Pattern configuration
 * @param total_bars Total number of bars on the conveyor
 * @returns Sequence of template IDs
 */
export function applyPattern(
  pattern: PatternConfig | BarPattern,
  total_bars: number
): PatternSequence {
  if (total_bars <= 0) {
    return { template_ids: [], primary_count: 0, secondary_count: 0 };
  }

  const template_ids: string[] = [];
  let primary_count = 0;
  let secondary_count = 0;

  const primaryId = pattern.primary_template_id;

  const secondaryId = pattern.secondary_template_id;

  // Get interval value - check both possible property names
  const getInterval = (): number => {
    if ('secondary_every_n' in pattern && pattern.secondary_every_n !== undefined) {
      return pattern.secondary_every_n;
    }
    if ('interval_count' in pattern && (pattern as PatternConfig).interval_count !== undefined) {
      return (pattern as PatternConfig).interval_count!;
    }
    return 4; // default
  };

  for (let i = 0; i < total_bars; i++) {
    const position = i + 1; // 1-indexed position
    let templateId: string;

    switch (pattern.mode) {
      case BarPatternMode.AllSame:
        templateId = primaryId;
        primary_count++;
        break;

      case BarPatternMode.Alternating:
        if (position % 2 === 1) {
          templateId = primaryId;
          primary_count++;
        } else {
          templateId = secondaryId || primaryId;
          if (secondaryId) {
            secondary_count++;
          } else {
            primary_count++;
          }
        }
        break;

      case BarPatternMode.Interval:
        const interval = getInterval();
        if (position % interval === 0 && secondaryId) {
          templateId = secondaryId;
          secondary_count++;
        } else {
          templateId = primaryId;
          primary_count++;
        }
        break;

      default:
        templateId = primaryId;
        primary_count++;
    }

    template_ids.push(templateId);
  }

  return { template_ids, primary_count, secondary_count };
}

/**
 * Calculate total removal capacity for the entire conveyor.
 *
 * @param pattern Pattern configuration
 * @param total_bars Total number of bars
 * @param templates Map of template ID to BarTemplate
 * @param magnets Available magnet catalog items
 * @returns Capacity calculation result
 */
export function calculateConveyorCapacity(
  pattern: PatternConfig | BarPattern,
  total_bars: number,
  templates: Map<string, BarTemplate & { slots?: any[] }>,
  magnets: MagnetCatalogItem[]
): ConveyorCapacityResult {
  if (total_bars <= 0) {
    return {
      total_capacity_lb: 0,
      capacity_per_bar_avg: 0,
      bar_sequence: [],
      primary_bar_count: 0,
      secondary_bar_count: 0,
    };
  }

  const sequence = applyPattern(pattern, total_bars);
  const bar_sequence: BarCapacityEntry[] = [];
  let total_capacity_lb = 0;

  // Cache template capacities to avoid recalculating
  const capacityCache = new Map<string, number>();

  for (let i = 0; i < sequence.template_ids.length; i++) {
    const templateId = sequence.template_ids[i];
    const template = templates.get(templateId);

    let capacity_lb = 0;
    let template_name = 'Unknown';

    if (template) {
      template_name = template.name;

      // Check cache first
      if (capacityCache.has(templateId)) {
        capacity_lb = capacityCache.get(templateId)!;
      } else {
        capacity_lb = calculateBarCapacity(template, magnets);
        capacityCache.set(templateId, capacity_lb);
      }
    }

    total_capacity_lb += capacity_lb;
    bar_sequence.push({
      position: i + 1,
      template_id: templateId,
      template_name,
      capacity_lb,
    });
  }

  return {
    total_capacity_lb,
    capacity_per_bar_avg: total_bars > 0 ? total_capacity_lb / total_bars : 0,
    bar_sequence,
    primary_bar_count: sequence.primary_count,
    secondary_bar_count: sequence.secondary_count,
  };
}

/**
 * Calculate conveyor capacity from pre-computed bar capacities.
 *
 * Convenience function when bar capacities are already known.
 *
 * @param pattern Pattern configuration
 * @param total_bars Total number of bars
 * @param primary_capacity_lb Capacity of primary template
 * @param secondary_capacity_lb Capacity of secondary template (optional)
 * @returns Total capacity calculation
 */
export function calculateConveyorCapacityFromValues(
  pattern: PatternConfig,
  total_bars: number,
  primary_capacity_lb: number,
  secondary_capacity_lb: number = 0
): { total_capacity_lb: number; capacity_per_bar_avg: number } {
  const sequence = applyPattern(pattern, total_bars);

  const total_capacity_lb =
    sequence.primary_count * primary_capacity_lb +
    sequence.secondary_count * secondary_capacity_lb;

  return {
    total_capacity_lb,
    capacity_per_bar_avg: total_bars > 0 ? total_capacity_lb / total_bars : 0,
  };
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate a pattern configuration.
 *
 * @param pattern Pattern to validate
 * @param templates Available templates (optional, for existence check)
 * @returns Validation result
 */
export function validatePattern(
  pattern: PatternConfig | BarPattern,
  templates?: Map<string, BarTemplate>
): PatternValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check primary template
  const primaryId = pattern.primary_template_id;
  if (!primaryId) {
    errors.push('Primary template is required');
  } else if (templates && !templates.has(primaryId)) {
    errors.push(`Primary template "${primaryId}" not found`);
  }

  // Check secondary template for modes that require it
  const secondaryId = 'secondary_template_id' in pattern
    ? pattern.secondary_template_id
    : undefined;

  if (pattern.mode === BarPatternMode.Alternating) {
    if (!secondaryId) {
      warnings.push('Alternating mode without secondary template will use primary for all bars');
    } else if (templates && !templates.has(secondaryId)) {
      errors.push(`Secondary template "${secondaryId}" not found`);
    }
  }

  if (pattern.mode === BarPatternMode.Interval) {
    if (!secondaryId) {
      warnings.push('Interval mode without secondary template will use primary for all bars');
    } else if (templates && !templates.has(secondaryId)) {
      errors.push(`Secondary template "${secondaryId}" not found`);
    }

    // Check interval value
    const interval = 'secondary_every_n' in pattern
      ? pattern.secondary_every_n
      : (pattern as PatternConfig).interval_count;

    if (interval !== undefined && interval < 2) {
      errors.push('Interval must be at least 2');
    }
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
 * Get a human-readable description of a pattern.
 */
export function describePattern(
  pattern: PatternConfig | BarPattern,
  templates?: Map<string, BarTemplate>
): string {
  const primaryName = templates?.get(pattern.primary_template_id)?.name ?? 'Primary';
  const secondaryId = 'secondary_template_id' in pattern
    ? pattern.secondary_template_id
    : undefined;
  const secondaryName = secondaryId
    ? templates?.get(secondaryId)?.name ?? 'Secondary'
    : null;

  switch (pattern.mode) {
    case BarPatternMode.AllSame:
      return `All bars: ${primaryName}`;

    case BarPatternMode.Alternating:
      return secondaryName
        ? `Alternating: ${primaryName} / ${secondaryName}`
        : `All bars: ${primaryName}`;

    case BarPatternMode.Interval:
      const interval = 'secondary_every_n' in pattern
        ? pattern.secondary_every_n
        : (pattern as PatternConfig).interval_count ?? 4;
      return secondaryName
        ? `${primaryName}, with ${secondaryName} every ${interval} bars`
        : `All bars: ${primaryName}`;

    default:
      return 'Unknown pattern';
  }
}

/**
 * Create a preview sequence showing the first N bars.
 */
export function previewPattern(
  pattern: PatternConfig | BarPattern,
  previewCount: number = 8
): Array<{ position: number; isPrimary: boolean }> {
  const sequence = applyPattern(pattern, previewCount);
  const primaryId = pattern.primary_template_id;

  return sequence.template_ids.map((id, i) => ({
    position: i + 1,
    isPrimary: id === primaryId,
  }));
}

/**
 * Calculate how bar counts split for a given pattern and total.
 */
export function calculateBarCounts(
  pattern: PatternConfig | BarPattern,
  total_bars: number
): { primary: number; secondary: number } {
  const sequence = applyPattern(pattern, total_bars);
  return {
    primary: sequence.primary_count,
    secondary: sequence.secondary_count,
  };
}

/**
 * Create default pattern configurations for common use cases.
 */
export const DEFAULT_PATTERNS = {
  allCeramic: (templateId: string): PatternConfig => ({
    mode: BarPatternMode.AllSame,
    primary_template_id: templateId,
  }),

  alternating: (primaryId: string, secondaryId: string): PatternConfig => ({
    mode: BarPatternMode.Alternating,
    primary_template_id: primaryId,
    secondary_template_id: secondaryId,
  }),

  sweeperEvery4th: (primaryId: string, sweeperId: string): PatternConfig => ({
    mode: BarPatternMode.Interval,
    primary_template_id: primaryId,
    secondary_template_id: sweeperId,
    interval_count: 4,
  }),
} as const;
