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
  id: '06-floor-supported',
  name: 'Floor Supported with Legs and Casters',
  status: 'hypothetical' as const,
  source: 'assumed / illustrative',
  excelVerified: false,

  intent: `
    Tests v1.40 Floor Support Logic with decoupled legs/casters.
    Verifies TOB fields are visible when floor supported.
    Tests both legs AND casters can be enabled together.
    Validates frame height calculation with TOB inputs.
  `,

  inputs: {
    // Geometry
    conveyor_length_cc_in: 240,
    belt_width_in: 24,
    conveyor_incline_deg: 5, // Slight incline
    geometry_mode: 'H_TOB', // TOB-based height mode

    // TOB inputs (only valid when floor supported)
    drive_tob_in: 36, // 36" TOB at drive end
    tail_tob_in: 32, // 32" TOB at tail end (lower for incline)

    // Belt & Pulleys
    drive_pulley_diameter_in: 6,
    tail_pulley_diameter_in: 4,
    belt_speed_fpm: 100,
    belt_tracking_method: 'Crowned',
    lacing_style: 'Endless',

    // Parts
    part_weight_lbs: 10,
    part_length_in: 12,
    part_width_in: 8,
    part_spacing_in: 12,
    orientation: 'Lengthwise',

    // Application
    material_type: 'Steel',
    process_type: 'Assembly',
    part_temperature_class: 'Ambient',

    // Drive
    drive_location: 'Head',
    drive_rpm: 100,

    // Support - v1.40 decoupled model
    support_method: 'FloorSupported',
    include_legs: true, // Legs enabled
    include_casters: true, // Casters ALSO enabled (v1.40 allows both)

    // Leg/Caster selection
    leg_model_key: 'LEG-ADJ-24-36',
    caster_model_key: 'CASTER-SWIVEL-4',
  },

  expectedBehaviors: {
    calculations: {
      // Frame height derived from TOB
      drive_frame_height_in: 'TOB - (pulley_radius + belt_thickness)',
      tail_frame_height_in: 'TOB - (pulley_radius + belt_thickness)',

      // Leg cut lengths derived
      drive_leg_cut_length_in: 'frame_height - leg_base_height',
      tail_leg_cut_length_in: 'frame_height - leg_base_height',
    },

    warnings: {
      tob_mismatch_warning: false, // TOBs are consistent with incline
    },

    errors: {
      validation_errors: false,
      tob_required_error: false, // TOB provided for H_TOB mode
    },

    derivedState: {
      // v1.40: Both can be true
      legs_required: true,
      casters_enabled: true,
      tob_fields_visible: true, // Floor supported shows TOB
      isFloorSupported: true,

      // Support hardware
      has_legs: true,
      has_casters: true,
    },
  },

  verificationNotes: `
    TO VERIFY WITH EXCEL:
    1. Confirm TOB fields are inputs (not derived) in H_TOB mode
    2. Verify frame height = TOB - pulley_radius - belt_thickness
    3. Check that legs AND casters can both be selected (v1.40)
    4. Validate leg cut length calculation
    5. Test what happens if TOB is missing in H_TOB mode (should error)
    6. Compare to External support (TOB fields should be hidden)
  `,
};
