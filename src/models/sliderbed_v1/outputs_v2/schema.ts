/**
 * Outputs v2 Schema - Vendor-Ready Packets
 *
 * v2.2 - Phase 1 Implementation
 *
 * This schema defines the outputs_v2 contract that runs in parallel with outputs_v1.
 * Key features:
 * - Normalized components[] with vendor_packet blocks
 * - Support system with conditional TOB
 * - Export-ready formats (JSON, CSV, copy blocks)
 * - Warning rules for design/quote/vendor impacts
 */

// =============================================================================
// CANONICAL COMPONENT IDS (Stable - do not change)
// =============================================================================

export type CanonicalComponentId =
  | 'belt_primary'
  | 'pulley_drive'
  | 'pulley_tail'
  | 'pulley_snub_drive'
  | 'pulley_snub_tail'
  | 'pulley_takeup'
  | 'roller_gravity'
  | 'roller_return'
  | 'drive_primary'
  | 'support_legs'
  | 'support_casters';

// =============================================================================
// OUTPUT MESSAGE (Warnings/Errors/Info)
// =============================================================================

export type OutputImpact = 'design' | 'quote' | 'vendor';

export interface OutputMessageV2 {
  severity: 'info' | 'warning' | 'error';
  code: string;
  message: string;
  recommendation: string | null;
  impacts: OutputImpact[];
  related_component_ids: CanonicalComponentId[];
}

// =============================================================================
// META
// =============================================================================

export interface OutputsV2Meta {
  schema_version: string;
  min_compatible_version: string;
  generated_at_iso: string;
  source_model_version: string;
  output_contracts_generated: string[];
}

// =============================================================================
// SUMMARY
// =============================================================================

export interface SummaryV2 {
  conveyor_id: string | null;
  conveyor_type: 'sliderbed' | string;
  duty: 'continuous' | 'intermittent' | 'surge' | string | null;
  environment_tags: string[];
  belt_speed_fpm: number | null;
  /** Actual belt speed from selected gearmotor (v1.38) */
  actual_belt_speed_fpm?: number | null;
  /** Actual belt speed delta percentage vs desired (v1.38) */
  actual_belt_speed_delta_pct?: number | null;
  center_distance_in: number | null;
  overall_length_in: number | null;
  incline_deg: number | null;
}

// =============================================================================
// SUPPORT SYSTEM
// =============================================================================

export type SupportType = 'floor_legs' | 'casters' | 'external' | 'suspended';
export type TobRelevance = 'required' | 'reference_only' | 'not_applicable';

export interface SupportSystemV2 {
  support_type: SupportType;
  is_floor_supported: boolean;
  tob_relevance: TobRelevance;
  has_legs: boolean;
  has_casters: boolean;
  notes: string | null;
}

// =============================================================================
// CALC RESULTS
// =============================================================================

export interface CalcResultsV2 {
  effective_tension_lbf: number | null;
  tight_side_tension_lbf: number | null;
  slack_side_tension_lbf: number | null;
  required_torque_inlb: number | null;
  required_power_hp: number | null;
  service_factor: number | null;
  drive_rpm: number | null;
  wrap_angle_deg: number | null;
}

// =============================================================================
// DESIGN GEOMETRY
// =============================================================================

export interface TobValueV2 {
  value: number | null;
  applicable: boolean;
  reference_only: boolean;
  note: string | null;
}

export interface FrameHeightValueV2 {
  value: number | null;
  reference_only: boolean;
  note: string | null;
}

export interface PulleyLocationV2 {
  component_id: CanonicalComponentId;
  station_in: number | null;
}

export interface RollerSpacingV2 {
  carry: number | null;
  return: number | null;
}

export interface DesignGeometryV2 {
  top_of_belt_in: TobValueV2;
  frame_height_in: FrameHeightValueV2;
  pulley_locations: PulleyLocationV2[];
  roller_spacing_in: RollerSpacingV2;
}

// =============================================================================
// COMPONENT (Normalized)
// =============================================================================

export type ComponentType = 'belt' | 'pulley' | 'roller' | 'drive' | 'support' | 'accessory' | string;

export interface ComponentSelectionV2 {
  overrides: Record<string, boolean>;
}

export interface ComponentValidationV2 {
  status: 'ok' | 'warning' | 'error';
  messages: OutputMessageV2[];
  assumptions: string[];
}

/** Union of all vendor packet types */
export type VendorPacketV2 =
  | VendorPacketBeltV2
  | VendorPacketPulleyV2
  | VendorPacketRollerV2
  | VendorPacketDriveV2
  | VendorPacketLegsV2
  | VendorPacketCastersV2;

export interface ComponentV2 {
  component_id: CanonicalComponentId;
  component_type: ComponentType;
  role: string;
  spec: Record<string, unknown>;
  selection: ComponentSelectionV2;
  validation: ComponentValidationV2;
  vendor_packet: VendorPacketV2 | null;
}

// =============================================================================
// VENDOR PACKETS - BELT
// =============================================================================

export interface BeltTrackingV2 {
  type: 'v_guide' | 'crowned_pulley' | 'edge_sensor' | 'none' | string;
  note: string | null;
}

export interface BeltVGuideV2 {
  included: boolean;
  profile: string | null;
  location: 'centered' | 'offset' | string | null;
  bond_type: 'hot-weld' | 'cold-bond' | string | null;
}

export interface BeltCleatsV2 {
  included: boolean;
  profile: string | null;
  height_in: number | null;
  spacing_in: number | null;
  orientation: string | null;
}

export interface BeltOperatingConditionsV2 {
  speed_fpm: number | null;
  load_type: 'parts' | 'bulk' | string | null;
  environment_tags: string[];
}

export interface VendorPacketBeltV2 {
  qty: number;
  belt_style: string;
  belt_width_in: number | null;
  overall_length_in: number | null;
  endless: boolean;
  splice_type: 'endless' | 'finger' | 'clipper' | 'laced' | string;
  material: string | null;
  series: string | null;
  plies: number | null;
  total_thickness_in: number | null;
  tracking: BeltTrackingV2;
  v_guide: BeltVGuideV2;
  cleats: BeltCleatsV2;
  minimum_pulley_diameter_in: number | null;
  operating_conditions: BeltOperatingConditionsV2;
  notes: string | null;
}

// =============================================================================
// VENDOR PACKETS - PULLEY
// =============================================================================

export interface PulleyLaggingV2 {
  included: boolean;
  type: string | null;
  thickness_in: number | null;
  coverage: string | null;
}

export interface PulleyCrownV2 {
  type: 'flat' | 'crowned' | string;
  value_in: number | null;
}

export interface PulleyHubV2 {
  type: string | null;
  bore_in: number | null;
  key: string | null;
}

export interface PulleyShaftV2 {
  required_diameter_in: number | null;
  extension_left_in: number | null;
  extension_right_in: number | null;
}

export interface PulleyLoadsV2 {
  belt_tension_lbf: number | null;
  torque_inlb: number | null;
}

export interface VendorPacketPulleyV2 {
  qty: number;
  pulley_role: 'drive' | 'tail' | 'snub' | 'bend' | 'takeup' | string;
  belt_width_in: number | null;
  face_length_in: number | null;
  diameter_in: number | null;
  surface_finish: 'bare' | 'lagged' | 'ceramic' | string | null;
  balance: 'static' | 'dynamic' | 'not_required' | string | null;
  lagging: PulleyLaggingV2;
  crown: PulleyCrownV2;
  hub: PulleyHubV2;
  shaft: PulleyShaftV2;
  bearing_centers_in: number | null;
  loads: PulleyLoadsV2;
  weight_lbs: number | null;
  notes: string | null;
}

// =============================================================================
// VENDOR PACKETS - ROLLER
// =============================================================================

export interface RollerTubeV2 {
  material: 'steel' | 'stainless' | 'aluminum' | 'pvc' | string | null;
  gauge: number | null;
}

export interface RollerAxleV2 {
  type: string | null;
  diameter_in: number | null;
}

export interface RollerBearingV2 {
  type: string | null;
  seal: string | null;
}

export interface VendorPacketRollerV2 {
  qty: number;
  roller_role: 'gravity' | 'return' | 'snub' | string;
  roller_diameter_in: number | null;
  roller_face_in: number | null;
  tube: RollerTubeV2;
  axle: RollerAxleV2;
  bearing: RollerBearingV2;
  required_load_lbf: number | null;
  load_rating_lbf: number | null;
  spacing_in: number | null;
  notes: string | null;
}

// =============================================================================
// VENDOR PACKETS - DRIVE
// =============================================================================

export interface DriveElectricalV2 {
  volts: number | null;
  phase: number | null;
  hz: number | null;
}

export interface DriveBrakeV2 {
  required: boolean;
  type: 'spring_set' | 'electric_release' | 'none' | string | null;
}

export interface DriveOutputShaftV2 {
  diameter_in: number | null;
  key: string | null;
}

export interface VendorPacketDriveV2 {
  required_output_rpm: number | null;
  required_output_torque_inlb: number | null;
  required_power_hp: number | null;
  service_factor_target: number | null;
  electrical: DriveElectricalV2;
  enclosure: string | null;
  thermal_protection: string | null;
  brake: DriveBrakeV2;
  duty: string | null;
  environment_tags: string[];
  mounting: string | null;
  frame_size: string | null;
  output_shaft: DriveOutputShaftV2;
  notes: string | null;
}

// =============================================================================
// VENDOR PACKETS - SUPPORTS
// =============================================================================

export interface LegHeightRangeV2 {
  min: number | null;
  max: number | null;
}

export interface VendorPacketLegsV2 {
  qty: number | null;
  height_adjustment_range_in: LegHeightRangeV2;
  foot_type: 'leveling_pad' | 'caster_mount' | string | null;
  material: string | null;
  load_rating_lbf_each: number | null;
  notes: string | null;
}

export interface VendorPacketCastersV2 {
  qty: number | null;
  wheel_diameter_in: number | null;
  load_rating_lbf_each: number | null;
  locking: boolean | null;
  notes: string | null;
}

export interface VendorPacketSupportsV2 {
  legs: VendorPacketLegsV2 | null;
  casters: VendorPacketCastersV2 | null;
}

// =============================================================================
// VENDOR PACKET BUNDLE
// =============================================================================

export interface VendorPacketBundleV2 {
  belt: VendorPacketBeltV2 | null;
  pulleys: VendorPacketPulleyV2[];
  rollers: VendorPacketRollerV2[];
  drive: VendorPacketDriveV2 | null;
  supports: VendorPacketSupportsV2;
}

// =============================================================================
// CSV EXPORT
// =============================================================================

export interface CsvRowsV2 {
  columns: string[];
  rows: (string | number)[][];
}

// =============================================================================
// EXPORTS
// =============================================================================

export interface ExportsV2 {
  json_ready: boolean;
  csv_rows: CsvRowsV2;
  vendor_packets: VendorPacketBundleV2;
}

// =============================================================================
// OUTPUTS V2 (TOP-LEVEL)
// =============================================================================

export interface OutputsV2 {
  meta: OutputsV2Meta;
  summary: SummaryV2;
  support_system: SupportSystemV2;
  calc_results: CalcResultsV2;
  components: ComponentV2[];
  design_geometry: DesignGeometryV2;
  warnings_and_notes: OutputMessageV2[];
  exports: ExportsV2;
}

// =============================================================================
// CSV COLUMNS (Stable - append only in future)
// =============================================================================

export const CSV_COLUMNS_V2 = [
  'component_type',
  'role',
  'component_id',
  'qty',
  'width_in',
  'length_in',
  'diameter_in',
  'thickness_in',
  'material',
  'series',
  'type',
  'load_lbf',
  'speed_fpm',
  'actual_speed_fpm', // v1.38: Actual belt speed from selected gearmotor
  'torque_inlb',
  'power_hp',
  'splice_type',
  'bore_in',
  'key',
  'voltage',
  'phase',
  'notes',
  'warnings',
] as const;

export type CsvColumnV2 = (typeof CSV_COLUMNS_V2)[number];

// =============================================================================
// WARNING CODES (For reference)
// =============================================================================

export const WARNING_CODES = {
  BELT_MIN_PULLEY_VIOLATION: 'BELT_MIN_PULLEY_VIOLATION',
  BELT_LENGTH_MISSING: 'BELT_LENGTH_MISSING',
  BELT_TENSION_EXCEEDS_RATING: 'BELT_TENSION_EXCEEDS_RATING',
  TOB_MISSING: 'TOB_MISSING',
  SHAFT_DEFLECTION_HIGH: 'SHAFT_DEFLECTION_HIGH',
  DRIVE_UNDERSIZED: 'DRIVE_UNDERSIZED',
  SNUB_WRAP_INSUFFICIENT: 'SNUB_WRAP_INSUFFICIENT',
  ROLLER_SPACING_EXCESSIVE: 'ROLLER_SPACING_EXCESSIVE',
  CASTER_OVERLOAD: 'CASTER_OVERLOAD',
} as const;

export type WarningCode = (typeof WARNING_CODES)[keyof typeof WARNING_CODES];
