/**
 * useConfigureIssues - Hook for computing validation issues by tab and section
 *
 * Provides:
 * - Issue model with severity, message, tabKey, sectionKey
 * - Aggregated counts by section and tab
 * - Helper functions for indicator display
 */

import { useMemo } from 'react';
import { SliderbedInputs, LacingStyle } from '../../src/models/sliderbed_v1/schema';
import {
  calculateTrackingGuidance,
  TrackingRiskLevel,
} from '../../src/models/sliderbed_v1/tracking-guidance';

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
export const BUILD_SECTIONS = ['guards', 'guides', 'beltpulley', 'sensors', 'documentation'] as const;

export type ApplicationSectionKey = typeof APPLICATION_SECTIONS[number];
export type PhysicalSectionKey = typeof PHYSICAL_SECTIONS[number];
export type DriveSectionKey = typeof DRIVE_SECTIONS[number];
export type BuildSectionKey = typeof BUILD_SECTIONS[number];

export type SectionKey = ApplicationSectionKey | PhysicalSectionKey | DriveSectionKey | BuildSectionKey;

// ============================================================================
// ISSUE MODEL
// ============================================================================

export type IssueSeverity = 'error' | 'warning';

export interface Issue {
  severity: IssueSeverity;
  message: string;
  detail?: string;
  tabKey: ConfigureTabKey;
  sectionKey: SectionKey;
  fieldKeys?: (keyof SliderbedInputs)[];
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
  // APPLICATION TAB - Product Definition
  // ---------------------------------------------------------------------------

  if (inputs.part_weight_lbs <= 0) {
    issues.push({
      severity: 'error',
      message: 'Part weight must be greater than 0',
      tabKey: 'application',
      sectionKey: 'product',
      fieldKeys: ['part_weight_lbs'],
    });
  }

  if (inputs.part_length_in <= 0) {
    issues.push({
      severity: 'error',
      message: 'Part length must be greater than 0',
      tabKey: 'application',
      sectionKey: 'product',
      fieldKeys: ['part_length_in'],
    });
  }

  if (inputs.part_width_in <= 0) {
    issues.push({
      severity: 'error',
      message: 'Part width must be greater than 0',
      tabKey: 'application',
      sectionKey: 'product',
      fieldKeys: ['part_width_in'],
    });
  }

  // Part width vs belt width warning
  if (inputs.part_width_in > inputs.belt_width_in) {
    issues.push({
      severity: 'warning',
      message: 'Part width exceeds belt width',
      detail: 'Part may not fit on belt or may overhang edges',
      tabKey: 'application',
      sectionKey: 'product',
      fieldKeys: ['part_width_in'],
    });
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
  // BUILD TAB - Belt & Pulley (Lacing)
  // ---------------------------------------------------------------------------

  if (inputs.lacing_style !== LacingStyle.Endless && !inputs.lacing_material) {
    issues.push({
      severity: 'error',
      message: 'Lacing material required when not using endless belt',
      tabKey: 'build',
      sectionKey: 'beltpulley',
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
  // PHYSICAL TAB - Belt & Pulleys (Tracking Guidance Advisory)
  // ---------------------------------------------------------------------------

  const trackingGuidance = calculateTrackingGuidance(inputs);
  if (trackingGuidance.riskLevel === TrackingRiskLevel.High) {
    issues.push({
      severity: 'warning',
      message: 'Tracking guidance: V-guided recommended (High Risk)',
      detail: trackingGuidance.summary,
      tabKey: 'physical',
      sectionKey: 'beltPulleys',
    });
  } else if (trackingGuidance.riskLevel === TrackingRiskLevel.Medium) {
    issues.push({
      severity: 'warning',
      message: 'Tracking guidance: Consider V-guided (Medium Risk)',
      detail: trackingGuidance.summary,
      tabKey: 'physical',
      sectionKey: 'beltPulleys',
    });
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

    // Aggregate by section
    const sectionCounts = initSectionCounts();
    for (const issue of issues) {
      if (issue.severity === 'error') {
        sectionCounts[issue.sectionKey].errors++;
      } else {
        sectionCounts[issue.sectionKey].warnings++;
      }
    }

    // Aggregate by tab
    const tabCounts = initTabCounts();
    for (const issue of issues) {
      if (issue.severity === 'error') {
        tabCounts[issue.tabKey].errors++;
      } else {
        tabCounts[issue.tabKey].warnings++;
      }
    }

    // Helper functions
    const getIssuesForSection = (sectionKey: SectionKey) =>
      issues.filter((i) => i.sectionKey === sectionKey);

    const getIssuesForTab = (tabKey: ConfigureTabKey) =>
      issues.filter((i) => i.tabKey === tabKey);

    return {
      issues,
      sectionCounts,
      tabCounts,
      getIssuesForSection,
      getIssuesForTab,
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
