/**
 * HYPOTHETICAL REFERENCE APPLICATIONS - INDEX
 *
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  WARNING: These are NOT golden fixtures                                   ║
 * ║                                                                           ║
 * ║  STATUS: hypothetical                                                     ║
 * ║  SOURCE: assumed / illustrative                                           ║
 * ║  EXCEL VERIFIED: NO                                                       ║
 * ║                                                                           ║
 * ║  DO NOT use numeric values as authoritative test expectations.            ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import { scenario as basicFlat } from './01-basic-flat';
import { scenario as moderateIncline } from './02-moderate-incline';
import { scenario as steepIncline } from './03-steep-incline';
import { scenario as vguidedTracking } from './04-vguided-tracking';
import { scenario as cleatedBelt } from './05-cleated-belt';
import { scenario as floorSupported } from './06-floor-supported';
import { scenario as highSpeed } from './07-high-speed';
import { scenario as heavyLoad } from './08-heavy-load';
import { scenario as hotParts } from './09-hot-parts';
import { scenario as longConveyor } from './10-long-conveyor';

/**
 * All hypothetical scenarios
 *
 * REMINDER: These exist ONLY for:
 * - Documenting expected RELATIONSHIPS
 * - Illustrating logic paths
 * - Providing templates for Excel verification
 *
 * They are NOT:
 * - Authoritative calculations
 * - Golden fixtures
 * - Suitable for numeric regression testing
 */
export const HYPOTHETICAL_SCENARIOS = [
  basicFlat,
  moderateIncline,
  steepIncline,
  vguidedTracking,
  cleatedBelt,
  floorSupported,
  highSpeed,
  heavyLoad,
  hotParts,
  longConveyor,
] as const;

/**
 * Get scenario by ID
 */
export function getScenarioById(id: string) {
  return HYPOTHETICAL_SCENARIOS.find((s) => s.id === id);
}

/**
 * Scenario summary for documentation
 */
export const SCENARIO_SUMMARY = HYPOTHETICAL_SCENARIOS.map((s) => ({
  id: s.id,
  name: s.name,
  status: s.status,
  excelVerified: s.excelVerified,
}));

// Re-export individual scenarios
export {
  basicFlat,
  moderateIncline,
  steepIncline,
  vguidedTracking,
  cleatedBelt,
  floorSupported,
  highSpeed,
  heavyLoad,
  hotParts,
  longConveyor,
};
