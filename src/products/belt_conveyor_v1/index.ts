/**
 * Belt Conveyor v1 Product Module
 *
 * Wraps the existing belt conveyor calculation engine as a ProductModule.
 * Defines the outputsSchema that gates which UI cards can render.
 *
 * CRITICAL: outputsSchema contains belt-specific output keys.
 * Magnetic-specific keys (qty_magnets, magnet_weight_each_lb, chain_length_in, etc.)
 * are NOT included.
 *
 * This enables the fail-closed gate to prevent magnetic cards from rendering
 * on belt conveyors, and vice versa.
 */

import type { ProductModule, OutputFieldDef, ValidationResult } from '../types';

// Import from existing belt conveyor module
import type {
  BeltConveyorInputs,
  BeltConveyorOutputs,
  BeltConveyorParameters,
} from '../../models/belt_conveyor_v1/schema';

import { calculate } from '../../models/belt_conveyor_v1/formulas';
import { validate } from '../../models/belt_conveyor_v1/rules';
import {
  DEFAULT_PARAMETERS,
  DEFAULT_INPUT_VALUES,
  BedType,
} from '../../models/belt_conveyor_v1/schema';

// =============================================================================
// OUTPUTS SCHEMA - CRITICAL FOR FAIL-CLOSED GATING
// =============================================================================

/**
 * Output field definitions for belt conveyor.
 *
 * IMPORTANT: This list contains belt-specific output keys.
 * Magnetic-specific keys like qty_magnets, magnet_weight_each_lb,
 * chain_length_in, total_torque_in_lb (magnetic style) are NOT included.
 *
 * The canRenderCard() function uses this schema to determine which
 * cards can render. If a card requires a key not in this list,
 * it will not render for belt conveyors.
 */
const outputsSchema: OutputFieldDef[] = [
  // =========================================================================
  // BELT TENSION OUTPUTS (Belt-specific - magnetic uses torque instead)
  // =========================================================================
  { key: 'drive_T1_lbf', label: 'Tight Side Tension (T1)', type: 'number', unit: 'lbf', precision: 1, category: 'tensions' },
  { key: 'drive_T2_lbf', label: 'Slack Side Tension (T2)', type: 'number', unit: 'lbf', precision: 1, category: 'tensions' },
  { key: 'total_belt_pull_lb', label: 'Total Belt Pull', type: 'number', unit: 'lb', precision: 1, category: 'tensions' },
  { key: 'friction_pull_lb', label: 'Friction Pull', type: 'number', unit: 'lb', precision: 1, category: 'tensions' },
  { key: 'incline_pull_lb', label: 'Incline Pull', type: 'number', unit: 'lb', precision: 1, category: 'tensions' },
  { key: 'starting_belt_pull_lb', label: 'Starting Belt Pull', type: 'number', unit: 'lb', precision: 1, category: 'tensions' },

  // =========================================================================
  // DRIVE OUTPUTS
  // =========================================================================
  { key: 'torque_drive_shaft_inlbf', label: 'Drive Shaft Torque', type: 'number', unit: 'in-lbf', precision: 1, category: 'drive' },
  { key: 'drive_shaft_rpm', label: 'Drive Shaft RPM', type: 'number', precision: 1, category: 'drive' },
  { key: 'gear_ratio', label: 'Gear Ratio', type: 'number', precision: 2, category: 'drive' },
  { key: 'chain_ratio', label: 'Chain Ratio', type: 'number', precision: 2, category: 'drive' },
  { key: 'total_drive_ratio', label: 'Total Drive Ratio', type: 'number', precision: 2, category: 'drive' },
  { key: 'gearmotor_output_rpm', label: 'Gearmotor Output RPM', type: 'number', precision: 1, category: 'drive' },
  { key: 'motor_rpm_used', label: 'Motor RPM Used', type: 'number', precision: 0, category: 'drive' },

  // =========================================================================
  // PULLEY OUTPUTS (Belt-specific - magnetic has no pulleys)
  // =========================================================================
  { key: 'drive_pulley_diameter_in', label: 'Drive Pulley Diameter', type: 'number', unit: 'in', precision: 2, category: 'pulleys' },
  { key: 'tail_pulley_diameter_in', label: 'Tail Pulley Diameter', type: 'number', unit: 'in', precision: 2, category: 'pulleys' },
  { key: 'pulley_face_length_in', label: 'Pulley Face Length', type: 'number', unit: 'in', precision: 2, category: 'pulleys' },
  { key: 'pulley_face_extra_in', label: 'Pulley Face Extra', type: 'number', unit: 'in', precision: 2, category: 'pulleys' },
  { key: 'pulley_requires_crown', label: 'Pulley Requires Crown', type: 'boolean', category: 'pulleys' },
  { key: 'drive_pulley_resultant_load_lbf', label: 'Drive Pulley Load', type: 'number', unit: 'lbf', precision: 1, category: 'pulleys' },
  { key: 'tail_pulley_resultant_load_lbf', label: 'Tail Pulley Load', type: 'number', unit: 'lbf', precision: 1, category: 'pulleys' },
  { key: 'min_pulley_drive_required_in', label: 'Min Drive Pulley Required', type: 'number', unit: 'in', precision: 2, category: 'pulleys' },
  { key: 'min_pulley_tail_required_in', label: 'Min Tail Pulley Required', type: 'number', unit: 'in', precision: 2, category: 'pulleys' },
  { key: 'required_min_pulley_diameter_in', label: 'Required Min Pulley Diameter', type: 'number', unit: 'in', precision: 2, category: 'pulleys' },

  // =========================================================================
  // SHAFT OUTPUTS
  // =========================================================================
  { key: 'drive_shaft_diameter_in', label: 'Drive Shaft Diameter', type: 'number', unit: 'in', precision: 3, category: 'shafts' },
  { key: 'tail_shaft_diameter_in', label: 'Tail Shaft Diameter', type: 'number', unit: 'in', precision: 3, category: 'shafts' },

  // =========================================================================
  // BELT OUTPUTS
  // =========================================================================
  { key: 'belt_width_in', label: 'Belt Width', type: 'number', unit: 'in', precision: 1, category: 'belt' },
  { key: 'total_belt_length_in', label: 'Belt Length', type: 'number', unit: 'in', precision: 1, category: 'belt' },
  { key: 'belt_weight_lbf', label: 'Belt Weight', type: 'number', unit: 'lbf', precision: 1, category: 'belt' },
  { key: 'belt_speed_fpm', label: 'Belt Speed', type: 'number', unit: 'FPM', precision: 1, category: 'belt' },
  { key: 'is_v_guided', label: 'V-Guided', type: 'boolean', category: 'belt' },

  // =========================================================================
  // GEOMETRY OUTPUTS
  // =========================================================================
  { key: 'conveyor_length_cc_in', label: 'Length (C-C)', type: 'number', unit: 'in', precision: 1, category: 'geometry' },
  { key: 'conveyor_incline_deg', label: 'Incline Angle', type: 'number', unit: 'deg', precision: 1, category: 'geometry' },
  { key: 'horizontal_run_in', label: 'Horizontal Run', type: 'number', unit: 'in', precision: 1, category: 'geometry' },
  { key: 'rise_in', label: 'Rise', type: 'number', unit: 'in', precision: 1, category: 'geometry' },

  // =========================================================================
  // LOAD OUTPUTS
  // =========================================================================
  { key: 'total_load_lbf', label: 'Total Load', type: 'number', unit: 'lbf', precision: 1, category: 'loads' },
  { key: 'load_on_belt_lbf', label: 'Load on Belt', type: 'number', unit: 'lbf', precision: 1, category: 'loads' },
  { key: 'parts_on_belt', label: 'Parts on Belt', type: 'number', precision: 1, category: 'loads' },

  // =========================================================================
  // THROUGHPUT OUTPUTS
  // =========================================================================
  { key: 'capacity_pph', label: 'Capacity', type: 'number', unit: 'pph', precision: 0, category: 'throughput' },
  { key: 'pitch_in', label: 'Pitch', type: 'number', unit: 'in', precision: 2, category: 'throughput' },
  { key: 'target_pph', label: 'Target Throughput', type: 'number', unit: 'pph', precision: 0, category: 'throughput' },
  { key: 'meets_throughput', label: 'Meets Throughput', type: 'boolean', category: 'throughput' },
  { key: 'throughput_margin_achieved_pct', label: 'Throughput Margin', type: 'number', unit: '%', precision: 1, category: 'throughput' },
  { key: 'mass_flow_lbs_per_hr', label: 'Mass Flow', type: 'number', unit: 'lbs/hr', precision: 0, category: 'throughput' },

  // =========================================================================
  // PARAMETERS USED (echoed for transparency)
  // =========================================================================
  { key: 'safety_factor_used', label: 'Safety Factor', type: 'number', precision: 2, category: 'parameters' },
  { key: 'friction_coeff_used', label: 'Friction Coefficient', type: 'number', precision: 3, category: 'parameters' },
  { key: 'starting_belt_pull_lb_used', label: 'Starting Belt Pull', type: 'number', unit: 'lb', precision: 0, category: 'parameters' },
  { key: 'piw_used', label: 'PIW Used', type: 'number', precision: 3, category: 'parameters' },
  { key: 'pil_used', label: 'PIL Used', type: 'number', precision: 3, category: 'parameters' },

  // =========================================================================
  // BED TYPE & PREMIUM FLAGS
  // =========================================================================
  { key: 'bed_type_used', label: 'Bed Type', type: 'string', category: 'config' },
  { key: 'premium_flags', label: 'Premium Flags', type: 'object', category: 'config' },

  // =========================================================================
  // PCI TUBE STRESS (Belt-specific pulley stress calculations)
  // =========================================================================
  { key: 'pci_drive_tube_stress_psi', label: 'Drive Tube Stress', type: 'number', unit: 'psi', precision: 0, category: 'pci' },
  { key: 'pci_tail_tube_stress_psi', label: 'Tail Tube Stress', type: 'number', unit: 'psi', precision: 0, category: 'pci' },
  { key: 'pci_tube_stress_limit_psi', label: 'Tube Stress Limit', type: 'number', unit: 'psi', precision: 0, category: 'pci' },
  { key: 'pci_tube_stress_status', label: 'Tube Stress Status', type: 'string', category: 'pci' },

  // =========================================================================
  // VALIDATION OUTPUTS
  // =========================================================================
  { key: 'warnings', label: 'Warnings', type: 'array', category: 'validation' },
  { key: 'errors', label: 'Errors', type: 'array', category: 'validation' },
];

// =============================================================================
// UI CONFIGURATION
// =============================================================================

const ui = {
  tabs: [
    { id: 'summary', label: 'Summary', cardIds: ['config-summary', 'geometry-summary', 'drive-summary'] },
    { id: 'tensions', label: 'Tensions', cardIds: ['tensions-detail'] },
    { id: 'belt', label: 'Belt', cardIds: ['belt-detail'] },
    { id: 'pulleys', label: 'Pulleys', cardIds: ['pulleys-detail'] },
    { id: 'drive', label: 'Drive', cardIds: ['drive-detail'] },
    { id: 'issues', label: 'Issues', cardIds: ['issues-card'] },
  ],
  cards: [
    // Summary cards
    {
      id: 'config-summary',
      title: 'Configuration',
      component: 'ConfigSummaryCard',
      requiresOutputKeys: ['bed_type_used'],
    },
    {
      id: 'geometry-summary',
      title: 'Geometry',
      component: 'GeometrySummaryCard',
      requiresOutputKeys: ['total_belt_length_in', 'belt_speed_fpm'],
    },
    {
      id: 'drive-summary',
      title: 'Drive',
      component: 'DriveSummaryCard',
      requiresOutputKeys: ['torque_drive_shaft_inlbf', 'drive_shaft_rpm'],
    },

    // Detail cards
    {
      id: 'tensions-detail',
      title: 'Belt Tensions',
      component: 'TensionsDetailCard',
      requiresOutputKeys: ['drive_T1_lbf', 'drive_T2_lbf', 'total_belt_pull_lb'],
    },
    {
      id: 'belt-detail',
      title: 'Belt Details',
      component: 'BeltDetailCard',
      requiresOutputKeys: ['total_belt_length_in', 'belt_weight_lbf', 'belt_speed_fpm'],
    },
    {
      id: 'pulleys-detail',
      title: 'Pulley Details',
      component: 'PulleysDetailCard',
      requiresOutputKeys: ['drive_pulley_diameter_in', 'tail_pulley_diameter_in', 'pulley_face_length_in'],
    },
    {
      id: 'drive-detail',
      title: 'Drive Requirements',
      component: 'DriveDetailCard',
      requiresOutputKeys: ['torque_drive_shaft_inlbf', 'drive_shaft_rpm', 'gear_ratio'],
    },

    // Issues
    {
      id: 'issues-card',
      title: 'Issues & Warnings',
      component: 'IssuesCard',
      requiresOutputKeys: ['warnings', 'errors'],
    },
  ],
};

// =============================================================================
// DEFAULT INPUTS
// =============================================================================

function getDefaultInputs(): BeltConveyorInputs {
  // Merge defaults with required fields
  return {
    ...DEFAULT_INPUT_VALUES,
    // Override with specific values
    bed_type: BedType.SliderBed,
    conveyor_length_cc_in: 120,
    belt_width_in: 24,
    conveyor_incline_deg: 0,
    pulley_diameter_in: 4,
    belt_speed_fpm: 65,
    part_weight_lbs: 5,
    part_length_in: 6,
    part_width_in: 4,
    part_spacing_in: 0,
  } as unknown as BeltConveyorInputs;
}

// =============================================================================
// VALIDATION WRAPPER
// =============================================================================

function validateWrapper(inputs: BeltConveyorInputs): ValidationResult[] {
  const result = validate(inputs, DEFAULT_PARAMETERS);
  const results: ValidationResult[] = [];

  // Convert errors
  if (result.errors) {
    result.errors.forEach(err => {
      results.push({
        severity: 'error',
        field: err.field || '',
        code: err.field || 'validation_error',
        message: err.message,
      });
    });
  }

  // Convert warnings
  if (result.warnings) {
    result.warnings.forEach(warn => {
      results.push({
        severity: warn.severity === 'info' ? 'info' : 'warning',
        field: warn.field || '',
        code: warn.field || 'validation_warning',
        message: warn.message,
      });
    });
  }

  return results;
}

// =============================================================================
// CALCULATE WRAPPER
// =============================================================================

function calculateWrapper(inputs: BeltConveyorInputs, params?: Record<string, unknown>): BeltConveyorOutputs {
  const parameters = (params as unknown as BeltConveyorParameters) || DEFAULT_PARAMETERS;
  return calculate(inputs, parameters);
}

// =============================================================================
// BUILD OUTPUTS V2
// =============================================================================

function buildOutputsV2(inputs: BeltConveyorInputs, outputs: BeltConveyorOutputs): unknown {
  return {
    meta: {
      schema_version: '2.0.0',
      min_compatible_version: '2.0.0',
      generated_at_iso: new Date().toISOString(),
      source_model_version: 'belt_conveyor_v1.0',
      output_contracts_generated: ['belt_v2'],
    },
    summary: {
      conveyor_id: null,
      conveyor_type: 'belt',
      bed_type: outputs.bed_type_used,
      belt_speed_fpm: outputs.belt_speed_fpm,
      belt_length_in: outputs.total_belt_length_in,
      incline_angle_deg: inputs.conveyor_incline_deg || 0,
    },
    calc_results: {
      total_belt_pull_lb: outputs.total_belt_pull_lb,
      torque_drive_shaft_inlbf: outputs.torque_drive_shaft_inlbf,
      drive_shaft_rpm: outputs.drive_shaft_rpm,
      gear_ratio: outputs.gear_ratio,
    },
    tensions: {
      drive_T1_lbf: outputs.drive_T1_lbf,
      drive_T2_lbf: outputs.drive_T2_lbf,
      friction_pull_lb: outputs.friction_pull_lb,
      incline_pull_lb: outputs.incline_pull_lb,
      total_belt_pull_lb: outputs.total_belt_pull_lb,
    },
    geometry: {
      conveyor_length_cc_in: inputs.conveyor_length_cc_in,
      belt_width_in: inputs.belt_width_in,
      conveyor_incline_deg: inputs.conveyor_incline_deg,
      total_belt_length_in: outputs.total_belt_length_in,
    },
    pulleys: {
      drive_pulley_diameter_in: outputs.drive_pulley_diameter_in,
      tail_pulley_diameter_in: outputs.tail_pulley_diameter_in,
      pulley_face_length_in: outputs.pulley_face_length_in,
      drive_pulley_resultant_load_lbf: outputs.drive_pulley_resultant_load_lbf,
      tail_pulley_resultant_load_lbf: outputs.tail_pulley_resultant_load_lbf,
    },
    shafts: {
      drive_shaft_diameter_in: outputs.drive_shaft_diameter_in,
      tail_shaft_diameter_in: outputs.tail_shaft_diameter_in,
    },
    loads: {
      total_load_lbf: outputs.total_load_lbf,
      load_on_belt_lbf: outputs.load_on_belt_lbf,
      parts_on_belt: outputs.parts_on_belt,
      belt_weight_lbf: outputs.belt_weight_lbf,
    },
    throughput: {
      capacity_pph: outputs.capacity_pph,
      target_pph: outputs.target_pph,
      meets_throughput: outputs.meets_throughput,
      throughput_margin_achieved_pct: outputs.throughput_margin_achieved_pct,
    },
    warnings_and_notes: [],
  };
}

// =============================================================================
// PRODUCT MODULE EXPORT
// =============================================================================

export const beltConveyorV1: ProductModule<BeltConveyorInputs, BeltConveyorOutputs> = {
  key: 'belt_conveyor_v1',
  name: 'Belt Conveyor',
  version: '1.0.0',
  inputsSchema: [], // Full inputsSchema would be defined if needed for form generation
  outputsSchema,
  getDefaultInputs,
  calculate: calculateWrapper,
  validate: validateWrapper,
  buildOutputsV2,
  ui,
};

export default beltConveyorV1;
