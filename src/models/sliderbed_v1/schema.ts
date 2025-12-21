/**
 * SLIDERBED CONVEYOR v1.2 - TYPE DEFINITIONS
 *
 * Source of Truth: Model v1 Specification (Authoritative)
 * Model Key: sliderbed_conveyor_v1
 * Excel Parity: Required
 *
 * This file defines the complete type system for inputs, parameters, and outputs.
 * All units are explicit. No hidden conversions.
 *
 * CHANGELOG:
 * v1.2 (2025-12-19): Make key parameters power-user editable (safety_factor, belt coeffs, base pull)
 * v1.1 (2025-12-19): Fix open-belt wrap length: use πD not 2πD
 * v1.0 (2024-12-19): Initial implementation
 */

// ============================================================================
// ENUMS
// ============================================================================

// GROUP 1: Application Basics
export enum MaterialType {
  Steel = 'Steel',
  Aluminum = 'Aluminum',
  Plastic = 'Plastic',
  Wood = 'Wood',
  Other = 'Other',
}

export enum ProcessType {
  Assembly = 'Assembly',
  Packaging = 'Packaging',
  Inspection = 'Inspection',
  Machining = 'Machining',
  Other = 'Other',
}

export enum PartsSharp {
  No = 'No',
  Yes = 'Yes',
}

// GROUP 2: Environment and Temperature
export enum EnvironmentFactors {
  Indoor = 'Indoor',
  Outdoor = 'Outdoor',
  Washdown = 'Washdown',
  Dusty = 'Dusty',
  Other = 'Other',
}

export enum FluidType {
  None = 'None',
  MinimalResidualOil = 'Minimal Residual Oil',
  ConsiderableOilLiquid = 'Considerable Oil / Liquid',
}

export enum PartTemperatureClass {
  Ambient = 'Ambient',
  Hot = 'Hot',
  RedHot = 'Red Hot',
}

export enum AmbientTemperature {
  Normal = 'Normal (60-90°F)',
  Cold = 'Cold (<60°F)',
  Hot = 'Hot (>90°F)',
}

// GROUP 3: Electrical and Controls
export enum PowerFeed {
  V120_1Ph = '120V 1-Phase',
  V240_1Ph = '240V 1-Phase',
  V480_3Ph = '480V 3-Phase',
  V600_3Ph = '600V 3-Phase',
}

export enum ControlsPackage {
  None = 'None',
  StartStop = 'Start/Stop',
  VFD = 'VFD',
  FullAutomation = 'Full Automation',
}

// GROUP 4: Build Options and Deliverables
export enum SpecSource {
  Standard = 'Standard',
  CustomerSpecification = 'Customer Specification',
}

export enum SupportOption {
  FloorMounted = 'Floor Mounted',
  Suspended = 'Suspended',
  IntegratedFrame = 'Integrated Frame',
}

export enum FieldWiringRequired {
  No = 'No',
  Yes = 'Yes',
}

export enum BearingGrade {
  Standard = 'Standard',
  Premium = 'Premium',
  SealedForLife = 'Sealed for Life',
}

export enum DocumentationPackage {
  Basic = 'Basic',
  Full = 'Full',
  AsBuilt = 'As-Built Drawings',
}

export enum FinishPaintSystem {
  None = 'None',
  PowderCoat = 'Powder Coat',
  IndustrialEnamel = 'Industrial Enamel',
  Galvanized = 'Galvanized',
}

export enum LabelsRequired {
  No = 'No',
  Yes = 'Yes',
}

export enum SendToEstimating {
  No = 'No',
  Yes = 'Yes',
}

export enum MotorBrand {
  Standard = 'Standard',
  Baldor = 'Baldor',
  SEW = 'SEW',
  NordGear = 'Nord Gear',
}

// CORE ENUMS (not part of application groups)
export enum Orientation {
  Lengthwise = 'Lengthwise',
  Crosswise = 'Crosswise',
}

// ============================================================================
// INPUTS SCHEMA
// ============================================================================

export interface SliderbedInputs {
  // GEOMETRY & LAYOUT
  /** Conveyor Length (C-C) in inches */
  conveyor_length_cc_in: number;

  /** Conveyor Width in inches */
  conveyor_width_in: number;

  /** Incline Angle in degrees (default: 0) */
  conveyor_incline_deg?: number;

  /** Pulley Diameter in inches */
  pulley_diameter_in: number;

  // SPEED & THROUGHPUT
  /** Belt Speed in FPM (feet per minute) */
  belt_speed_fpm: number;

  /** Throughput in units per hour (optional) */
  throughput_units_per_hr?: number;

  // PRODUCT / PART
  /** Part Weight in lbs */
  part_weight_lbs: number;

  /** Part Length in inches */
  part_length_in: number;

  /** Part Width in inches */
  part_width_in: number;

  /** Part Temperature Class */
  part_temperature_class: PartTemperatureClass | string;

  /** Fluid Type */
  fluid_type: FluidType | string;

  /** Part Orientation on belt */
  orientation: Orientation;

  /** Part Spacing in inches (default: 0) */
  part_spacing_in: number;

  // THROUGHPUT INPUTS
  /** Drive RPM (current drive shaft speed) */
  drive_rpm: number;

  /** Required Throughput in parts per hour (optional) */
  required_throughput_pph?: number;

  /** Throughput Margin in percent (default: 0) */
  throughput_margin_pct?: number;

  // POWER-USER PARAMETERS (optional overrides)
  /** Safety factor (default: 2.0, range: 1.0–5.0) */
  safety_factor?: number;

  /** Belt weight coefficient - Pounds per Inch of Width (lb/in, default: 0.109, range: 0.05–0.30) */
  belt_coeff_piw?: number;

  /** Belt weight coefficient - Pounds per Inch of Length (lb/in, default: 0.109, range: 0.05–0.30) */
  belt_coeff_pil?: number;

  /** Starting belt pull in lb (default: 75, range: 0–2000) */
  starting_belt_pull_lb?: number;

  /** Friction coefficient (default: 0.25, range: 0.05–0.6) */
  friction_coeff?: number;

  /** Motor RPM (default: 1750, range: 800–3600) */
  motor_rpm?: number;

  // APPLICATION FIELDS (Group 1: Application Basics)
  /** Material Type */
  material_type: MaterialType | string;

  /** Process Type */
  process_type: ProcessType | string;

  /** Parts Sharp */
  parts_sharp: PartsSharp | string;

  // APPLICATION FIELDS (Group 2: Environment and Temperature)
  /** Environment Factors */
  environment_factors: EnvironmentFactors | string;

  /** Ambient Temperature */
  ambient_temperature: AmbientTemperature | string;

  // Note: fluid_type and part_temperature_class already defined above in PRODUCT/PART section

  // APPLICATION FIELDS (Group 3: Electrical and Controls)
  /** Power Feed */
  power_feed: PowerFeed | string;

  /** Controls Package */
  controls_package: ControlsPackage | string;

  // APPLICATION FIELDS (Group 4: Build Options and Deliverables)
  /** Spec Source */
  spec_source: SpecSource | string;

  /** Customer Spec Reference (required only if spec_source = Customer Specification) */
  customer_spec_reference?: string;

  /** Support Option */
  support_option: SupportOption | string;

  /** Field Wiring Required */
  field_wiring_required: FieldWiringRequired | string;

  /** Bearing Grade */
  bearing_grade: BearingGrade | string;

  /** Documentation Package */
  documentation_package: DocumentationPackage | string;

  /** Finish Paint System */
  finish_paint_system: FinishPaintSystem | string;

  /** Labels Required */
  labels_required: LabelsRequired | string;

  /** Send to Estimating */
  send_to_estimating: SendToEstimating | string;

  /** Motor Brand */
  motor_brand: MotorBrand | string;
}

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

export interface SliderbedParameters {
  /** Sliderbed friction coefficient (dimensionless) */
  friction_coeff: number;

  /** Safety factor applied to torque (dimensionless) */
  safety_factor: number;

  /** Starting belt pull in lb (pounds-force, fixed not per-foot) */
  starting_belt_pull_lb: number;

  /** Nominal motor RPM */
  motor_rpm: number;

  /** Gravity constant in in/s² (inches per second squared) */
  gravity_in_per_s2: number;

  /** Belt weight coefficient for 2.5" pulley (piw when pulley_diameter_in == 2.5) */
  piw_2p5: number;

  /** Belt weight coefficient for other pulleys (piw when pulley_diameter_in != 2.5) */
  piw_other: number;

  /** Belt weight coefficient for 2.5" pulley (pil when pulley_diameter_in == 2.5) */
  pil_2p5: number;

  /** Belt weight coefficient for other pulleys (pil when pulley_diameter_in != 2.5) */
  pil_other: number;
}

// ============================================================================
// OUTPUTS SCHEMA
// ============================================================================

export interface SliderbedOutputs {
  // INTERMEDIATE CALCULATIONS
  /** Parts on belt (dimensionless count) */
  parts_on_belt: number;

  /** Load on belt from parts in lbf (pounds-force) */
  load_on_belt_lbf: number;

  /** Belt weight in lbf */
  belt_weight_lbf: number;

  /** Total load (belt + parts) in lbf */
  total_load_lbf: number;

  /** Total belt length in inches */
  total_belt_length_in: number;

  /** Friction pull in lb (friction_coeff * total_load_lb) */
  friction_pull_lb: number;

  /** Incline pull in lb (total_load_lb * sin(incline_rad)) */
  incline_pull_lb: number;

  /** Starting belt pull in lb */
  starting_belt_pull_lb: number;

  /** Total belt pull in lb (friction_pull + incline_pull + starting_pull) */
  total_belt_pull_lb: number;

  /** Legacy calculated belt pull (deprecated, kept for compatibility) */
  belt_pull_calc_lb: number;

  /** Belt weight coefficient used (piw) */
  piw_used: number;

  /** Belt weight coefficient used (pil) */
  pil_used: number;

  // THROUGHPUT OUTPUTS
  /** Pitch in inches (travel dimension + spacing) */
  pitch_in: number;

  /** Belt speed in FPM */
  belt_speed_fpm: number;

  /** Capacity in parts per hour */
  capacity_pph: number;

  /** Target throughput (required + margin) in parts per hour */
  target_pph?: number;

  /** Meets throughput requirement (true if capacity >= target) */
  meets_throughput?: boolean;

  /** RPM required to achieve target throughput */
  rpm_required_for_target?: number;

  /** Throughput margin achieved in percent */
  throughput_margin_achieved_pct?: number;

  // FINAL OUTPUTS
  /** Drive shaft RPM (required output RPM of gearmotor) */
  drive_shaft_rpm: number;

  /** Torque on drive shaft in in-lbf (inch-pounds-force) */
  torque_drive_shaft_inlbf: number;

  /** Gear ratio (motor RPM / drive shaft RPM) */
  gear_ratio: number;

  /** Safety factor used */
  safety_factor_used: number;

  /** Starting belt pull used (lb) */
  starting_belt_pull_lb_used: number;

  /** Friction coefficient used */
  friction_coeff_used: number;

  /** Motor RPM used */
  motor_rpm_used: number;
}

// ============================================================================
// VALIDATION & METADATA
// ============================================================================

export interface ValidationError {
  field?: string;
  message: string;
  severity: 'error';
}

export interface ValidationWarning {
  field?: string;
  message: string;
  severity: 'warning' | 'info';
}

export interface CalculationMetadata {
  model_version_id: string;
  calculated_at: string; // ISO 8601 timestamp
  model_key: 'sliderbed_conveyor_v1';
}

// ============================================================================
// CALCULATION RESULT
// ============================================================================

export interface CalculationResult {
  success: boolean;
  outputs?: SliderbedOutputs;
  errors?: ValidationError[];
  warnings?: ValidationWarning[];
  metadata: CalculationMetadata;
}

// ============================================================================
// DEFAULTS
// ============================================================================

export const DEFAULT_PARAMETERS: SliderbedParameters = {
  friction_coeff: 0.25,
  safety_factor: 2.0,
  starting_belt_pull_lb: 75,
  motor_rpm: 1750,
  gravity_in_per_s2: 386.1,
  piw_2p5: 0.138,
  piw_other: 0.109,
  pil_2p5: 0.138,
  pil_other: 0.109,
};

export const DEFAULT_INPUT_VALUES = {
  conveyor_incline_deg: 0,
  part_spacing_in: 0,
  throughput_margin_pct: 0,
  orientation: Orientation.Lengthwise,

  // Application defaults
  material_type: MaterialType.Steel,
  process_type: ProcessType.Assembly,
  parts_sharp: PartsSharp.No,
  environment_factors: EnvironmentFactors.Indoor,
  ambient_temperature: AmbientTemperature.Normal,
  power_feed: PowerFeed.V480_3Ph,
  controls_package: ControlsPackage.StartStop,
  spec_source: SpecSource.Standard,
  support_option: SupportOption.FloorMounted,
  field_wiring_required: FieldWiringRequired.No,
  bearing_grade: BearingGrade.Standard,
  documentation_package: DocumentationPackage.Basic,
  finish_paint_system: FinishPaintSystem.PowderCoat,
  labels_required: LabelsRequired.Yes,
  send_to_estimating: SendToEstimating.No,
  motor_brand: MotorBrand.Standard,
};
