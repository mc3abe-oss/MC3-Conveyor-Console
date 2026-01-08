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
  type ParsedModelType,
  type BomComponent,
  type BomResolution,
  type BomCopyContext,
} from './bom';
