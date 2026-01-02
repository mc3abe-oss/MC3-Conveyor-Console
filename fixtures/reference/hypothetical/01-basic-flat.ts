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
  id: '01-basic-flat',
  name: 'Basic Flat Conveyor',
  status: 'hypothetical' as const,
  source: 'assumed / illustrative',
  excelVerified: false,

  intent: `
    Baseline scenario for a simple, flat sliderbed conveyor.
    Tests the most common configuration path with no special features.
    All other scenarios should be compared against this baseline.
  `,

  inputs: {
    // Geometry
    conveyor_length_cc_in: 120, // 10 feet
    belt_width_in: 24,
    conveyor_incline_deg: 0,
    geometry_mode: 'L_ANGLE',

    // Belt & Pulleys
    drive_pulley_diameter_in: 4,
    tail_pulley_diameter_in: 4,
    belt_speed_fpm: 100,
    belt_tracking_method: 'Crowned',
    lacing_style: 'Endless',

    // Parts
    part_weight_lbs: 5,
    part_length_in: 12,
    part_width_in: 6,
    part_spacing_in: 12,
    orientation: 'Lengthwise',

    // Application
    material_type: 'Steel',
    process_type: 'Assembly',
    part_temperature_class: 'Ambient',

    // Drive
    drive_location: 'Head',
    drive_rpm: 100,

    // Support
    support_method: 'FloorSupported',
    include_legs: true,
    include_casters: false,
  },

  expectedBehaviors: {
    // Relationships, not exact numbers
    calculations: {
      parts_on_belt: 'GREATER_THAN_ZERO',
      total_belt_pull_lbf: 'POSITIVE',
      motor_hp_required: 'POSITIVE',
      belt_length_in: 'GREATER_THAN conveyor_length_cc_in',
    },

    warnings: {
      incline_warning: false, // 0° should not warn
      long_conveyor_warning: false, // 120" is not long
      temperature_warning: false, // Ambient is fine
    },

    errors: {
      validation_errors: false, // Valid config should pass
    },

    derivedState: {
      legs_required: true, // Floor supported with legs
      tob_visible: true, // Floor supported shows TOB
    },
  },

  verificationNotes: `
    TO VERIFY WITH EXCEL:
    1. Enter all inputs into Excel calculator
    2. Record: parts_on_belt, total_belt_pull_lbf, motor_hp_required
    3. Record: belt_length_in, effective_belt_pull_lbf
    4. Record: drive_shaft_diameter_in, tail_shaft_diameter_in
    5. Document any warnings shown
    6. Note rounding behavior (decimal places)
  `,
};
