/**
 * Outputs V2 Public API
 *
 * This is the single entry point for all outputs_v2 functionality.
 * Import from this module, not from internal files.
 */

// =============================================================================
// MAIN BUILDER
// =============================================================================

export { buildOutputsV2 } from './builder';
export type { BuildOutputsV2Input } from './builder';

// =============================================================================
// EXPORTS
// =============================================================================

export { exportOutputsV2ToJSON, parseOutputsV2FromJSON } from './export_json';
export { buildCsvRows, csvRowsToString } from './export_csv';

import { OutputsV2 } from './schema';
import { buildCsvRows, csvRowsToString } from './export_csv';

/**
 * Convenience function to export OutputsV2 directly to CSV string
 */
export function exportOutputsV2ToCSV(outputs: OutputsV2): string {
  // v1.38: Pass actual_belt_speed_fpm for belt component rows
  const csvRows = buildCsvRows(
    outputs.components,
    outputs.warnings_and_notes,
    outputs.summary.actual_belt_speed_fpm
  );
  return csvRowsToString(csvRows);
}

// =============================================================================
// TYPES - Core
// =============================================================================

export type {
  OutputsV2,
  OutputsV2Meta,
  SummaryV2,
  SupportSystemV2,
  CalcResultsV2,
  DesignGeometryV2,
  ExportsV2,
  SupportType,
  TobRelevance,
  TobValueV2,
  FrameHeightValueV2,
  PulleyLocationV2,
  RollerSpacingV2,
} from './schema';

// =============================================================================
// TYPES - Components
// =============================================================================

export type {
  ComponentV2,
  ComponentType,
  CanonicalComponentId,
  ComponentSelectionV2,
  ComponentValidationV2,
} from './schema';

// =============================================================================
// TYPES - Vendor Packets
// =============================================================================

export type {
  VendorPacketV2,
  VendorPacketBeltV2,
  VendorPacketPulleyV2,
  VendorPacketRollerV2,
  VendorPacketDriveV2,
  VendorPacketLegsV2,
  VendorPacketCastersV2,
  VendorPacketBundleV2,
  VendorPacketSupportsV2,
  BeltTrackingV2,
  BeltVGuideV2,
  BeltCleatsV2,
  BeltOperatingConditionsV2,
  PulleyLaggingV2,
  PulleyCrownV2,
  PulleyHubV2,
  PulleyShaftV2,
  PulleyLoadsV2,
  RollerTubeV2,
  RollerAxleV2,
  RollerBearingV2,
  DriveElectricalV2,
  DriveOutputShaftV2,
  LegHeightRangeV2,
} from './schema';

// =============================================================================
// TYPES - Messages and Exports
// =============================================================================

export type {
  OutputMessageV2,
  OutputImpact,
  CsvRowsV2,
} from './schema';

// =============================================================================
// CONSTANTS
// =============================================================================

export { CSV_COLUMNS_V2, WARNING_CODES } from './schema';

// =============================================================================
// WARNING UTILITIES
// =============================================================================

export {
  runAllWarningRules,
  getWarningsForComponent,
  getWorstStatus,
} from './warnings';

export type { WarningRuleContext } from './warnings';
