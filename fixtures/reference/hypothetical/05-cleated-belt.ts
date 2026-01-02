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
  id: '05-cleated-belt',
  name: 'Cleated Belt Configuration',
  status: 'hypothetical' as const,
  source: 'assumed / illustrative',
  excelVerified: false,

  intent: `
    Tests cleated belt logic including minimum pulley diameter rules.
    Verifies cleat height affects min pulley calculation.
    Tests cleat pattern spacing multiplier.
    Verifies frame height includes cleat adder.
  `,

  inputs: {
    // Geometry - inclined (cleats are for inclines)
    conveyor_length_cc_in: 180,
    belt_width_in: 18,
    conveyor_incline_deg: 20,
    geometry_mode: 'L_ANGLE',

    // Belt & Pulleys
    drive_pulley_diameter_in: 8, // Must meet cleat min
    tail_pulley_diameter_in: 8,
    belt_speed_fpm: 80,
    belt_tracking_method: 'Crowned',
    lacing_style: 'Endless',

    // Cleats - enabled
    cleats_mode: 'cleated',
    cleats_enabled: true,
    cleat_profile: 'T', // T-profile cleat
    cleat_size: '4', // 4" cleat height
    cleat_pattern: 'STAGGERED',
    cleat_centers_in: 12,
    cleat_style: 'MOLDED',
    cleat_material_family: 'URETHANE',

    // Parts
    part_weight_lbs: 5,
    part_length_in: 6,
    part_width_in: 4,
    part_spacing_in: 10,
    orientation: 'Lengthwise',

    // Application
    material_type: 'Plastic',
    process_type: 'Assembly',
    part_temperature_class: 'Ambient',

    // Drive
    drive_location: 'Head',
    drive_rpm: 80,

    // Support
    support_method: 'FloorSupported',
    include_legs: true,
    include_casters: false,
  },

  expectedBehaviors: {
    calculations: {
      // Cleat min pulley is based on cleat height
      cleats_min_pulley_diameter_in: 'GREATER_THAN 6', // 4" cleat needs ~8" pulley
      cleats_base_min_pulley_diameter_12in_in: 'FROM_CATALOG', // Base value from lookup
      cleats_centers_factor: 'MULTIPLIER_FROM_PATTERN', // Pattern affects spacing

      // Frame height includes cleat adder
      frame_reference_height_in: 'INCLUDES 2 * cleat_height',
    },

    warnings: {
      pulley_too_small_warning: false, // 8" should be sufficient
      cleat_snub_warning: false, // Check if snubs conflict with cleats
    },

    errors: {
      validation_errors: false,
      // Would error if pulley < cleats_min_pulley_diameter_in
    },

    derivedState: {
      cleats_configured: true,
      effective_cleat_height_in: 4,
      governing_min_pulley_source: 'CLEATS', // Cleats drive the min, not belt
    },
  },

  verificationNotes: `
    TO VERIFY WITH EXCEL:
    1. Look up cleat_catalog for T-profile, 4" size
    2. Get base min pulley diameter for 12" standard
    3. Apply centers factor from cleat_center_factors table
    4. Verify: min_pulley = base * centers_factor, rounded UP to 0.25"
    5. Check frame height formula includes 2 * cleat_height
    6. Test with pulley < min to confirm error triggers
    7. Test LOW PROFILE frame mode - should error with cleats
  `,
};
