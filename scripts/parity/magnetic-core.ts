/**
 * Magnetic parity harness — core data & helpers.
 *
 * Magnetic golden corpus generator support: clean baselines, the Abe-blessed
 * bar literal set (Gate 1, 2026-07-14), and the magnetic rule-ID catalog.
 *
 * CAPTURE ENTRY POINT (Gate 1 ruling): the magnetic MODEL directly —
 * `magnetic_conveyor_v1/formulas.calculate()` — NOT the shared runCalculation
 * orchestrator. The orchestrator runs sliderbed input validation on magnetic
 * inputs and stamps every magnetic case success:false with a belt-only
 * "Material form not selected" error while the magnetic outputs themselves are
 * identical. That is a legacy integration quirk of the belt-first UI stack,
 * logged for the port lane; it is not magnetic calc truth. Contract semantics:
 * outcome=success ⟺ outputs.errors is empty; rules = outputs.errors+warnings.
 *
 * HEADLESS RULE (Phase 0 / cleat-cache lesson): no case may depend on a live
 * Supabase magnet-catalog read. Bar configurations are inline frozen literals
 * (BAR_LITERALS below) or exercise the D1 no-bar / zero-capacity path.
 *
 * NOTHING here is imported by app/engine code; this is generation-only tooling.
 */
import {
  MagneticInputs,
  ConveyorStyle,
  ConveyorClass,
  MagnetType,
  ChipType,
  MaterialType,
  TemperatureClass,
  FluidType,
  BarConfigurationInput,
} from '../../src/models/magnetic_conveyor_v1/schema';

export const GENERATOR_VERSION = '1';
export const CORPUS_VERSION = 'magnetic-v1';
export const MODEL_KEY = 'magnetic_conveyor_v1';
export const MODEL_VERSION_ID = 'magnetic_conveyor_v1.0';
export const CANONICAL_PRODUCT = 'magnetic_conveyor';

// ============================================================================
// BAR LITERAL SET — Abe-blessed at Gate 1 (2026-07-14).
// Capacities verbatim from the engine's coded lookup tables
// (magnet-bar/seed-data.ts REMOVAL_CAPACITY_12/15/18/24) and real-job configs.
// SWEEP is synthetic (3 × 2.5" sweeper ceramic @ 0.08 from seed catalog
// values, no table row) — blessed with the derived flag.
// The physical standard bar (2×3.5" + 1×2.5") was ruled OUT of the literal set.
// ============================================================================

export const BAR_LITERALS: Record<string, BarConfigurationInput> = {
  C12: { bar_capacity_lb: 0.362, ceramic_count: 3, neo_count: 0 }, // table 12" / Job 32791
  C12_N1: { bar_capacity_lb: 0.52, ceramic_count: 2, neo_count: 1 }, // table 12"
  C12_N2: { bar_capacity_lb: 0.717, ceramic_count: 1, neo_count: 2 }, // table 12"
  C15_N1: { bar_capacity_lb: 0.621, ceramic_count: 3, neo_count: 1 }, // table 15" / Job 33017
  C24: { bar_capacity_lb: 0.723, ceramic_count: 6, neo_count: 0 }, // table 24"
  N30x8: { bar_capacity_lb: 2.384, ceramic_count: 0, neo_count: 8 }, // Job 32425 drawing (8 × 0.298)
  SWEEP: { bar_capacity_lb: 0.24, ceramic_count: 3, neo_count: 0 }, // synthetic sweeper bar (derived)
  ZERO: { bar_capacity_lb: 0, ceramic_count: 0, neo_count: 0 }, // D1: zero-capacity config = no bar
};

// ============================================================================
// CLEAN-SUCCESS BASELINES
// Both produce success (no errors). NOTE: with no bar configured the D1
// contract yields margin 1.0 < 1.5, so THROUGHPUT_UNDERSIZED_CHIPS fires on
// every no-bar chips case — a benign, contract-true warning (belt's analog
// was the snub-roller frame-height warning).
// ============================================================================

export function standardBaseline(): MagneticInputs {
  return {
    style: ConveyorStyle.B,
    conveyor_class: ConveyorClass.Standard,
    infeed_length_in: 48,
    discharge_height_in: 100,
    incline_angle_deg: 60,
    discharge_length_in: 22,
    magnet_width_in: 12,
    magnet_type: MagnetType.Ceramic8,
    magnet_centers_in: 12,
    belt_speed_fpm: 30,
    load_lbs_per_hr: 1000,
    material_type: MaterialType.Steel,
    chip_type: ChipType.Small,
  };
}

export function heavyDutyBaseline(): MagneticInputs {
  return {
    style: ConveyorStyle.B,
    conveyor_class: ConveyorClass.HeavyDuty,
    infeed_length_in: 60,
    discharge_height_in: 200,
    incline_angle_deg: 70,
    discharge_length_in: 22,
    magnet_width_in: 30,
    magnet_type: MagnetType.Neo35,
    magnet_centers_in: 12,
    belt_speed_fpm: 30,
    load_lbs_per_hr: 6000,
    material_type: MaterialType.CastIron,
    chip_type: ChipType.Small,
  };
}

/** Fully-clean Standard config (no warnings at all when combined with a healthy bar). */
export function cleanBaseline(): MagneticInputs {
  return {
    ...standardBaseline(),
    temperature_class: TemperatureClass.Ambient,
    fluid_type: FluidType.WaterSoluble,
  };
}

// ============================================================================
// NAME MAP ADDITIONS (documented; applied by hand in Conveyor-Console
// parity/name-map.json in the same versioned change as the corpus).
// All magnetic input/output keys are already canonical snake_case physics
// keys — no legacy naming. Only the product identifier needs mapping.
// ============================================================================

export const NAME_MAP_ADDITIONS = {
  product_identifier: { magnetic_conveyor_v1: CANONICAL_PRODUCT },
};

// ============================================================================
// MAGNETIC RULE-ID CATALOG (Gate 1 ruling: IDs ARE the in-engine
// ValidationCodes — src/models/magnetic_conveyor_v1/validation.ts:77-102 —
// matched by field + severity + exact message; magnetic messages carry no
// interpolation). MATERIAL_NON_MAGNETIC is declared in ValidationCodes but no
// rule emits it: latent, excluded from the contract (belt precedent).
// ============================================================================

export interface MagneticRuleDef {
  id: string;
  field: string;
  severity: 'error' | 'warning';
  message: string;
  description: string;
}

export const MAGNETIC_RULE_CATALOG: MagneticRuleDef[] = [
  { id: 'INVALID_MATERIAL_ALUMINUM', field: 'material_type', severity: 'error', message: 'Invalid - Aluminum cannot be magnetized', description: 'aluminum cannot be magnetized' },
  { id: 'INVALID_MATERIAL_STAINLESS', field: 'material_type', severity: 'error', message: 'Invalid - Stainless steel cannot be magnetized', description: 'stainless steel cannot be magnetized' },
  { id: 'STYLE_C_REQUIRED_ZERO_HEIGHT', field: 'style', severity: 'error', message: 'Style C required for horizontal-only configuration', description: 'discharge height 0 requires Style C' },
  { id: 'STYLE_C_REQUIRED_ZERO_ANGLE', field: 'style', severity: 'error', message: 'Style C required for 0° angle', description: 'incline angle 0 requires Style C' },
  { id: 'CUSTOM_TAIL_TRACKS_REQUIRED', field: 'infeed_length_in', severity: 'warning', message: 'Custom tail tracks and tail end required', description: 'infeed < 39"' },
  { id: 'SPEED_TOO_HIGH', field: 'belt_speed_fpm', severity: 'warning', message: 'Material could be flung off', description: 'belt speed > 120 FPM' },
  { id: 'CHIP_TYPE_BRIDGING', field: 'chip_type', severity: 'warning', message: 'Poor option due to magnet bridging', description: 'stringers / bird nests bridge magnets' },
  { id: 'TEMPERATURE_RED_HOT', field: 'temperature_class', severity: 'warning', message: 'Poor choice for magnetic conveyor', description: 'red-hot parts demagnetize' },
  { id: 'FLUID_OIL_BASED', field: 'fluid_type', severity: 'warning', message: 'Require SS rigidized cover', description: 'oil-based fluid needs SS rigidized cover' },
  { id: 'CONSIDER_HD_MAGNET_WIDTH', field: 'magnet_width_in', severity: 'warning', message: 'Consider Heavy Duty class for magnet width > 24"', description: 'HD suggestion: magnet width' },
  { id: 'CONSIDER_HD_LOAD', field: 'load_lbs_per_hr', severity: 'warning', message: 'Consider Heavy Duty class for load > 5,000 lbs/hr', description: 'HD suggestion: load' },
  { id: 'CONSIDER_HD_DISCHARGE_HEIGHT', field: 'discharge_height_in', severity: 'warning', message: 'Consider Heavy Duty class for discharge height > 200"', description: 'HD suggestion: discharge height' },
  { id: 'CONSIDER_HD_CHAIN_LENGTH', field: 'chain_length_in', severity: 'warning', message: 'Consider Heavy Duty class for chain length > 500"', description: 'HD suggestion: chain length (output rule)' },
  { id: 'THROUGHPUT_UNDERSIZED_CHIPS', field: 'throughput_margin', severity: 'warning', message: 'Undersized for chips', description: 'throughput margin < 1.5 for chips (output rule)' },
  { id: 'THROUGHPUT_UNDERSIZED_PARTS', field: 'throughput_margin', severity: 'warning', message: 'Undersized for parts', description: 'throughput margin < 1.25 for parts (output rule)' },
];

/** Exact-match classifier: field + severity + full message. Null = completeness gap (generator STOPs). */
export function classifyMagneticRule(field: string, severity: string, message: string): string | null {
  const hit = MAGNETIC_RULE_CATALOG.find(
    (r) => r.field === field && r.severity === severity && r.message === message
  );
  return hit ? hit.id : null;
}
