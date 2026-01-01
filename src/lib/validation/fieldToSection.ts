/**
 * fieldToSection.ts - Maps ValidationError.field to UI section/tab keys
 *
 * This mapping enables post-calc validation errors from rules.ts to be
 * displayed inline in the relevant Configure tab sections via SectionIssuesBanner.
 *
 * IMPORTANT: Keep this mapping in sync with:
 * - rules.ts ValidationError field names
 * - useConfigureIssues.ts section/tab keys
 * - Tab component accordion section IDs
 */

// Types duplicated from useConfigureIssues.ts to avoid cross-boundary imports
// Keep in sync with useConfigureIssues.ts types

export type ConfigureTabKey = 'application' | 'physical' | 'drive' | 'build';

export type ApplicationSectionKey = 'product' | 'throughput' | 'environment';
export type PhysicalSectionKey = 'geometry' | 'beltPulleys' | 'frame';
export type DriveSectionKey = 'speed' | 'electrical' | 'drive' | 'advanced';
export type BuildSectionKey = 'guards' | 'guides' | 'beltpulley' | 'sensors' | 'documentation';

export type SectionKey = ApplicationSectionKey | PhysicalSectionKey | DriveSectionKey | BuildSectionKey;

/**
 * Field to section mapping entry
 */
export interface FieldMapping {
  tabKey: ConfigureTabKey;
  sectionKey: SectionKey;
}

/**
 * Maps ValidationError.field values to their corresponding tab and section keys.
 *
 * Fields from rules.ts that generate ValidationErrors:
 * - Frame height: frame_height_mode, custom_frame_height_in
 * - Cleats: cleats_mode, cleat_profile, cleat_size, cleat_pattern, cleat_style
 * - Belt/Pulleys: belt_tracking_method, pulley_diameter_in, drive_pulley_diameter_in, tail_pulley_diameter_in
 * - V-guides: v_guide_key, v_guide_profile_key
 * - Geometry: conveyor_length_cc_in, belt_width_in, conveyor_incline_deg
 * - Drive: gearmotor_mounting_style, gm_sprocket_teeth, drive_shaft_sprocket_teeth
 * - Sprocket: sprocket warnings
 */
export const FIELD_TO_SECTION: Record<string, FieldMapping> = {
  // ===========================================================================
  // Physical Tab - Frame Section
  // ===========================================================================
  frame_height_mode: { tabKey: 'physical', sectionKey: 'frame' },
  custom_frame_height_in: { tabKey: 'physical', sectionKey: 'frame' },
  end_support_type: { tabKey: 'physical', sectionKey: 'frame' },
  frame_construction_type: { tabKey: 'physical', sectionKey: 'frame' },
  sheet_metal_gauge: { tabKey: 'physical', sectionKey: 'frame' },
  structural_channel_series: { tabKey: 'physical', sectionKey: 'frame' },

  // ===========================================================================
  // Physical Tab - Belt & Pulleys Section
  // ===========================================================================
  cleats_mode: { tabKey: 'physical', sectionKey: 'beltPulleys' },
  cleats_enabled: { tabKey: 'physical', sectionKey: 'beltPulleys' },
  cleat_profile: { tabKey: 'physical', sectionKey: 'beltPulleys' },
  cleat_size: { tabKey: 'physical', sectionKey: 'beltPulleys' },
  cleat_pattern: { tabKey: 'physical', sectionKey: 'beltPulleys' },
  cleat_style: { tabKey: 'physical', sectionKey: 'beltPulleys' },
  cleat_spacing_in: { tabKey: 'physical', sectionKey: 'beltPulleys' },
  belt_tracking_method: { tabKey: 'physical', sectionKey: 'beltPulleys' },
  pulley_diameter_in: { tabKey: 'physical', sectionKey: 'beltPulleys' },
  drive_pulley_diameter_in: { tabKey: 'physical', sectionKey: 'beltPulleys' },
  tail_pulley_diameter_in: { tabKey: 'physical', sectionKey: 'beltPulleys' },
  v_guide_key: { tabKey: 'physical', sectionKey: 'beltPulleys' },
  v_guide_profile_key: { tabKey: 'physical', sectionKey: 'beltPulleys' },
  belt_catalog_key: { tabKey: 'physical', sectionKey: 'beltPulleys' },
  side_loading_severity: { tabKey: 'physical', sectionKey: 'beltPulleys' },

  // v1.29: Return Support fields
  return_frame_style: { tabKey: 'physical', sectionKey: 'beltPulleys' },
  return_snub_mode: { tabKey: 'physical', sectionKey: 'beltPulleys' },
  return_gravity_roller_count: { tabKey: 'physical', sectionKey: 'beltPulleys' },
  return_gravity_roller_diameter_in: { tabKey: 'physical', sectionKey: 'beltPulleys' },
  return_snub_roller_diameter_in: { tabKey: 'physical', sectionKey: 'beltPulleys' },
  return_end_offset_in: { tabKey: 'physical', sectionKey: 'beltPulleys' },

  // ===========================================================================
  // Physical Tab - Geometry Section
  // ===========================================================================
  conveyor_length_cc_in: { tabKey: 'physical', sectionKey: 'geometry' },
  belt_width_in: { tabKey: 'physical', sectionKey: 'geometry' },
  conveyor_incline_deg: { tabKey: 'physical', sectionKey: 'geometry' },
  conveyor_elevation_in: { tabKey: 'physical', sectionKey: 'geometry' },
  conveyor_horizontal_run_in: { tabKey: 'physical', sectionKey: 'geometry' },
  geometry_mode: { tabKey: 'physical', sectionKey: 'geometry' },

  // ===========================================================================
  // Drive Tab - Drive Section
  // ===========================================================================
  gearmotor_mounting_style: { tabKey: 'drive', sectionKey: 'drive' },
  gm_sprocket_teeth: { tabKey: 'drive', sectionKey: 'drive' },
  drive_shaft_sprocket_teeth: { tabKey: 'drive', sectionKey: 'drive' },
  drive_location: { tabKey: 'drive', sectionKey: 'drive' },
  motor_brand: { tabKey: 'drive', sectionKey: 'drive' },

  // ===========================================================================
  // Drive Tab - Speed Section
  // ===========================================================================
  belt_speed_fpm: { tabKey: 'drive', sectionKey: 'speed' },
  drive_rpm: { tabKey: 'drive', sectionKey: 'speed' },
  speed_mode: { tabKey: 'drive', sectionKey: 'speed' },

  // ===========================================================================
  // Drive Tab - Advanced Section
  // ===========================================================================
  safety_factor: { tabKey: 'drive', sectionKey: 'advanced' },
  friction_coefficient: { tabKey: 'drive', sectionKey: 'advanced' },

  // ===========================================================================
  // Application Tab - Product Section
  // ===========================================================================
  part_weight_lbs: { tabKey: 'application', sectionKey: 'product' },
  part_length_in: { tabKey: 'application', sectionKey: 'product' },
  part_width_in: { tabKey: 'application', sectionKey: 'product' },
  drop_height_in: { tabKey: 'application', sectionKey: 'product' },

  // ===========================================================================
  // Application Tab - Throughput Section
  // ===========================================================================
  part_spacing_in: { tabKey: 'application', sectionKey: 'throughput' },
  target_pph: { tabKey: 'application', sectionKey: 'throughput' },

  // ===========================================================================
  // Build Tab - Belt & Pulley Section
  // ===========================================================================
  lacing_style: { tabKey: 'build', sectionKey: 'beltpulley' },
  lacing_material: { tabKey: 'build', sectionKey: 'beltpulley' },

  // ===========================================================================
  // Build Tab - Documentation Section
  // ===========================================================================
  spec_source: { tabKey: 'build', sectionKey: 'documentation' },
  customer_spec_reference: { tabKey: 'build', sectionKey: 'documentation' },
};

/**
 * Get the tab and section for a validation error field.
 * Returns undefined if the field is not mapped.
 */
export function getFieldMapping(field: string | undefined): FieldMapping | undefined {
  if (!field) return undefined;
  return FIELD_TO_SECTION[field];
}

/**
 * Get just the section key for a field, for quick lookups.
 */
export function getFieldSectionKey(field: string | undefined): SectionKey | undefined {
  return getFieldMapping(field)?.sectionKey;
}

/**
 * Get just the tab key for a field, for quick lookups.
 */
export function getFieldTabKey(field: string | undefined): ConfigureTabKey | undefined {
  return getFieldMapping(field)?.tabKey;
}
