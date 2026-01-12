/**
 * Outputs v2 Warning Rules
 *
 * Implements warning/error detection for the v2.2 spec.
 * Each rule function checks specific conditions and returns OutputMessageV2[] if triggered.
 *
 * Phase 1 Thresholds (hardcoded, Phase 2 can parameterize):
 * - ROLLER_SPACING_EXCESSIVE: carry spacing > 72 in
 * - DRIVE_UNDERSIZED: required_hp > selected_hp * 0.95
 * - SHAFT_DEFLECTION_HIGH: deflection > 0.001 * span
 * - CASTER_OVERLOAD: load_per_caster > rating * 0.8
 * - SNUB_WRAP_INSUFFICIENT: wrap_angle_deg < 180
 */

import { SliderbedInputs, SliderbedOutputs, DriveSourceMode } from '../schema';
import {
  OutputMessageV2,
  CanonicalComponentId,
  WARNING_CODES,
  VendorPacketBeltV2,
  SupportSystemV2,
  TobValueV2,
} from './schema';

// =============================================================================
// THRESHOLD CONSTANTS (Phase 2: move to parameters)
// =============================================================================

const ROLLER_SPACING_THRESHOLD_IN = 72;
const DRIVE_UNDERSIZED_FACTOR = 0.95;
const SHAFT_DEFLECTION_FACTOR = 0.001;
const CASTER_OVERLOAD_FACTOR = 0.8;
const SNUB_WRAP_MIN_DEG = 180;
// v1.49: Manual drive validation thresholds
const MANUAL_DRIVE_SF_MIN = 1.0;
const MANUAL_DRIVE_TORQUE_MISMATCH_THRESHOLD = 0.15; // 15%

// =============================================================================
// WARNING RULE CONTEXT
// =============================================================================

export interface WarningRuleContext {
  inputs: SliderbedInputs;
  outputs_v1: SliderbedOutputs;
  belt_packet?: VendorPacketBeltV2 | null;
  support_system?: SupportSystemV2;
  tob?: TobValueV2;
  roller_spacing_in?: number | null;
  selected_power_hp?: number | null;
  conveyor_weight_lbf?: number | null;
  caster_qty?: number | null;
  caster_rating_lbf?: number | null;
  shaft_deflection_in?: number | null;
  shaft_span_in?: number | null;
  wrap_angle_deg?: number | null;
  snubs_configured?: boolean;
}

// =============================================================================
// INDIVIDUAL WARNING RULES
// =============================================================================

/**
 * BELT_MIN_PULLEY_VIOLATION
 * Triggers when any pulley diameter is below the governing minimum.
 */
export function checkBeltMinPulleyViolation(ctx: WarningRuleContext): OutputMessageV2[] {
  const warnings: OutputMessageV2[] = [];
  const { outputs_v1 } = ctx;

  // Get governing minimum
  const governingMin = outputs_v1.required_min_pulley_diameter_in;
  if (governingMin == null || governingMin <= 0) {
    return warnings;
  }

  // Check drive pulley
  const driveOd = outputs_v1.drive_pulley_finished_od_in ?? outputs_v1.drive_pulley_diameter_in;
  if (driveOd != null && driveOd < governingMin) {
    warnings.push({
      severity: 'warning',
      code: WARNING_CODES.BELT_MIN_PULLEY_VIOLATION,
      message: `Drive pulley diameter (${driveOd.toFixed(2)}") is below the governing minimum (${governingMin.toFixed(2)}").`,
      recommendation: 'Increase pulley diameter or confirm belt supplier approval.',
      impacts: ['design', 'vendor'],
      related_component_ids: ['pulley_drive', 'belt_primary'],
    });
  }

  // Check tail pulley
  const tailOd = outputs_v1.tail_pulley_finished_od_in ?? outputs_v1.tail_pulley_diameter_in;
  if (tailOd != null && tailOd < governingMin) {
    warnings.push({
      severity: 'warning',
      code: WARNING_CODES.BELT_MIN_PULLEY_VIOLATION,
      message: `Tail pulley diameter (${tailOd.toFixed(2)}") is below the governing minimum (${governingMin.toFixed(2)}").`,
      recommendation: 'Increase pulley diameter or confirm belt supplier approval.',
      impacts: ['design', 'vendor'],
      related_component_ids: ['pulley_tail', 'belt_primary'],
    });
  }

  return warnings;
}

/**
 * BELT_LENGTH_MISSING
 * Triggers when belt overall length is not available.
 */
export function checkBeltLengthMissing(ctx: WarningRuleContext): OutputMessageV2[] {
  const warnings: OutputMessageV2[] = [];
  const { outputs_v1 } = ctx;

  const beltLength = outputs_v1.total_belt_length_in;
  if (beltLength == null || beltLength <= 0) {
    warnings.push({
      severity: 'warning',
      code: WARNING_CODES.BELT_LENGTH_MISSING,
      message: 'Belt overall length is not available.',
      recommendation: 'Ensure conveyor length and pulley configuration are complete.',
      impacts: ['quote', 'vendor'],
      related_component_ids: ['belt_primary'],
    });
  }

  return warnings;
}

/**
 * TOB_MISSING
 * Triggers when TOB is applicable but value is missing.
 */
export function checkTobMissing(ctx: WarningRuleContext): OutputMessageV2[] {
  const warnings: OutputMessageV2[] = [];
  const { tob, support_system } = ctx;

  // Only check if TOB is applicable
  if (!support_system || support_system.tob_relevance === 'not_applicable') {
    return warnings;
  }

  if (tob && tob.applicable && tob.value == null) {
    warnings.push({
      severity: 'warning',
      code: WARNING_CODES.TOB_MISSING,
      message: 'Top of Belt (TOB) height is applicable but not specified.',
      recommendation: 'Enter TOB height for floor-supported conveyors.',
      impacts: ['design', 'quote'],
      related_component_ids: ['support_legs'],
    });
  }

  return warnings;
}

/**
 * BELT_TENSION_EXCEEDS_RATING
 * Triggers when effective tension exceeds belt rated tension.
 * Only fires if belt rating is available (Phase 1: often not available).
 */
export function checkBeltTensionExceedsRating(ctx: WarningRuleContext): OutputMessageV2[] {
  const warnings: OutputMessageV2[] = [];
  const { outputs_v1 } = ctx;

  // Belt rating is not typically available in current schema
  // This rule is conditional - skip if data not available
  const effectiveTension = outputs_v1.total_belt_pull_lb;
  const beltRating = (outputs_v1 as any).belt_rated_tension_lbf; // Not in current schema

  if (effectiveTension != null && beltRating != null && effectiveTension > beltRating) {
    warnings.push({
      severity: 'error',
      code: WARNING_CODES.BELT_TENSION_EXCEEDS_RATING,
      message: `Effective belt tension (${effectiveTension.toFixed(0)} lbf) exceeds belt rating (${beltRating.toFixed(0)} lbf).`,
      recommendation: 'Select a higher-rated belt or reduce conveyor load.',
      impacts: ['design', 'vendor'],
      related_component_ids: ['belt_primary'],
    });
  }

  return warnings;
}

/**
 * SHAFT_DEFLECTION_HIGH
 * Triggers when shaft deflection exceeds 0.001 * span.
 * Only fires if deflection and span data are available.
 */
export function checkShaftDeflectionHigh(ctx: WarningRuleContext): OutputMessageV2[] {
  const warnings: OutputMessageV2[] = [];
  const { shaft_deflection_in, shaft_span_in } = ctx;

  if (shaft_deflection_in == null || shaft_span_in == null || shaft_span_in <= 0) {
    return warnings;
  }

  const threshold = SHAFT_DEFLECTION_FACTOR * shaft_span_in;
  if (shaft_deflection_in > threshold) {
    warnings.push({
      severity: 'warning',
      code: WARNING_CODES.SHAFT_DEFLECTION_HIGH,
      message: `Shaft deflection (${shaft_deflection_in.toFixed(4)}") exceeds allowable (${threshold.toFixed(4)}").`,
      recommendation: 'Increase shaft diameter or reduce bearing span.',
      impacts: ['design', 'vendor'],
      related_component_ids: ['pulley_drive'],
    });
  }

  return warnings;
}

/**
 * DRIVE_UNDERSIZED
 * Triggers when required power exceeds selected power * 0.95.
 * Only fires if selected drive power is available.
 */
export function checkDriveUndersized(ctx: WarningRuleContext): OutputMessageV2[] {
  const warnings: OutputMessageV2[] = [];
  const { outputs_v1, selected_power_hp } = ctx;

  // Required power from calculation
  // Note: Current schema doesn't have a direct required_power_hp output
  // We'd need to derive it from torque and RPM
  const torque = outputs_v1.torque_drive_shaft_inlbf;
  const rpm = outputs_v1.drive_shaft_rpm;

  if (torque == null || rpm == null || selected_power_hp == null) {
    return warnings;
  }

  // HP = (Torque_in-lb * RPM) / 63025
  const requiredHp = (torque * rpm) / 63025;
  const threshold = selected_power_hp * DRIVE_UNDERSIZED_FACTOR;

  if (requiredHp > threshold) {
    warnings.push({
      severity: 'warning',
      code: WARNING_CODES.DRIVE_UNDERSIZED,
      message: `Required power (${requiredHp.toFixed(2)} HP) exceeds ${(DRIVE_UNDERSIZED_FACTOR * 100).toFixed(0)}% of selected motor (${selected_power_hp.toFixed(2)} HP).`,
      recommendation: 'Select a larger motor or reduce conveyor load.',
      impacts: ['design', 'quote'],
      related_component_ids: ['drive_primary'],
    });
  }

  return warnings;
}

/**
 * SNUB_WRAP_INSUFFICIENT
 * Triggers when wrap angle is below 180 degrees with snubs configured.
 */
export function checkSnubWrapInsufficient(ctx: WarningRuleContext): OutputMessageV2[] {
  const warnings: OutputMessageV2[] = [];
  const { wrap_angle_deg, snubs_configured } = ctx;

  if (!snubs_configured || wrap_angle_deg == null) {
    return warnings;
  }

  if (wrap_angle_deg < SNUB_WRAP_MIN_DEG) {
    warnings.push({
      severity: 'warning',
      code: WARNING_CODES.SNUB_WRAP_INSUFFICIENT,
      message: `Wrap angle (${wrap_angle_deg.toFixed(1)}°) is below ${SNUB_WRAP_MIN_DEG}° with snub rollers configured.`,
      recommendation: 'Adjust snub roller positions to increase belt wrap.',
      impacts: ['design'],
      related_component_ids: ['pulley_snub_drive', 'pulley_snub_tail'],
    });
  }

  return warnings;
}

/**
 * ROLLER_SPACING_EXCESSIVE
 * Triggers when gravity roller spacing exceeds 72 inches.
 */
export function checkRollerSpacingExcessive(ctx: WarningRuleContext): OutputMessageV2[] {
  const warnings: OutputMessageV2[] = [];
  const { roller_spacing_in } = ctx;

  if (roller_spacing_in == null) {
    return warnings;
  }

  if (roller_spacing_in > ROLLER_SPACING_THRESHOLD_IN) {
    warnings.push({
      severity: 'warning',
      code: WARNING_CODES.ROLLER_SPACING_EXCESSIVE,
      message: `Gravity roller spacing (${roller_spacing_in.toFixed(1)}") exceeds ${ROLLER_SPACING_THRESHOLD_IN}".`,
      recommendation: 'Add more return rollers to reduce belt sag.',
      impacts: ['design'],
      related_component_ids: ['roller_gravity'],
    });
  }

  return warnings;
}

/**
 * CASTER_OVERLOAD
 * Triggers when load per caster exceeds 80% of rating.
 * Only fires if caster data is available.
 */
export function checkCasterOverload(ctx: WarningRuleContext): OutputMessageV2[] {
  const warnings: OutputMessageV2[] = [];
  const { conveyor_weight_lbf, caster_qty, caster_rating_lbf } = ctx;

  if (conveyor_weight_lbf == null || caster_qty == null || caster_qty <= 0 || caster_rating_lbf == null) {
    return warnings;
  }

  const loadPerCaster = conveyor_weight_lbf / caster_qty;
  const threshold = caster_rating_lbf * CASTER_OVERLOAD_FACTOR;

  if (loadPerCaster > threshold) {
    warnings.push({
      severity: 'warning',
      code: WARNING_CODES.CASTER_OVERLOAD,
      message: `Load per caster (${loadPerCaster.toFixed(0)} lbf) exceeds ${(CASTER_OVERLOAD_FACTOR * 100).toFixed(0)}% of rating (${caster_rating_lbf.toFixed(0)} lbf).`,
      recommendation: 'Add more casters or select higher-rated casters.',
      impacts: ['design', 'quote'],
      related_component_ids: ['support_casters'],
    });
  }

  return warnings;
}

/**
 * MANUAL_DRIVE_SF_LOW (v1.49)
 * Triggers when manual drive service factor is below 1.0.
 * WARNING ONLY - does not block.
 */
export function checkManualDriveSfLow(ctx: WarningRuleContext): OutputMessageV2[] {
  const warnings: OutputMessageV2[] = [];
  const { inputs, outputs_v1 } = ctx;

  // Only check in custom manual mode
  const driveSourceMode = inputs.drive_source_mode ?? DriveSourceMode.FlexblocCatalog;
  const isCustomManualMode =
    driveSourceMode === DriveSourceMode.CustomManual ||
    driveSourceMode === 'custom_manual';

  if (!isCustomManualMode) {
    return warnings;
  }

  // Check selected_service_factor from outputs (canonical value)
  const serviceFactor = outputs_v1.selected_service_factor;
  if (serviceFactor != null && serviceFactor < MANUAL_DRIVE_SF_MIN) {
    warnings.push({
      severity: 'warning',
      code: WARNING_CODES.MANUAL_DRIVE_SF_LOW,
      message: `Service factor (${serviceFactor.toFixed(2)}) is below ${MANUAL_DRIVE_SF_MIN}. Confirm this is intentional.`,
      recommendation: 'Service factors below 1.0 may result in premature drive failure under normal operating conditions.',
      impacts: ['design'],
      related_component_ids: ['drive_primary'],
    });
  }

  return warnings;
}

/**
 * MANUAL_DRIVE_TORQUE_MISMATCH (v1.49)
 * Triggers when entered torque doesn't match implied torque from HP & RPM.
 * WARNING ONLY - does not alter calculations.
 */
export function checkManualDriveTorqueMismatch(ctx: WarningRuleContext): OutputMessageV2[] {
  const warnings: OutputMessageV2[] = [];
  const { inputs } = ctx;

  // Only check in custom manual mode
  const driveSourceMode = inputs.drive_source_mode ?? DriveSourceMode.FlexblocCatalog;
  const isCustomManualMode =
    driveSourceMode === DriveSourceMode.CustomManual ||
    driveSourceMode === 'custom_manual';

  if (!isCustomManualMode) {
    return warnings;
  }

  // Need HP, RPM, and torque to compute
  const hp = inputs.manual_motor_hp;
  const rpm = inputs.manual_output_rpm;
  const enteredTorque = inputs.manual_output_torque_lb_in;

  // Skip if any required value is missing or invalid
  if (hp == null || rpm == null || rpm <= 0 || enteredTorque == null || enteredTorque <= 0) {
    return warnings;
  }

  // Compute implied torque: T = (63025 * HP / RPM) * 12
  // Note: 63025 gives oz-in when HP/RPM, multiply by 12 to convert to lb-in?
  // Actually: T (lb-in) = (HP * 63025) / RPM for lb-in (standard formula)
  // Let me verify: HP = (T * RPM) / 63025 => T = (HP * 63025) / RPM (in lb-in)
  const impliedTorqueLbIn = (hp * 63025) / rpm;

  // Check if difference exceeds threshold
  const difference = Math.abs(impliedTorqueLbIn - enteredTorque) / enteredTorque;
  if (difference > MANUAL_DRIVE_TORQUE_MISMATCH_THRESHOLD) {
    const pctDiff = (difference * 100).toFixed(0);
    warnings.push({
      severity: 'warning',
      code: WARNING_CODES.MANUAL_DRIVE_TORQUE_MISMATCH,
      message: `Entered torque (${enteredTorque.toFixed(0)} lb-in) differs from implied torque (${impliedTorqueLbIn.toFixed(0)} lb-in) by ${pctDiff}%.`,
      recommendation: 'Check units and values. Torque should satisfy: T (lb-in) = (HP × 63025) / RPM.',
      impacts: ['design'],
      related_component_ids: ['drive_primary'],
    });
  }

  return warnings;
}

// =============================================================================
// AGGREGATE WARNING RUNNER
// =============================================================================

/**
 * Run all warning rules and return combined messages.
 */
export function runAllWarningRules(ctx: WarningRuleContext): OutputMessageV2[] {
  const allWarnings: OutputMessageV2[] = [];

  // Run each rule
  allWarnings.push(...checkBeltMinPulleyViolation(ctx));
  allWarnings.push(...checkBeltLengthMissing(ctx));
  allWarnings.push(...checkTobMissing(ctx));
  allWarnings.push(...checkBeltTensionExceedsRating(ctx));
  allWarnings.push(...checkShaftDeflectionHigh(ctx));
  allWarnings.push(...checkDriveUndersized(ctx));
  allWarnings.push(...checkSnubWrapInsufficient(ctx));
  allWarnings.push(...checkRollerSpacingExcessive(ctx));
  allWarnings.push(...checkCasterOverload(ctx));
  // v1.49: Manual drive warnings
  allWarnings.push(...checkManualDriveSfLow(ctx));
  allWarnings.push(...checkManualDriveTorqueMismatch(ctx));

  return allWarnings;
}

/**
 * Filter warnings by component ID
 */
export function getWarningsForComponent(
  warnings: OutputMessageV2[],
  componentId: CanonicalComponentId
): OutputMessageV2[] {
  return warnings.filter((w) => w.related_component_ids.includes(componentId));
}

/**
 * Get the most severe status from a list of warnings
 */
export function getWorstStatus(warnings: OutputMessageV2[]): 'ok' | 'warning' | 'error' {
  if (warnings.some((w) => w.severity === 'error')) {
    return 'error';
  }
  if (warnings.some((w) => w.severity === 'warning')) {
    return 'warning';
  }
  return 'ok';
}
