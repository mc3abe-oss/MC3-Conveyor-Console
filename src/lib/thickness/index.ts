/**
 * Thickness Library
 *
 * Unified library for frame sheet metal gauge and pulley wall thickness options.
 *
 * IMPORTANT: Both Frame and Pulley dropdowns use the SAME options list
 * with the SAME label format. No filtering by context.
 *
 * Usage:
 *   import { getAllThicknessOptions, formatThickness } from '@/src/lib/thickness';
 *
 *   // Get ALL thickness options (same for frame and pulley)
 *   const options = getAllThicknessOptions();
 *
 *   // Format thickness for display (same label everywhere)
 *   const label = formatThickness(option);
 */

// Types
export type {
  ThicknessSystem,
  ThicknessOption,
} from './types';

// Library and helpers
export {
  THICKNESS_OPTIONS,
  getAllThicknessOptions,
  getThicknessOption,
  getThicknessOptionByValue,
  formatThickness,
  // Legacy compatibility
  LEGACY_FRAME_GAUGE_MAP,
  THICKNESS_KEY_TO_LEGACY_GAUGE,
  legacyGaugeToThicknessKey,
  thicknessKeyToLegacyGauge,
  legacyWallThicknessToKey,
  getThicknessInFromKey,
} from './library';
