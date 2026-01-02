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
  id: '09-hot-parts',
  name: 'Hot Parts (Temperature Warning)',
  status: 'hypothetical' as const,
  source: 'assumed / illustrative',
  excelVerified: false,

  intent: `
    Tests temperature warning logic path.
    Verifies "Hot" temperature class triggers warning.
    Tests that "Red Hot" triggers ERROR (not just warning).
    Validates temperature affects belt selection.
  `,

  inputs: {
    // Geometry
    conveyor_length_cc_in: 120,
    belt_width_in: 18,
    conveyor_incline_deg: 0,
    geometry_mode: 'L_ANGLE',

    // Belt & Pulleys
    drive_pulley_diameter_in: 6,
    tail_pulley_diameter_in: 4,
    belt_speed_fpm: 80,
    belt_tracking_method: 'Crowned',
    lacing_style: 'Endless',

    // Parts - HOT
    part_weight_lbs: 5,
    part_length_in: 8,
    part_width_in: 6,
    part_spacing_in: 10,
    orientation: 'Lengthwise',
    part_temperature_class: 'Hot', // Key: Hot parts

    // Application
    material_type: 'Steel',
    process_type: 'Heat_Treat', // Related to hot parts
    ambient_temperature: 'Normal', // Ambient is normal, parts are hot

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
      // Calculations should still succeed with Hot parts
      total_belt_pull_lbf: 'POSITIVE',
      motor_hp_required: 'POSITIVE',
    },

    warnings: {
      // Hot parts trigger WARNING (not error)
      temperature_warning: true,
      warning_severity: 'WARNING', // Not error
      warning_text_contains: 'temperature', // Should mention temp
      belt_material_recommendation: 'HIGH_TEMP_BELT', // Suggest appropriate belt
    },

    errors: {
      validation_errors: false, // Hot is warning, not error
    },

    derivedState: {
      temperature_category: 'HOT',
      requires_special_belt: true,
    },
  },

  verificationNotes: `
    TO VERIFY WITH EXCEL:
    1. Confirm "Hot" triggers WARNING (code continues)
    2. Test "Red_Hot" - should trigger ERROR (stops calculation)
    3. Check warning text content
    4. Verify belt material recommendations for hot parts
    5. Test "Ambient" - should have NO temperature warning
    6. Check if ambient_temperature affects the warning
  `,
};
