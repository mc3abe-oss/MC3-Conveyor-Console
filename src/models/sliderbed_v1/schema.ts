/**
 * SLIDERBED CONVEYOR v1.40 - TYPE DEFINITIONS
 *
 * Source of Truth: Model v1 Specification (Authoritative)
 * Model Key: sliderbed_conveyor_v1
 * Excel Parity: Required
 *
 * This file defines the complete type system for inputs, parameters, and outputs.
 * All units are explicit. No hidden conversions.
 *
 * CHANGELOG:
 * v1.40 (2026-01-02): Floor Support Logic - Decouple TOB from Legs/Casters
 *                     SupportMethod now External | FloorSupported (binary)
 *                     New fields: include_legs, include_casters (additive checkboxes)
 *                     TOB shown/required when FloorSupported (independent of hardware)
 *                     Legs and Casters can both be enabled simultaneously
 * v1.37 (2026-01-02): Shaft Step-Down Specification
 *                     New inputs: drive_shaft_stepdown_to_dia_in, drive_shaft_stepdown_left_len_in,
 *                                 drive_shaft_stepdown_right_len_in, tail_shaft_stepdown_*
 *                     Pass-through to outputs for BOM/drawing downstream
 * v1.32 (2026-01-01): Material to Be Conveyed UI Polish + Bulk Feed Behavior
 *                     New FeedBehavior enum (CONTINUOUS | INTERMITTENT | SURGE)
 *                     New inputs: feed_behavior, surge_multiplier, surge_duration_sec
 *                     Bulk density now always visible (required for Volume, optional for Weight)
 *                     UI refinements: softer headers, dominant material form toggle
 * v1.31 (2026-01-01): Product Definition UI Refactor
 *                     New inputs: smallest_lump_size_in, largest_lump_size_in (replaces max_lump_size_in),
 *                     application_notes, material_notes
 *                     Consolidated Material Definition UI (single section)
 *                     Deprecated: max_lump_size_in (use largest_lump_size_in)
 * v1.30 (2026-01-01): PCI Hub Connection Selection (Pages 12-14)
 *                     New inputs: drive_pulley_hub_connection_type, drive_pulley_bushing_system,
 *                     tail_pulley_hub_connection_type, tail_pulley_bushing_system
 *                     New pciHubConnections.ts module with hub types and bushing systems
 * v1.29 (2026-01-01): Product Definition vNext - PARTS vs BULK material support
 *                     New MaterialForm enum (PARTS | BULK)
 *                     New BulkInputMethod enum (WEIGHT_FLOW | VOLUME_FLOW)
 *                     New DensitySource enum (KNOWN | ASSUMED_CLASS)
 *                     New BULK inputs: bulk_input_method, mass_flow_lbs_per_hr,
 *                     volume_flow_ft3_per_hr, density_lbs_per_ft3, density_source, max_lump_size_in
 *                     New outputs: mass_flow_lbs_per_hr (canonical), assumptions, risk_flags
 *                     Deprecated: throughput_units_per_hr (orphaned, never consumed)
 * v1.27 (2025-12-30): PCI Pulley Guide integration - tube stress checks
 *                     New inputs: hub_centers_in, drive_tube_od_in, drive_tube_wall_in,
 *                     tail_tube_od_in, tail_tube_wall_in, enforce_pci_checks
 *                     New outputs: drive_pulley_resultant_load_lbf, tail_pulley_resultant_load_lbf,
 *                     drive_T1_lbf, drive_T2_lbf, pci_drive_tube_stress_psi, pci_tail_tube_stress_psi,
 *                     pci_tube_stress_limit_psi, pci_tube_stress_status, pci_hub_centers_estimated
 * v1.23 (2025-12-30): Cleats catalog integration (cleat_catalog, cleat_center_factors tables)
 *                     New inputs: cleats_mode, cleat_profile, cleat_size, cleat_pattern,
 *                     cleat_centers_in, cleat_style, cleat_material_family
 *                     New outputs: cleats_base_min_pulley_diameter_12in_in, cleats_centers_factor,
 *                     cleats_min_pulley_diameter_in, cleats_rule_source, cleats_drill_siped_caution,
 *                     required_min_pulley_diameter_in
 * v1.22 (2025-12-30): V-Guides catalog integration (v_guide_key references v_guides table)
 * v1.21 (2025-12-30): Draft saves and calculation status tracking
 * v1.15 (2025-12-26): Pulley Catalog integration (head_pulley_catalog_key, tail_pulley_catalog_key)
 * v1.14 (2025-12-26): Conveyor Frame inputs (construction type, gauge, channel, pulley-to-frame gap)
 * v1.13 (2025-12-26): Belt tracking recommendation system (crowned/hybrid/v-guided)
 * v1.12 (2025-12-25): Von Mises-based shaft diameter calculation, belt_width_in rename
 * v1.11 (2025-12-24): Belt minimum pulley diameter outputs and validation
 * v1.10 (2025-12-24): Geometry mode - L_ANGLE, H_ANGLE, H_TOB modes; horizontal_run_in field
 * v1.9 (2025-12-24): Environment factors multi-select
 * v1.8 (2025-12-23): Ambient temperature class enum
 * v1.7 (2025-12-22): Gearmotor mounting style + sprocket chain ratio stage
 * v1.6 (2025-12-22): Speed mode - Belt Speed + Motor RPM as primary inputs
 * v1.5 (2025-12-21): Frame height modes, snub roller requirements, cost flags
 * v1.4 (2025-12-21): Per-end support types, derived legs_required, height model (TOB)
 * v1.3 (2025-12-21): Split pulley diameter into drive/tail, add presets, add belt cleats
 * v1.2 (2025-12-19): Make key parameters power-user editable (safety_factor, belt coeffs, base pull)
 * v1.1 (2025-12-19): Fix open-belt wrap length: use πD not 2πD
 * v1.0 (2024-12-19): Initial implementation
 */

// ============================================================================
// v1.13: TRACKING RECOMMENDATION TYPES (re-exported from shared module)
// ============================================================================

export {
  ApplicationClass,
  BeltConstruction,
  TrackingPreference,
  TrackingMode,
  LwBand,
  DisturbanceSeverity,
  type TrackingRecommendationInput,
  type TrackingRecommendationOutput,
  TRACKING_MODE_LABELS,
  TRACKING_MODE_SHORT_LABELS,
  APPLICATION_CLASS_LABELS,
  BELT_CONSTRUCTION_LABELS,
  TRACKING_PREFERENCE_LABELS,
  LW_BAND_LABELS,
  DISTURBANCE_SEVERITY_LABELS,
} from '../../lib/tracking';

// Note: BedType is defined in belt_conveyor_v1/schema.ts
// We use the string literal 'slider_bed' directly in buildDefaultInputs()
// to avoid circular dependency (belt_conveyor_v1 imports from this file)

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

// ============================================================================
// v1.29: MATERIAL FORM & BULK HANDLING ENUMS
// ============================================================================

/**
 * Material form selector (v1.29)
 * Determines whether product is discrete parts or bulk material.
 * - PARTS: Discrete items with individual dimensions and weights
 * - BULK: Continuous material specified by flow rate
 */
export enum MaterialForm {
  Parts = 'PARTS',
  Bulk = 'BULK',
}

/**
 * Bulk input method (v1.29)
 * Determines how bulk material flow is specified.
 * Required when material_form = BULK.
 */
export enum BulkInputMethod {
  /** User provides mass flow in lbs/hr directly */
  WeightFlow = 'WEIGHT_FLOW',
  /** User provides volume flow in ft³/hr + density */
  VolumeFlow = 'VOLUME_FLOW',
}

/**
 * Density source (v1.29)
 * Indicates whether density value is known or assumed.
 * Required when bulk_input_method = VOLUME_FLOW.
 */
export enum DensitySource {
  /** Density value is known/measured */
  Known = 'KNOWN',
  /** Density value is assumed from material class (triggers warning) */
  AssumedClass = 'ASSUMED_CLASS',
}

/**
 * Feed behavior (v1.32)
 * Describes how material is fed to the conveyor.
 * Only applicable when material_form = BULK.
 */
export enum FeedBehavior {
  /** Steady, continuous feed at average rate */
  Continuous = 'CONTINUOUS',
  /** Periodic/batch feed with gaps */
  Intermittent = 'INTERMITTENT',
  /** Sudden peaks above average (requires surge multiplier) */
  Surge = 'SURGE',
}

/**
 * Display labels for FeedBehavior enum values
 */
export const FEED_BEHAVIOR_LABELS: Record<FeedBehavior, string> = {
  [FeedBehavior.Continuous]: 'Continuous',
  [FeedBehavior.Intermittent]: 'Intermittent',
  [FeedBehavior.Surge]: 'Surge',
};

/**
 * Display labels for MaterialForm enum values
 */
export const MATERIAL_FORM_LABELS: Record<MaterialForm, string> = {
  [MaterialForm.Parts]: 'Parts (discrete items)',
  [MaterialForm.Bulk]: 'Bulk (continuous material)',
};

/**
 * Display labels for BulkInputMethod enum values
 */
export const BULK_INPUT_METHOD_LABELS: Record<BulkInputMethod, string> = {
  [BulkInputMethod.WeightFlow]: 'Weight flow (lbs/hr)',
  [BulkInputMethod.VolumeFlow]: 'Volume flow (ft³/hr)',
};

/**
 * Display labels for DensitySource enum values
 */
export const DENSITY_SOURCE_LABELS: Record<DensitySource, string> = {
  [DensitySource.Known]: 'Known / Measured',
  [DensitySource.AssumedClass]: 'Assumed from material class',
};

/**
 * Risk flag structure for BULK mode (v1.29)
 * Used to surface assumptions and potential issues to the user.
 */
export interface RiskFlag {
  /** Unique identifier for the risk */
  code: string;
  /** Severity level */
  level: 'info' | 'warning' | 'error';
  /** Human-readable message */
  message: string;
  /** Field this risk is associated with (optional) */
  field?: string;
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

/**
 * @deprecated Use AmbientTemperatureClass instead.
 * Kept for backward compatibility during migration.
 */
export enum AmbientTemperature {
  Normal = 'Normal (60-90°F)',
  Cold = 'Cold (<60°F)',
  Hot = 'Hot (>90°F)',
}

/**
 * Ambient Temperature Class (v1.8)
 * Classification-based dropdown with no gaps in temperature ranges.
 * Ambient temperature is informational only in v1.
 * Future versions may apply warnings or derating.
 */
export enum AmbientTemperatureClass {
  VeryCold = 'very_cold',
  Cold = 'cold',
  Normal = 'normal',
  Hot = 'hot',
  VeryHot = 'very_hot',
}

/**
 * Display labels for AmbientTemperatureClass enum values
 */
export const AMBIENT_TEMPERATURE_CLASS_LABELS: Record<AmbientTemperatureClass, string> = {
  [AmbientTemperatureClass.VeryCold]: 'Very Cold (Below 32°F)',
  [AmbientTemperatureClass.Cold]: 'Cold (32–60°F)',
  [AmbientTemperatureClass.Normal]: 'Normal (60–90°F)',
  [AmbientTemperatureClass.Hot]: 'Hot (90–120°F)',
  [AmbientTemperatureClass.VeryHot]: 'Very Hot (Above 120°F)',
};

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

// ============================================================================
// GEARMOTOR MOUNTING STYLE (v1.7)
// ============================================================================

/**
 * Gearmotor mounting style (v1.7)
 * Determines how the gearmotor connects to the drive shaft.
 * - shaft_mounted: Direct coupling, no chain/sprocket (chain_ratio = 1)
 * - bottom_mount: Chain-coupled via sprockets (requires sprocket config)
 */
export enum GearmotorMountingStyle {
  /** Direct shaft-mounted gearmotor (no chain) */
  ShaftMounted = 'shaft_mounted',
  /** Bottom mount with chain drive (requires sprocket configuration) */
  BottomMount = 'bottom_mount',
}

export enum DriveHand {
  RightHand = 'Right-hand (RH)',
  LeftHand = 'Left-hand (LH)',
}

// ============================================================================
// SPEED MODE ENUM (v1.6)
// ============================================================================

/**
 * Speed mode (v1.6)
 * Determines which speed parameter is the primary input.
 */
export enum SpeedMode {
  /** User specifies Belt Speed (FPM), system calculates Drive RPM */
  BeltSpeed = 'belt_speed',
  /** User specifies Drive RPM, system calculates Belt Speed */
  DriveRpm = 'drive_rpm',
}

// ============================================================================
// GEOMETRY MODE ENUM (v1.10)
// ============================================================================

/**
 * Geometry input mode (v1.10)
 * Determines which geometry parameters are primary inputs vs derived.
 *
 * Definitions:
 * - L_cc: Axis length between pulley centers (conveyor_length_cc_in)
 * - H_cc: Horizontal projection/run (horizontal_run_in)
 * - theta: Incline angle in degrees (conveyor_incline_deg)
 */
export enum GeometryMode {
  /** User specifies L_cc + angle, system derives H_cc */
  LengthAngle = 'L_ANGLE',
  /** User specifies H_cc + angle, system derives L_cc */
  HorizontalAngle = 'H_ANGLE',
  /** User specifies H_cc + both TOBs, system derives angle + L_cc */
  HorizontalTob = 'H_TOB',
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
// v1.4: SUPPORT & HEIGHT ENUMS
// ============================================================================

/**
 * Per-end support type (v1.4)
 * Determines how each end of the conveyor is supported.
 */
export enum EndSupportType {
  /** Suspended, wall-mounted, or framework-supported (no floor contact) */
  External = 'External',
  /** Floor-standing legs */
  Legs = 'Legs',
  /** Floor-rolling casters */
  Casters = 'Casters',
}

/**
 * Unified support method (v1.40)
 * Single selector for conveyor support configuration.
 * Answers ONLY: "Does this conveyor sit on the floor?"
 */
export enum SupportMethod {
  /** Suspended, wall-mounted, or framework-supported (no floor contact) */
  External = 'external',
  /** Floor supported - conveyor sits on the floor (requires TOB) */
  FloorSupported = 'floor_supported',
  /** @deprecated Use FloorSupported + include_legs instead */
  Legs = 'legs',
  /** @deprecated Use FloorSupported + include_casters instead */
  Casters = 'casters',
}

/**
 * Check if conveyor is floor supported (v1.40)
 * Used for TOB visibility and validation.
 */
export function isFloorSupported(supportMethod?: SupportMethod | string): boolean {
  return (
    supportMethod === SupportMethod.FloorSupported ||
    supportMethod === 'floor_supported' ||
    // Legacy support
    supportMethod === SupportMethod.Legs ||
    supportMethod === 'legs' ||
    supportMethod === SupportMethod.Casters ||
    supportMethod === 'casters'
  );
}

/**
 * @deprecated Use isFloorSupported() instead
 * Check if legs are required based on support method (v1.39)
 */
export function isLegsRequired(supportMethod?: SupportMethod | string): boolean {
  return supportMethod === SupportMethod.Legs || supportMethod === 'legs';
}

/**
 * @deprecated Use isFloorSupported() instead
 * Check if casters are being used based on support method (v1.39)
 */
export function isCastersSelected(supportMethod?: SupportMethod | string): boolean {
  return supportMethod === SupportMethod.Casters || supportMethod === 'casters';
}

/**
 * Height input mode (v1.4)
 * Determines how TOB (Top of Belt) heights are specified.
 */
export enum HeightInputMode {
  /** Mode A: User provides reference TOB + angle, system calculates opposite */
  ReferenceAndAngle = 'reference_and_angle',
  /** Mode B: User provides both TOBs, system calculates implied angle */
  BothEnds = 'both_ends',
}

/**
 * Reference end for height input (v1.4)
 * Only used in ReferenceAndAngle mode.
 */
export type HeightReferenceEnd = 'tail' | 'drive';

/**
 * Validation mode (v1.4)
 * Controls strictness of validation.
 */
export type ValidationMode = 'draft' | 'commit';

// ============================================================================
// v1.5: FRAME HEIGHT ENUMS
// ============================================================================

/**
 * Frame height mode (v1.5, updated v1.36)
 * Determines how frame height is specified.
 * Note: Both Standard and Low Profile use the same explicit frame_clearance_in input.
 */
export enum FrameHeightMode {
  /** Standard frame height: uses gravity return rollers (no snub rollers required) */
  Standard = 'Standard',
  /** Low profile frame height: uses snub rollers (snub rollers typically required) */
  LowProfile = 'Low Profile',
  /** Custom frame height: user-specified reference value */
  Custom = 'Custom',
}

// ============================================================================
// v1.29: RETURN SUPPORT CONFIGURATION
// ============================================================================

/**
 * Return frame style (v1.29)
 * Determines the frame style for the belt return path.
 * This is an explicit user selection, NOT derived from frame height.
 */
export enum ReturnFrameStyle {
  /** Standard frame - adequate clearance, no snub rollers needed */
  Standard = 'STANDARD',
  /** Low profile frame - reduced clearance, typically uses snub rollers */
  LowProfile = 'LOW_PROFILE',
}

/**
 * Return snub mode (v1.29)
 * Determines whether snub rollers are used on the return path.
 */
export enum ReturnSnubMode {
  /** Auto: Standard → No snubs, Low Profile → Yes snubs */
  Auto = 'AUTO',
  /** Force snub rollers enabled */
  Yes = 'YES',
  /** Force snub rollers disabled (advanced) */
  No = 'NO',
}

/**
 * Display labels for ReturnFrameStyle
 */
export const RETURN_FRAME_STYLE_LABELS: Record<ReturnFrameStyle, string> = {
  [ReturnFrameStyle.Standard]: 'Standard',
  [ReturnFrameStyle.LowProfile]: 'Low Profile',
};

/**
 * Display labels for ReturnSnubMode
 */
export const RETURN_SNUB_MODE_LABELS: Record<ReturnSnubMode, string> = {
  [ReturnSnubMode.Auto]: 'Auto',
  [ReturnSnubMode.Yes]: 'Yes',
  [ReturnSnubMode.No]: 'No (Advanced)',
};

// ============================================================================
// v1.14: CONVEYOR FRAME CONSTRUCTION ENUMS
// ============================================================================

/**
 * Frame construction type (v1.14)
 * Determines frame side material and thickness derivation method.
 */
export type FrameConstructionType = 'sheet_metal' | 'structural_channel' | 'special';

/**
 * Sheet metal gauge (v1.14)
 * Standard gauges for sheet metal frame construction.
 * Thickness is derived from gauge via lookup table.
 */
export type SheetMetalGauge = '10_GA' | '12_GA' | '14_GA' | '16_GA' | '18_GA';

/**
 * Structural channel series (v1.14)
 * Standard C-channel and MC-channel series for structural frame construction.
 * Thickness is derived from series via lookup table.
 */
export type StructuralChannelSeries = 'C3' | 'C4' | 'C5' | 'C6' | 'MC6' | 'MC8';

/**
 * Display labels for FrameConstructionType
 */
export const FRAME_CONSTRUCTION_TYPE_LABELS: Record<FrameConstructionType, string> = {
  sheet_metal: 'Sheet Metal',
  structural_channel: 'Structural Channel',
  special: 'Special',
};

/**
 * Display labels for SheetMetalGauge
 * Format: "{gauge} ga" for dropdown display
 */
export const SHEET_METAL_GAUGE_LABELS: Record<SheetMetalGauge, string> = {
  '10_GA': '10 ga',
  '12_GA': '12 ga',
  '14_GA': '14 ga',
  '16_GA': '16 ga',
  '18_GA': '18 ga',
};

/**
 * Display labels for StructuralChannelSeries
 */
export const STRUCTURAL_CHANNEL_SERIES_LABELS: Record<StructuralChannelSeries, string> = {
  C3: 'C3 (3" depth)',
  C4: 'C4 (4" depth)',
  C5: 'C5 (5" depth)',
  C6: 'C6 (6" depth)',
  MC6: 'MC6 (6" depth)',
  MC8: 'MC8 (8" depth)',
};

// ============================================================================
// PULLEY PRESETS
// ============================================================================

/** Common pulley diameter presets in inches */
export const PULLEY_DIAMETER_PRESETS = [3, 4, 5, 6, 8, 10] as const;
export type PulleyDiameterPreset = typeof PULLEY_DIAMETER_PRESETS[number] | 'custom';

// ============================================================================
// INPUTS SCHEMA
// ============================================================================

export interface SliderbedInputs {
  // BED TYPE (for belt_conveyor_v1 compatibility)
  /** Bed type - determines support method under belt (slider_bed or roller_bed) */
  bed_type?: string;

  // =========================================================================
  // GEOMETRY & LAYOUT (v1.10)
  // =========================================================================

  /**
   * Geometry input mode (v1.10)
   * Determines which geometry parameters are primary inputs.
   * Default: 'L_ANGLE' (Length + Angle mode)
   */
  geometry_mode?: GeometryMode;

  /**
   * Conveyor Length (C-C) in inches - axis length between pulley centers (L_cc)
   * In L_ANGLE mode: user input
   * In H_ANGLE/H_TOB modes: derived from horizontal_run_in and angle
   */
  conveyor_length_cc_in: number;

  /**
   * Horizontal run in inches (H_cc) - horizontal projection of conveyor
   * In L_ANGLE mode: derived from conveyor_length_cc_in and angle
   * In H_ANGLE/H_TOB modes: user input
   */
  horizontal_run_in?: number;

  /** Belt Width in inches (active belt surface width) */
  belt_width_in: number;

  /**
   * @deprecated Use belt_width_in instead.
   * Legacy field - kept for backward compatibility.
   * If present and belt_width_in is missing, this value is used.
   */
  conveyor_width_in?: number;

  /**
   * Incline Angle in degrees (default: 0)
   * In L_ANGLE/H_ANGLE modes: user input
   * In H_TOB mode: derived from TOB heights and horizontal run
   */
  conveyor_incline_deg?: number;

  /**
   * @deprecated Use drive_pulley_diameter_in and tail_pulley_diameter_in instead.
   * Legacy field - kept for backward compatibility during migration.
   * If present and new fields are missing, this value is used for both pulleys.
   */
  pulley_diameter_in: number;

  // =========================================================================
  // PULLEY DIAMETERS (v1.3)
  // =========================================================================

  /** Drive pulley diameter in inches */
  drive_pulley_diameter_in?: number;

  /** Tail pulley diameter in inches */
  tail_pulley_diameter_in?: number;

  /**
   * @deprecated v1.16: Removed from UI. Kept for backward compatibility with saved configs.
   * Migration shim in migrate.ts handles old configs by setting tail_pulley_diameter_in = drive_pulley_diameter_in
   * when this field is true or undefined.
   */
  tail_matches_drive?: boolean;

  /** Drive pulley preset selection (UI state only) */
  drive_pulley_preset?: PulleyDiameterPreset;

  /** Tail pulley preset selection (UI state only) */
  tail_pulley_preset?: PulleyDiameterPreset;

  // =========================================================================
  // BELT CLEATS (v1.3 legacy + v1.23 catalog-based)
  // =========================================================================

  // --- LEGACY FIELDS (v1.3 - MUST REMAIN, do not rename) ---

  /** Whether belt cleats are enabled */
  cleats_enabled?: boolean;

  /** Cleat height in inches (legacy - retained for backward compat) */
  cleat_height_in?: number;

  /** Cleat center-to-center spacing in inches (legacy - retained for backward compat) */
  cleat_spacing_in?: number;

  /** Cleat edge offset in inches (legacy - retained for backward compat) */
  cleat_edge_offset_in?: number;

  // --- NEW v1.23 CATALOG-BASED FIELDS ---

  /**
   * Cleats mode (v1.23)
   * 'none' | 'cleated' - UI uses this; must stay in sync with cleats_enabled
   * SYNC RULE: cleats_mode='cleated' => cleats_enabled=true
   */
  cleats_mode?: 'none' | 'cleated';

  /**
   * Cleat profile (v1.23)
   * Selected from cleat_catalog.cleat_profile (e.g., 'T-Cleat', 'Straight', 'Scalloped')
   */
  cleat_profile?: string;

  /**
   * Cleat size (v1.23)
   * Selected from cleat_catalog.cleat_size (e.g., '0.5"', '1"', '1.5"', '2"')
   */
  cleat_size?: string;

  /**
   * Cleat pattern (v1.23, expanded v1.29)
   * STRAIGHT_CROSS (default), STAGGERED, CHEVRON, PARTIAL_WIDTH, CUSTOM
   * Note: Pattern selection is informational only; does not affect calculations.
   */
  cleat_pattern?: 'STRAIGHT_CROSS' | 'STAGGERED' | 'CHEVRON' | 'PARTIAL_WIDTH' | 'CUSTOM';

  /**
   * Cleat centers in inches (v1.23)
   * Standard values: 12, 8, 6, 4
   * Default: 12
   */
  cleat_centers_in?: 12 | 8 | 6 | 4;

  /**
   * Cleat style (v1.23)
   * SOLID (default) or DRILL_SIPED_1IN
   */
  cleat_style?: 'SOLID' | 'DRILL_SIPED_1IN';

  /**
   * Cleat material family (v1.23)
   * Locked to PVC_HOT_WELDED for now; future may support others
   */
  cleat_material_family?: string;

  /**
   * Are the cleats notched? (v1.24)
   * Documentation-only intent capture
   */
  cleats_notched?: boolean;

  /**
   * Notch notes - free text description (v1.24)
   * Required when cleats_notched = true
   */
  cleats_notch_notes?: string;

  // --- v1.43: CLEAT SPACING MODE ---

  /**
   * Cleat spacing mode (v1.43)
   * - 'divide_evenly': User specifies cleat count, system calculates pitch
   * - 'use_nominal': User specifies desired centers, system handles remainder
   */
  cleat_spacing_mode?: 'divide_evenly' | 'use_nominal';

  /**
   * Number of cleats (v1.43)
   * Used when cleat_spacing_mode = 'divide_evenly'
   */
  cleat_count?: number;

  /**
   * Remainder handling mode (v1.43)
   * Used when cleat_spacing_mode = 'use_nominal'
   * - 'spread_evenly': Adjust all spacings slightly to eliminate remainder
   * - 'one_odd_gap': Keep nominal spacing, put remainder in one gap
   */
  cleat_remainder_mode?: 'spread_evenly' | 'one_odd_gap';

  /**
   * Odd gap size preference (v1.43)
   * Used when cleat_remainder_mode = 'one_odd_gap'
   * - 'smaller': Odd gap is smaller than nominal
   * - 'larger': Odd gap is larger than nominal
   */
  cleat_odd_gap_size?: 'smaller' | 'larger';

  /**
   * Odd gap location (v1.43)
   * Used when cleat_remainder_mode = 'one_odd_gap'
   * - 'head': Odd gap at head/drive end
   * - 'tail': Odd gap at tail end (default)
   * - 'center': Odd gap in center
   */
  cleat_odd_gap_location?: 'head' | 'tail' | 'center';

  // SPEED & THROUGHPUT
  /** Belt Speed in FPM (feet per minute) */
  belt_speed_fpm: number;

  /**
   * @deprecated v1.29: Orphaned field - never consumed by formulas or rules.
   * Kept for schema stability. Ignored at runtime.
   * Use required_throughput_pph for PARTS mode throughput requirements.
   */
  throughput_units_per_hr?: number;

  // =========================================================================
  // v1.29: MATERIAL FORM & BULK INPUTS
  // =========================================================================

  /**
   * Material form selector (v1.29)
   * Determines whether product is discrete parts or bulk material.
   * Default: PARTS (preserves existing behavior)
   */
  material_form?: MaterialForm | string;

  /**
   * Bulk input method (v1.29)
   * Required when material_form = BULK.
   * Determines how bulk material flow is specified.
   */
  bulk_input_method?: BulkInputMethod | string;

  /**
   * Mass flow rate in lbs/hr (v1.29)
   * Required when bulk_input_method = WEIGHT_FLOW.
   * Also used for VOLUME_FLOW after conversion from volume × density.
   */
  mass_flow_lbs_per_hr?: number;

  /**
   * Volume flow rate in ft³/hr (v1.29)
   * Required when bulk_input_method = VOLUME_FLOW.
   */
  volume_flow_ft3_per_hr?: number;

  /**
   * Material density in lbs/ft³ (v1.29)
   * Required when bulk_input_method = VOLUME_FLOW.
   */
  density_lbs_per_ft3?: number;

  /**
   * Density source (v1.29)
   * Required when bulk_input_method = VOLUME_FLOW.
   * ASSUMED_CLASS triggers a warning about density accuracy.
   */
  density_source?: DensitySource | string;

  /**
   * @deprecated v1.31: Use largest_lump_size_in instead.
   * Maximum lump/piece size in inches (v1.29)
   * Kept for backward compatibility during migration.
   */
  max_lump_size_in?: number;

  /**
   * Smallest lump/piece size in inches (v1.31)
   * Optional - for rules/warnings only.
   * Must be <= largest_lump_size_in if both are provided.
   */
  smallest_lump_size_in?: number;

  /**
   * Largest lump/piece size in inches (v1.31)
   * Optional - for rules/warnings only (e.g., lump vs belt width).
   * Replaces max_lump_size_in. Migration: max_lump_size_in → largest_lump_size_in.
   */
  largest_lump_size_in?: number;

  /**
   * Feed behavior (v1.32)
   * Describes how material is fed to the conveyor.
   * Only applicable when material_form = BULK.
   * Default: CONTINUOUS
   */
  feed_behavior?: FeedBehavior | string;

  /**
   * Surge multiplier (v1.32)
   * Peak flow divided by average flow.
   * Only applicable when feed_behavior = SURGE.
   * Default: 1.5
   * Validation: must be >= 1.0
   */
  surge_multiplier?: number;

  /**
   * Surge duration in seconds (v1.32)
   * Duration of surge event.
   * Optional, informational only (no calc impact in v1.32).
   * Only applicable when feed_behavior = SURGE.
   */
  surge_duration_sec?: number;

  // PRODUCT / PART (PARTS mode only)
  // v1.48: Made optional - new applications don't have defaults, user must enter
  /** Part Weight in lbs */
  part_weight_lbs?: number;

  /** Part Length in inches */
  part_length_in?: number;

  /** Part Width in inches */
  part_width_in?: number;

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

  // =========================================================================
  // SPEED INPUTS (v1.6)
  // =========================================================================

  /**
   * Speed mode (v1.6)
   * Determines which speed parameter is the primary input.
   * - 'belt_speed': User specifies Belt Speed, system calculates Drive RPM
   * - 'drive_rpm': User specifies Drive RPM, system calculates Belt Speed
   * Default: 'belt_speed'
   */
  speed_mode?: SpeedMode | string;

  /**
   * @deprecated Use belt_speed_fpm as the primary input when speed_mode = 'belt_speed'.
   * Drive RPM (current drive shaft speed) - legacy field, now secondary.
   * When speed_mode = 'belt_speed', this is calculated from belt_speed_fpm.
   * When speed_mode = 'drive_rpm', this is the user input (via drive_rpm_input).
   */
  drive_rpm: number;

  /**
   * Drive RPM input (v1.6)
   * Only used when speed_mode = 'drive_rpm'.
   * This is the user-entered value when in drive_rpm mode.
   */
  drive_rpm_input?: number;

  // THROUGHPUT INPUTS
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
  /**
   * Environment Factors (v1.9 - Multi-select)
   * Array of environment factor keys from catalog.
   * Must contain at least one value.
   */
  environment_factors: string[];

  /**
   * @deprecated Use ambient_temperature_class instead.
   * Kept for backward compatibility during migration.
   */
  ambient_temperature: AmbientTemperature | string;

  /**
   * Ambient Temperature Class (v1.8)
   * Classification-based dropdown with no gaps in temperature ranges.
   * Ambient temperature is informational only in v1.
   * Future versions may apply warnings or derating.
   */
  ambient_temperature_class?: AmbientTemperatureClass | string;

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

  /**
   * @deprecated Use tail_support_type and drive_support_type instead.
   * Legacy field - kept for backward compatibility during migration.
   */
  support_option?: SupportOption | string;

  // =========================================================================
  // v1.39: UNIFIED SUPPORT METHOD & MODEL SELECTION
  // =========================================================================

  /**
   * Unified support method (v1.40)
   * Single selector: 'external' | 'floor_supported'
   * Answers ONLY: "Does this conveyor sit on the floor?"
   * Default: 'external'
   */
  support_method?: SupportMethod | string;

  /**
   * Include legs in floor support configuration (v1.40)
   * Only applicable when support_method='floor_supported'
   * Can be combined with include_casters (both true simultaneously)
   */
  include_legs?: boolean;

  /**
   * Include casters in floor support configuration (v1.40)
   * Only applicable when support_method='floor_supported'
   * Can be combined with include_legs (both true simultaneously)
   */
  include_casters?: boolean;

  /**
   * Leg model key (v1.39)
   * Reference to catalog_items.item_key where catalog_key='leg_model'
   * Required when include_legs=true
   */
  leg_model_key?: string;

  /**
   * Caster rigid model key (v1.39)
   * Reference to catalog_items.item_key where catalog_key='caster_model'
   * Required when caster_rigid_qty > 0
   */
  caster_rigid_model_key?: string;

  /**
   * Caster rigid quantity (v1.39)
   * Number of rigid (non-swivel) casters
   * Used when support_method='casters'
   */
  caster_rigid_qty?: number;

  /**
   * Caster swivel model key (v1.39)
   * Reference to catalog_items.item_key where catalog_key='caster_model'
   * Required when caster_swivel_qty > 0
   */
  caster_swivel_model_key?: string;

  /**
   * Caster swivel quantity (v1.39)
   * Number of swivel casters
   * Used when support_method='casters'
   */
  caster_swivel_qty?: number;

  // =========================================================================
  // v1.4: HEIGHT MODEL (TOP OF BELT)
  // Used by floor-supported conveyors and H_TOB geometry mode
  // =========================================================================

  /** Reference end for TOB input (which end user specifies TOB for) */
  reference_end?: HeightReferenceEnd;

  /** Top of Belt height at tail end in inches */
  tail_tob_in?: number;

  /** Top of Belt height at drive end in inches */
  drive_tob_in?: number;

  /** Leg adjustment range in inches (default: ±2") */
  adjustment_required_in?: number;

  // =========================================================================
  // v1.5: FRAME HEIGHT (updated v1.36)
  // =========================================================================

  /** Frame height mode (Standard, Low Profile, Custom) */
  frame_height_mode?: FrameHeightMode | string;

  /** Custom frame height in inches (required if frame_height_mode = Custom) */
  custom_frame_height_in?: number;

  /**
   * Frame clearance in inches (v1.36)
   * Explicit user-editable clearance added to required frame height.
   * Used in BOTH Standard and Low Profile modes.
   * Default: 0.50", Range: 0.00" – 3.00", Step: 0.125"
   */
  frame_clearance_in?: number;

  // =========================================================================
  // v1.29: RETURN SUPPORT CONFIGURATION
  // =========================================================================

  /**
   * Return frame style (v1.29)
   * Explicit user selection for frame style on return path.
   * Default: STANDARD
   */
  return_frame_style?: ReturnFrameStyle | string;

  /**
   * Return snub mode (v1.29)
   * Controls whether snub rollers are used.
   * Auto: Standard → No, Low Profile → Yes
   * Default: AUTO
   */
  return_snub_mode?: ReturnSnubMode | string;

  /**
   * Number of gravity return rollers (v1.29)
   * User-specified count. Minimum 2.
   * Default: computed from span / 60"
   */
  return_gravity_roller_count?: number;

  /**
   * Gravity roller diameter in inches (v1.29)
   * Standard return roller diameter.
   * Default: 1.9"
   */
  return_gravity_roller_diameter_in?: number;

  /**
   * Snub roller diameter in inches (v1.29)
   * Only relevant when snubs are enabled.
   * Default: 2.5"
   */
  return_snub_roller_diameter_in?: number;

  /**
   * End offset per end in inches (v1.29)
   * Distance from pulley center to first return roller center.
   * When snubs are enabled, this defines the snub zone at each end.
   * Default: 24"
   */
  return_end_offset_in?: number;

  // =========================================================================
  // v1.14: CONVEYOR FRAME CONSTRUCTION
  // =========================================================================

  /**
   * Frame construction type (v1.14)
   * Determines frame side material and thickness derivation method.
   * Default: 'sheet_metal'
   */
  frame_construction_type?: FrameConstructionType;

  /**
   * Sheet metal gauge (v1.14)
   * Required when frame_construction_type = 'sheet_metal'.
   * Thickness derived from gauge via lookup table.
   */
  frame_sheet_metal_gauge?: SheetMetalGauge;

  /**
   * Structural channel series (v1.14)
   * Required when frame_construction_type = 'structural_channel'.
   * Thickness derived from series via lookup table.
   */
  frame_structural_channel_series?: StructuralChannelSeries;

  /**
   * Pulley end to frame inside distance in inches (v1.14)
   * Distance from end of pulley face to inside of frame side.
   * Used for between-frame (BF) calculations in future versions.
   * Default: 0.5"
   */
  pulley_end_to_frame_inside_in?: number;

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

  // =========================================================================
  // GEARMOTOR MOUNTING STYLE & SPROCKETS (v1.7)
  // =========================================================================

  /**
   * Gearmotor mounting style (v1.7)
   * - 'shaft_mounted': Direct coupling (chain_ratio = 1)
   * - 'bottom_mount': Chain-coupled via sprockets
   * Default: 'shaft_mounted'
   */
  gearmotor_mounting_style?: GearmotorMountingStyle | string;

  /**
   * Gearmotor sprocket teeth (driver) (v1.7)
   * Required when gearmotor_mounting_style = 'bottom_mount'.
   * This is the sprocket on the gearmotor output shaft.
   */
  gm_sprocket_teeth?: number;

  /**
   * Drive shaft sprocket teeth (driven) (v1.7)
   * Required when gearmotor_mounting_style = 'bottom_mount'.
   * This is the sprocket on the conveyor drive shaft.
   */
  drive_shaft_sprocket_teeth?: number;

  /**
   * Actual gearmotor source (v1.38)
   * Indicates how the actual gearmotor values were obtained:
   * - 'nord_catalogue': Selected from NORD Drive Selector
   * - 'manual': User entered values manually
   * Null when no gearmotor is configured.
   */
  actual_gearmotor_source?: 'nord_catalogue' | 'manual' | null;

  /**
   * Actual gearmotor output RPM (v1.38)
   * Populated when user selects a NORD gearmotor from the Drive Selector
   * OR enters a manual value.
   * Used to compute actual_belt_speed_fpm in outputs.
   * Null when no gearmotor is selected.
   */
  actual_gearmotor_output_rpm?: number | null;

  /**
   * Actual gearmotor output torque in inch-lbf (v1.38)
   * Optional - used for comparison with required torque.
   * Can be populated from NORD selection or manual entry.
   */
  actual_gearmotor_output_torque_inlbf?: number | null;

  /**
   * Actual gearmotor service factor (v1.38)
   * Optional - used for verification against required service factor.
   * Can be populated from NORD selection or manual entry.
   */
  actual_gearmotor_service_factor?: number | null;

  /** Drive hand (RH/LH) - when facing discharge end */
  drive_hand: DriveHand | string;

  // =========================================================================
  // BELT TRACKING & PULLEY
  // =========================================================================

  /** Belt tracking method */
  belt_tracking_method: BeltTrackingMethod | string;

  /** V-guide profile - required if belt_tracking_method = V-guided */
  v_guide_profile?: VGuideProfile | string;

  /**
   * V-Guide key (v1.22) - references v_guides catalog
   * Canonical key using EU designation (O, A, B, C)
   * When set, this takes precedence over v_guide_profile
   */
  v_guide_key?: string;

  /** Shaft diameter mode */
  shaft_diameter_mode: ShaftDiameterMode | string;

  /** Drive shaft diameter in inches - required if shaft_diameter_mode = Manual */
  drive_shaft_diameter_in?: number;

  /** Tail shaft diameter in inches - required if shaft_diameter_mode = Manual */
  tail_shaft_diameter_in?: number;

  // =========================================================================
  // v1.37: SHAFT STEP-DOWN SPECIFICATION
  // =========================================================================

  /** Drive shaft step-down to diameter in inches */
  drive_shaft_stepdown_to_dia_in?: number;

  /** Drive shaft step-down left length in inches */
  drive_shaft_stepdown_left_len_in?: number;

  /** Drive shaft step-down right length in inches */
  drive_shaft_stepdown_right_len_in?: number;

  /** Tail shaft step-down to diameter in inches */
  tail_shaft_stepdown_to_dia_in?: number;

  /** Tail shaft step-down left length in inches */
  tail_shaft_stepdown_left_len_in?: number;

  /** Tail shaft step-down right length in inches */
  tail_shaft_stepdown_right_len_in?: number;

  // =========================================================================
  // BELT SELECTION
  // =========================================================================

  /** Belt catalog key - references belt_catalog table */
  belt_catalog_key?: string;

  // =========================================================================
  // v1.15: PULLEY SELECTION
  // =========================================================================

  /**
   * Head/Drive pulley catalog key (v1.15)
   * References pulley_catalog table.
   * Selected pulley must be compatible with head_drive station.
   */
  head_pulley_catalog_key?: string;

  /**
   * Tail pulley catalog key (v1.15)
   * References pulley_catalog table.
   * Selected pulley must be compatible with tail station.
   * INTERNAL_BEARINGS pulleys can ONLY be used here.
   */
  tail_pulley_catalog_key?: string;

  /**
   * Drive pulley manual override (v1.17)
   * When true, use drive_pulley_diameter_in instead of catalog diameter.
   * When false (default), diameter comes from head_pulley_catalog_key.
   */
  drive_pulley_manual_override?: boolean;

  /**
   * Tail pulley manual override (v1.17)
   * When true, use tail_pulley_diameter_in instead of catalog diameter.
   * When false (default), diameter comes from tail_pulley_catalog_key.
   */
  tail_pulley_manual_override?: boolean;

  // =========================================================================
  // v1.24: PULLEY FAMILY/VARIANT SELECTION
  // =========================================================================

  /**
   * Drive pulley variant key (v1.24)
   * References pulley_variants table. Takes precedence over head_pulley_catalog_key.
   * When set, finished_od_in is derived from variant (or family shell_od_in).
   */
  drive_pulley_variant_key?: string;

  /**
   * Tail pulley variant key (v1.24)
   * References pulley_variants table. Takes precedence over tail_pulley_catalog_key.
   * When set, finished_od_in is derived from variant (or family shell_od_in).
   */
  tail_pulley_variant_key?: string;

  /** Belt PIW from catalog (populated when belt is selected) */
  belt_piw?: number;

  /** Belt PIL from catalog (populated when belt is selected) */
  belt_pil?: number;

  /** Belt PIW override - user-specified value that overrides catalog value */
  belt_piw_override?: number;

  /** Belt PIL override - user-specified value that overrides catalog value */
  belt_pil_override?: number;

  /** Minimum pulley diameter for selected belt (without V-guide) */
  belt_min_pulley_dia_no_vguide_in?: number;

  /** Minimum pulley diameter for selected belt (with V-guide) */
  belt_min_pulley_dia_with_vguide_in?: number;

  /**
   * Cleat attachment method for the selected belt (v1.11 Phase 4)
   * Populated from belt.material_profile.cleat_method when belt is selected.
   * - "hot_welded": Requires min pulley diameter multiplier based on cleat spacing
   * - "molded" | "mechanical": No multiplier required
   */
  belt_cleat_method?: 'hot_welded' | 'molded' | 'mechanical';

  // =========================================================================
  // v1.26: BELT FAMILY & V-GUIDE MIN PULLEY
  // =========================================================================

  /**
   * Belt family (v1.27)
   * Populated from belt catalog when belt is selected.
   * Determines which V-guide min pulley values to use.
   * FLEECE: No V-guide rules defined - triggers warning for V-guide lookups.
   */
  belt_family?: 'PVC' | 'PU' | 'FLEECE';

  /**
   * V-guide min pulley diameter for solid belt - PVC (v1.26)
   * Populated from v_guides catalog when V-guide is selected.
   */
  vguide_min_pulley_dia_solid_in?: number;

  /**
   * V-guide min pulley diameter for notched belt - PVC (v1.26)
   * Populated from v_guides catalog when V-guide is selected.
   */
  vguide_min_pulley_dia_notched_in?: number;

  /**
   * V-guide min pulley diameter for solid belt - PU (v1.26)
   * Populated from v_guides catalog when V-guide is selected.
   * Null if V-guide doesn't support PU belts.
   */
  vguide_min_pulley_dia_solid_pu_in?: number | null;

  /**
   * V-guide min pulley diameter for notched belt - PU (v1.26)
   * Populated from v_guides catalog when V-guide is selected.
   * Null if V-guide doesn't support PU belts.
   */
  vguide_min_pulley_dia_notched_pu_in?: number | null;

  // =========================================================================
  // v1.13: TRACKING RECOMMENDATION INPUTS
  // =========================================================================

  /**
   * Application class (v1.13)
   * Affects tracking sensitivity. Bulk handling nudges severity worse.
   * Default: unit_handling
   */
  application_class?: string;

  /**
   * Belt construction type (v1.13)
   * Affects tracking sensitivity. Stiff/profiled belts nudge severity worse.
   * Default: general
   */
  belt_construction?: string;

  /**
   * Reversing operation disturbance (v1.13)
   * Default: false
   */
  reversing_operation?: boolean;

  /**
   * Side loading disturbance (v1.13)
   * Includes: side feed, plows, aggressive transfers, lateral forces
   * Default: false
   */
  disturbance_side_loading?: boolean;

  /**
   * Load variability disturbance (v1.13)
   * Includes: inconsistent placement/weight, uneven loading, shifting
   * Default: false
   */
  disturbance_load_variability?: boolean;

  /**
   * Environment disturbance (v1.13)
   * Includes: dirty/wet/outdoor/temperature swings
   * Default: false
   */
  disturbance_environment?: boolean;

  /**
   * Installation risk disturbance (v1.13)
   * Includes: long frames, site-built, tolerance stack-up, low install control
   * Default: false
   */
  disturbance_installation_risk?: boolean;

  /**
   * User tracking preference (v1.13)
   * If not 'auto', overrides computed recommendation but shows margin note.
   * Default: auto
   */
  tracking_preference?: string;

  // =========================================================================
  // v1.27: PCI TUBE GEOMETRY INPUTS (auto-populated, with override)
  // =========================================================================

  /**
   * Hub center-to-center distance (inches)
   * Distance between hub contact points on the pulley.
   * DEFAULT: belt_width_in (flagged as "estimated")
   * Override: User can provide actual value for accurate check.
   */
  hub_centers_in?: number;

  /**
   * Drive pulley tube OD (inches) - OVERRIDE ONLY
   * AUTO-POPULATED from pulley family/variant shell_od_in if available.
   * Only use this input when variant lacks shell data.
   */
  drive_tube_od_in?: number;

  /**
   * Drive pulley tube wall thickness (inches) - OVERRIDE ONLY
   * AUTO-POPULATED from pulley family/variant shell_wall_in if available.
   */
  drive_tube_wall_in?: number;

  /**
   * Tail pulley tube OD (inches) - OVERRIDE ONLY
   */
  tail_tube_od_in?: number;

  /**
   * Tail pulley tube wall thickness (inches) - OVERRIDE ONLY
   */
  tail_tube_wall_in?: number;

  /**
   * v1.28: Drive pulley face width (inches) - from application_pulleys modal
   * When set, overrides the legacy pulley_face_length_in calculation
   */
  drive_pulley_face_width_in?: number;

  /**
   * v1.28: Tail pulley face width (inches) - from application_pulleys modal
   * Used for display, drive face width governs output
   */
  tail_pulley_face_width_in?: number;

  // =========================================================================
  // v1.30: PCI Hub Connection Configuration (Pages 12-14)
  // =========================================================================

  /**
   * Drive pulley hub connection type (PCI Pages 12-14)
   * Default: WELD_ON_HUB_COMPRESSION_BUSHINGS
   */
  drive_pulley_hub_connection_type?: string;

  /**
   * Drive pulley compression bushing system
   * Only applicable when hub connection requires bushings
   * Default: XT
   */
  drive_pulley_bushing_system?: string;

  /**
   * Tail pulley hub connection type (PCI Pages 12-14)
   * Default: WELD_ON_HUB_COMPRESSION_BUSHINGS
   */
  tail_pulley_hub_connection_type?: string;

  /**
   * Tail pulley compression bushing system
   * Only applicable when hub connection requires bushings
   * Default: XT
   */
  tail_pulley_bushing_system?: string;

  /**
   * Enforce PCI checks as hard errors (default: false)
   * When false: violations are warnings
   * When true: violations are errors that block calculation
   */
  enforce_pci_checks?: boolean;

  // =========================================================================
  // v1.31: APPLICATION & MATERIAL NOTES
  // =========================================================================

  /**
   * Application notes (v1.31)
   * General context and application info.
   * Optional multiline text stored with the configuration.
   */
  application_notes?: string;

  /**
   * Material notes (v1.31)
   * Part/material-specific behavior notes.
   * Optional multiline text stored with the configuration.
   */
  material_notes?: string;
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

  /**
   * Return (gravity) roller diameter allowance for frame height calculation (inches).
   * Default: 2.0". Used in: frame_height = largest_pulley + 2*cleat_height + return_roller.
   */
  return_roller_diameter_in: number;

  // v1.36: Frame clearance parameter (replaces separate Standard/Low Profile clearances)
  /**
   * Default frame clearance in inches (v1.36).
   * Default: 0.50". Added to required frame height for reference frame height.
   * Used in BOTH Standard and Low Profile modes. User can override via input.
   */
  frame_clearance_default_in: number;

  /**
   * Maximum frame height for Low Profile classification (inches).
   * Default: 10.0". Used for warning when required height exceeds Low Profile standard.
   */
  low_profile_max_frame_height_in: number;
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

  /** Belt weight in lbf. Null when no belt is selected (requires belt). */
  belt_weight_lbf: number | null;

  /** Total load (belt + parts) in lbf. Null when no belt is selected (requires belt). */
  total_load_lbf: number | null;

  /** Total belt length in inches */
  total_belt_length_in: number;

  /** Friction pull in lb (friction_coeff * total_load_lb). Null when no belt is selected (requires belt). */
  friction_pull_lb: number | null;

  /** Incline pull in lb (total_load_lb * sin(incline_rad)). Null when no belt is selected (requires belt). */
  incline_pull_lb: number | null;

  /** Starting belt pull in lb */
  starting_belt_pull_lb: number;

  /** Total belt pull in lb (friction_pull + incline_pull + starting_pull). Null when no belt is selected (requires belt). */
  total_belt_pull_lb: number | null;

  /** Legacy calculated belt pull (deprecated, kept for compatibility). Null when no belt is selected (requires belt). */
  belt_pull_calc_lb: number | null;

  /** Belt weight coefficient used (piw). Null when no belt is selected (requires belt). */
  piw_used: number | null;

  /** Belt weight coefficient used (pil). Null when no belt is selected (requires belt). */
  pil_used: number | null;

  /** Belt PIW effective - override if provided, else catalog value, else parameter default */
  belt_piw_effective?: number;

  /** Belt PIL effective - override if provided, else catalog value, else parameter default */
  belt_pil_effective?: number;

  // =========================================================================
  // SPEED OUTPUTS (v1.6)
  // =========================================================================

  /** Speed mode used in calculation */
  speed_mode_used?: SpeedMode | string;

  // =========================================================================
  // v1.29: MATERIAL FORM & BULK OUTPUTS
  // =========================================================================

  /**
   * Material form used in calculation (v1.29)
   * PARTS or BULK
   */
  material_form_used?: MaterialForm | string;

  /**
   * Mass flow rate in lbs/hr (v1.29)
   * Canonical flow output for BULK mode.
   * For PARTS mode: capacity_pph × part_weight_lbs (optional derived output).
   * For BULK mode: input directly (WEIGHT_FLOW) or volume × density (VOLUME_FLOW).
   */
  mass_flow_lbs_per_hr?: number;

  /**
   * Volume flow rate in ft³/hr (v1.29)
   * Echo of input when bulk_input_method = VOLUME_FLOW.
   * Undefined for PARTS mode or WEIGHT_FLOW.
   */
  volume_flow_ft3_per_hr?: number;

  /**
   * Density value used in calculation (v1.29)
   * Only populated when bulk_input_method = VOLUME_FLOW.
   */
  density_lbs_per_ft3_used?: number;

  /**
   * Residence time on belt in minutes (v1.29)
   * time_on_belt_min = conveyor_length_cc_in / (belt_speed_fpm × 12)
   * Used in BULK load calculation.
   */
  time_on_belt_min?: number;

  /**
   * Assumptions made during calculation (v1.29)
   * Human-readable strings describing assumptions.
   * Always present (may be empty array).
   */
  assumptions?: string[];

  /**
   * Risk flags from calculation (v1.29)
   * Structured warnings/info for transparency.
   * Always present (may be empty array).
   */
  risk_flags?: RiskFlag[];

  // THROUGHPUT OUTPUTS (PARTS mode)
  /** Pitch in inches (travel dimension + spacing) */
  pitch_in: number;

  /** Belt speed in FPM (calculated when speed_mode='drive_rpm', input when speed_mode='belt_speed') */
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

  /** Torque on drive shaft in in-lbf (inch-pounds-force). Null when no belt is selected (requires belt). */
  torque_drive_shaft_inlbf: number | null;

  /** Gear ratio (motor RPM / drive shaft RPM) */
  gear_ratio: number;

  // =========================================================================
  // CHAIN RATIO OUTPUTS (v1.7)
  // =========================================================================

  /**
   * Chain ratio (driven_teeth / driver_teeth) (v1.7)
   * = 1 when shaft_mounted, > 1 or < 1 when bottom_mount with sprockets.
   * chain_ratio = drive_shaft_sprocket_teeth / gm_sprocket_teeth
   */
  chain_ratio?: number;

  /**
   * Gearmotor output RPM required (v1.7)
   * = drive_shaft_rpm * chain_ratio
   * This is the RPM the gearmotor output shaft must spin at.
   */
  gearmotor_output_rpm?: number;

  /**
   * Total drive ratio (v1.7)
   * = gear_ratio * chain_ratio
   * The overall ratio from motor to drive shaft.
   */
  total_drive_ratio?: number;

  // =========================================================================
  // SPEED CHAIN OUTPUTS (v1.38)
  // Explicit required vs actual naming for clarity in the speed chain
  // =========================================================================

  /**
   * Required drive shaft RPM (v1.38)
   * = belt_speed_fpm / (PI * pulley_diameter_in / 12)
   * The RPM needed at the drive shaft to achieve the desired belt speed.
   * This is an alias of drive_shaft_rpm for explicit naming.
   */
  required_drive_shaft_rpm?: number;

  /**
   * Required gearmotor output RPM (v1.38)
   * = required_drive_shaft_rpm * chain_ratio
   * The RPM the gearmotor output shaft must spin at to achieve desired belt speed.
   * This is an alias of gearmotor_output_rpm for explicit naming.
   */
  required_gearmotor_output_rpm?: number;

  /**
   * Actual belt speed in FPM (v1.38)
   * Computed from selected gearmotor output RPM, drive ratio, and pulley diameter.
   * Null when no gearmotor is selected (actual_gearmotor_output_rpm is null).
   * Formula: (gearmotor_output_rpm * drive_ratio * PI * pulley_diameter_in) / 12
   * where drive_ratio = gm_sprocket_teeth / drive_shaft_sprocket_teeth (inverse of chain_ratio)
   */
  actual_belt_speed_fpm?: number | null;

  /**
   * Actual belt speed delta percentage (v1.38)
   * = ((actual - desired) / desired) * 100
   * Positive = faster than desired, Negative = slower than desired.
   * Null when actual_belt_speed_fpm is null.
   */
  actual_belt_speed_delta_pct?: number | null;

  /**
   * Actual drive shaft RPM (v1.38)
   * = gearmotor_output_rpm * drive_ratio
   * where drive_ratio = gm_sprocket_teeth / drive_shaft_sprocket_teeth (for bottom mount)
   * or 1.0 for shaft mounted.
   * Null when actual_belt_speed_fpm is null.
   */
  actual_drive_shaft_rpm?: number | null;

  /**
   * Warning code from actual speed calculation (v1.38)
   * Codes:
   *   ACTUAL_GM_RPM_INVALID - gearmotor RPM was 0
   *   PULLEY_DIAMETER_MISSING - pulley diameter not configured
   *   SPROCKET_TEETH_MISSING - sprocket teeth not configured for bottom mount
   *   SPEED_DELTA_HIGH - |actual - desired| > 5% (soft warning, informational)
   * Null when calculation succeeded with no warnings.
   */
  actual_speed_warning_code?: string | null;

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

  /** Pulley face length in inches (belt_width_in + pulley_face_extra_in) */
  pulley_face_length_in: number;

  /** Drive shaft diameter in inches (input or calculated) */
  drive_shaft_diameter_in: number;

  /** Tail shaft diameter in inches (input or calculated) */
  tail_shaft_diameter_in: number;

  // =========================================================================
  // v1.37: SHAFT STEP-DOWN OUTPUTS (pass-through from inputs)
  // =========================================================================

  /** Drive shaft step-down to diameter in inches */
  drive_shaft_stepdown_to_dia_in?: number;

  /** Drive shaft step-down left length in inches */
  drive_shaft_stepdown_left_len_in?: number;

  /** Drive shaft step-down right length in inches */
  drive_shaft_stepdown_right_len_in?: number;

  /** Tail shaft step-down to diameter in inches */
  tail_shaft_stepdown_to_dia_in?: number;

  /** Tail shaft step-down left length in inches */
  tail_shaft_stepdown_left_len_in?: number;

  /** Tail shaft step-down right length in inches */
  tail_shaft_stepdown_right_len_in?: number;

  // PULLEY DIAMETER OUTPUTS (v1.3)
  /** Drive pulley diameter used in inches */
  drive_pulley_diameter_in: number;

  /** Tail pulley diameter used in inches */
  tail_pulley_diameter_in: number;

  // =========================================================================
  // v1.24: PULLEY FAMILY/VARIANT OUTPUTS
  // =========================================================================

  /**
   * Drive pulley shell OD from family (inches)
   * Always the family's shell_od_in. Undefined if no variant selected.
   */
  drive_pulley_shell_od_in?: number;

  /**
   * Tail pulley shell OD from family (inches)
   * Always the family's shell_od_in. Undefined if no variant selected.
   */
  tail_pulley_shell_od_in?: number;

  /**
   * Drive pulley finished OD (inches)
   * Variant's finished_od_in if set, else family's shell_od_in.
   * This is the effective outer diameter after lagging.
   * Undefined if no variant selected.
   */
  drive_pulley_finished_od_in?: number;

  /**
   * Tail pulley finished OD (inches)
   * Variant's finished_od_in if set, else family's shell_od_in.
   * This is the effective outer diameter after lagging.
   * Undefined if no variant selected.
   */
  tail_pulley_finished_od_in?: number;

  // =========================================================================
  // v1.11: BELT MINIMUM PULLEY DIAMETER OUTPUTS
  // =========================================================================

  /**
   * Minimum required drive pulley diameter from belt spec (inches)
   * Based on belt_min_pulley_dia_no_vguide_in or belt_min_pulley_dia_with_vguide_in
   * depending on tracking method. Undefined if no belt selected.
   */
  min_pulley_drive_required_in?: number;

  /**
   * Minimum required tail pulley diameter from belt spec (inches)
   * Same as drive requirement in v1.11. Undefined if no belt selected.
   */
  min_pulley_tail_required_in?: number;

  /**
   * Whether drive pulley meets or exceeds belt minimum requirement
   * Undefined if no belt selected (no requirement to check).
   */
  drive_pulley_meets_minimum?: boolean;

  /**
   * Whether tail pulley meets or exceeds belt minimum requirement
   * Undefined if no belt selected (no requirement to check).
   */
  tail_pulley_meets_minimum?: boolean;

  /**
   * Base minimum pulley diameter before cleat spacing adjustment (inches)
   * This is the belt-specified minimum (from material_profile or legacy columns).
   * Undefined if no belt selected.
   */
  min_pulley_base_in?: number;

  /**
   * Cleat spacing multiplier applied to minimum pulley diameter.
   * Only > 1.0 when cleats are enabled AND belt uses hot_welded cleat method.
   * Based on cleat_spacing_in: 12"=1.0, 8"=1.15, 6"=1.25, 4"=1.35
   * Undefined if not applicable (no cleats or non-hot-welded).
   */
  cleat_spacing_multiplier?: number;

  // CLEAT OUTPUTS (v1.3 spec-only summary + v1.23 catalog-driven)
  /** Whether cleats are enabled */
  cleats_enabled?: boolean;

  /** Cleat specification summary (for display) */
  cleats_summary?: string;

  // =========================================================================
  // v1.23: CLEATS CATALOG-DRIVEN OUTPUTS
  // =========================================================================

  /**
   * Base minimum pulley diameter from cleat catalog at 12" centers (inches)
   * Before applying centers factor. 0/null if cleats disabled.
   */
  cleats_base_min_pulley_diameter_12in_in?: number;

  /**
   * Centers factor applied from cleat_center_factors table
   * e.g., 1.0, 1.15, 1.25, 1.35. 1.0 if cleats disabled.
   */
  cleats_centers_factor?: number;

  /**
   * Final minimum pulley diameter after applying centers factor (inches)
   * Rounded up to nearest 0.5". 0/null if cleats disabled.
   */
  cleats_min_pulley_diameter_in?: number;

  /**
   * Source description for the cleat rule applied
   * e.g., "PVC Hot Welded Guide: T-Cleat 1" STRAIGHT_CROSS @ 6" centers"
   */
  cleats_rule_source?: string;

  /**
   * True if DRILL_SIPED_1IN style is selected (triggers durability caution)
   */
  cleats_drill_siped_caution?: boolean;

  // =========================================================================
  // v1.43: CLEAT WEIGHT & SPACING OUTPUTS
  // =========================================================================

  /**
   * Derived cleat width (inches)
   * Calculated as: belt_width_in - (2 × cleat_edge_offset_in)
   */
  cleat_width_in?: number;

  /**
   * Weight per cleat (lbs)
   * Based on T-cleat geometry: A = 0.25 × (1.5 + cleat_height_in)
   * Volume = A × cleat_width_in; Weight = Volume × 0.045 lb/in³
   */
  cleat_weight_lb_each?: number;

  /**
   * Actual cleat pitch (inches)
   * May differ from desired spacing based on layout mode
   */
  cleat_pitch_in?: number;

  /**
   * Actual cleat count on belt
   */
  cleat_count_actual?: number;

  /**
   * Odd gap size (inches)
   * Only populated when using 'one_odd_gap' remainder mode
   */
  cleat_odd_gap_in?: number;

  /**
   * Added belt weight from cleats (lb/ft)
   * Calculated as: cleat_weight_lb_each × (12 / cleat_pitch_in)
   */
  cleat_weight_lb_per_ft?: number;

  /**
   * Base belt weight without cleats (lb/ft)
   * Preserved for reference when cleats add weight
   */
  belt_weight_lb_per_ft_base?: number;

  /**
   * Effective belt weight with cleats (lb/ft)
   * = belt_weight_lb_per_ft_base + cleat_weight_lb_per_ft
   * When cleats disabled: equals base belt weight
   */
  belt_weight_lb_per_ft_effective?: number;

  /**
   * Human-readable cleat layout summary
   * e.g., "10 cleats at 12.0 in, 1 odd gap = 5.0 in at tail"
   */
  cleat_layout_summary?: string;

  // =========================================================================
  // v1.26: V-GUIDE MIN PULLEY OUTPUTS
  // =========================================================================

  /**
   * Belt family derived from selected belt (v1.27)
   * Determines which V-guide min pulley values are used.
   * FLEECE: No V-guide rules defined - vguide_min_pulley_dia_in will be undefined.
   */
  belt_family_used?: 'PVC' | 'PU' | 'FLEECE';

  /**
   * V-guide min pulley diameter requirement (inches) (v1.26)
   * Selected based on belt_family:
   * - PU: vguide_min_pulley_dia_solid_pu_in or vguide_min_pulley_dia_notched_pu_in
   * - PVC: vguide_min_pulley_dia_solid_in or vguide_min_pulley_dia_notched_in
   * Undefined if no V-guide selected or if tracking is not V-guided.
   */
  vguide_min_pulley_dia_in?: number;

  /**
   * True if V-guide PU data is missing but PU belt is selected (v1.26)
   * Triggers error: "Selected V-guide does not support PU belts"
   */
  vguide_pu_data_missing?: boolean;

  /**
   * Aggregate required minimum pulley diameter (inches)
   * max(belt_min, vguide_min, cleats_min) - the final constraint
   */
  required_min_pulley_diameter_in?: number;

  // =========================================================================
  // v1.5: FRAME HEIGHT & SNUB ROLLER OUTPUTS (v1.33: cleat/pulley awareness, v1.34: required vs reference)
  // =========================================================================

  /**
   * Largest pulley diameter (inches).
   * max(drive_pulley_diameter_in, tail_pulley_diameter_in)
   * @deprecated Use largest_pulley_od_in for new code
   */
  largest_pulley_diameter_in?: number;

  /**
   * Largest pulley OD (inches) - v1.34.
   * max(drive_pulley_finished_od_in, tail_pulley_finished_od_in)
   * Uses actual configured pulley OD from application_pulleys.
   */
  largest_pulley_od_in?: number;

  /**
   * Effective cleat height used in frame height calc (inches).
   * 0 if cleats disabled, otherwise parsed from cleat_size.
   */
  effective_cleat_height_in?: number;

  /**
   * Required frame height (inches) - v1.34.
   * Physical envelope: largest_pulley_od + (2 * cleat_height) + return_roller_allowance.
   * Always calculated, regardless of frame standard selection.
   */
  required_frame_height_in?: number;

  /**
   * Reference frame height (inches) - v1.34.
   * For quoting/reference: required_frame_height + clearance_for_selected_standard.
   * Based on selected Frame Standard (Low Profile, Standard, Custom).
   */
  reference_frame_height_in?: number;

  /**
   * Clearance added to required height for selected frame standard (inches) - v1.34.
   * Low Profile: 0.5", Standard: 2.5", Custom: user-specified.
   */
  clearance_for_selected_standard_in?: number;

  /** Effective frame height in inches (calculated from mode or custom value) */
  effective_frame_height_in?: number;

  /**
   * Frame height calculation breakdown (v1.33, v1.34: updated with required/reference).
   * Shows: largest_pulley + 2*cleat_height + return_roller = required; required + clearance = reference
   */
  frame_height_breakdown?: {
    largest_pulley_in: number;
    cleat_height_in: number;
    cleat_adder_in: number; // 2 * cleat_height_in
    return_roller_in: number;
    total_in: number; // Legacy: same as required_total_in
    required_total_in: number; // v1.34: Required frame height
    clearance_in: number; // v1.34: Clearance for selected standard
    reference_total_in: number; // v1.34: Reference frame height
    formula: string; // Human-readable formula string
  };

  /** Whether snub rollers are required (frame height < drive pulley diameter) */
  requires_snub_rollers?: boolean;

  // COST FLAGS (v1.5)
  /** Low profile frame (frame_height_mode = Low Profile) */
  cost_flag_low_profile?: boolean;

  /** Custom frame (frame_height_mode = Custom) */
  cost_flag_custom_frame?: boolean;

  /** Snub rollers required (additional cost) */
  cost_flag_snub_rollers?: boolean;

  /** Design review required (frame height < 4.0") */
  cost_flag_design_review?: boolean;

  // ROLLER QUANTITIES (v1.5)
  /** Number of gravity return rollers */
  gravity_roller_quantity?: number;

  /** Spacing between gravity return rollers (inches) */
  gravity_roller_spacing_in?: number;

  /** Number of snub rollers (0 if not required, typically 2 if required) */
  snub_roller_quantity?: number;

  // =========================================================================
  // v1.29: RETURN SUPPORT OUTPUTS
  // =========================================================================

  /**
   * Whether snub rollers are enabled (v1.29)
   * Derived from return_frame_style + return_snub_mode.
   * Auto mode: Standard → false, Low Profile → true
   */
  return_snubs_enabled?: boolean;

  /**
   * Span to support in inches (v1.29)
   * The return path length that gravity rollers must cover.
   * With snubs: reduced by snub zones at each end.
   * Without snubs: full return run length.
   */
  return_span_in?: number;

  /**
   * Number of gravity return rollers (v1.29)
   * User-specified or computed from return span.
   */
  return_gravity_roller_count?: number;

  /**
   * Computed gravity roller centers in inches (v1.29)
   * Formula: span / (roller_count - 1)
   */
  return_gravity_roller_centers_in?: number;

  /**
   * Gravity return roller diameter in inches (v1.29)
   * Default: 1.9"
   */
  return_gravity_roller_diameter_in?: number;

  /**
   * Snub roller diameter in inches (v1.29)
   * Only present when return_snubs_enabled is true.
   * Default: 2.5"
   */
  return_snub_roller_diameter_in?: number;

  /**
   * Return frame style (v1.29)
   * Echo of input for display purposes.
   */
  return_frame_style?: ReturnFrameStyle;

  /**
   * Return snub mode (v1.29)
   * Echo of input for display purposes.
   */
  return_snub_mode?: ReturnSnubMode;

  /**
   * End offset per end in inches (v1.29)
   * Echo of input for display purposes.
   */
  return_end_offset_in?: number;

  // =========================================================================
  // v1.14: CONVEYOR FRAME CONSTRUCTION OUTPUTS
  // =========================================================================

  /**
   * Frame construction type (echo of input) (v1.14)
   */
  frame_construction_type?: FrameConstructionType;

  /**
   * Frame side thickness in inches (v1.14)
   * Derived from gauge (sheet_metal) or channel series (structural_channel).
   * Null for 'special' construction type.
   */
  frame_side_thickness_in?: number | null;

  /**
   * Pulley end to frame inside distance (echo of input) (v1.14)
   * Used for downstream BF calculations.
   */
  pulley_end_to_frame_inside_out_in?: number;

  // =========================================================================
  // v1.13: TRACKING RECOMMENDATION OUTPUTS
  // =========================================================================

  /** L/W ratio (rounded to 0.1) */
  tracking_lw_ratio?: number;

  /** L/W band classification (low, medium, high) */
  tracking_lw_band?: string;

  /** Count of disturbance factors */
  tracking_disturbance_count?: number;

  /** Raw severity before modifiers (minimal, moderate, significant) */
  tracking_disturbance_severity_raw?: string;

  /** Modified severity after belt/application modifiers */
  tracking_disturbance_severity_modified?: string;

  /** Recommended tracking mode (crowned, hybrid, v_guided) */
  tracking_mode_recommended?: string;

  /** Short recommendation note (for "with note" cases or override conflicts) */
  tracking_recommendation_note?: string | null;

  /** 1-2 sentence rationale */
  tracking_recommendation_rationale?: string;

  // =========================================================================
  // v1.27: PCI PULLEY LOAD OUTPUTS (wired from shaftCalc, no new math)
  // =========================================================================

  /**
   * Resultant load on drive pulley (lbf)
   * Vector sum of T1 + T2 belt tensions.
   * Source: shaftCalc.radial_load_lbf
   * Equivalent to PCI "F" for tube stress calculations.
   */
  drive_pulley_resultant_load_lbf?: number;

  /**
   * Resultant load on tail pulley (lbf)
   * Source: shaftCalc.radial_load_lbf (tail calculation)
   */
  tail_pulley_resultant_load_lbf?: number;

  /**
   * Tight side belt tension at drive pulley (lbf)
   * Source: shaftCalc.T1_lbf
   */
  drive_T1_lbf?: number;

  /**
   * Slack side belt tension at drive pulley (lbf)
   * Source: shaftCalc.T2_lbf
   */
  drive_T2_lbf?: number;

  // =========================================================================
  // v1.27: PCI TUBE STRESS OUTPUTS (new calculation)
  // =========================================================================

  /**
   * Drive pulley tube stress (psi)
   * PCI Formula: σ = 8(OD)(F)(H) / (π(OD⁴ - ID⁴))
   * Undefined if tube geometry not provided.
   */
  pci_drive_tube_stress_psi?: number;

  /**
   * Tail pulley tube stress (psi)
   */
  pci_tail_tube_stress_psi?: number;

  /**
   * Tube stress limit applied (psi)
   * 10,000 for drum pulleys, 3,400 for V-groove pulleys
   */
  pci_tube_stress_limit_psi?: number;

  /**
   * PCI tube stress check status
   * - "pass": stress ≤ limit (all geometry provided)
   * - "estimated": stress ≤ limit but hub_centers was defaulted
   * - "warn": stress > limit (default mode)
   * - "fail": stress > limit (enforce mode)
   * - "incomplete": missing tube geometry inputs
   * - "error": invalid geometry (ID≤0 or OD⁴-ID⁴≤0)
   */
  pci_tube_stress_status?: 'pass' | 'estimated' | 'warn' | 'fail' | 'incomplete' | 'error';

  /**
   * PCI tube stress error message (when status is 'error')
   */
  pci_tube_stress_error_message?: string;

  /**
   * Whether hub_centers_in was estimated (defaulted to belt_width_in)
   */
  pci_hub_centers_estimated?: boolean;
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
  model_key: 'belt_conveyor_v1';
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
  return_roller_diameter_in: 2.0,
  // v1.36: Frame clearance parameter (single value for both modes)
  frame_clearance_default_in: 0.5,
  low_profile_max_frame_height_in: 10.0,
};

export const DEFAULT_INPUT_VALUES = {
  // Geometry defaults (v1.10)
  geometry_mode: GeometryMode.LengthAngle,
  conveyor_incline_deg: 0,
  // horizontal_run_in is derived in L_ANGLE mode, not set by default

  // Material form: NO DEFAULT (v1.48)
  // New applications must explicitly select PARTS or BULK before calculation.
  // Legacy configs default to PARTS via migrate.ts.

  drop_height_in: 0,
  part_spacing_in: 0,
  throughput_margin_pct: 0,
  orientation: Orientation.Lengthwise,

  // Application defaults
  material_type: MaterialType.Steel,
  process_type: ProcessType.Assembly,
  parts_sharp: PartsSharp.No,
  environment_factors: [], // v1.9: Multi-select array, empty by default
  ambient_temperature: AmbientTemperature.Normal, // Deprecated, kept for backward compatibility
  ambient_temperature_class: AmbientTemperatureClass.Normal,
  power_feed: PowerFeed.V480_3Ph,
  controls_package: ControlsPackage.StartStop,
  spec_source: SpecSource.Standard,
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

  // Gearmotor mounting style defaults (v1.7)
  gearmotor_mounting_style: GearmotorMountingStyle.ShaftMounted,
  gm_sprocket_teeth: 18,
  drive_shaft_sprocket_teeth: 24,

  // Belt tracking & pulley defaults
  belt_tracking_method: BeltTrackingMethod.Crowned,
  shaft_diameter_mode: ShaftDiameterMode.Calculated,

  // Belt selection defaults (no belt selected by default)
  belt_catalog_key: undefined,

  // Pulley diameter defaults (v1.3, v1.16: tail_matches_drive removed)
  drive_pulley_preset: 4 as PulleyDiameterPreset, // 4" is common default
  tail_pulley_preset: 4 as PulleyDiameterPreset,

  // Pulley manual override defaults (v1.17)
  drive_pulley_manual_override: false,
  tail_pulley_manual_override: false,

  // Cleat defaults (v1.3)
  cleats_enabled: false,

  // Height model defaults (v1.4)
  // Note: height_input_mode, reference_end, tail_tob_in, drive_tob_in, adjustment_required_in
  // are intentionally NOT listed here because they must NOT exist when legs_required=false

  // Frame height defaults (v1.5, updated v1.36)
  frame_height_mode: FrameHeightMode.Standard,
  frame_clearance_in: 0.5, // v1.36: explicit clearance, default 0.50" for both Standard and Low Profile

  // Return support defaults (v1.29)
  return_frame_style: ReturnFrameStyle.Standard,
  return_snub_mode: ReturnSnubMode.Auto,
  return_gravity_roller_diameter_in: 1.9,
  return_snub_roller_diameter_in: 2.5,
  return_end_offset_in: 24,

  // Conveyor frame construction defaults (v1.14)
  frame_construction_type: 'sheet_metal' as FrameConstructionType,
  frame_sheet_metal_gauge: '12_GA' as SheetMetalGauge,
  pulley_end_to_frame_inside_in: 0.5,

  // Speed mode defaults (v1.6)
  speed_mode: SpeedMode.BeltSpeed,
  // Note: belt_speed_fpm and motor_rpm are required inputs, not listed here
  // drive_rpm_input only used in drive_rpm mode, defaults to 100 RPM
  drive_rpm_input: 100,

  // Tracking recommendation defaults (v1.13)
  application_class: 'unit_handling',
  belt_construction: 'general',
  reversing_operation: false,
  disturbance_side_loading: false,
  disturbance_load_variability: false,
  disturbance_environment: false,
  disturbance_installation_risk: false,
  tracking_preference: 'auto',
};

/**
 * Build factory-default inputs for a new application.
 *
 * This is the single source of truth for initial form state.
 * Used by:
 * - CalculatorForm initial state
 * - handleClear to fully reset the application
 *
 * Includes all required fields with sensible defaults for a typical sliderbed conveyor.
 */
export function buildDefaultInputs(): SliderbedInputs {
  return {
    // Bed type - determines friction coefficient preset
    // Using string literal to avoid circular import with belt_conveyor_v1/schema
    bed_type: 'slider_bed' as any,

    // Geometry (required numeric inputs)
    conveyor_length_cc_in: 120,
    belt_width_in: 24,
    conveyor_incline_deg: 0,
    geometry_mode: GeometryMode.LengthAngle,

    // Pulley diameter (legacy field for backward compatibility)
    pulley_diameter_in: 4,

    // Speed & RPM
    belt_speed_fpm: 104.72, // Calculated from drive_rpm=100 * (PI * 4/12)
    drive_rpm: 100,
    speed_mode: SpeedMode.BeltSpeed,
    drive_rpm_input: 100,

    // Product / Material definition (v1.48)
    // material_form: NOT SET - new applications must explicitly select PARTS or BULK
    // part_weight_lbs, part_length_in, part_width_in: NOT SET - user must enter
    // These are only set after material_form is selected
    drop_height_in: 0,
    part_temperature_class: 'AMBIENT',
    fluid_type: 'NONE',
    orientation: Orientation.Lengthwise,
    part_spacing_in: 0, // Changed from 6 to 0 - user must set explicitly
    throughput_margin_pct: 0,

    // Application fields - catalog item_keys
    material_type: 'PARTS',
    process_type: 'MOLDING',
    parts_sharp: 'No',
    environment_factors: ['Indoor'],
    ambient_temperature: 'Normal (60-90°F)', // Deprecated - kept for backward compatibility
    ambient_temperature_class: AmbientTemperatureClass.Normal,
    power_feed: 'AC_480_3_60',
    controls_package: 'NOT_SUPPLIED',
    spec_source: 'MC3_STD',
    support_option: 'FLOOR_MOUNTED',
    field_wiring_required: 'No',
    bearing_grade: 'STANDARD',
    documentation_package: 'BASIC',
    finish_paint_system: 'POWDER_COAT',
    labels_required: 'Yes',
    send_to_estimating: 'No',
    motor_brand: 'STANDARD',

    // Features & Options
    bottom_covers: false,
    side_rails: SideRails.None,
    end_guards: EndGuards.None,
    finger_safe: false,
    lacing_style: LacingStyle.Endless,
    side_skirts: false,
    sensor_options: [],

    // Application / Demand (extended)
    pulley_surface_type: PulleySurfaceType.Plain,
    start_stop_application: false,
    direction_mode: DirectionMode.OneDirection,
    side_loading_direction: SideLoadingDirection.None,

    // Drive specifications
    drive_location: DriveLocation.Head,
    brake_motor: false,
    gearmotor_orientation: GearmotorOrientation.SideMount,
    drive_hand: DriveHand.RightHand,

    // Gearmotor mounting style & sprockets (v1.7)
    gearmotor_mounting_style: GearmotorMountingStyle.ShaftMounted,
    gm_sprocket_teeth: 18,
    drive_shaft_sprocket_teeth: 24,

    // Belt tracking & pulley
    belt_tracking_method: BeltTrackingMethod.Crowned,
    shaft_diameter_mode: ShaftDiameterMode.Calculated,

    // Frame height (v1.5, updated v1.36)
    frame_height_mode: FrameHeightMode.Standard,
    frame_clearance_in: 0.5, // v1.36: explicit clearance

    // Unified support method (v1.39)
    support_method: SupportMethod.External,
    // leg_model_key: undefined (only set when support_method='legs')
    // caster_rigid_model_key: undefined (only set when support_method='casters')
    // caster_rigid_qty: undefined
    // caster_swivel_model_key: undefined
    // caster_swivel_qty: undefined

    // Return support (v1.29)
    return_frame_style: ReturnFrameStyle.Standard,
    return_snub_mode: ReturnSnubMode.Auto,
    return_gravity_roller_diameter_in: 1.9,
    return_snub_roller_diameter_in: 2.5,
    return_end_offset_in: 24,

    // Conveyor frame construction (v1.14)
    frame_construction_type: 'sheet_metal' as FrameConstructionType,
    frame_sheet_metal_gauge: '12_GA' as SheetMetalGauge,
    pulley_end_to_frame_inside_in: 0.5,

    // Tracking recommendation (v1.13)
    application_class: 'unit_handling',
    belt_construction: 'general',
    reversing_operation: false,
    disturbance_side_loading: false,
    disturbance_load_variability: false,
    disturbance_environment: false,
    disturbance_installation_risk: false,
    tracking_preference: 'auto',

    // Cleat defaults (v1.3) - cleats disabled by default
    cleats_enabled: false,

    // Pulley presets (v1.3)
    drive_pulley_preset: 4,
    tail_pulley_preset: 4,
    drive_pulley_manual_override: false,
    tail_pulley_manual_override: false,
  } as SliderbedInputs;
}

// ============================================================================
// v1.9: ENVIRONMENT FACTORS HELPERS
// ============================================================================

/**
 * Legacy environment factor keys to remove from inputs.
 * These are stripped on load and never included in saved configurations.
 */
export const ENVIRONMENT_FACTOR_BLOCKLIST = new Set([
  'indoor',
  'Indoor',
  'indoors',
  'Indoors',
  'indoor_inactive',
  'Indoor_Inactive',
]);

/**
 * Normalize environment_factors to array format (v1.9)
 *
 * Handles backward compatibility for old configs that stored a single string.
 * Automatically strips blocked/legacy keys like "Indoor".
 *
 * Rules:
 * - array → filter blocked keys, dedupe, sort
 * - string (not blocked) → [string]
 * - null/undefined/other/blocked → []
 *
 * @param value - The raw environment_factors value from inputs
 * @returns Normalized string array, deduplicated and sorted
 */
export function normalizeEnvironmentFactors(value: unknown): string[] {
  if (Array.isArray(value)) {
    // Filter to valid strings, remove blocked keys, dedupe, sort
    const validStrings = value.filter(
      (v): v is string =>
        typeof v === 'string' &&
        v.trim() !== '' &&
        !ENVIRONMENT_FACTOR_BLOCKLIST.has(v)
    );
    return Array.from(new Set(validStrings)).sort();
  }

  if (typeof value === 'string' && value.trim() !== '') {
    // Single string - check if blocked
    if (ENVIRONMENT_FACTOR_BLOCKLIST.has(value)) {
      return [];
    }
    return [value];
  }

  return [];
}

/**
 * Prepare environment_factors for save (dedupe + sort, remove blocked)
 *
 * @param factors - Array of environment factor keys
 * @returns Deduplicated, sorted array with blocked keys removed
 */
export function prepareEnvironmentFactorsForSave(factors: string[]): string[] {
  if (!Array.isArray(factors)) {
    return [];
  }
  // Filter out blocked keys, dedupe, sort
  const valid = factors.filter(
    (f) => typeof f === 'string' && f.trim() !== '' && !ENVIRONMENT_FACTOR_BLOCKLIST.has(f)
  );
  return Array.from(new Set(valid)).sort();
}
