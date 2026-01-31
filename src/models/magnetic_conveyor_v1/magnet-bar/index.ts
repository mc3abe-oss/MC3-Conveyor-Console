/**
 * MAGNET BAR CONFIGURATION SYSTEM
 *
 * Public exports for the magnet bar configuration module.
 *
 * This module provides a 5-layer type system for configuring magnet bars:
 * - Layer 0: Conveyor Magnet Family (membership rules)
 * - Layer 1: Magnet Catalog Items
 * - Layer 2: Bar Template (OAL-driven)
 * - Layer 3: Bar Pattern Along Chain
 * - Layer 4: Layout Application
 *
 * @module magnetic_conveyor_v1/magnet-bar
 */

// Schema types and enums
export {
  // Enums
  MagnetMaterialType,
  MagnetGrade,
  BarPatternMode,
  // Labels
  MAGNET_MATERIAL_TYPE_LABELS,
  MAGNET_GRADE_LABELS,
  BAR_PATTERN_MODE_LABELS,
  // Constants
  SUPPORTED_OAL_VALUES_IN,
  SUPPORTED_CENTER_SPACING_IN,
  // Type guards
  isMagnetMaterialType,
  isMagnetGrade,
  isBarPatternMode,
  isSupportedOAL,
  isSupportedCenterSpacing,
  // Helper function
  getMagnetRemovalCapacity,
} from './schema';

// Types (for type-only imports)
export type {
  CrossSectionKey,
  ConveyorMagnetFamily,
  MagnetCatalogItem,
  BarSlot,
  BarTemplate,
  BarTemplateComputed,
  BarPattern,
  MagnetLayout,
  MagnetLayoutComputed,
  BarValidationError,
  BarValidationResult,
  RemovalCapacityLookup,
  SupportedOAL,
  SupportedCenterSpacing,
} from './schema';

// Seed data
export {
  // Families
  STANDARD_MAGNET_FAMILY,
  HEAVY_DUTY_MAGNET_FAMILY,
  ALL_MAGNET_FAMILIES,
  // Catalog items
  CERAMIC_5_3_5,
  CERAMIC_5_2_5,
  NEO_35_1_375,
  NEO_50_1_375,
  NEO_35_2_0,
  ALL_MAGNET_CATALOG_ITEMS,
  // Removal capacity lookup tables
  REMOVAL_CAPACITY_12,
  REMOVAL_CAPACITY_15,
  REMOVAL_CAPACITY_18,
  REMOVAL_CAPACITY_24,
  ALL_REMOVAL_CAPACITY_LOOKUPS,
  // Constants
  DEFAULT_GAP_IN,
  DEFAULT_END_CLEARANCE_IN,
  DEFAULT_LEFTOVER_TOLERANCE_IN,
  // SQL generators
  generateFamiliesInsertSQL,
  generateCatalogInsertSQL,
  // Computation helpers
  computeMagnetCount,
  computeBarCount,
  computeExpectedHoldForce,
  validateAgainstReferenceTables,
} from './seed-data';

// Bar builder functions
export {
  // Core functions
  computeMagnetFit,
  buildBarTemplate,
  calculateBarCapacity,
  calculateBarCapacityFromCounts,
  validateBarConfig,
  // Saturation correction
  applySaturationCorrection,
  // Utility functions
  countMagnetsByType,
  createSlotSpecsFromCounts,
  computeOptimalMix,
} from './bar-builder';

// Bar builder types
export type {
  MagnetFitResult,
  SlotSpec,
  BarValidationResult as BarBuilderValidationResult,
} from './bar-builder';

// Pattern functions
export {
  // Core functions
  applyPattern,
  calculateConveyorCapacity,
  calculateConveyorCapacityFromValues,
  validatePattern,
  // Utility functions
  describePattern,
  previewPattern,
  calculateBarCounts,
  DEFAULT_PATTERNS,
} from './patterns';

// Pattern types
export type {
  PatternConfig,
  PatternSequence,
  BarCapacityEntry,
  ConveyorCapacityResult,
  PatternValidationResult,
} from './patterns';

// Calculation display helpers
export {
  // Core functions
  getCalculationBreakdown,
  getMagnetContributions,
  getSaturationFactor,
  getMarginStatus,
  // Formatting helpers
  formatNumber,
  getMarginStatusClass,
  getMarginStatusIcon,
} from './calculation-display';

// Calculation display types
export type {
  CalculationStep,
  CalculationSection,
  MagnetContribution,
  CalculationBreakdown,
  ConveyorContext,
} from './calculation-display';
