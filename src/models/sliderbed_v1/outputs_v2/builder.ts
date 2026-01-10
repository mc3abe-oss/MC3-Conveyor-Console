/**
 * Outputs V2 Builder
 *
 * Orchestrates the construction of outputs_v2 from inputs and outputs_v1.
 * This builder runs in parallel with v1 - it does not modify v1 outputs.
 */

import { SliderbedInputs, SliderbedOutputs, ReturnFrameStyle, ReturnSnubMode } from '../schema';
import {
  OutputsV2,
  OutputsV2Meta,
  SummaryV2,
  SupportSystemV2,
  CalcResultsV2,
  DesignGeometryV2,
  ComponentV2,
  VendorPacketBundleV2,
  ExportsV2,
  SupportType,
  TobRelevance,
  PulleyLocationV2,
} from './schema';
import { runAllWarningRules, WarningRuleContext } from './warnings';
import {
  buildBeltPacket,
  buildPulleyPackets,
  buildRollerPackets,
  buildDrivePacket,
  buildSupportPackets,
  buildVendorPacketBundle,
} from './vendor_packets';
import { buildCsvRows } from './export_csv';

// =============================================================================
// CONSTANTS
// =============================================================================

const SCHEMA_VERSION = '2.2';
const MIN_COMPATIBLE_VERSION = '2.0';
const SOURCE_MODEL_VERSION = 'sliderbed_v1';

// =============================================================================
// SUPPORT SYSTEM DERIVATION
// =============================================================================

interface SupportSystemDerivation {
  support_system: SupportSystemV2;
  has_legs: boolean;
  has_casters: boolean;
}

function deriveSupportSystem(inputs: SliderbedInputs): SupportSystemDerivation {
  // Derive support type from inputs
  // Phase 1: Default to floor_legs unless explicitly set otherwise
  const supportTypeInput = (inputs as any).support_type as SupportType | undefined;
  const hasCastersInput = (inputs as any).has_casters as boolean | undefined;

  let support_type: SupportType = 'floor_legs';
  let is_floor_supported = true;
  let has_legs = true;
  let has_casters = false;

  if (supportTypeInput) {
    support_type = supportTypeInput;
    switch (support_type) {
      case 'floor_legs':
        is_floor_supported = true;
        has_legs = true;
        has_casters = false;
        break;
      case 'casters':
        is_floor_supported = true;
        has_legs = true; // Casters typically mount to legs
        has_casters = true;
        break;
      case 'external':
      case 'suspended':
        is_floor_supported = false;
        has_legs = false;
        has_casters = false;
        break;
    }
  } else if (hasCastersInput) {
    support_type = 'casters';
    has_casters = true;
    has_legs = true;
  }

  // TOB relevance
  let tob_relevance: TobRelevance = 'not_applicable';
  if (is_floor_supported) {
    // Phase 1: Always reference_only for floor-supported
    tob_relevance = 'reference_only';
  }

  const support_system: SupportSystemV2 = {
    support_type,
    is_floor_supported,
    tob_relevance,
    has_legs,
    has_casters,
    notes: null,
  };

  return { support_system, has_legs, has_casters };
}

// =============================================================================
// SUMMARY BUILDER
// =============================================================================

function buildSummary(inputs: SliderbedInputs, outputs: SliderbedOutputs): SummaryV2 {
  // Environment tags from factors
  const environment_tags: string[] = [];
  const envFactors = inputs.environment_factors;
  if (Array.isArray(envFactors)) {
    envFactors.forEach((f) => {
      if (typeof f === 'string') {
        environment_tags.push(f.toLowerCase());
      }
    });
  }

  return {
    conveyor_id: (inputs as any).conveyor_id ?? null,
    conveyor_type: 'sliderbed',
    duty: 'continuous', // Default
    environment_tags,
    belt_speed_fpm: outputs.belt_speed_fpm ?? null,
    // v1.38: Speed chain outputs (required vs actual)
    required_drive_shaft_rpm: outputs.required_drive_shaft_rpm ?? outputs.drive_shaft_rpm ?? null,
    required_gearmotor_output_rpm: outputs.required_gearmotor_output_rpm ?? outputs.gearmotor_output_rpm ?? null,
    actual_belt_speed_fpm: outputs.actual_belt_speed_fpm ?? null,
    actual_belt_speed_delta_pct: outputs.actual_belt_speed_delta_pct ?? null,
    speed_error_fpm: outputs.speed_error_fpm ?? null,
    actual_drive_shaft_rpm: outputs.actual_drive_shaft_rpm ?? null,
    actual_speed_warning_code: outputs.actual_speed_warning_code ?? null,
    center_distance_in: inputs.conveyor_length_cc_in ?? null,
    overall_length_in: outputs.total_belt_length_in ?? null,
    incline_deg: inputs.conveyor_incline_deg ?? 0,
  };
}

// =============================================================================
// CALC RESULTS BUILDER
// =============================================================================

function buildCalcResults(outputs: SliderbedOutputs): CalcResultsV2 {
  // Calculate HP from torque and RPM
  const torque = outputs.torque_drive_shaft_inlbf ?? 0;
  const rpm = outputs.gearmotor_output_rpm ?? outputs.drive_shaft_rpm ?? 0;
  const requiredHp = rpm > 0 ? (torque * rpm) / 63025 : null;

  return {
    effective_tension_lbf: outputs.total_belt_pull_lb ?? null,
    tight_side_tension_lbf: null, // Not directly available in v1
    slack_side_tension_lbf: null, // Not directly available in v1
    required_torque_inlb: outputs.torque_drive_shaft_inlbf ?? null,
    required_power_hp: requiredHp,
    service_factor: outputs.safety_factor_used ?? null,
    drive_rpm: outputs.gearmotor_output_rpm ?? outputs.drive_shaft_rpm ?? null,
    wrap_angle_deg: null, // Not directly available without geometry calc
  };
}

// =============================================================================
// DESIGN GEOMETRY BUILDER
// =============================================================================

function buildDesignGeometry(
  inputs: SliderbedInputs,
  outputs: SliderbedOutputs,
  support_system: SupportSystemV2,
  components: ComponentV2[]
): DesignGeometryV2 {
  // TOB
  const tobApplicable = support_system.tob_relevance !== 'not_applicable';
  const tobValue = tobApplicable ? ((inputs as any).top_of_belt_in ?? null) : null;

  // Frame height
  const frameHeight = outputs.reference_frame_height_in ?? outputs.effective_frame_height_in ?? null;

  // Pulley locations (station only, no elevation in Phase 1)
  const pulley_locations: PulleyLocationV2[] = [];

  // Drive pulley at station 0
  if (components.some((c) => c.component_id === 'pulley_drive')) {
    pulley_locations.push({
      component_id: 'pulley_drive',
      station_in: 0,
    });
  }

  // Tail pulley at conveyor length
  if (components.some((c) => c.component_id === 'pulley_tail')) {
    pulley_locations.push({
      component_id: 'pulley_tail',
      station_in: inputs.conveyor_length_cc_in ?? null,
    });
  }

  // Roller spacing
  let carrySpacing: number | null = null;
  let returnSpacing: number | null = null;

  // Calculate return roller spacing
  const gravityCount = inputs.return_gravity_roller_count ?? 2;
  const conveyorLength = inputs.conveyor_length_cc_in ?? 0;
  if (conveyorLength > 0 && gravityCount >= 2) {
    returnSpacing = conveyorLength / (gravityCount - 1);
  }

  return {
    top_of_belt_in: {
      value: tobValue,
      applicable: tobApplicable,
      reference_only: true, // Phase 1: always reference only
      note: tobApplicable ? null : 'Not applicable for non-floor-supported conveyors',
    },
    frame_height_in: {
      value: frameHeight,
      reference_only: true,
      note: 'Reference height for quoting',
    },
    pulley_locations,
    roller_spacing_in: {
      carry: carrySpacing,
      return: returnSpacing,
    },
  };
}

// =============================================================================
// META BUILDER
// =============================================================================

function buildMeta(): OutputsV2Meta {
  return {
    schema_version: SCHEMA_VERSION,
    min_compatible_version: MIN_COMPATIBLE_VERSION,
    generated_at_iso: new Date().toISOString(),
    source_model_version: SOURCE_MODEL_VERSION,
    output_contracts_generated: ['v1', 'v2'],
  };
}

// =============================================================================
// MAIN BUILDER
// =============================================================================

export interface BuildOutputsV2Input {
  inputs: SliderbedInputs;
  outputs_v1: SliderbedOutputs;
}

export function buildOutputsV2({ inputs, outputs_v1 }: BuildOutputsV2Input): OutputsV2 {
  // Step 1: Derive support system
  const { support_system, has_legs, has_casters } = deriveSupportSystem(inputs);

  // Step 2: Build summary and calc results
  const summary = buildSummary(inputs, outputs_v1);
  const calc_results = buildCalcResults(outputs_v1);

  // Step 3: Build warning context (partial, before components)
  const warningCtx: WarningRuleContext = {
    inputs,
    outputs_v1,
    support_system,
    tob: undefined, // Will set after geometry
    roller_spacing_in: null,
    snubs_configured: false,
  };

  // Determine if snubs are configured
  const returnSnubMode = inputs.return_snub_mode ?? ReturnSnubMode.Auto;
  const returnFrameStyle = inputs.return_frame_style ?? ReturnFrameStyle.Standard;
  let snubsEnabled = false;
  if (returnSnubMode === ReturnSnubMode.Yes || returnSnubMode === 'YES') {
    snubsEnabled = true;
  } else if (returnSnubMode === ReturnSnubMode.No || returnSnubMode === 'NO') {
    snubsEnabled = false;
  } else {
    snubsEnabled = returnFrameStyle === ReturnFrameStyle.LowProfile || returnFrameStyle === 'LOW_PROFILE';
  }
  warningCtx.snubs_configured = snubsEnabled;

  // Calculate roller spacing for warning context
  const gravityCount = inputs.return_gravity_roller_count ?? 2;
  const conveyorLength = inputs.conveyor_length_cc_in ?? 0;
  if (conveyorLength > 0 && gravityCount >= 2) {
    warningCtx.roller_spacing_in = conveyorLength / (gravityCount - 1);
  }

  // Step 4: Run warning rules (first pass)
  const warnings = runAllWarningRules(warningCtx);

  // Step 5: Build component packets
  const components: ComponentV2[] = [];
  let vendorBundle: VendorPacketBundleV2;

  // Belt
  const beltResult = buildBeltPacket(inputs, outputs_v1, warnings);
  components.push(beltResult.component);

  // Pulleys
  const pulleyResults = buildPulleyPackets(inputs, outputs_v1, warnings);
  pulleyResults.forEach((r) => components.push(r.component));

  // Rollers
  const rollerResults = buildRollerPackets(inputs, outputs_v1, warnings);
  rollerResults.forEach((r) => components.push(r.component));

  // Drive
  const driveResult = buildDrivePacket(inputs, outputs_v1, warnings);
  components.push(driveResult.component);

  // Supports
  const supportResult = buildSupportPackets(inputs, outputs_v1, warnings, has_legs, has_casters);
  if (supportResult.legs_component) {
    components.push(supportResult.legs_component);
  }
  if (supportResult.casters_component) {
    components.push(supportResult.casters_component);
  }

  // Step 6: Build vendor packet bundle
  vendorBundle = buildVendorPacketBundle(
    beltResult.vendor_packet,
    pulleyResults.map((r) => r.vendor_packet),
    rollerResults.map((r) => r.vendor_packet),
    driveResult.vendor_packet,
    supportResult.legs_packet,
    supportResult.casters_packet
  );

  // Step 7: Build design geometry
  const design_geometry = buildDesignGeometry(inputs, outputs_v1, support_system, components);

  // Update warning context with TOB for final check
  warningCtx.tob = design_geometry.top_of_belt_in;

  // Re-run TOB warning check
  const tobWarnings = runAllWarningRules({
    ...warningCtx,
    tob: design_geometry.top_of_belt_in,
  }).filter((w) => w.code === 'TOB_MISSING');

  // Merge TOB warnings if not already present
  tobWarnings.forEach((tw) => {
    if (!warnings.some((w) => w.code === tw.code)) {
      warnings.push(tw);
    }
  });

  // Step 8: Build CSV rows
  // v1.38: Pass actual_belt_speed_fpm for belt component rows
  const csv_rows = buildCsvRows(components, warnings, outputs_v1.actual_belt_speed_fpm);

  // Step 9: Build exports
  const exports: ExportsV2 = {
    json_ready: true,
    csv_rows,
    vendor_packets: vendorBundle,
  };

  // Step 10: Assemble final outputs_v2
  const outputs_v2: OutputsV2 = {
    meta: buildMeta(),
    summary,
    support_system,
    calc_results,
    components,
    design_geometry,
    warnings_and_notes: warnings,
    exports,
  };

  return outputs_v2;
}
