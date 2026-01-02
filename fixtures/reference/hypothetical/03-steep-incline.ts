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
  id: '03-steep-incline',
  name: 'Steep Incline Conveyor (Warning Threshold)',
  status: 'hypothetical' as const,
  source: 'assumed / illustrative',
  excelVerified: false,

  intent: `
    Tests the HIGH incline warning threshold at 35°.
    Should trigger a STRONG warning (not error).
    Verifies warning text and severity.
    Tests edge of acceptable incline range.
  `,

  inputs: {
    // Geometry - steep incline
    conveyor_length_cc_in: 120,
    belt_width_in: 18,
    conveyor_incline_deg: 35, // Strong warning threshold
    geometry_mode: 'L_ANGLE',

    // Belt & Pulleys - cleated for grip
    drive_pulley_diameter_in: 8,
    tail_pulley_diameter_in: 6,
    belt_speed_fpm: 60,
    belt_tracking_method: 'Crowned',
    lacing_style: 'Endless',

    // Parts
    part_weight_lbs: 5,
    part_length_in: 6,
    part_width_in: 4,
    part_spacing_in: 8,
    orientation: 'Lengthwise',

    // Application
    material_type: 'Plastic',
    process_type: 'Assembly',
    part_temperature_class: 'Ambient',

    // Drive
    drive_location: 'Head',
    drive_rpm: 60,

    // Support
    support_method: 'FloorSupported',
    include_legs: true,
    include_casters: false,
  },

  expectedBehaviors: {
    calculations: {
      // High incline = significant rise
      rise_in: 'APPROXIMATELY 120 * sin(35°)', // ~68.8"
      incline_pull_lbf: 'SIGNIFICANTLY_POSITIVE',
      total_belt_pull_lbf: 'MUCH_GREATER_THAN flat_baseline',
    },

    warnings: {
      incline_warning: true, // 35° > 20° threshold
      incline_warning_severity: 'STRONG', // Not just mild warning
      warning_text_contains: 'incline', // Should mention incline
      cleats_recommended: true, // Should suggest cleats at this angle
    },

    errors: {
      validation_errors: false, // 35° is still valid (< 45°)
    },

    derivedState: {
      theta_deg: 35,
    },
  },

  verificationNotes: `
    TO VERIFY WITH EXCEL:
    1. Confirm warning triggers at 35°
    2. Check warning severity (should be "strong" not mild)
    3. Verify calculation still succeeds (no error)
    4. Note if Excel recommends cleats for steep inclines
    5. Compare 35° to 20° threshold behavior
    6. Test 46° to confirm it becomes an ERROR
  `,
};
