/**
 * HYPOTHETICAL REFERENCE APPLICATION
 *
 * STATUS: hypothetical
 * SOURCE: assumed / illustrative
 * EXCEL VERIFIED: NO
 *
 * DO NOT use numeric values as authoritative test expectations.
 */

export const scenario = {
  id: '04-vguided-tracking',
  name: 'V-Guided Belt Tracking',
  status: 'hypothetical' as const,
  source: 'assumed / illustrative',
  excelVerified: false,

  intent: `
    Tests the V-guided belt tracking logic path.
    Verifies pulley face width calculations differ from crowned.
    Tests V-guide requirement validation.
    Verifies tracking recommendation logic.
  `,

  inputs: {
    // Geometry
    conveyor_length_cc_in: 240, // 20 feet - longer conveyor benefits from V-guide
    belt_width_in: 24,
    conveyor_incline_deg: 0,
    geometry_mode: 'L_ANGLE',

    // Belt & Pulleys - V-guided
    drive_pulley_diameter_in: 6,
    tail_pulley_diameter_in: 6,
    belt_speed_fpm: 120,
    belt_tracking_method: 'V-guided', // Key difference
    lacing_style: 'Endless',

    // V-Guide selection
    v_guide_key: 'VG-001', // Reference to v_guides table

    // Parts
    part_weight_lbs: 8,
    part_length_in: 10,
    part_width_in: 8,
    part_spacing_in: 12,
    orientation: 'Lengthwise',

    // Application
    material_type: 'Steel',
    process_type: 'Assembly',
    part_temperature_class: 'Ambient',

    // Drive
    drive_location: 'Head',
    drive_rpm: 120,

    // Support
    support_method: 'FloorSupported',
    include_legs: true,
    include_casters: false,
  },

  expectedBehaviors: {
    calculations: {
      // V-guided has different face width calculation
      pulley_face_extra_in: 0.5, // V-guided uses 0.5" (vs 2.0" for crowned)
      drive_pulley_face_width_in: 'belt_width + 0.5',
      tail_pulley_face_width_in: 'belt_width + 0.5',
    },

    warnings: {
      tracking_warning: false, // V-guided is valid choice
      v_guide_required_warning: false, // V-guide key is provided
    },

    errors: {
      validation_errors: false,
      v_guide_missing_error: false, // Would error if v_guide_key missing
    },

    derivedState: {
      tracking_mode: 'V-guided',
      requires_v_guide_profile: true,
      v_guide_groove_required: true, // Pulleys need grooves
    },
  },

  verificationNotes: `
    TO VERIFY WITH EXCEL:
    1. Confirm pulley face width = belt_width + 0.5" for V-guided
    2. Compare to crowned (belt_width + 2.0")
    3. Verify V-guide profile/key is required
    4. Check if pulley surface type affects V-guide compatibility
    5. Test what happens if v_guide_key is missing
    6. Verify tracking recommendation system output
  `,
};
