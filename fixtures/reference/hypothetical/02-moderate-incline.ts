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
  id: '02-moderate-incline',
  name: 'Moderate Incline Conveyor',
  status: 'hypothetical' as const,
  source: 'assumed / illustrative',
  excelVerified: false,

  intent: `
    Tests the incline calculation path with a moderate 15° angle.
    Should NOT trigger high-incline warnings.
    Verifies incline pull is added to total belt pull.
    Tests geometry mode with non-zero angle.
  `,

  inputs: {
    // Geometry - inclined
    conveyor_length_cc_in: 180, // 15 feet
    belt_width_in: 18,
    conveyor_incline_deg: 15,
    geometry_mode: 'L_ANGLE',

    // Belt & Pulleys
    drive_pulley_diameter_in: 6,
    tail_pulley_diameter_in: 4,
    belt_speed_fpm: 80,
    belt_tracking_method: 'Crowned',
    lacing_style: 'Endless',

    // Parts - heavier for incline
    part_weight_lbs: 10,
    part_length_in: 8,
    part_width_in: 6,
    part_spacing_in: 10,
    orientation: 'Lengthwise',

    // Application
    material_type: 'Steel',
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
      // Incline should add to belt pull
      incline_pull_lbf: 'POSITIVE', // sin(15°) * load
      total_belt_pull_lbf: 'GREATER_THAN scenario_01', // More than flat
      motor_hp_required: 'GREATER_THAN scenario_01',

      // Geometry derived values
      rise_in: 'APPROXIMATELY length * sin(15°)', // ~46.6"
      horizontal_run_in: 'APPROXIMATELY length * cos(15°)', // ~174"
    },

    warnings: {
      incline_warning: false, // 15° is below 20° threshold
      long_conveyor_warning: false,
      temperature_warning: false,
    },

    errors: {
      validation_errors: false,
    },

    derivedState: {
      theta_deg: 15, // Should match input
      legs_required: true,
    },
  },

  verificationNotes: `
    TO VERIFY WITH EXCEL:
    1. Confirm incline_pull_lbf calculation: W * sin(θ)
    2. Verify total_belt_pull includes incline component
    3. Check rise_in = L * sin(15°) ≈ 46.6"
    4. Verify NO incline warning at 15°
    5. Compare motor HP to flat scenario (should be higher)
  `,
};
