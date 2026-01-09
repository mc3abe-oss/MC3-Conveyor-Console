/**
 * Gearmotor Selection Module
 *
 * Provides gearmotor selection functionality for NORD FLEXBLOC (and MINICASE).
 */

export {
  selectGearmotor,
  type GearmotorSeries,
  type GearmotorSelectionInputs,
  type GearmotorCandidate,
  type GearmotorSelectionResult,
} from './selector';

export {
  evaluateGearmotorCandidate,
  formatMarginPct,
  type EvaluationInputs,
  type EvaluationResult,
} from './evaluate';

export {
  parseModelType,
  resolveBom,
  resolveBomFromMetadata,
  buildBomCopyText,
  getMissingHint,
  isRealNordPartNumber,
  needsOutputShaftKit,
  getAvailableShaftDiameters,
  getAvailableShaftStyles,
  lookupOutputShaftKitByStyle,
  parseHollowShaftBore,
  getAvailableHollowShaftBushings,
  lookupHollowShaftBushing,
  DEFAULT_MOUNTING_VARIANT,
  GEARMOTOR_MOUNTING_STYLE,
  OUTPUT_SHAFT_OPTION_LABELS,
  type ParsedModelType,
  type ParsedHollowShaftBore,
  type BomComponent,
  type BomResolution,
  type BomCopyContext,
  type ResolveBomOptions,
} from './bom';
