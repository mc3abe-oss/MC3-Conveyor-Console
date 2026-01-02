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
  id: '07-high-speed',
  name: 'High Speed Conveyor',
  status: 'hypothetical' as const,
  source: 'assumed / illustrative',
  excelVerified: false,

  intent: `
    Tests high belt speed scenario (300+ FPM).
    Verifies motor sizing increases with speed.
    Tests shaft sizing at higher RPM.
    Validates any high-speed warnings or limits.
  `,

  inputs: {
    // Geometry
    conveyor_length_cc_in: 180,
    belt_width_in: 18,
    conveyor_incline_deg: 0,
    geometry_mode: 'L_ANGLE',

    // Belt & Pulleys - sized for high speed
    drive_pulley_diameter_in: 8, // Larger pulley for high speed
    tail_pulley_diameter_in: 6,
    belt_speed_fpm: 350, // High speed
    belt_tracking_method: 'Crowned',
    lacing_style: 'Endless',

    // Parts - light, fast-moving
    part_weight_lbs: 2,
    part_length_in: 6,
    part_width_in: 4,
    part_spacing_in: 8,
    orientation: 'Lengthwise',

    // Application
    material_type: 'Plastic',
    process_type: 'Sorting',
    part_temperature_class: 'Ambient',

    // Drive - high RPM
    drive_location: 'Head',
    drive_rpm: 350, // High RPM for high speed

    // Support
    support_method: 'FloorSupported',
    include_legs: true,
    include_casters: false,
  },

  expectedBehaviors: {
    calculations: {
      // Higher speed = higher power requirement
      motor_hp_required: 'HIGHER_THAN baseline_at_100fpm',

      // Shaft RPM derived from belt speed and pulley diameter
      drive_shaft_rpm: 'APPROXIMATELY (belt_speed * 12) / (π * pulley_dia)',
      // At 350 FPM, 8" pulley: ~167 RPM

      // Gear ratio for motor to shaft
      gear_ratio: 'motor_rpm / shaft_rpm',
    },

    warnings: {
      high_speed_warning: 'POSSIBLE', // May warn above certain FPM
      belt_selection_warning: 'CHECK', // Some belts have max speed
    },

    errors: {
      validation_errors: false, // 350 FPM should be valid
    },

    derivedState: {
      speed_category: 'HIGH',
    },
  },

  verificationNotes: `
    TO VERIFY WITH EXCEL:
    1. Calculate expected shaft RPM: (350 * 12) / (π * 8) ≈ 167 RPM
    2. Verify motor HP scales with speed
    3. Check if any warnings trigger at 350 FPM
    4. Test with 500 FPM - is there a max limit?
    5. Verify belt selection compatibility with speed
    6. Check shaft diameter sizing at high RPM
  `,
};
