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
  id: '10-long-conveyor',
  name: 'Long Conveyor (Length Warning)',
  status: 'hypothetical' as const,
  source: 'assumed / illustrative',
  excelVerified: false,

  intent: `
    Tests long conveyor warning threshold.
    Verifies warning triggers at certain length.
    Tests belt length calculation for long conveyors.
    Validates return roller spacing for long spans.
  `,

  inputs: {
    // Geometry - LONG
    conveyor_length_cc_in: 600, // 50 feet - should trigger warning
    belt_width_in: 24,
    conveyor_incline_deg: 0,
    geometry_mode: 'L_ANGLE',

    // Belt & Pulleys
    drive_pulley_diameter_in: 8,
    tail_pulley_diameter_in: 6,
    belt_speed_fpm: 100,
    belt_tracking_method: 'Crowned',
    lacing_style: 'Endless',

    // Parts
    part_weight_lbs: 10,
    part_length_in: 12,
    part_width_in: 8,
    part_spacing_in: 14,
    orientation: 'Lengthwise',

    // Application
    material_type: 'Steel',
    process_type: 'Assembly',
    part_temperature_class: 'Ambient',

    // Drive
    drive_location: 'Head',
    drive_rpm: 100,

    // Return Support - important for long conveyors
    return_frame_style: 'Standard',
    return_snub_mode: 'Auto',
    return_gravity_roller_count: 10, // More rollers for long span

    // Support
    support_method: 'FloorSupported',
    include_legs: true,
    include_casters: false,
  },

  expectedBehaviors: {
    calculations: {
      // Belt length much longer than conveyor
      belt_length_in: 'APPROXIMATELY 2 * 600 + π * pulleys', // ~1225"

      // More parts on belt
      parts_on_belt: 'MANY', // 600" / (12" + 14") ≈ 23 parts

      // Higher belt pull due to more parts
      total_belt_pull_lbf: 'HIGHER_THAN short_conveyor',

      // Return roller spacing
      return_roller_centers_in: 'APPROXIMATELY span / roller_count',
    },

    warnings: {
      // Long conveyor triggers warning
      long_conveyor_warning: true,
      warning_threshold_in: 480, // Assumed ~40 feet threshold
      warning_text_contains: 'length', // Should mention length

      // May suggest intermediate support
      intermediate_support_recommendation: 'POSSIBLE',
    },

    errors: {
      validation_errors: false, // Long is warning, not error
    },

    derivedState: {
      length_category: 'LONG',
      return_rollers_needed: 10,
    },
  },

  verificationNotes: `
    TO VERIFY WITH EXCEL:
    1. Confirm warning threshold (is it 480"? 360"? 600"?)
    2. Verify belt length formula: 2*L + π*D_drive/2 + π*D_tail/2
    3. Check parts_on_belt calculation
    4. Verify return roller spacing calculation
    5. Test at threshold - 1 inch below, at, 1 inch above
    6. Check if intermediate support is ever required
    7. Test maximum length if any hard limit exists
  `,
};
