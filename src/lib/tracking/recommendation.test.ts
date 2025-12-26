/**
 * BELT TRACKING RECOMMENDATION MODULE - TEST SUITE
 *
 * Tests the v1 tracking recommendation logic per specification:
 * - L/W bands: LOW ≤ 5, MEDIUM 5-10, HIGH > 10
 * - Disturbance severity rules
 * - Belt construction and application modifiers
 * - Recommendation matrix outcomes
 * - Preference override behavior
 */

import {
  calculateTrackingRecommendation,
  calculateLwRatio,
  calculateLwBand,
  countDisturbances,
  calculateRawSeverity,
  applyModifiers,
  getRecommendedModeFromMatrix,
  ApplicationClass,
  BeltConstruction,
  TrackingPreference,
  TrackingMode,
  LwBand,
  DisturbanceSeverity,
  TrackingRecommendationInput,
} from './recommendation';

describe('Belt Tracking Recommendation Module', () => {
  // ========================================================================
  // L/W RATIO TESTS
  // ========================================================================

  describe('calculateLwRatio', () => {
    it('should calculate ratio correctly', () => {
      expect(calculateLwRatio(100, 20)).toBe(5.0);
      expect(calculateLwRatio(120, 24)).toBe(5.0);
      expect(calculateLwRatio(150, 12)).toBe(12.5);
    });

    it('should round to 0.1', () => {
      expect(calculateLwRatio(100, 33)).toBe(3.0); // 3.0303... -> 3.0
      expect(calculateLwRatio(100, 15)).toBe(6.7); // 6.666... -> 6.7
    });

    it('should handle zero width', () => {
      expect(calculateLwRatio(100, 0)).toBe(Infinity);
    });
  });

  describe('calculateLwBand', () => {
    it('should classify LOW band (≤5)', () => {
      expect(calculateLwBand(3.0)).toBe(LwBand.Low);
      expect(calculateLwBand(5.0)).toBe(LwBand.Low);
    });

    it('should classify MEDIUM band (5-10)', () => {
      expect(calculateLwBand(5.1)).toBe(LwBand.Medium);
      expect(calculateLwBand(7.5)).toBe(LwBand.Medium);
      expect(calculateLwBand(10.0)).toBe(LwBand.Medium);
    });

    it('should classify HIGH band (>10)', () => {
      expect(calculateLwBand(10.1)).toBe(LwBand.High);
      expect(calculateLwBand(15.0)).toBe(LwBand.High);
      expect(calculateLwBand(20.0)).toBe(LwBand.High);
    });
  });

  // ========================================================================
  // DISTURBANCE COUNT TESTS
  // ========================================================================

  describe('countDisturbances', () => {
    it('should count zero disturbances', () => {
      expect(countDisturbances({})).toBe(0);
    });

    it('should count individual disturbances', () => {
      expect(countDisturbances({ reversing_operation: true })).toBe(1);
      expect(countDisturbances({ disturbance_side_loading: true })).toBe(1);
      expect(countDisturbances({ disturbance_load_variability: true })).toBe(1);
      expect(countDisturbances({ disturbance_environment: true })).toBe(1);
      expect(countDisturbances({ disturbance_installation_risk: true })).toBe(1);
    });

    it('should count multiple disturbances', () => {
      expect(
        countDisturbances({
          reversing_operation: true,
          disturbance_side_loading: true,
        })
      ).toBe(2);

      expect(
        countDisturbances({
          reversing_operation: true,
          disturbance_side_loading: true,
          disturbance_environment: true,
        })
      ).toBe(3);

      expect(
        countDisturbances({
          reversing_operation: true,
          disturbance_side_loading: true,
          disturbance_load_variability: true,
          disturbance_environment: true,
          disturbance_installation_risk: true,
        })
      ).toBe(5);
    });
  });

  // ========================================================================
  // RAW SEVERITY TESTS
  // ========================================================================

  describe('calculateRawSeverity', () => {
    it('should return minimal for count = 0', () => {
      expect(calculateRawSeverity({})).toBe(DisturbanceSeverity.Minimal);
    });

    it('should return moderate for count = 1', () => {
      expect(
        calculateRawSeverity({ disturbance_environment: true })
      ).toBe(DisturbanceSeverity.Moderate);
    });

    it('should return moderate for count = 2 (without reversing+side_loading)', () => {
      expect(
        calculateRawSeverity({
          disturbance_environment: true,
          disturbance_load_variability: true,
        })
      ).toBe(DisturbanceSeverity.Moderate);
    });

    it('should return significant for count >= 3', () => {
      expect(
        calculateRawSeverity({
          disturbance_environment: true,
          disturbance_load_variability: true,
          disturbance_installation_risk: true,
        })
      ).toBe(DisturbanceSeverity.Significant);
    });

    it('should return significant for reversing + side_loading (even if count = 2)', () => {
      const input = {
        reversing_operation: true,
        disturbance_side_loading: true,
      };
      expect(countDisturbances(input)).toBe(2);
      expect(calculateRawSeverity(input)).toBe(DisturbanceSeverity.Significant);
    });
  });

  // ========================================================================
  // MODIFIER TESTS
  // ========================================================================

  describe('applyModifiers', () => {
    it('should not modify severity when no modifiers apply', () => {
      expect(
        applyModifiers(DisturbanceSeverity.Minimal, ApplicationClass.UnitHandling, BeltConstruction.General)
      ).toBe(DisturbanceSeverity.Minimal);
    });

    it('should nudge severity for bulk handling', () => {
      expect(
        applyModifiers(DisturbanceSeverity.Minimal, ApplicationClass.BulkHandling, BeltConstruction.General)
      ).toBe(DisturbanceSeverity.Moderate);

      expect(
        applyModifiers(DisturbanceSeverity.Moderate, ApplicationClass.BulkHandling, BeltConstruction.General)
      ).toBe(DisturbanceSeverity.Significant);
    });

    it('should nudge severity for steel cord / very stiff belt', () => {
      expect(
        applyModifiers(DisturbanceSeverity.Minimal, ApplicationClass.UnitHandling, BeltConstruction.SteelCordOrVeryStiff)
      ).toBe(DisturbanceSeverity.Moderate);

      expect(
        applyModifiers(DisturbanceSeverity.Moderate, ApplicationClass.UnitHandling, BeltConstruction.SteelCordOrVeryStiff)
      ).toBe(DisturbanceSeverity.Significant);
    });

    it('should nudge severity for profiled sidewall / high cleat belt', () => {
      expect(
        applyModifiers(DisturbanceSeverity.Minimal, ApplicationClass.UnitHandling, BeltConstruction.ProfiledSidewallOrHighCleat)
      ).toBe(DisturbanceSeverity.Moderate);
    });

    it('should apply both modifiers cumulatively', () => {
      // Bulk + stiff belt: minimal -> moderate -> significant
      expect(
        applyModifiers(DisturbanceSeverity.Minimal, ApplicationClass.BulkHandling, BeltConstruction.SteelCordOrVeryStiff)
      ).toBe(DisturbanceSeverity.Significant);
    });

    it('should cap at significant', () => {
      expect(
        applyModifiers(DisturbanceSeverity.Significant, ApplicationClass.BulkHandling, BeltConstruction.SteelCordOrVeryStiff)
      ).toBe(DisturbanceSeverity.Significant);
    });
  });

  // ========================================================================
  // RECOMMENDATION MATRIX TESTS
  // ========================================================================

  describe('getRecommendedModeFromMatrix', () => {
    // LOW band tests
    describe('LOW band', () => {
      it('LOW + minimal -> Crowned (no note)', () => {
        const result = getRecommendedModeFromMatrix(LwBand.Low, DisturbanceSeverity.Minimal);
        expect(result.mode).toBe(TrackingMode.Crowned);
        expect(result.withNote).toBe(false);
      });

      it('LOW + moderate -> Crowned (with note)', () => {
        const result = getRecommendedModeFromMatrix(LwBand.Low, DisturbanceSeverity.Moderate);
        expect(result.mode).toBe(TrackingMode.Crowned);
        expect(result.withNote).toBe(true);
      });

      it('LOW + significant -> Hybrid', () => {
        const result = getRecommendedModeFromMatrix(LwBand.Low, DisturbanceSeverity.Significant);
        expect(result.mode).toBe(TrackingMode.Hybrid);
        expect(result.withNote).toBe(false);
      });
    });

    // MEDIUM band tests
    describe('MEDIUM band', () => {
      it('MEDIUM + minimal -> Crowned (with note)', () => {
        const result = getRecommendedModeFromMatrix(LwBand.Medium, DisturbanceSeverity.Minimal);
        expect(result.mode).toBe(TrackingMode.Crowned);
        expect(result.withNote).toBe(true);
      });

      it('MEDIUM + moderate -> Hybrid', () => {
        const result = getRecommendedModeFromMatrix(LwBand.Medium, DisturbanceSeverity.Moderate);
        expect(result.mode).toBe(TrackingMode.Hybrid);
        expect(result.withNote).toBe(false);
      });

      it('MEDIUM + significant -> V-guided', () => {
        const result = getRecommendedModeFromMatrix(LwBand.Medium, DisturbanceSeverity.Significant);
        expect(result.mode).toBe(TrackingMode.VGuided);
        expect(result.withNote).toBe(false);
      });
    });

    // HIGH band tests
    describe('HIGH band', () => {
      it('HIGH + minimal -> Hybrid', () => {
        const result = getRecommendedModeFromMatrix(LwBand.High, DisturbanceSeverity.Minimal);
        expect(result.mode).toBe(TrackingMode.Hybrid);
        expect(result.withNote).toBe(false);
      });

      it('HIGH + moderate -> V-guided', () => {
        const result = getRecommendedModeFromMatrix(LwBand.High, DisturbanceSeverity.Moderate);
        expect(result.mode).toBe(TrackingMode.VGuided);
        expect(result.withNote).toBe(false);
      });

      it('HIGH + significant -> V-guided', () => {
        const result = getRecommendedModeFromMatrix(LwBand.High, DisturbanceSeverity.Significant);
        expect(result.mode).toBe(TrackingMode.VGuided);
        expect(result.withNote).toBe(false);
      });
    });
  });

  // ========================================================================
  // FULL INTEGRATION TESTS
  // ========================================================================

  describe('calculateTrackingRecommendation (integration)', () => {
    // Helper to create base input
    const baseInput = (overrides: Partial<TrackingRecommendationInput> = {}): TrackingRecommendationInput => ({
      conveyor_length_cc_in: 100,
      belt_width_in: 24,
      ...overrides,
    });

    describe('Matrix outcomes with geometry', () => {
      it('LOW + minimal -> Crowned', () => {
        // L/W = 100/24 = 4.2 (LOW), no disturbances (minimal)
        const result = calculateTrackingRecommendation(baseInput());
        expect(result.tracking_lw_band).toBe(LwBand.Low);
        expect(result.tracking_disturbance_severity_modified).toBe(DisturbanceSeverity.Minimal);
        expect(result.tracking_mode_recommended).toBe(TrackingMode.Crowned);
        expect(result.tracking_recommendation_note).toBeNull();
      });

      it('LOW + significant -> Hybrid', () => {
        // L/W = 4.2 (LOW), 3+ disturbances (significant)
        const result = calculateTrackingRecommendation(
          baseInput({
            disturbance_side_loading: true,
            disturbance_load_variability: true,
            disturbance_environment: true,
          })
        );
        expect(result.tracking_lw_band).toBe(LwBand.Low);
        expect(result.tracking_disturbance_severity_modified).toBe(DisturbanceSeverity.Significant);
        expect(result.tracking_mode_recommended).toBe(TrackingMode.Hybrid);
      });

      it('MEDIUM + minimal -> Crowned with note', () => {
        // L/W = 180/24 = 7.5 (MEDIUM), no disturbances
        const result = calculateTrackingRecommendation(
          baseInput({ conveyor_length_cc_in: 180 })
        );
        expect(result.tracking_lw_band).toBe(LwBand.Medium);
        expect(result.tracking_disturbance_severity_modified).toBe(DisturbanceSeverity.Minimal);
        expect(result.tracking_mode_recommended).toBe(TrackingMode.Crowned);
        expect(result.tracking_recommendation_note).not.toBeNull();
      });

      it('MEDIUM + moderate -> Hybrid', () => {
        // L/W = 7.5 (MEDIUM), 1 disturbance (moderate)
        const result = calculateTrackingRecommendation(
          baseInput({
            conveyor_length_cc_in: 180,
            disturbance_environment: true,
          })
        );
        expect(result.tracking_lw_band).toBe(LwBand.Medium);
        expect(result.tracking_disturbance_severity_modified).toBe(DisturbanceSeverity.Moderate);
        expect(result.tracking_mode_recommended).toBe(TrackingMode.Hybrid);
      });

      it('MEDIUM + significant -> V-guided', () => {
        // L/W = 7.5 (MEDIUM), 3+ disturbances (significant)
        const result = calculateTrackingRecommendation(
          baseInput({
            conveyor_length_cc_in: 180,
            disturbance_side_loading: true,
            disturbance_load_variability: true,
            disturbance_environment: true,
          })
        );
        expect(result.tracking_lw_band).toBe(LwBand.Medium);
        expect(result.tracking_disturbance_severity_modified).toBe(DisturbanceSeverity.Significant);
        expect(result.tracking_mode_recommended).toBe(TrackingMode.VGuided);
      });

      it('HIGH + minimal -> Hybrid', () => {
        // L/W = 300/24 = 12.5 (HIGH), no disturbances
        const result = calculateTrackingRecommendation(
          baseInput({ conveyor_length_cc_in: 300 })
        );
        expect(result.tracking_lw_band).toBe(LwBand.High);
        expect(result.tracking_disturbance_severity_modified).toBe(DisturbanceSeverity.Minimal);
        expect(result.tracking_mode_recommended).toBe(TrackingMode.Hybrid);
      });

      it('HIGH + moderate -> V-guided', () => {
        // L/W = 12.5 (HIGH), 1 disturbance
        const result = calculateTrackingRecommendation(
          baseInput({
            conveyor_length_cc_in: 300,
            disturbance_environment: true,
          })
        );
        expect(result.tracking_lw_band).toBe(LwBand.High);
        expect(result.tracking_disturbance_severity_modified).toBe(DisturbanceSeverity.Moderate);
        expect(result.tracking_mode_recommended).toBe(TrackingMode.VGuided);
      });
    });

    describe('Special severity rules', () => {
      it('reversing + side_loading triggers significant even with count=2', () => {
        const result = calculateTrackingRecommendation(
          baseInput({
            reversing_operation: true,
            disturbance_side_loading: true,
          })
        );
        expect(result.tracking_disturbance_count).toBe(2);
        expect(result.tracking_disturbance_severity_raw).toBe(DisturbanceSeverity.Significant);
      });
    });

    describe('Modifier effects', () => {
      it('bulk handling nudges severity up', () => {
        // L/W = 4.2 (LOW), 1 disturbance -> moderate raw -> significant modified
        const result = calculateTrackingRecommendation(
          baseInput({
            application_class: ApplicationClass.BulkHandling,
            disturbance_environment: true,
          })
        );
        expect(result.tracking_disturbance_severity_raw).toBe(DisturbanceSeverity.Moderate);
        expect(result.tracking_disturbance_severity_modified).toBe(DisturbanceSeverity.Significant);
        expect(result.tracking_mode_recommended).toBe(TrackingMode.Hybrid);
      });

      it('stiff belt nudges severity up', () => {
        // L/W = 4.2 (LOW), minimal raw -> moderate modified
        const result = calculateTrackingRecommendation(
          baseInput({
            belt_construction: BeltConstruction.SteelCordOrVeryStiff,
          })
        );
        expect(result.tracking_disturbance_severity_raw).toBe(DisturbanceSeverity.Minimal);
        expect(result.tracking_disturbance_severity_modified).toBe(DisturbanceSeverity.Moderate);
        // LOW + moderate -> Crowned with note
        expect(result.tracking_mode_recommended).toBe(TrackingMode.Crowned);
        expect(result.tracking_recommendation_note).not.toBeNull();
      });

      it('profiled sidewall nudges severity up', () => {
        const result = calculateTrackingRecommendation(
          baseInput({
            belt_construction: BeltConstruction.ProfiledSidewallOrHighCleat,
          })
        );
        expect(result.tracking_disturbance_severity_raw).toBe(DisturbanceSeverity.Minimal);
        expect(result.tracking_disturbance_severity_modified).toBe(DisturbanceSeverity.Moderate);
      });

      it('bulk + stiff belt applies both modifiers', () => {
        // minimal raw -> moderate (bulk) -> significant (stiff)
        const result = calculateTrackingRecommendation(
          baseInput({
            application_class: ApplicationClass.BulkHandling,
            belt_construction: BeltConstruction.SteelCordOrVeryStiff,
          })
        );
        expect(result.tracking_disturbance_severity_raw).toBe(DisturbanceSeverity.Minimal);
        expect(result.tracking_disturbance_severity_modified).toBe(DisturbanceSeverity.Significant);
        // LOW + significant -> Hybrid
        expect(result.tracking_mode_recommended).toBe(TrackingMode.Hybrid);
      });
    });

    describe('Preference override', () => {
      it('forces crowned when preferred', () => {
        // Would recommend Hybrid (HIGH + minimal), but user prefers crowned
        const result = calculateTrackingRecommendation(
          baseInput({
            conveyor_length_cc_in: 300,
            tracking_preference: TrackingPreference.PreferCrowned,
          })
        );
        expect(result.tracking_mode_recommended).toBe(TrackingMode.Crowned);
        // Should show margin note since crowned < hybrid
        expect(result.tracking_recommendation_note).toContain('less tracking control');
      });

      it('forces v-guided when preferred', () => {
        // Would recommend Crowned (LOW + minimal), but user prefers v-guided
        const result = calculateTrackingRecommendation(
          baseInput({
            tracking_preference: TrackingPreference.PreferVGuided,
          })
        );
        expect(result.tracking_mode_recommended).toBe(TrackingMode.VGuided);
        // No warning needed when user chooses more control
        expect(result.tracking_recommendation_note).toBeNull();
      });

      it('forces hybrid when preferred', () => {
        const result = calculateTrackingRecommendation(
          baseInput({
            tracking_preference: TrackingPreference.PreferHybrid,
          })
        );
        expect(result.tracking_mode_recommended).toBe(TrackingMode.Hybrid);
      });

      it('shows margin note when preference conflicts with recommendation', () => {
        // HIGH + moderate -> V-guided recommended, but user prefers Crowned
        const result = calculateTrackingRecommendation(
          baseInput({
            conveyor_length_cc_in: 300,
            disturbance_environment: true,
            tracking_preference: TrackingPreference.PreferCrowned,
          })
        );
        expect(result.tracking_mode_recommended).toBe(TrackingMode.Crowned);
        expect(result.tracking_recommendation_note).not.toBeNull();
        expect(result.tracking_recommendation_rationale).toContain('User preference applied');
      });

      it('no margin note when preference matches recommendation', () => {
        // LOW + minimal -> Crowned recommended, user also prefers Crowned
        const result = calculateTrackingRecommendation(
          baseInput({
            tracking_preference: TrackingPreference.PreferCrowned,
          })
        );
        expect(result.tracking_mode_recommended).toBe(TrackingMode.Crowned);
        // No conflict, no note
        expect(result.tracking_recommendation_note).toBeNull();
      });
    });

    describe('Output fields', () => {
      it('includes all required output fields', () => {
        const result = calculateTrackingRecommendation(baseInput());

        expect(result.tracking_lw_ratio).toBeDefined();
        expect(result.tracking_lw_band).toBeDefined();
        expect(result.tracking_disturbance_count).toBeDefined();
        expect(result.tracking_disturbance_severity_raw).toBeDefined();
        expect(result.tracking_disturbance_severity_modified).toBeDefined();
        expect(result.tracking_mode_recommended).toBeDefined();
        expect(result.tracking_recommendation_rationale).toBeDefined();
        // note can be null
        expect('tracking_recommendation_note' in result).toBe(true);
      });

      it('L/W ratio is rounded to 0.1', () => {
        const result = calculateTrackingRecommendation(
          baseInput({ conveyor_length_cc_in: 100, belt_width_in: 33 })
        );
        expect(result.tracking_lw_ratio).toBe(3.0);
      });
    });
  });
});
