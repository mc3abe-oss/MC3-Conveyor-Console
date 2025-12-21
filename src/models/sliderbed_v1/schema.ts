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
// FEATURES & OPTIONS ENUMS
// ============================================================================

export enum SideRails {
  None = 'None',
  Left = 'Left',
  Right = 'Right',
  Both = 'Both',
}

export enum EndGuards {
  None = 'None',
  HeadEnd = 'Head end',
  TailEnd = 'Tail end',
  BothEnds = 'Both ends',
}

export enum LacingStyle {
  Endless = 'Endless (no lacing)',
  HiddenLacing = 'Hidden lacing',
  ClipperLacing = 'Clipper lacing',
}

export enum LacingMaterial {
  CarbonSteel = 'Carbon steel',
  StainlessSteel = 'Stainless steel',
}

export enum SensorOption {
  ProductPresent = 'Product present (photoeye)',
  JamDetection = 'Jam detection',
  BeltMisTracking = 'Belt mis-tracking',
  ZeroSpeed = 'Zero speed / motion',
  Encoder = 'Encoder',
}

// ============================================================================
// APPLICATION / DEMAND ENUMS
// ============================================================================

export enum PulleySurfaceType {
  Plain = 'Plain (bare steel)',
  Lagged = 'Lagged',
}

export enum DirectionMode {
  OneDirection = 'One direction',
  Reversing = 'Reversing',
}

export enum SideLoadingDirection {
  None = 'No side loading',
  Left = 'Left',
  Right = 'Right',
  Both = 'Both',
}

export enum SideLoadingSeverity {
  Light = 'Light',
  Moderate = 'Moderate',
  Heavy = 'Heavy',
}

// ============================================================================
// SPECIFICATIONS ENUMS
// ============================================================================

export enum DriveLocation {
  Head = 'Head',
  Tail = 'Tail',
  Center = 'Center',
}

export enum GearmotorOrientation {
  SideMount = 'Side mount',
  BottomMount = 'Bottom mount',
}

export enum DriveHand {
  RightHand = 'Right-hand (RH)',
  LeftHand = 'Left-hand (LH)',
}

// ============================================================================
// BELT TRACKING & PULLEY ENUMS
// ============================================================================

export enum BeltTrackingMethod {
  VGuided = 'V-guided',
  Crowned = 'Crowned',
}

export enum VGuideProfile {
  K6 = 'K6',
  K8 = 'K8',
  K10 = 'K10',
  K13 = 'K13',
  K13Mod = 'K13 Modified',
  K15 = 'K15',
  K17 = 'K17',
  K30 = 'K30',
  Custom = 'Custom',
}

export enum ShaftDiameterMode {
  Calculated = 'Calculated',
  Manual = 'Manual',
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

  /** Drop height in inches (vertical distance from part release to belt surface) */
  drop_height_in: number;

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

  // =========================================================================
  // FEATURES & OPTIONS
  // =========================================================================

  /** Bottom covers - include covers under return side */
  bottom_covers: boolean;

  /** Side rails */
  side_rails: SideRails | string;

  /** End guards */
  end_guards: EndGuards | string;

  /** Finger safe - design intent flag */
  finger_safe: boolean;

  /** Lacing style */
  lacing_style: LacingStyle | string;

  /** Lacing material - required if lacing_style != Endless */
  lacing_material?: LacingMaterial | string;

  /** Side skirts - optional belt edge containment */
  side_skirts: boolean;

  /** Sensor options - multi-select */
  sensor_options: string[];

  // =========================================================================
  // APPLICATION / DEMAND (Extended)
  // =========================================================================

  /** Pulley surface type */
  pulley_surface_type: PulleySurfaceType | string;

  /** Start/stop application */
  start_stop_application: boolean;

  /** Cycle time in seconds - required if start_stop_application = true */
  cycle_time_seconds?: number;

  /** Direction mode */
  direction_mode: DirectionMode | string;

  /** Side loading direction */
  side_loading_direction: SideLoadingDirection | string;

  /** Side loading severity - required if side_loading_direction != None */
  side_loading_severity?: SideLoadingSeverity | string;

  // =========================================================================
  // SPECIFICATIONS
  // =========================================================================

  /** Drive location */
  drive_location: DriveLocation | string;

  /** Brake motor */
  brake_motor: boolean;

  /** Gearmotor mounting orientation */
  gearmotor_orientation: GearmotorOrientation | string;

  /** Drive hand (RH/LH) - when facing discharge end */
  drive_hand: DriveHand | string;

  // =========================================================================
  // BELT TRACKING & PULLEY
  // =========================================================================

  /** Belt tracking method */
  belt_tracking_method: BeltTrackingMethod | string;

  /** V-guide profile - required if belt_tracking_method = V-guided */
  v_guide_profile?: VGuideProfile | string;

  /** Shaft diameter mode */
  shaft_diameter_mode: ShaftDiameterMode | string;

  /** Drive shaft diameter in inches - required if shaft_diameter_mode = Manual */
  drive_shaft_diameter_in?: number;

  /** Tail shaft diameter in inches - required if shaft_diameter_mode = Manual */
  tail_shaft_diameter_in?: number;
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

  /** Extra pulley face allowance for V-guided belts in inches */
  pulley_face_extra_v_guided_in: number;

  /** Extra pulley face allowance for crowned pulleys in inches */
  pulley_face_extra_crowned_in: number;
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

  // BELT TRACKING & PULLEY OUTPUTS
  /** Whether belt tracking is V-guided (true) or crowned (false) */
  is_v_guided: boolean;

  /** Whether pulley requires crown (only applies when not V-guided) */
  pulley_requires_crown: boolean;

  /** Extra pulley face allowance in inches (0.5 for V-guided, 2.0 for crowned) */
  pulley_face_extra_in: number;

  /** Pulley face length in inches (conveyor_width_in + pulley_face_extra_in) */
  pulley_face_length_in: number;

  /** Drive shaft diameter in inches (input or calculated) */
  drive_shaft_diameter_in: number;

  /** Tail shaft diameter in inches (input or calculated) */
  tail_shaft_diameter_in: number;
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
  pulley_face_extra_v_guided_in: 0.5,
  pulley_face_extra_crowned_in: 2.0,
};

export const DEFAULT_INPUT_VALUES = {
  conveyor_incline_deg: 0,
  drop_height_in: 0,
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

  // Features & Options defaults
  bottom_covers: false,
  side_rails: SideRails.None,
  end_guards: EndGuards.None,
  finger_safe: false,
  lacing_style: LacingStyle.Endless,
  side_skirts: false,
  sensor_options: [],

  // Application / Demand defaults
  pulley_surface_type: PulleySurfaceType.Plain,
  start_stop_application: false,
  direction_mode: DirectionMode.OneDirection,
  side_loading_direction: SideLoadingDirection.None,

  // Specifications defaults
  drive_location: DriveLocation.Head,
  brake_motor: false,
  gearmotor_orientation: GearmotorOrientation.SideMount,
  drive_hand: DriveHand.RightHand,

  // Belt tracking & pulley defaults
  belt_tracking_method: BeltTrackingMethod.Crowned,
  shaft_diameter_mode: ShaftDiameterMode.Calculated,
};
