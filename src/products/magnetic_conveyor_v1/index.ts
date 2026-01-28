/**
 * Magnetic Conveyor v1 Product Module
 *
 * Wraps the existing magnetic conveyor calculation engine as a ProductModule.
 * Defines the outputsSchema that gates which UI cards can render.
 *
 * CRITICAL: outputsSchema contains ONLY magnetic-specific output keys.
 * Belt-specific keys (effective_tension_lbf, wrap_angle_deg, etc.) are NOT included.
 * This enables the fail-closed gate to prevent belt cards from rendering.
 */

import type { ProductModule, InputFieldDef, OutputFieldDef, ValidationResult } from '../types';

// Import from existing magnetic conveyor module
import {
  MagneticInputs,
  MagneticOutputs,
  ConveyorStyle,
  ConveyorClass,
  MagnetType,
  MaterialType,
  ChipType,
  TemperatureClass,
  FluidType,
  ChipDelivery,
  SupportType,
  CONVEYOR_STYLE_LABELS,
  CONVEYOR_CLASS_LABELS,
  MAGNET_TYPE_LABELS,
  MATERIAL_TYPE_LABELS,
  CHIP_TYPE_LABELS,
  TEMPERATURE_CLASS_LABELS,
  FLUID_TYPE_LABELS,
  CHIP_DELIVERY_LABELS,
  SUPPORT_TYPE_LABELS,
} from '../../models/magnetic_conveyor_v1/schema';

import { calculate } from '../../models/magnetic_conveyor_v1/formulas';
import { validateInputs, type ValidationMessage } from '../../models/magnetic_conveyor_v1/validation';

// =============================================================================
// INPUTS SCHEMA
// =============================================================================

const inputsSchema: InputFieldDef[] = [
  // Style & Class
  {
    key: 'style',
    label: 'Conveyor Style',
    type: 'enum',
    required: true,
    defaultValue: ConveyorStyle.B,
    enumOptions: Object.entries(CONVEYOR_STYLE_LABELS).map(([value, label]) => ({ value, label })),
  },
  {
    key: 'conveyor_class',
    label: 'Conveyor Class',
    type: 'enum',
    required: true,
    defaultValue: ConveyorClass.Standard,
    enumOptions: Object.entries(CONVEYOR_CLASS_LABELS).map(([value, label]) => ({ value, label })),
  },

  // Geometry
  {
    key: 'infeed_length_in',
    label: 'Infeed Length',
    type: 'number',
    unit: 'in',
    required: true,
    defaultValue: 52,
    min: 0,
  },
  {
    key: 'discharge_height_in',
    label: 'Discharge Height',
    type: 'number',
    unit: 'in',
    required: true,
    defaultValue: 60,
    min: 0,
  },
  {
    key: 'incline_angle_deg',
    label: 'Incline Angle',
    type: 'number',
    unit: 'deg',
    required: true,
    defaultValue: 60,
    min: 0,
    max: 90,
  },
  {
    key: 'discharge_length_in',
    label: 'Discharge Length',
    type: 'number',
    unit: 'in',
    required: false,
    defaultValue: 22,
    min: 0,
  },

  // Magnets
  {
    key: 'magnet_width_in',
    label: 'Magnet Width',
    type: 'number',
    unit: 'in',
    required: true,
    defaultValue: 12,
    min: 5,
    max: 30,
  },
  {
    key: 'magnet_type',
    label: 'Magnet Type',
    type: 'enum',
    required: true,
    defaultValue: MagnetType.Ceramic8,
    enumOptions: Object.entries(MAGNET_TYPE_LABELS).map(([value, label]) => ({ value, label })),
  },
  {
    key: 'magnet_centers_in',
    label: 'Magnet Centers',
    type: 'number',
    unit: 'in',
    required: true,
    defaultValue: 18,
    enumOptions: [
      { value: 12, label: '12"' },
      { value: 18, label: '18"' },
      { value: 24, label: '24"' },
      { value: 36, label: '36"' },
    ],
  },

  // Operation
  {
    key: 'belt_speed_fpm',
    label: 'Belt Speed',
    type: 'number',
    unit: 'fpm',
    required: true,
    defaultValue: 30,
    min: 1,
    max: 100,
  },
  {
    key: 'load_lbs_per_hr',
    label: 'Load',
    type: 'number',
    unit: 'lbs/hr',
    required: true,
    defaultValue: 500,
    min: 0,
  },
  {
    key: 'material_type',
    label: 'Material Type',
    type: 'enum',
    required: true,
    defaultValue: MaterialType.Steel,
    enumOptions: Object.entries(MATERIAL_TYPE_LABELS).map(([value, label]) => ({ value, label })),
  },
  {
    key: 'chip_type',
    label: 'Chip Type',
    type: 'enum',
    required: true,
    defaultValue: ChipType.Small,
    enumOptions: Object.entries(CHIP_TYPE_LABELS).map(([value, label]) => ({ value, label })),
  },
  {
    key: 'temperature_class',
    label: 'Temperature Class',
    type: 'enum',
    required: false,
    defaultValue: TemperatureClass.Ambient,
    enumOptions: Object.entries(TEMPERATURE_CLASS_LABELS).map(([value, label]) => ({ value, label })),
  },
  {
    key: 'fluid_type',
    label: 'Fluid Type',
    type: 'enum',
    required: false,
    defaultValue: FluidType.None,
    enumOptions: Object.entries(FLUID_TYPE_LABELS).map(([value, label]) => ({ value, label })),
  },
  {
    key: 'chip_delivery',
    label: 'Chip Delivery',
    type: 'enum',
    required: false,
    defaultValue: ChipDelivery.ChipChute,
    enumOptions: Object.entries(CHIP_DELIVERY_LABELS).map(([value, label]) => ({ value, label })),
  },
  {
    key: 'support_type',
    label: 'Support Type',
    type: 'enum',
    required: false,
    defaultValue: SupportType.AdjustableLegs,
    enumOptions: Object.entries(SUPPORT_TYPE_LABELS).map(([value, label]) => ({ value, label })),
  },
];

// =============================================================================
// OUTPUTS SCHEMA - CRITICAL FOR FAIL-CLOSED GATING
// =============================================================================

/**
 * Output field definitions for magnetic conveyor.
 *
 * IMPORTANT: This list contains ONLY magnetic-specific output keys.
 * Belt-specific keys like effective_tension_lbf, wrap_angle_deg,
 * tight_side_tension_lbf, slack_side_tension_lbf, pulley_diameter_in, etc.
 * are NOT included.
 *
 * The canRenderCard() function uses this schema to determine which
 * cards can render. If a card requires a key not in this list,
 * it will not render for magnetic conveyors.
 */
const outputsSchema: OutputFieldDef[] = [
  // Geometry outputs
  { key: 'incline_length_in', label: 'Incline Length', type: 'number', unit: 'in', precision: 1, category: 'geometry' },
  { key: 'incline_run_in', label: 'Incline Run', type: 'number', unit: 'in', precision: 1, category: 'geometry' },
  { key: 'horizontal_length_in', label: 'Horizontal Length', type: 'number', unit: 'in', precision: 1, category: 'geometry' },
  { key: 'path_length_ft', label: 'Path Length', type: 'number', unit: 'ft', precision: 2, category: 'geometry' },
  { key: 'belt_length_ft', label: 'Belt Length', type: 'number', unit: 'ft', precision: 2, category: 'geometry' },
  { key: 'chain_length_in', label: 'Chain Length', type: 'number', unit: 'in', precision: 0, category: 'geometry' },

  // Magnet outputs
  { key: 'magnet_weight_each_lb', label: 'Magnet Weight (Each)', type: 'number', unit: 'lbs', precision: 2, category: 'magnets' },
  { key: 'qty_magnets', label: 'Magnet Quantity', type: 'number', precision: 0, category: 'magnets' },
  { key: 'total_magnet_weight_lb', label: 'Total Magnet Weight', type: 'number', unit: 'lbs', precision: 2, category: 'magnets' },

  // Load outputs
  { key: 'weight_per_foot_lb', label: 'Weight Per Foot', type: 'number', unit: 'lb/ft', precision: 2, category: 'loads' },
  { key: 'belt_pull_friction_lb', label: 'Belt Pull (Friction)', type: 'number', unit: 'lbs', precision: 2, category: 'loads' },
  { key: 'belt_pull_gravity_lb', label: 'Belt Pull (Gravity)', type: 'number', unit: 'lbs', precision: 2, category: 'loads' },
  { key: 'chip_load_lb', label: 'Chip Load', type: 'number', unit: 'lbs', precision: 2, category: 'loads' },
  { key: 'total_load_lb', label: 'Total Load', type: 'number', unit: 'lbs', precision: 2, category: 'loads' },

  // Drive outputs (NO HP for magnetic - uses torque/RPM)
  { key: 'total_belt_pull_lb', label: 'Total Belt Pull', type: 'number', unit: 'lbs', precision: 2, category: 'drive' },
  { key: 'running_torque_in_lb', label: 'Running Torque', type: 'number', unit: 'in-lb', precision: 2, category: 'drive' },
  { key: 'total_torque_in_lb', label: 'Total Torque', type: 'number', unit: 'in-lb', precision: 2, category: 'drive' },
  { key: 'required_rpm', label: 'Required RPM', type: 'number', precision: 1, category: 'drive' },
  { key: 'suggested_gear_ratio', label: 'Suggested Gear Ratio', type: 'number', precision: 1, category: 'drive' },

  // Throughput outputs
  { key: 'achieved_throughput_lbs_hr', label: 'Achieved Throughput', type: 'number', unit: 'lbs/hr', precision: 0, category: 'throughput' },
  { key: 'throughput_margin', label: 'Throughput Margin', type: 'number', precision: 2, category: 'throughput' },

  // Parameters used (echoed for transparency)
  { key: 'coefficient_of_friction_used', label: 'Coefficient of Friction', type: 'number', precision: 2, category: 'parameters' },
  { key: 'safety_factor_used', label: 'Safety Factor', type: 'number', precision: 2, category: 'parameters' },
  { key: 'starting_belt_pull_lb_used', label: 'Starting Belt Pull', type: 'number', unit: 'lbs', precision: 0, category: 'parameters' },
  { key: 'chain_weight_lb_per_ft_used', label: 'Chain Weight', type: 'number', unit: 'lb/ft', precision: 2, category: 'parameters' },

  // Validation outputs
  { key: 'warnings', label: 'Warnings', type: 'array', category: 'validation' },
  { key: 'errors', label: 'Errors', type: 'array', category: 'validation' },
];

// =============================================================================
// UI CONFIGURATION
// =============================================================================

const ui = {
  tabs: [
    { id: 'summary', label: 'Summary', cardIds: ['summary-card', 'status-card'] },
    { id: 'geometry', label: 'Geometry', cardIds: ['geometry-card'] },
    { id: 'magnets', label: 'Magnets', cardIds: ['magnets-card'] },
    { id: 'loads', label: 'Loads', cardIds: ['loads-card'] },
    { id: 'drive', label: 'Drive', cardIds: ['drive-card'] },
    { id: 'issues', label: 'Issues', cardIds: ['issues-card'] },
  ],
  cards: [
    {
      id: 'summary-card',
      title: 'Conveyor Summary',
      component: 'MagneticSummaryCard',
      requiresOutputKeys: ['belt_length_ft', 'total_torque_in_lb', 'throughput_margin'],
    },
    {
      id: 'status-card',
      title: 'Calculation Status',
      component: 'StatusCard',
      requiresOutputKeys: ['warnings', 'errors'],
    },
    {
      id: 'geometry-card',
      title: 'Geometry Results',
      component: 'GeometryCard',
      requiresOutputKeys: ['incline_length_in', 'incline_run_in', 'horizontal_length_in', 'path_length_ft', 'belt_length_ft', 'chain_length_in'],
    },
    {
      id: 'magnets-card',
      title: 'Magnet Results',
      component: 'MagnetsCard',
      requiresOutputKeys: ['magnet_weight_each_lb', 'qty_magnets', 'total_magnet_weight_lb'],
    },
    {
      id: 'loads-card',
      title: 'Load Results',
      component: 'LoadsCard',
      requiresOutputKeys: ['weight_per_foot_lb', 'belt_pull_friction_lb', 'belt_pull_gravity_lb', 'chip_load_lb', 'total_load_lb'],
    },
    {
      id: 'drive-card',
      title: 'Drive Results',
      component: 'MagneticDriveCard',
      requiresOutputKeys: ['total_belt_pull_lb', 'running_torque_in_lb', 'total_torque_in_lb', 'required_rpm', 'suggested_gear_ratio'],
    },
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

function getDefaultInputs(): MagneticInputs {
  return {
    // Style & Class
    style: ConveyorStyle.B,
    conveyor_class: ConveyorClass.Standard,

    // Geometry
    infeed_length_in: 52,
    discharge_height_in: 60,
    incline_angle_deg: 60,
    discharge_length_in: 22,

    // Magnets
    magnet_width_in: 12,
    magnet_type: MagnetType.Ceramic8,
    magnet_centers_in: 18,

    // Operation
    belt_speed_fpm: 30,
    load_lbs_per_hr: 500,
    material_type: MaterialType.Steel,
    chip_type: ChipType.Small,
    temperature_class: TemperatureClass.Ambient,
    fluid_type: FluidType.None,
    chip_delivery: ChipDelivery.ChipChute,

    // Support
    support_type: SupportType.AdjustableLegs,
  };
}

// =============================================================================
// VALIDATION WRAPPER
// =============================================================================

function validate(inputs: MagneticInputs): ValidationResult[] {
  const messages = validateInputs(inputs);
  return messages.map((msg: ValidationMessage) => ({
    severity: msg.type === 'error' ? 'error' : 'warning',
    field: msg.field || '',
    code: msg.code,
    message: msg.message,
  }));
}

// =============================================================================
// BUILD OUTPUTS V2
// =============================================================================

function buildOutputsV2(inputs: MagneticInputs, outputs: MagneticOutputs): unknown {
  return {
    meta: {
      schema_version: '2.0.0',
      min_compatible_version: '2.0.0',
      generated_at_iso: new Date().toISOString(),
      source_model_version: 'magnetic_conveyor_v1.0',
      output_contracts_generated: ['magnetic_v2'],
    },
    summary: {
      conveyor_id: null,
      conveyor_type: 'magnetic',
      style: inputs.style,
      conveyor_class: inputs.conveyor_class,
      belt_speed_fpm: inputs.belt_speed_fpm,
      belt_length_ft: outputs.belt_length_ft,
      incline_angle_deg: inputs.incline_angle_deg,
    },
    calc_results: {
      total_belt_pull_lb: outputs.total_belt_pull_lb,
      running_torque_in_lb: outputs.running_torque_in_lb,
      total_torque_in_lb: outputs.total_torque_in_lb,
      required_rpm: outputs.required_rpm,
      suggested_gear_ratio: outputs.suggested_gear_ratio,
    },
    geometry: {
      incline_length_in: outputs.incline_length_in,
      incline_run_in: outputs.incline_run_in,
      horizontal_length_in: outputs.horizontal_length_in,
      path_length_ft: outputs.path_length_ft,
      belt_length_ft: outputs.belt_length_ft,
      chain_length_in: outputs.chain_length_in,
    },
    magnets: {
      magnet_width_in: inputs.magnet_width_in,
      magnet_type: inputs.magnet_type,
      magnet_centers_in: inputs.magnet_centers_in,
      magnet_weight_each_lb: outputs.magnet_weight_each_lb,
      qty_magnets: outputs.qty_magnets,
      total_magnet_weight_lb: outputs.total_magnet_weight_lb,
    },
    loads: {
      weight_per_foot_lb: outputs.weight_per_foot_lb,
      belt_pull_friction_lb: outputs.belt_pull_friction_lb,
      belt_pull_gravity_lb: outputs.belt_pull_gravity_lb,
      chip_load_lb: outputs.chip_load_lb,
      total_load_lb: outputs.total_load_lb,
    },
    throughput: {
      load_lbs_per_hr: inputs.load_lbs_per_hr,
      achieved_throughput_lbs_hr: outputs.achieved_throughput_lbs_hr,
      throughput_margin: outputs.throughput_margin,
    },
    warnings_and_notes: [
      ...outputs.warnings.map((w) => ({
        severity: 'warning' as const,
        code: w.field,
        message: w.message,
        recommendation: null,
        impacts: ['design'] as const,
        related_component_ids: [],
      })),
      ...outputs.errors.map((e) => ({
        severity: 'error' as const,
        code: e.field,
        message: e.message,
        recommendation: null,
        impacts: ['design'] as const,
        related_component_ids: [],
      })),
    ],
  };
}

// =============================================================================
// PRODUCT MODULE EXPORT
// =============================================================================

export const magneticConveyorV1: ProductModule<MagneticInputs, MagneticOutputs> = {
  key: 'magnetic_conveyor_v1',
  name: 'Magnetic Conveyor',
  version: '1.0.0',
  inputsSchema,
  outputsSchema,
  getDefaultInputs,
  calculate,
  validate,
  buildOutputsV2,
  ui,
};

export default magneticConveyorV1;
