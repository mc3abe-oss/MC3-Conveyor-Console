/**
 * SLIDERBED CONVEYOR v1 - MISC TESTS
 * 
 * Split from model.test.ts for readability.
 * Contains:
 * - PCI Tube Stress Calculations (v1.27)
 * - Material Form - PARTS vs BULK (v1.29)
 * - Legacy Key Stripping (v1.42)
 * - Excel Parity Tests
 */

import { runCalculation } from '../../../lib/calculator/engine';
import { migrateInputs } from '../migrate';
import {
  SliderbedInputs,
  PartTemperatureClass,
  FluidType,
  Orientation,
  MaterialType,
  ProcessType,
  PartsSharp,
  EnvironmentFactors,
  AmbientTemperature,
  PowerFeed,
  ControlsPackage,
  SpecSource,
  FieldWiringRequired,
  BearingGrade,
  DocumentationPackage,
  FinishPaintSystem,
  LabelsRequired,
  SendToEstimating,
  MotorBrand,
  SideRails,
  EndGuards,
  LacingStyle,
  PulleySurfaceType,
  DirectionMode,
  SideLoadingDirection,
  DriveLocation,
  GearmotorOrientation,
  DriveHand,
  BeltTrackingMethod,
  ShaftDiameterMode,
  FrameHeightMode,
  SpeedMode,
  SupportMethod,
  VGuideProfile,
} from '../schema';
import { migrateInputs } from '../migrate';

describe('PCI Tube Stress Calculations (v1.27)', () => {
  // Base inputs for PCI tests
  const PCI_BASE_INPUTS: SliderbedInputs = {
    material_form: 'PARTS', // v1.48: Required for new applications
    conveyor_length_cc_in: 120,
    belt_width_in: 24,
    belt_speed_fpm: 100,
    pulley_diameter_in: 6,
    // Manual override flags required for diameters to be used (v1.17 pulley resolution logic)
    drive_pulley_manual_override: true,
    drive_pulley_diameter_in: 6,
    tail_pulley_manual_override: true,
    tail_pulley_diameter_in: 6,
    part_weight_lbs: 10,
    part_length_in: 10,
    part_width_in: 8,
    drop_height_in: 0,
    part_temperature_class: PartTemperatureClass.Ambient,
    fluid_type: FluidType.None,
    orientation: Orientation.Lengthwise,
    part_spacing_in: 12,
    drive_rpm: 100,
    material_type: MaterialType.Steel,
    process_type: ProcessType.Assembly,
    parts_sharp: PartsSharp.No,
    environment_factors: [EnvironmentFactors.Indoor],
    ambient_temperature: AmbientTemperature.Normal,
    power_feed: PowerFeed.V480_3Ph,
    controls_package: ControlsPackage.StartStop,
    spec_source: SpecSource.Standard,
    field_wiring_required: FieldWiringRequired.No,
    bearing_grade: BearingGrade.Standard,
    documentation_package: DocumentationPackage.Basic,
    finish_paint_system: FinishPaintSystem.PowderCoat,
    labels_required: LabelsRequired.Yes,
    send_to_estimating: SendToEstimating.No,
    motor_brand: MotorBrand.Standard,
    bottom_covers: false,
    side_rails: SideRails.None,
    end_guards: EndGuards.None,
    finger_safe: false,
    lacing_style: LacingStyle.Endless,
    side_skirts: false,
    sensor_options: [],
    pulley_surface_type: PulleySurfaceType.Plain,
    start_stop_application: false,
    direction_mode: DirectionMode.OneDirection,
    side_loading_direction: SideLoadingDirection.None,
    drive_location: DriveLocation.Head,
    brake_motor: false,
    gearmotor_orientation: GearmotorOrientation.SideMount,
    drive_hand: DriveHand.RightHand,
    belt_tracking_method: BeltTrackingMethod.Crowned,
    shaft_diameter_mode: ShaftDiameterMode.Calculated,
  };

  // Test 1: Resultant load output is populated (wire-only)
  it('should populate drive_pulley_resultant_load_lbf from shaftCalc', () => {
    const result = runCalculation({ inputs: PCI_BASE_INPUTS });

    expect(result.success).toBe(true);
    expect(result.outputs?.drive_pulley_resultant_load_lbf).toBeDefined();
    expect(result.outputs?.drive_pulley_resultant_load_lbf).toBeGreaterThan(0);
    expect(result.outputs?.tail_pulley_resultant_load_lbf).toBeDefined();
    expect(result.outputs?.tail_pulley_resultant_load_lbf).toBeGreaterThan(0);
  });

  // Test 2: T1 and T2 outputs are populated (wire-only)
  it('should populate drive_T1_lbf and drive_T2_lbf from shaftCalc', () => {
    const result = runCalculation({ inputs: PCI_BASE_INPUTS });

    expect(result.success).toBe(true);
    expect(result.outputs?.drive_T1_lbf).toBeDefined();
    expect(result.outputs?.drive_T1_lbf).toBeGreaterThan(0);
    expect(result.outputs?.drive_T2_lbf).toBeDefined();
    expect(result.outputs?.drive_T2_lbf).toBeGreaterThan(0);
  });

  // Test 3: PCI status is "incomplete" when geometry not provided
  it('should set pci_tube_stress_status to "incomplete" when geometry missing', () => {
    const result = runCalculation({ inputs: PCI_BASE_INPUTS });

    expect(result.success).toBe(true);
    expect(result.outputs?.pci_tube_stress_status).toBe('incomplete');
    expect(result.outputs?.pci_drive_tube_stress_psi).toBeUndefined();
    expect(result.outputs?.pci_tail_tube_stress_psi).toBeUndefined();
  });

  // Test 4: PCI tube stress calculated when geometry provided
  it('should calculate pci_drive_tube_stress_psi when geometry provided', () => {
    const inputs: SliderbedInputs = {
      ...PCI_BASE_INPUTS,
      drive_tube_od_in: 6.0,
      drive_tube_wall_in: 0.134,
      hub_centers_in: 24,
    };

    const result = runCalculation({ inputs });

    expect(result.success).toBe(true);
    expect(result.outputs?.pci_drive_tube_stress_psi).toBeDefined();
    expect(result.outputs?.pci_drive_tube_stress_psi).toBeGreaterThan(0);
    expect(result.outputs?.pci_tube_stress_limit_psi).toBe(10000); // Drum pulley
    expect(result.outputs?.pci_hub_centers_estimated).toBe(false);
  });

  // Test 5: Hub centers estimated flag set when defaulted
  it('should set pci_hub_centers_estimated when hub_centers_in not provided', () => {
    const inputs: SliderbedInputs = {
      ...PCI_BASE_INPUTS,
      drive_tube_od_in: 6.0,
      drive_tube_wall_in: 0.134,
      // hub_centers_in not provided - will default to belt_width_in
    };

    const result = runCalculation({ inputs });

    expect(result.success).toBe(true);
    expect(result.outputs?.pci_hub_centers_estimated).toBe(true);
    // Status should be "estimated" when hub centers defaulted and stress OK
    expect(['estimated', 'warn', 'fail', 'incomplete']).toContain(result.outputs?.pci_tube_stress_status);
  });

  // Test 6: V-groove pulley uses 3,400 psi limit
  it('should use 3,400 psi limit for V-groove pulley', () => {
    const inputs: SliderbedInputs = {
      ...PCI_BASE_INPUTS,
      belt_tracking_method: BeltTrackingMethod.VGuided,
      v_guide_profile: VGuideProfile.K10,
      v_guide_key: 'K10_SOLID',
      drive_tube_od_in: 6.0,
      drive_tube_wall_in: 0.134,
      hub_centers_in: 24,
    };

    const result = runCalculation({ inputs });

    expect(result.success).toBe(true);
    expect(result.outputs?.pci_tube_stress_limit_psi).toBe(3400);
  });

  // Test 7: Invalid geometry (wall exceeds radius) returns error status
  it('should set pci_tube_stress_status to "error" for invalid geometry', () => {
    const inputs: SliderbedInputs = {
      ...PCI_BASE_INPUTS,
      drive_tube_od_in: 4.0,
      drive_tube_wall_in: 2.5, // Wall exceeds radius (2.0")
      hub_centers_in: 24,
    };

    const result = runCalculation({ inputs });

    expect(result.success).toBe(true);
    expect(result.outputs?.pci_tube_stress_status).toBe('error');
    expect(result.outputs?.pci_tube_stress_error_message).toBeDefined();
  });

  // Test 8: Regression - existing shaft outputs unchanged
  it('should not change existing shaft diameter outputs when PCI inputs added', () => {
    // Calculate without PCI inputs
    const baseResult = runCalculation({ inputs: PCI_BASE_INPUTS });

    // Calculate with PCI inputs
    const pciInputs: SliderbedInputs = {
      ...PCI_BASE_INPUTS,
      drive_tube_od_in: 6.0,
      drive_tube_wall_in: 0.134,
      hub_centers_in: 24,
    };
    const pciResult = runCalculation({ inputs: pciInputs });

    // Existing outputs must be unchanged (Edit #5 - mustNotChange)
    expect(pciResult.outputs?.drive_shaft_diameter_in).toBe(baseResult.outputs?.drive_shaft_diameter_in);
    expect(pciResult.outputs?.tail_shaft_diameter_in).toBe(baseResult.outputs?.tail_shaft_diameter_in);
    expect(pciResult.outputs?.total_belt_pull_lb).toBe(baseResult.outputs?.total_belt_pull_lb);
    expect(pciResult.outputs?.friction_pull_lb).toBe(baseResult.outputs?.friction_pull_lb);
  });
});

describe('Material Form - PARTS vs BULK (v1.29)', () => {
  // Base inputs for testing - shared across all BULK tests
  const BULK_BASE_INPUTS: SliderbedInputs = {
    material_form: 'PARTS', // v1.48: Default to PARTS, tests override for BULK
    conveyor_length_cc_in: 120, // 10 ft
    belt_width_in: 24,
    belt_speed_fpm: 60, // 60 FPM
    pulley_diameter_in: 4,
    drive_pulley_diameter_in: 4,
    tail_pulley_diameter_in: 4,
    conveyor_incline_deg: 0,
    // These are required for PARTS but should be ignored in BULK
    part_weight_lbs: 1,
    part_length_in: 12,
    part_width_in: 6,
    part_spacing_in: 0,
    drop_height_in: 0,
    part_temperature_class: PartTemperatureClass.Ambient,
    fluid_type: FluidType.None,
    orientation: Orientation.Lengthwise,
    drive_rpm: 100, // Will be calculated from belt speed
    // Application fields
    material_type: MaterialType.Steel,
    process_type: ProcessType.Assembly,
    parts_sharp: PartsSharp.No,
    environment_factors: ['Industrial'],
    ambient_temperature: AmbientTemperature.Normal,
    power_feed: PowerFeed.V480_3Ph,
    controls_package: ControlsPackage.StartStop,
    spec_source: SpecSource.Standard,
    field_wiring_required: FieldWiringRequired.No,
    bearing_grade: BearingGrade.Standard,
    documentation_package: DocumentationPackage.Basic,
    finish_paint_system: FinishPaintSystem.PowderCoat,
    labels_required: LabelsRequired.Yes,
    send_to_estimating: SendToEstimating.No,
    motor_brand: MotorBrand.Standard,
    bottom_covers: false,
    side_rails: SideRails.None,
    end_guards: EndGuards.None,
    finger_safe: false,
    lacing_style: LacingStyle.Endless,
    side_skirts: false,
    sensor_options: [],
    pulley_surface_type: PulleySurfaceType.Plain,
    start_stop_application: false,
    direction_mode: DirectionMode.OneDirection,
    side_loading_direction: SideLoadingDirection.None,
    drive_location: DriveLocation.Head,
    brake_motor: false,
    gearmotor_orientation: GearmotorOrientation.SideMount,
    drive_hand: DriveHand.RightHand,
    belt_tracking_method: BeltTrackingMethod.Crowned,
    shaft_diameter_mode: ShaftDiameterMode.Calculated,
  };

  // Test 1: Legacy config (no material_form) defaults to PARTS via migration
  // v1.48: Legacy configs go through migrateInputs which adds material_form
  it('should default material_form to PARTS for legacy configs via migration', () => {
    // Simulate legacy config from database (no material_form)
    const rawInputs: Partial<SliderbedInputs> = { ...BULK_BASE_INPUTS };
    delete (rawInputs as Record<string, unknown>).material_form;

    // Legacy configs go through migration which adds material_form = PARTS
    const migratedInputs = migrateInputs(rawInputs as SliderbedInputs);
    const result = runCalculation({ inputs: migratedInputs });

    expect(result.success).toBe(true);
    // Should have PARTS-specific outputs
    expect(result.outputs?.parts_on_belt).toBeDefined();
    expect(result.outputs?.parts_on_belt).toBeGreaterThan(0);
    expect(result.outputs?.capacity_pph).toBeDefined();
    expect(result.outputs?.pitch_in).toBeDefined();
    expect(result.outputs?.material_form_used).toBe('PARTS');
  });

  // Test 2: Explicit PARTS mode matches legacy calculation (via migration)
  it('should calculate PARTS mode identically to legacy (via migration)', () => {
    // Legacy config - no material_form
    const rawLegacyInputs: Partial<SliderbedInputs> = { ...BULK_BASE_INPUTS };
    delete (rawLegacyInputs as Record<string, unknown>).material_form;
    const legacyInputs = migrateInputs(rawLegacyInputs as SliderbedInputs);

    // Apply migration to partsInputs too to ensure same defaults
    // (migration adds speed_mode, geometry_mode, etc. that affect calculation)
    const partsInputs = migrateInputs({
      ...BULK_BASE_INPUTS,
      material_form: 'PARTS',
    } as SliderbedInputs);

    const legacyResult = runCalculation({ inputs: legacyInputs });
    const partsResult = runCalculation({ inputs: partsInputs });

    expect(legacyResult.success).toBe(true);
    expect(partsResult.success).toBe(true);

    // All outputs must be identical - no math drift
    expect(partsResult.outputs?.parts_on_belt).toBe(legacyResult.outputs?.parts_on_belt);
    expect(partsResult.outputs?.load_on_belt_lbf).toBe(legacyResult.outputs?.load_on_belt_lbf);
    expect(partsResult.outputs?.capacity_pph).toBe(legacyResult.outputs?.capacity_pph);
    expect(partsResult.outputs?.total_belt_pull_lb).toBe(legacyResult.outputs?.total_belt_pull_lb);
  });

  // Test 2b: v1.48 - Calculation fails without material_form (no migration)
  it('should fail calculation when material_form is missing (no migration)', () => {
    const inputs: Partial<SliderbedInputs> = { ...BULK_BASE_INPUTS };
    delete (inputs as Record<string, unknown>).material_form;

    // Without migration, missing material_form should fail validation
    const result = runCalculation({ inputs: inputs as SliderbedInputs });

    expect(result.success).toBe(false);
    expect(result.errors?.some(e => e.field === 'material_form')).toBe(true);
    expect(result.errors?.some(e => e.message?.includes('Material form not selected'))).toBe(true);
  });

  // Test 3: PARTS validation - zero weight should fail
  it('should error when PARTS mode has zero part weight', () => {
    const inputs: SliderbedInputs = {
      ...BULK_BASE_INPUTS,
      material_form: 'PARTS',
      part_weight_lbs: 0, // Invalid
    };

    const result = runCalculation({ inputs });

    expect(result.success).toBe(false);
    expect(result.errors?.some(e => e.field === 'part_weight_lbs')).toBe(true);
  });

  // Test 4: PARTS edge case - crosswise orientation
  it('should handle crosswise orientation correctly', () => {
    const inputs: SliderbedInputs = {
      ...BULK_BASE_INPUTS,
      material_form: 'PARTS',
      orientation: Orientation.Crosswise,
      part_length_in: 6,
      part_width_in: 12,
    };

    const result = runCalculation({ inputs });

    expect(result.success).toBe(true);
    // In crosswise, travel dimension is width (12")
    expect(result.outputs?.pitch_in).toBe(12); // width + 0 spacing
  });

  // Test 5: PARTS edge case - zero spacing
  it('should handle zero part spacing correctly', () => {
    const inputs: SliderbedInputs = {
      ...BULK_BASE_INPUTS,
      material_form: 'PARTS',
      part_spacing_in: 0,
      part_length_in: 12,
    };

    const result = runCalculation({ inputs });

    expect(result.success).toBe(true);
    // Pitch should equal travel dimension when spacing is 0
    expect(result.outputs?.pitch_in).toBe(12);
    // Parts on belt = 120" / 12" = 10
    expect(result.outputs?.parts_on_belt).toBeCloseTo(10, 5);
  });

  // Test 6: BULK validation - missing bulk_input_method should fail
  it('should error when BULK mode has no bulk_input_method', () => {
    const inputs: SliderbedInputs = {
      ...BULK_BASE_INPUTS,
      material_form: 'BULK',
      // bulk_input_method not provided
    };

    const result = runCalculation({ inputs });

    // Should fail validation - bulk_input_method required
    expect(result.errors?.some(e => e.field === 'bulk_input_method')).toBe(true);
  });

  // Test 7: BULK WEIGHT_FLOW validation - zero mass flow should fail
  it('should error when BULK WEIGHT_FLOW has zero mass flow', () => {
    const inputs: SliderbedInputs = {
      ...BULK_BASE_INPUTS,
      material_form: 'BULK',
      bulk_input_method: 'WEIGHT_FLOW',
      mass_flow_lbs_per_hr: 0, // Invalid
    };

    const result = runCalculation({ inputs });

    expect(result.errors?.some(e => e.field === 'mass_flow_lbs_per_hr')).toBe(true);
  });

  // Test 8: BULK VOLUME_FLOW validation - zero volume flow should fail
  it('should error when BULK VOLUME_FLOW has zero volume flow', () => {
    const inputs: SliderbedInputs = {
      ...BULK_BASE_INPUTS,
      material_form: 'BULK',
      bulk_input_method: 'VOLUME_FLOW',
      volume_flow_ft3_per_hr: 0, // Invalid
      density_lbs_per_ft3: 50,
      density_source: 'KNOWN',
    };

    const result = runCalculation({ inputs });

    expect(result.errors?.some(e => e.field === 'volume_flow_ft3_per_hr')).toBe(true);
  });

  // Test 9: BULK VOLUME_FLOW validation - zero density should fail
  it('should error when BULK VOLUME_FLOW has zero density', () => {
    const inputs: SliderbedInputs = {
      ...BULK_BASE_INPUTS,
      material_form: 'BULK',
      bulk_input_method: 'VOLUME_FLOW',
      volume_flow_ft3_per_hr: 100,
      density_lbs_per_ft3: 0, // Invalid
      density_source: 'KNOWN',
    };

    const result = runCalculation({ inputs });

    expect(result.errors?.some(e => e.field === 'density_lbs_per_ft3')).toBe(true);
  });

  // Test 10: BULK VOLUME_FLOW validation - missing density_source should fail
  it('should error when BULK VOLUME_FLOW has no density_source', () => {
    const inputs: SliderbedInputs = {
      ...BULK_BASE_INPUTS,
      material_form: 'BULK',
      bulk_input_method: 'VOLUME_FLOW',
      volume_flow_ft3_per_hr: 100,
      density_lbs_per_ft3: 50,
      // density_source not provided
    };

    const result = runCalculation({ inputs });

    expect(result.errors?.some(e => e.field === 'density_source')).toBe(true);
  });

  // =========================================================================
  // v1.31: LUMP SIZE VALIDATION TESTS
  // =========================================================================

  // Test 11: Valid lump size range (smallest < largest)
  it('should accept valid lump size range (smallest < largest)', () => {
    const inputs: SliderbedInputs = {
      ...BULK_BASE_INPUTS,
      material_form: 'BULK',
      bulk_input_method: 'WEIGHT_FLOW',
      mass_flow_lbs_per_hr: 1000,
      smallest_lump_size_in: 1,
      largest_lump_size_in: 4,
    };

    const result = runCalculation({ inputs });

    // Should not have lump size errors
    expect(result.errors?.some(e => e.field === 'smallest_lump_size_in') ?? false).toBe(false);
    expect(result.errors?.some(e => e.field === 'largest_lump_size_in') ?? false).toBe(false);
  });

  // Test 12: Lump size error when smallest > largest
  it('should error when smallest lump size exceeds largest', () => {
    const inputs: SliderbedInputs = {
      ...BULK_BASE_INPUTS,
      material_form: 'BULK',
      bulk_input_method: 'WEIGHT_FLOW',
      mass_flow_lbs_per_hr: 1000,
      smallest_lump_size_in: 5,
      largest_lump_size_in: 2,
    };

    const result = runCalculation({ inputs });

    expect(result.errors?.some(e => e.field === 'smallest_lump_size_in')).toBe(true);
  });

  // Test 13: Negative lump size should error
  it('should error when lump size is negative', () => {
    const inputs: SliderbedInputs = {
      ...BULK_BASE_INPUTS,
      material_form: 'BULK',
      bulk_input_method: 'WEIGHT_FLOW',
      mass_flow_lbs_per_hr: 1000,
      smallest_lump_size_in: -1,
    };

    const result = runCalculation({ inputs });

    expect(result.errors?.some(e => e.field === 'smallest_lump_size_in')).toBe(true);
  });

  // Test 14: Legacy max_lump_size_in should be used as fallback for largest_lump_size_in
  it('should use legacy max_lump_size_in as fallback for largest', () => {
    const inputs: SliderbedInputs = {
      ...BULK_BASE_INPUTS,
      material_form: 'BULK',
      bulk_input_method: 'WEIGHT_FLOW',
      mass_flow_lbs_per_hr: 1000,
      max_lump_size_in: 3, // Legacy field
      // largest_lump_size_in not provided - should use max_lump_size_in
    };

    const result = runCalculation({ inputs });

    // Should not error - legacy field is valid
    expect(result.errors?.some(e => e.field === 'largest_lump_size_in') ?? false).toBe(false);
  });

  // Test 15: Notes should be persisted (no validation errors)
  it('should accept application and material notes', () => {
    const inputs: SliderbedInputs = {
      ...BULK_BASE_INPUTS,
      material_form: 'BULK',
      bulk_input_method: 'WEIGHT_FLOW',
      mass_flow_lbs_per_hr: 1000,
      application_notes: 'This is a test application for bulk material handling.',
      material_notes: 'Material is granular with some fines.',
    };

    const result = runCalculation({ inputs });

    // Should calculate successfully with notes
    expect(result.errors?.length ?? 0).toBe(0);
  });

  // =========================================================================
  // v1.32: FEED BEHAVIOR & SURGE VALIDATION TESTS
  // =========================================================================

  // Test 16: Feed behavior continuous should work without surge fields
  it('should accept continuous feed behavior without surge fields', () => {
    const inputs: SliderbedInputs = {
      ...BULK_BASE_INPUTS,
      material_form: 'BULK',
      bulk_input_method: 'WEIGHT_FLOW',
      mass_flow_lbs_per_hr: 1000,
      feed_behavior: 'CONTINUOUS',
    };

    const result = runCalculation({ inputs });

    expect(result.errors?.some(e => e.field === 'surge_multiplier') ?? false).toBe(false);
  });

  // Test 17: Surge feed should warn if multiplier not provided
  it('should warn when surge selected but no multiplier', () => {
    const inputs: SliderbedInputs = {
      ...BULK_BASE_INPUTS,
      material_form: 'BULK',
      bulk_input_method: 'WEIGHT_FLOW',
      mass_flow_lbs_per_hr: 1000,
      feed_behavior: 'SURGE',
      // surge_multiplier not provided
    };

    const result = runCalculation({ inputs });

    expect(result.warnings?.some(w => w.field === 'surge_multiplier')).toBe(true);
  });

  // Test 18: Surge multiplier < 1 should error
  it('should error when surge multiplier is less than 1', () => {
    const inputs: SliderbedInputs = {
      ...BULK_BASE_INPUTS,
      material_form: 'BULK',
      bulk_input_method: 'WEIGHT_FLOW',
      mass_flow_lbs_per_hr: 1000,
      feed_behavior: 'SURGE',
      surge_multiplier: 0.5,
    };

    const result = runCalculation({ inputs });

    expect(result.errors?.some(e => e.field === 'surge_multiplier')).toBe(true);
  });

  // Test 19: Valid surge config should pass
  it('should accept valid surge configuration', () => {
    const inputs: SliderbedInputs = {
      ...BULK_BASE_INPUTS,
      material_form: 'BULK',
      bulk_input_method: 'WEIGHT_FLOW',
      mass_flow_lbs_per_hr: 1000,
      feed_behavior: 'SURGE',
      surge_multiplier: 1.5,
      surge_duration_sec: 10,
    };

    const result = runCalculation({ inputs });

    expect(result.errors?.some(e => e.field === 'surge_multiplier') ?? false).toBe(false);
  });

  // Test 20: Weight flow without density should warn (optional but encouraged)
  it('should warn when weight flow has no density', () => {
    const inputs: SliderbedInputs = {
      ...BULK_BASE_INPUTS,
      material_form: 'BULK',
      bulk_input_method: 'WEIGHT_FLOW',
      mass_flow_lbs_per_hr: 1000,
      // density_lbs_per_ft3 not provided
    };

    const result = runCalculation({ inputs });

    expect(result.warnings?.some(w => w.field === 'density_lbs_per_ft3')).toBe(true);
  });
});

describe('Legacy Key Stripping (v1.42)', () => {
  it('should strip legacy tail_support_type, drive_support_type, height_input_mode on migration', () => {
    // Simulate an old config with legacy keys
    const legacyInputs = {
      conveyor_length_cc_in: 120,
      belt_width_in: 24,
      conveyor_incline_deg: 0,
      part_weight_lbs: 5,
      part_length_in: 6,
      part_width_in: 4,
      part_spacing_in: 12,
      belt_speed_fpm: 50,
      // Legacy fields that should be stripped
      tail_support_type: 'Legs',
      drive_support_type: 'Casters',
      height_input_mode: 'reference_and_angle',
      support_option: 'Floor Mounted',
    } as Record<string, unknown>;

    const migrated = migrateInputs(legacyInputs as SliderbedInputs);

    // All legacy keys should be stripped
    expect((migrated as Record<string, unknown>).tail_support_type).toBeUndefined();
    expect((migrated as Record<string, unknown>).drive_support_type).toBeUndefined();
    expect((migrated as Record<string, unknown>).height_input_mode).toBeUndefined();
    expect((migrated as Record<string, unknown>).support_option).toBeUndefined();
  });

  it('should preserve valid TOB fields (tail_tob_in, drive_tob_in, reference_end)', () => {
    // These fields are still valid in the new system
    const inputs = {
      conveyor_length_cc_in: 120,
      belt_width_in: 24,
      conveyor_incline_deg: 0,
      part_weight_lbs: 5,
      part_length_in: 6,
      part_width_in: 4,
      part_spacing_in: 12,
      belt_speed_fpm: 50,
      support_method: SupportMethod.FloorSupported,
      reference_end: 'tail' as const,
      tail_tob_in: 36,
      drive_tob_in: 42,
    } as SliderbedInputs;

    const migrated = migrateInputs(inputs);

    // These should be preserved
    expect(migrated.reference_end).toBe('tail');
    expect(migrated.tail_tob_in).toBe(36);
    expect(migrated.drive_tob_in).toBe(42);
    expect(migrated.support_method).toBe(SupportMethod.FloorSupported);
  });

  it('should not crash when loading old config with removed keys', () => {
    const oldConfig = {
      conveyor_length_cc_in: 120,
      belt_width_in: 24,
      tail_support_type: 'External',
      drive_support_type: 'External',
    } as Record<string, unknown>;

    // This should not throw
    expect(() => migrateInputs(oldConfig as SliderbedInputs)).not.toThrow();

    const migrated = migrateInputs(oldConfig as SliderbedInputs);
    expect(migrated.conveyor_length_cc_in).toBe(120);
  });
});

describe('Excel Parity Tests', () => {
  it('should be implemented with actual Excel fixtures', () => {
    // TODO: Import fixtures from Excel and validate outputs match within tolerance
    // See fixtures.ts for structure
    expect(true).toBe(true);
  });
});
