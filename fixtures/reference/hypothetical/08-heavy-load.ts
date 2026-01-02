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
  id: '08-heavy-load',
  name: 'Heavy Load Conveyor',
  status: 'hypothetical' as const,
  source: 'assumed / illustrative',
  excelVerified: false,

  intent: `
    Tests heavy part weight scenario (50+ lbs per part).
    Verifies belt pull increases with load.
    Tests shaft diameter sizing under heavy load.
    Validates structural channel frame recommendation.
  `,

  inputs: {
    // Geometry
    conveyor_length_cc_in: 240,
    belt_width_in: 36, // Wide belt for heavy parts
    conveyor_incline_deg: 0,
    geometry_mode: 'L_ANGLE',

    // Belt & Pulleys - heavy duty
    drive_pulley_diameter_in: 10, // Large pulley for torque
    tail_pulley_diameter_in: 8,
    belt_speed_fpm: 60, // Slower for heavy parts
    belt_tracking_method: 'Crowned',
    lacing_style: 'Endless',

    // Parts - HEAVY
    part_weight_lbs: 75, // Heavy parts
    part_length_in: 24,
    part_width_in: 18,
    part_spacing_in: 30,
    orientation: 'Lengthwise',

    // Application
    material_type: 'Steel',
    process_type: 'Assembly',
    part_temperature_class: 'Ambient',

    // Drive
    drive_location: 'Head',
    drive_rpm: 60,

    // Frame - structural for heavy duty
    frame_construction_type: 'structural_channel',
    frame_structural_channel_series: 'C6',

    // Support
    support_method: 'FloorSupported',
    include_legs: true,
    include_casters: false,
  },

  expectedBehaviors: {
    calculations: {
      // Heavy load = higher belt pull
      total_belt_pull_lbf: 'SIGNIFICANTLY_HIGHER_THAN baseline',

      // More parts on belt due to weight
      live_load_lbs: 'HIGH', // Many heavy parts

      // Larger shaft diameters needed
      drive_shaft_diameter_in: 'LARGER_THAN baseline',
      tail_shaft_diameter_in: 'LARGER_THAN baseline',

      // Motor sizing
      motor_hp_required: 'HIGHER_THAN baseline',
      torque_drive_shaft_inlbf: 'HIGH',
    },

    warnings: {
      heavy_load_warning: 'POSSIBLE',
      frame_recommendation: 'structural_channel', // Should recommend heavy frame
    },

    errors: {
      validation_errors: false,
    },

    derivedState: {
      load_category: 'HEAVY',
      frame_type: 'structural_channel',
    },
  },

  verificationNotes: `
    TO VERIFY WITH EXCEL:
    1. Calculate live load with 75 lb parts
    2. Verify belt pull formula with heavy load
    3. Check shaft diameter calculation (Von Mises)
    4. Verify structural channel is appropriate
    5. Test if sheet metal frame shows warning
    6. Compare motor HP to light load scenario
    7. Check torque calculations
  `,
};
