/**
 * useConfigureIssues - Hook for computing validation issues by tab and section
 *
 * Provides:
 * - Issue model with severity, message, tabKey, sectionKey
 * - Aggregated counts by section and tab
 * - Helper functions for indicator display
 * - Pre-calc tracking recommendation and min pulley checks
 */

import { useMemo } from 'react';
import { SliderbedInputs, LacingStyle, BeltTrackingMethod, MaterialForm, CoatingMethod } from '../../src/models/sliderbed_v1/schema';
import {
  calculateTrackingRecommendation,
  TRACKING_MODE_LABELS,
  TrackingRecommendationOutput,
} from '../../src/lib/tracking';
import { getCleatSpacingMultiplier, roundUpToIncrement } from '../../src/lib/belt-catalog';

// ============================================================================
// TAB AND SECTION KEYS
// ============================================================================

export type ConfigureTabKey = 'application' | 'physical' | 'drive' | 'build';

/**
 * Section keys for each tab
 */
export const APPLICATION_SECTIONS = ['product', 'throughput', 'environment'] as const;
export const PHYSICAL_SECTIONS = ['geometry', 'beltPulleys', 'frame'] as const;
export const DRIVE_SECTIONS = ['speed', 'electrical', 'drive', 'advanced'] as const;
export const BUILD_SECTIONS = ['support', 'guards', 'guides', 'beltpulley', 'sensors', 'documentation'] as const;

export type ApplicationSectionKey = typeof APPLICATION_SECTIONS[number];
export type PhysicalSectionKey = typeof PHYSICAL_SECTIONS[number];
export type DriveSectionKey = typeof DRIVE_SECTIONS[number];
export type BuildSectionKey = typeof BUILD_SECTIONS[number];

export type SectionKey = ApplicationSectionKey | PhysicalSectionKey | DriveSectionKey | BuildSectionKey;

// ============================================================================
// ISSUE CODES
// ============================================================================

/**
 * Issue codes for programmatic identification
 */
export enum IssueCode {
  // Tracking issues
  TRACKING_RECOMMENDATION = 'TRACKING_RECOMMENDATION',
  // Min pulley issues
  MIN_PULLEY_DRIVE_TOO_SMALL = 'MIN_PULLEY_DRIVE_TOO_SMALL',
  MIN_PULLEY_TAIL_TOO_SMALL = 'MIN_PULLEY_TAIL_TOO_SMALL',
  // v1.23: Cleats issues
  CLEATS_PROFILE_REQUIRED = 'CLEATS_PROFILE_REQUIRED',
  CLEATS_SIZE_REQUIRED = 'CLEATS_SIZE_REQUIRED',
  // CLEATS_PATTERN_REQUIRED removed - pattern is informational only
  CLEATS_DRILL_SIPED_CAUTION = 'CLEATS_DRILL_SIPED_CAUTION',
  // Finish validation issues
  FINISH_COLOR_REQUIRED = 'FINISH_COLOR_REQUIRED',
  FINISH_NOTE_REQUIRED = 'FINISH_NOTE_REQUIRED',
  GUARDING_COLOR_REQUIRED = 'GUARDING_COLOR_REQUIRED',
  GUARDING_NOTE_REQUIRED = 'GUARDING_NOTE_REQUIRED',
}

// ============================================================================
// ISSUE MODEL
// ============================================================================

export type IssueSeverity = 'error' | 'warning' | 'info';

export interface Issue {
  severity: IssueSeverity;
  message: string;
  detail?: string;
  tabKey: ConfigureTabKey;
  sectionKey: SectionKey;
  fieldKeys?: (keyof SliderbedInputs)[];
  /** Optional code for programmatic identification */
  code?: IssueCode | string;
  /** Optional tracking recommendation data (for TRACKING_RECOMMENDATION issues) */
  trackingData?: TrackingRecommendationOutput;
  /** Optional min pulley data */
  minPulleyData?: {
    requiredIn: number;
    currentIn: number;
    isVGuided: boolean;
    cleatMultiplier?: number;
  };
}

// ============================================================================
// SECTION COUNTS
// ============================================================================

export interface SectionCounts {
  errors: number;
  warnings: number;
}

export interface TabCounts {
  errors: number;
  warnings: number;
}

// ============================================================================
// ISSUE AGGREGATION RESULT
// ============================================================================

export interface IssueAggregation {
  issues: Issue[];
  sectionCounts: Record<SectionKey, SectionCounts>;
  tabCounts: Record<ConfigureTabKey, TabCounts>;
  getIssuesForSection: (sectionKey: SectionKey) => Issue[];
  getIssuesForTab: (tabKey: ConfigureTabKey) => Issue[];
  /** Get tracking recommendation issue (for banner display) */
  getTrackingIssue: () => Issue | undefined;
  /** Get min pulley issues (for banner display) */
  getMinPulleyIssues: () => Issue[];
}

// ============================================================================
// VALIDATION RULES
// ============================================================================

/**
 * Compute validation issues from inputs
 */
function computeIssues(inputs: SliderbedInputs): Issue[] {
  const issues: Issue[] = [];

  // ---------------------------------------------------------------------------
  // APPLICATION TAB - Material Form Selection (v1.48)
  // ---------------------------------------------------------------------------

  const materialForm = inputs.material_form as MaterialForm | string | undefined;
  const isPartsMode = materialForm === MaterialForm.Parts || materialForm === 'PARTS';

  // v1.48: Material form is required for new applications
  if (!materialForm) {
    issues.push({
      severity: 'error',
      message: 'Material form not selected',
      detail: 'Choose PARTS or BULK to proceed with configuration',
      tabKey: 'application',
      sectionKey: 'product',
      fieldKeys: ['material_form'],
    });
  }

  // ---------------------------------------------------------------------------
  // APPLICATION TAB - Product Definition (PARTS mode only)
  // ---------------------------------------------------------------------------

  if (isPartsMode) {
    if (!inputs.part_weight_lbs || inputs.part_weight_lbs <= 0) {
      issues.push({
        severity: 'error',
        message: 'Part weight must be greater than 0',
        tabKey: 'application',
        sectionKey: 'product',
        fieldKeys: ['part_weight_lbs'],
      });
    }

    if (!inputs.part_length_in || inputs.part_length_in <= 0) {
      issues.push({
        severity: 'error',
        message: 'Part length must be greater than 0',
        tabKey: 'application',
        sectionKey: 'product',
        fieldKeys: ['part_length_in'],
      });
    }

    if (!inputs.part_width_in || inputs.part_width_in <= 0) {
      issues.push({
        severity: 'error',
        message: 'Part width must be greater than 0',
        tabKey: 'application',
        sectionKey: 'product',
        fieldKeys: ['part_width_in'],
      });
    }

    // Part width vs belt width warning
    if (inputs.part_width_in && inputs.part_width_in > inputs.belt_width_in) {
      issues.push({
        severity: 'warning',
        message: 'Part width exceeds belt width',
        detail: 'Part may not fit on belt or may overhang edges',
        tabKey: 'application',
        sectionKey: 'product',
        fieldKeys: ['part_width_in'],
      });
    }
  }

  // High drop height warning
  if (inputs.drop_height_in > 24) {
    issues.push({
      severity: 'warning',
      message: 'High drop height may cause belt damage',
      detail: 'Consider reducing drop height or using impact-resistant belt',
      tabKey: 'application',
      sectionKey: 'product',
      fieldKeys: ['drop_height_in'],
    });
  }

  // ---------------------------------------------------------------------------
  // APPLICATION TAB - Throughput Requirements
  // ---------------------------------------------------------------------------

  if (inputs.part_spacing_in < 0) {
    issues.push({
      severity: 'error',
      message: 'Part spacing cannot be negative',
      tabKey: 'application',
      sectionKey: 'throughput',
      fieldKeys: ['part_spacing_in'],
    });
  }

  // ---------------------------------------------------------------------------
  // PHYSICAL TAB - Conveyor Type & Geometry
  // ---------------------------------------------------------------------------

  if (inputs.conveyor_length_cc_in <= 0) {
    issues.push({
      severity: 'error',
      message: 'Conveyor length must be greater than 0',
      tabKey: 'physical',
      sectionKey: 'geometry',
      fieldKeys: ['conveyor_length_cc_in'],
    });
  }

  if (inputs.belt_width_in <= 0) {
    issues.push({
      severity: 'error',
      message: 'Belt width must be greater than 0',
      tabKey: 'physical',
      sectionKey: 'geometry',
      fieldKeys: ['belt_width_in'],
    });
  }

  // Incline warning
  const inclineDeg = inputs.conveyor_incline_deg ?? 0;
  if (inclineDeg > 15) {
    issues.push({
      severity: 'warning',
      message: 'Steep incline may require cleats or textured belt',
      detail: `Incline of ${inclineDeg}° exceeds typical limit for smooth belt`,
      tabKey: 'physical',
      sectionKey: 'geometry',
      fieldKeys: ['conveyor_incline_deg'],
    });
  }

  // ---------------------------------------------------------------------------
  // PHYSICAL TAB - Belt & Pulleys
  // ---------------------------------------------------------------------------

  const drivePulleyDia = inputs.drive_pulley_diameter_in ?? inputs.pulley_diameter_in;
  const tailPulleyDia = inputs.tail_pulley_diameter_in ?? inputs.pulley_diameter_in;

  if (drivePulleyDia < 2) {
    issues.push({
      severity: 'error',
      message: 'Drive pulley diameter must be at least 2"',
      tabKey: 'physical',
      sectionKey: 'beltPulleys',
      fieldKeys: ['drive_pulley_diameter_in'],
    });
  }

  if (tailPulleyDia < 2) {
    issues.push({
      severity: 'error',
      message: 'Tail pulley diameter must be at least 2"',
      tabKey: 'physical',
      sectionKey: 'beltPulleys',
      fieldKeys: ['tail_pulley_diameter_in'],
    });
  }

  // Belt minimum pulley diameter check
  const minPulleyDia = inputs.belt_min_pulley_dia_no_vguide_in ?? 0;
  if (minPulleyDia > 0) {
    if (drivePulleyDia < minPulleyDia) {
      issues.push({
        severity: 'warning',
        message: `Drive pulley diameter below belt minimum (${minPulleyDia}")`,
        detail: 'May cause belt damage or tracking issues',
        tabKey: 'physical',
        sectionKey: 'beltPulleys',
        fieldKeys: ['drive_pulley_diameter_in'],
      });
    }
    if (tailPulleyDia < minPulleyDia) {
      issues.push({
        severity: 'warning',
        message: `Tail pulley diameter below belt minimum (${minPulleyDia}")`,
        detail: 'May cause belt damage or tracking issues',
        tabKey: 'physical',
        sectionKey: 'beltPulleys',
        fieldKeys: ['tail_pulley_diameter_in'],
      });
    }
  }

  // ---------------------------------------------------------------------------
  // DRIVE TAB - Speed Definition
  // ---------------------------------------------------------------------------

  if (inputs.belt_speed_fpm <= 0) {
    issues.push({
      severity: 'error',
      message: 'Belt speed must be greater than 0',
      tabKey: 'drive',
      sectionKey: 'speed',
      fieldKeys: ['belt_speed_fpm'],
    });
  }

  // High belt speed warning
  if (inputs.belt_speed_fpm > 300) {
    issues.push({
      severity: 'warning',
      message: 'High belt speed may increase wear',
      detail: 'Consider motor/gearbox requirements for sustained high-speed operation',
      tabKey: 'drive',
      sectionKey: 'speed',
      fieldKeys: ['belt_speed_fpm'],
    });
  }

  // ---------------------------------------------------------------------------
  // DRIVE TAB - Advanced Parameters
  // ---------------------------------------------------------------------------

  const safetyFactor = inputs.safety_factor ?? 2.0;
  if (safetyFactor < 1.0) {
    issues.push({
      severity: 'error',
      message: 'Safety factor must be at least 1.0',
      tabKey: 'drive',
      sectionKey: 'advanced',
      fieldKeys: ['safety_factor'],
    });
  }

  if (safetyFactor > 5.0) {
    issues.push({
      severity: 'warning',
      message: 'Safety factor above 5.0 is unusually high',
      detail: 'May result in over-sized motor selection',
      tabKey: 'drive',
      sectionKey: 'advanced',
      fieldKeys: ['safety_factor'],
    });
  }

  // ---------------------------------------------------------------------------
  // PHYSICAL TAB - Belt & Pulley (Lacing)
  // Lacing fields are in the Physical tab's Belt & Pulleys section
  // ---------------------------------------------------------------------------

  if (inputs.lacing_style !== LacingStyle.Endless && !inputs.lacing_material) {
    issues.push({
      severity: 'error',
      message: 'Lacing material required when not using endless belt',
      tabKey: 'physical',
      sectionKey: 'beltPulleys',
      fieldKeys: ['lacing_material'],
    });
  }

  // ---------------------------------------------------------------------------
  // BUILD TAB - Documentation & Finish
  // ---------------------------------------------------------------------------

  if (inputs.spec_source === 'CUSTOMER_SPEC' && !inputs.customer_spec_reference) {
    issues.push({
      severity: 'error',
      message: 'Customer spec reference required',
      detail: 'Provide specification document number or reference',
      tabKey: 'build',
      sectionKey: 'documentation',
      fieldKeys: ['customer_spec_reference'],
    });
  }

  // ---------------------------------------------------------------------------
  // BUILD TAB - Conveyor Finish Validation
  // ---------------------------------------------------------------------------

  const finishCoatingMethod = inputs.finish_coating_method || CoatingMethod.PowderCoat;
  const finishIsPowderCoat = finishCoatingMethod === CoatingMethod.PowderCoat || finishCoatingMethod === 'powder_coat';
  const finishIsWetPaint = finishCoatingMethod === CoatingMethod.WetPaint || finishCoatingMethod === 'wet_paint';

  // Powder coat requires color selection
  if (finishIsPowderCoat && !inputs.finish_powder_color_code) {
    issues.push({
      severity: 'error',
      code: IssueCode.FINISH_COLOR_REQUIRED,
      message: 'Conveyor finish color is required',
      detail: 'Select a powder coat color for the conveyor',
      tabKey: 'build',
      sectionKey: 'documentation',
      fieldKeys: ['finish_powder_color_code'],
    });
  }

  // Wet paint or CUSTOM color requires note
  const finishNoteRequired = finishIsWetPaint || inputs.finish_powder_color_code === 'CUSTOM';
  if (finishNoteRequired && !inputs.finish_custom_note?.trim()) {
    issues.push({
      severity: 'error',
      code: IssueCode.FINISH_NOTE_REQUIRED,
      message: finishIsWetPaint ? 'Wet paint details required' : 'Custom color details required',
      detail: finishIsWetPaint
        ? 'Specify paint color, finish type, and any special requirements'
        : 'Provide details about the custom color selection',
      tabKey: 'build',
      sectionKey: 'documentation',
      fieldKeys: ['finish_custom_note'],
    });
  }

  // ---------------------------------------------------------------------------
  // BUILD TAB - Guarding Finish Validation
  // ---------------------------------------------------------------------------

  const guardingCoatingMethod = inputs.guarding_coating_method || CoatingMethod.PowderCoat;
  const guardingIsPowderCoat = guardingCoatingMethod === CoatingMethod.PowderCoat || guardingCoatingMethod === 'powder_coat';
  const guardingIsWetPaint = guardingCoatingMethod === CoatingMethod.WetPaint || guardingCoatingMethod === 'wet_paint';

  // Powder coat requires color selection
  if (guardingIsPowderCoat && !inputs.guarding_powder_color_code) {
    issues.push({
      severity: 'error',
      code: IssueCode.GUARDING_COLOR_REQUIRED,
      message: 'Guarding finish color is required',
      detail: 'Select a powder coat color for guarding',
      tabKey: 'build',
      sectionKey: 'documentation',
      fieldKeys: ['guarding_powder_color_code'],
    });
  }

  // Wet paint or CUSTOM color requires note
  const guardingNoteRequired = guardingIsWetPaint || inputs.guarding_powder_color_code === 'CUSTOM';
  if (guardingNoteRequired && !inputs.guarding_custom_note?.trim()) {
    issues.push({
      severity: 'error',
      code: IssueCode.GUARDING_NOTE_REQUIRED,
      message: guardingIsWetPaint ? 'Wet paint details required' : 'Custom color details required',
      detail: guardingIsWetPaint
        ? 'Specify paint color, finish type, and any special requirements'
        : 'Provide details about the custom color selection',
      tabKey: 'build',
      sectionKey: 'documentation',
      fieldKeys: ['guarding_custom_note'],
    });
  }

  // ---------------------------------------------------------------------------
  // PHYSICAL TAB - Tracking Recommendation (PRE-CALC)
  // ---------------------------------------------------------------------------

  // Calculate tracking recommendation from inputs only (no outputs needed)
  if (inputs.conveyor_length_cc_in > 0 && inputs.belt_width_in > 0) {
    const trackingResult = calculateTrackingRecommendation({
      conveyor_length_cc_in: inputs.conveyor_length_cc_in,
      belt_width_in: inputs.belt_width_in,
      application_class: inputs.application_class,
      belt_construction: inputs.belt_construction,
      reversing_operation: inputs.reversing_operation,
      disturbance_side_loading: inputs.disturbance_side_loading,
      disturbance_load_variability: inputs.disturbance_load_variability,
      disturbance_environment: inputs.disturbance_environment,
      disturbance_installation_risk: inputs.disturbance_installation_risk,
      tracking_preference: inputs.tracking_preference,
    });

    // Always add tracking recommendation as info issue for UI display
    issues.push({
      severity: 'info',
      code: IssueCode.TRACKING_RECOMMENDATION,
      message: `Recommended: ${TRACKING_MODE_LABELS[trackingResult.tracking_mode_recommended] ?? trackingResult.tracking_mode_recommended}`,
      detail: trackingResult.tracking_recommendation_rationale ?? undefined,
      tabKey: 'physical',
      sectionKey: 'beltPulleys',
      trackingData: trackingResult,
    });
  }

  // ---------------------------------------------------------------------------
  // PHYSICAL TAB - Cleats Validation (v1.23)
  // ---------------------------------------------------------------------------

  if (inputs.cleats_mode === 'cleated') {
    // Profile is required when cleats enabled
    if (!inputs.cleat_profile) {
      issues.push({
        severity: 'error',
        code: IssueCode.CLEATS_PROFILE_REQUIRED,
        message: 'Cleat profile is required',
        detail: 'Select a cleat profile from the catalog',
        tabKey: 'physical',
        sectionKey: 'beltPulleys',
        fieldKeys: ['cleat_profile'],
      });
    }

    // Size is required when cleats enabled
    if (!inputs.cleat_size) {
      issues.push({
        severity: 'error',
        code: IssueCode.CLEATS_SIZE_REQUIRED,
        message: 'Cleat size is required',
        detail: 'Select a cleat size',
        tabKey: 'physical',
        sectionKey: 'beltPulleys',
        fieldKeys: ['cleat_size'],
      });
    }

    // NOTE: cleat_pattern validation removed - pattern is informational only
    // and defaults to STRAIGHT_CROSS. No calculations depend on pattern selection.

    // Drill & Siped caution warning
    if (inputs.cleat_style === 'DRILL_SIPED_1IN') {
      issues.push({
        severity: 'warning',
        code: IssueCode.CLEATS_DRILL_SIPED_CAUTION,
        message: 'Drill & Siped cleats have reduced durability',
        detail: 'Perforated cleats are recommended for drainage applications only',
        tabKey: 'physical',
        sectionKey: 'beltPulleys',
        fieldKeys: ['cleat_style'],
      });
    }
  }

  // ---------------------------------------------------------------------------
  // PHYSICAL TAB - Min Pulley Diameter Checks (PRE-CALC)
  // ---------------------------------------------------------------------------

  // Determine if V-guided tracking
  const isVGuided =
    inputs.belt_tracking_method === BeltTrackingMethod.VGuided ||
    inputs.belt_tracking_method === 'V-guided';

  // Get min pulley requirement from belt metadata
  const minPulleyBaseFromBelt = isVGuided
    ? inputs.belt_min_pulley_dia_with_vguide_in
    : inputs.belt_min_pulley_dia_no_vguide_in;

  // Calculate min pulley with cleat multiplier if applicable
  let minPulleyRequired: number | undefined;
  let cleatMultiplier: number | undefined;

  if (minPulleyBaseFromBelt !== undefined) {
    const cleatsEnabled = inputs.cleats_enabled === true;
    const isHotWeldedCleats = inputs.belt_cleat_method === 'hot_welded';

    if (cleatsEnabled && isHotWeldedCleats) {
      const cleatSpacingIn = inputs.cleat_spacing_in ?? 12;
      cleatMultiplier = getCleatSpacingMultiplier(cleatSpacingIn);
      minPulleyRequired = roundUpToIncrement(
        minPulleyBaseFromBelt * cleatMultiplier,
        0.25
      );
    } else {
      minPulleyRequired = minPulleyBaseFromBelt;
    }

    // Check drive pulley
    const drivePulleyDia = inputs.drive_pulley_diameter_in ?? inputs.pulley_diameter_in ?? 4;
    if (drivePulleyDia < minPulleyRequired) {
      issues.push({
        severity: 'warning',
        code: IssueCode.MIN_PULLEY_DRIVE_TOO_SMALL,
        message: `Drive pulley below minimum (${minPulleyRequired}")`,
        detail: `Current: ${drivePulleyDia}", Required: ${minPulleyRequired}" for ${isVGuided ? 'V-guided' : 'crowned'} tracking`,
        tabKey: 'physical',
        sectionKey: 'beltPulleys',
        fieldKeys: ['drive_pulley_diameter_in'],
        minPulleyData: {
          requiredIn: minPulleyRequired,
          currentIn: drivePulleyDia,
          isVGuided,
          cleatMultiplier,
        },
      });
    }

    // v1.16: Check tail pulley independently (always)
    const tailPulleyDia = inputs.tail_pulley_diameter_in ?? drivePulleyDia;

    if (tailPulleyDia < minPulleyRequired) {
      issues.push({
        severity: 'warning',
        code: IssueCode.MIN_PULLEY_TAIL_TOO_SMALL,
        message: `Tail pulley below minimum (${minPulleyRequired}")`,
        detail: `Current: ${tailPulleyDia}", Required: ${minPulleyRequired}" for ${isVGuided ? 'V-guided' : 'crowned'} tracking`,
        tabKey: 'physical',
        sectionKey: 'beltPulleys',
        fieldKeys: ['tail_pulley_diameter_in'],
        minPulleyData: {
          requiredIn: minPulleyRequired,
          currentIn: tailPulleyDia,
          isVGuided,
          cleatMultiplier,
        },
      });
    }
  }

  return issues;
}

// ============================================================================
// AGGREGATION HELPERS
// ============================================================================

function initSectionCounts(): Record<SectionKey, SectionCounts> {
  const sections: SectionKey[] = [
    ...APPLICATION_SECTIONS,
    ...PHYSICAL_SECTIONS,
    ...DRIVE_SECTIONS,
    ...BUILD_SECTIONS,
  ];
  return sections.reduce(
    (acc, key) => {
      acc[key] = { errors: 0, warnings: 0 };
      return acc;
    },
    {} as Record<SectionKey, SectionCounts>
  );
}

function initTabCounts(): Record<ConfigureTabKey, TabCounts> {
  return {
    application: { errors: 0, warnings: 0 },
    physical: { errors: 0, warnings: 0 },
    drive: { errors: 0, warnings: 0 },
    build: { errors: 0, warnings: 0 },
  };
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useConfigureIssues(inputs: SliderbedInputs): IssueAggregation {
  return useMemo(() => {
    const issues = computeIssues(inputs);

    // Aggregate by section (info severity doesn't count toward warnings)
    const sectionCounts = initSectionCounts();
    for (const issue of issues) {
      if (issue.severity === 'error') {
        sectionCounts[issue.sectionKey].errors++;
      } else if (issue.severity === 'warning') {
        sectionCounts[issue.sectionKey].warnings++;
      }
      // 'info' severity is not counted in error/warning counts
    }

    // Aggregate by tab (info severity doesn't count toward warnings)
    const tabCounts = initTabCounts();
    for (const issue of issues) {
      if (issue.severity === 'error') {
        tabCounts[issue.tabKey].errors++;
      } else if (issue.severity === 'warning') {
        tabCounts[issue.tabKey].warnings++;
      }
      // 'info' severity is not counted in error/warning counts
    }

    // Helper functions
    const getIssuesForSection = (sectionKey: SectionKey) =>
      issues.filter((i) => i.sectionKey === sectionKey);

    const getIssuesForTab = (tabKey: ConfigureTabKey) =>
      issues.filter((i) => i.tabKey === tabKey);

    // Get tracking recommendation issue (for banner display)
    const getTrackingIssue = () =>
      issues.find((i) => i.code === IssueCode.TRACKING_RECOMMENDATION);

    // Get min pulley issues (for banner display)
    const getMinPulleyIssues = () =>
      issues.filter(
        (i) =>
          i.code === IssueCode.MIN_PULLEY_DRIVE_TOO_SMALL ||
          i.code === IssueCode.MIN_PULLEY_TAIL_TOO_SMALL
      );

    return {
      issues,
      sectionCounts,
      tabCounts,
      getIssuesForSection,
      getIssuesForTab,
      getTrackingIssue,
      getMinPulleyIssues,
    };
  }, [inputs]);
}

// ============================================================================
// INDICATOR DISPLAY HELPERS
// ============================================================================

export type IndicatorStatus = 'error' | 'warning' | 'ok' | 'none';

/**
 * Get the indicator status from counts
 */
export function getIndicatorStatus(counts: SectionCounts | TabCounts): IndicatorStatus {
  if (counts.errors > 0) return 'error';
  if (counts.warnings > 0) return 'warning';
  return 'none'; // No indicator when no issues
}

/**
 * Get CSS classes for indicator chip
 */
export function getIndicatorClasses(status: IndicatorStatus): string {
  switch (status) {
    case 'error':
      return 'bg-red-100 text-red-800';
    case 'warning':
      return 'bg-yellow-100 text-yellow-800';
    case 'ok':
      return 'bg-green-100 text-green-800';
    case 'none':
    default:
      return 'hidden';
  }
}

/**
 * Get indicator count text
 */
export function getIndicatorText(counts: SectionCounts | TabCounts): string {
  if (counts.errors > 0 && counts.warnings > 0) {
    return `${counts.errors}E ${counts.warnings}W`;
  }
  if (counts.errors > 0) {
    return counts.errors === 1 ? '1 error' : `${counts.errors} errors`;
  }
  if (counts.warnings > 0) {
    return counts.warnings === 1 ? '1 warning' : `${counts.warnings} warnings`;
  }
  return '';
}
