/**
 * SLIDERBED CONVEYOR v1 - TRACKING TESTS
 * 
 * Split from model.test.ts for readability.
 * Contains: Belt Tracking Guidance
 */

import { runCalculation } from '../../../lib/calculator/engine';
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
  SupportOption,
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
  SideLoadingSeverity,
  DriveLocation,
  GearmotorOrientation,
  DriveHand,
  BeltTrackingMethod,
  ShaftDiameterMode,
  VGuideProfile,
  FrameHeightMode,
  SpeedMode,
} from '../schema';
import {
  calculateTrackingGuidance,
  getTrackingTooltip,
  isTrackingSelectionOptimal,
  getRiskLevelColor,
  TrackingRiskLevel,
} from '../tracking-guidance';

describe('Belt Tracking Guidance', () => {
  // Application field defaults (used in all tests)
  const TRACKING_APPLICATION_DEFAULTS = {
    material_type: MaterialType.Steel,
    process_type: ProcessType.Assembly,
    parts_sharp: PartsSharp.No,
    environment_factors: [EnvironmentFactors.Indoor],
    ambient_temperature: AmbientTemperature.Normal,
    power_feed: PowerFeed.V480_3Ph,
    controls_package: ControlsPackage.StartStop,
    spec_source: SpecSource.Standard,
    support_option: SupportOption.FloorMounted,
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

  const baseInputs: SliderbedInputs = {
    conveyor_length_cc_in: 72, // 72" / 24" = 3:1 L:W ratio (Low)
    belt_width_in: 24,
    pulley_diameter_in: 2.5,
    belt_speed_fpm: 50, // Low speed
    drive_rpm: 100,
    part_weight_lbs: 5,
    part_length_in: 12,
    part_width_in: 6,
    drop_height_in: 0,
    part_temperature_class: PartTemperatureClass.Ambient,
    fluid_type: FluidType.None,
    orientation: Orientation.Lengthwise,
    part_spacing_in: 0,
    ...TRACKING_APPLICATION_DEFAULTS,
  };

  describe('Risk Assessment - L:W Ratio', () => {
    it('should assess low risk for L:W <= 3:1', () => {
      const inputs = { ...baseInputs, conveyor_length_cc_in: 72, belt_width_in: 24 }; // 3:1
      const guidance = calculateTrackingGuidance(inputs);

      const lwFactor = guidance.factors.find(f => f.name === 'Length-to-Width Ratio');
      expect(lwFactor?.risk).toBe(TrackingRiskLevel.Low);
    });

    it('should assess medium risk for L:W between 3:1 and 6:1', () => {
      const inputs = { ...baseInputs, conveyor_length_cc_in: 120, belt_width_in: 24 }; // 5:1
      const guidance = calculateTrackingGuidance(inputs);

      const lwFactor = guidance.factors.find(f => f.name === 'Length-to-Width Ratio');
      expect(lwFactor?.risk).toBe(TrackingRiskLevel.Medium);
    });

    it('should assess high risk for L:W > 6:1', () => {
      const inputs = { ...baseInputs, conveyor_length_cc_in: 180, belt_width_in: 24 }; // 7.5:1
      const guidance = calculateTrackingGuidance(inputs);

      const lwFactor = guidance.factors.find(f => f.name === 'Length-to-Width Ratio');
      expect(lwFactor?.risk).toBe(TrackingRiskLevel.High);
    });
  });

  describe('Risk Assessment - Reversing Operation', () => {
    it('should assess low risk for one-direction operation', () => {
      const inputs = { ...baseInputs, direction_mode: DirectionMode.OneDirection };
      const guidance = calculateTrackingGuidance(inputs);

      const reverseFactor = guidance.factors.find(f => f.name === 'Reversing Operation');
      expect(reverseFactor?.risk).toBe(TrackingRiskLevel.Low);
    });

    it('should assess high risk for reversing operation', () => {
      const inputs = { ...baseInputs, direction_mode: DirectionMode.Reversing };
      const guidance = calculateTrackingGuidance(inputs);

      const reverseFactor = guidance.factors.find(f => f.name === 'Reversing Operation');
      expect(reverseFactor?.risk).toBe(TrackingRiskLevel.High);
    });
  });

  describe('Risk Assessment - Side Loading', () => {
    it('should assess low risk for no side loading', () => {
      const inputs = { ...baseInputs, side_loading_direction: SideLoadingDirection.None };
      const guidance = calculateTrackingGuidance(inputs);

      const sideFactor = guidance.factors.find(f => f.name === 'Side Loading');
      expect(sideFactor?.risk).toBe(TrackingRiskLevel.Low);
    });

    it('should assess medium risk for light side loading', () => {
      const inputs = {
        ...baseInputs,
        side_loading_direction: SideLoadingDirection.Left,
        side_loading_severity: SideLoadingSeverity.Light,
      };
      const guidance = calculateTrackingGuidance(inputs);

      const sideFactor = guidance.factors.find(f => f.name === 'Side Loading');
      expect(sideFactor?.risk).toBe(TrackingRiskLevel.Medium);
    });

    it('should assess high risk for heavy side loading', () => {
      const inputs = {
        ...baseInputs,
        side_loading_direction: SideLoadingDirection.Both,
        side_loading_severity: SideLoadingSeverity.Heavy,
      };
      const guidance = calculateTrackingGuidance(inputs);

      const sideFactor = guidance.factors.find(f => f.name === 'Side Loading');
      expect(sideFactor?.risk).toBe(TrackingRiskLevel.High);
    });
  });

  describe('Risk Assessment - Environment', () => {
    it('should assess low risk for no environment factors', () => {
      const inputs = { ...baseInputs, environment_factors: [] };
      const guidance = calculateTrackingGuidance(inputs);

      const envFactor = guidance.factors.find(f => f.name === 'Environment');
      expect(envFactor?.risk).toBe(TrackingRiskLevel.Low);
    });

    it('should assess medium risk for washdown environment', () => {
      const inputs = { ...baseInputs, environment_factors: [EnvironmentFactors.Washdown] };
      const guidance = calculateTrackingGuidance(inputs);

      const envFactor = guidance.factors.find(f => f.name === 'Environment');
      expect(envFactor?.risk).toBe(TrackingRiskLevel.Medium);
    });

    it('should assess medium risk for dusty environment', () => {
      const inputs = { ...baseInputs, environment_factors: [EnvironmentFactors.Dusty] };
      const guidance = calculateTrackingGuidance(inputs);

      const envFactor = guidance.factors.find(f => f.name === 'Environment');
      expect(envFactor?.risk).toBe(TrackingRiskLevel.Medium);
    });

    // v1.9: Multi-select environment tests
    it('should assess highest risk when multiple environments selected', () => {
      const inputs = { ...baseInputs, environment_factors: [EnvironmentFactors.Outdoor, EnvironmentFactors.Washdown] };
      const guidance = calculateTrackingGuidance(inputs);

      const envFactor = guidance.factors.find(f => f.name === 'Environment');
      // Washdown is Medium, Outdoor is Low - should take highest (Medium)
      expect(envFactor?.risk).toBe(TrackingRiskLevel.Medium);
    });

    it('should handle all low-risk environments as low risk', () => {
      const inputs = { ...baseInputs, environment_factors: [EnvironmentFactors.Outdoor] };
      const guidance = calculateTrackingGuidance(inputs);

      const envFactor = guidance.factors.find(f => f.name === 'Environment');
      expect(envFactor?.risk).toBe(TrackingRiskLevel.Low);
    });
  });

  describe('Risk Assessment - Belt Speed', () => {
    it('should assess low risk for speed <= 100 FPM', () => {
      const inputs = { ...baseInputs, belt_speed_fpm: 80 };
      const guidance = calculateTrackingGuidance(inputs);

      const speedFactor = guidance.factors.find(f => f.name === 'Belt Speed');
      expect(speedFactor?.risk).toBe(TrackingRiskLevel.Low);
    });

    it('should assess medium risk for speed between 100-200 FPM', () => {
      const inputs = { ...baseInputs, belt_speed_fpm: 150 };
      const guidance = calculateTrackingGuidance(inputs);

      const speedFactor = guidance.factors.find(f => f.name === 'Belt Speed');
      expect(speedFactor?.risk).toBe(TrackingRiskLevel.Medium);
    });

    it('should assess high risk for speed > 200 FPM', () => {
      const inputs = { ...baseInputs, belt_speed_fpm: 250 };
      const guidance = calculateTrackingGuidance(inputs);

      const speedFactor = guidance.factors.find(f => f.name === 'Belt Speed');
      expect(speedFactor?.risk).toBe(TrackingRiskLevel.High);
    });
  });

  describe('Overall Recommendations', () => {
    it('should recommend crowned for low-risk conveyor', () => {
      const inputs = {
        ...baseInputs,
        conveyor_length_cc_in: 60, // 2.5:1 L:W
        belt_width_in: 24,
        belt_speed_fpm: 50,
        direction_mode: DirectionMode.OneDirection,
        side_loading_direction: SideLoadingDirection.None,
        environment_factors: [EnvironmentFactors.Indoor],
      };
      const guidance = calculateTrackingGuidance(inputs);

      expect(guidance.recommendation).toBe(BeltTrackingMethod.Crowned);
      expect(guidance.riskLevel).toBe(TrackingRiskLevel.Low);
    });

    it('should recommend V-guided for high-risk conveyor', () => {
      const inputs = {
        ...baseInputs,
        conveyor_length_cc_in: 180, // 7.5:1 L:W (High)
        belt_width_in: 24,
        direction_mode: DirectionMode.Reversing, // High
      };
      const guidance = calculateTrackingGuidance(inputs);

      expect(guidance.recommendation).toBe(BeltTrackingMethod.VGuided);
      expect(guidance.riskLevel).toBe(TrackingRiskLevel.High);
    });

    it('should recommend V-guided when multiple medium risks exist', () => {
      const inputs = {
        ...baseInputs,
        conveyor_length_cc_in: 120, // 5:1 L:W (Medium)
        belt_width_in: 24,
        belt_speed_fpm: 150, // Medium
        environment_factors: [EnvironmentFactors.Washdown], // Medium
      };
      const guidance = calculateTrackingGuidance(inputs);

      expect(guidance.recommendation).toBe(BeltTrackingMethod.VGuided);
      expect(guidance.riskLevel).toBe(TrackingRiskLevel.High); // Multiple mediums = High
    });
  });

  describe('Warnings', () => {
    it('should warn when reversing with crowned selected', () => {
      const inputs = {
        ...baseInputs,
        direction_mode: DirectionMode.Reversing,
        belt_tracking_method: BeltTrackingMethod.Crowned,
      };
      const guidance = calculateTrackingGuidance(inputs);

      expect(guidance.warnings.some(w => w.includes('Reversing'))).toBe(true);
    });

    it('should warn when high L:W with crowned selected', () => {
      const inputs = {
        ...baseInputs,
        conveyor_length_cc_in: 180, // 7.5:1 L:W
        belt_width_in: 24,
        belt_tracking_method: BeltTrackingMethod.Crowned,
      };
      const guidance = calculateTrackingGuidance(inputs);

      expect(guidance.warnings.some(w => w.includes('length-to-width'))).toBe(true);
    });

    it('should warn when low L:W with crowned selected', () => {
      const inputs = {
        ...baseInputs,
        conveyor_length_cc_in: 40, // 40/30 = 1.33:1 L:W (too low)
        belt_width_in: 30,
        belt_tracking_method: BeltTrackingMethod.Crowned,
      };
      const guidance = calculateTrackingGuidance(inputs);

      expect(guidance.warnings.some(w => w.includes('Low length-to-width'))).toBe(true);
    });

    it('should NOT warn when low L:W with V-guided selected', () => {
      const inputs = {
        ...baseInputs,
        conveyor_length_cc_in: 40, // 1.33:1 L:W (too low for crowned)
        belt_width_in: 30,
        belt_tracking_method: BeltTrackingMethod.VGuided,
        v_guide_profile: 'K10',
      };
      const guidance = calculateTrackingGuidance(inputs);

      expect(guidance.warnings.some(w => w.includes('Low length-to-width'))).toBe(false);
    });

    it('should NOT warn when L:W is exactly at threshold (2.0) with crowned', () => {
      const inputs = {
        ...baseInputs,
        conveyor_length_cc_in: 60, // 60/30 = 2.0:1 L:W (at threshold, not below)
        belt_width_in: 30,
        belt_tracking_method: BeltTrackingMethod.Crowned,
      };
      const guidance = calculateTrackingGuidance(inputs);

      // Threshold is strict < 2.0, so 2.0 exactly should NOT warn
      expect(guidance.warnings.some(w => w.includes('Low length-to-width'))).toBe(false);
    });

    it('should warn when heavy side loading with crowned selected', () => {
      const inputs = {
        ...baseInputs,
        side_loading_direction: SideLoadingDirection.Left,
        side_loading_severity: SideLoadingSeverity.Heavy,
        belt_tracking_method: BeltTrackingMethod.Crowned,
      };
      const guidance = calculateTrackingGuidance(inputs);

      expect(guidance.warnings.some(w => w.includes('side loading'))).toBe(true);
    });
  });

  describe('Helper Functions', () => {
    it('getTrackingTooltip should return appropriate text', () => {
      const lowRiskInputs = { ...baseInputs };
      const tooltip = getTrackingTooltip(lowRiskInputs);

      expect(tooltip).toContain('suitable');
    });

    it('isTrackingSelectionOptimal should return true for matching selection', () => {
      const inputs = {
        ...baseInputs,
        direction_mode: DirectionMode.OneDirection,
        belt_tracking_method: BeltTrackingMethod.Crowned,
      };

      expect(isTrackingSelectionOptimal(inputs)).toBe(true);
    });

    it('isTrackingSelectionOptimal should return false for non-optimal selection', () => {
      const inputs = {
        ...baseInputs,
        direction_mode: DirectionMode.Reversing,
        belt_tracking_method: BeltTrackingMethod.Crowned,
      };

      expect(isTrackingSelectionOptimal(inputs)).toBe(false);
    });

    it('getRiskLevelColor should return correct classes', () => {
      expect(getRiskLevelColor(TrackingRiskLevel.Low)).toContain('green');
      expect(getRiskLevelColor(TrackingRiskLevel.Medium)).toContain('yellow');
      expect(getRiskLevelColor(TrackingRiskLevel.High)).toContain('red');
    });
  });
});
