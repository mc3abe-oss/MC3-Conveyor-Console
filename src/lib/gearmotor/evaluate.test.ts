/**
 * Tests for Gearmotor Candidate Evaluation Helper
 *
 * CANONICAL FORMULAS (LOCKED per Bob's directive 2026-01-07):
 *
 * SERVICE FACTOR:
 * - SF affects FILTERING ONLY (done in selector.ts)
 * - Filtering rule: service_factor_catalog >= applied_service_factor
 * - SF does NOT affect torque capacity calculations
 *
 * PASS/FAIL RULES:
 * - passTorque = catalog_torque >= raw_required_torque (no SF adjustment)
 * - passRpm = candidate RPM within tolerance of required RPM
 * - passSF = catalog_SF >= applied_SF
 *
 * MARGIN (uses RAW required torque, NO SF multiplier):
 * - margin = (catalog_output_torque_lb_in / required_output_torque_raw) - 1
 * - marginPct = margin * 100
 */

import { evaluateGearmotorCandidate, formatMarginPct } from './evaluate';

describe('evaluateGearmotorCandidate', () => {
  // ===========================================================================
  // REGRESSION TESTS FOR CRITICAL BUG FIXES
  // ===========================================================================

  describe('REGRESSION: Service Factor Filtering (STRICT)', () => {
    it('MUST EXCLUDE candidate when catalog SF < applied SF (SF_cat=0.9, applied=1.0)', () => {
      // CRITICAL REGRESSION TEST: This was the bug where SF=0.9 candidates
      // were incorrectly passing when applied SF=1.0
      const result = evaluateGearmotorCandidate({
        requiredTorque: 500,
        requiredRpm: 60,
        serviceFactor: 1.0,
        candidateTorque: 600,
        candidateSF: 0.9, // Catalog SF below applied SF
        candidateRpm: 60,
      });

      // passSF MUST be false when catalog SF < applied SF
      expect(result.passSF).toBe(false);
      expect(result.passAll).toBe(false);
    });

    it('MUST INCLUDE candidate when catalog SF >= applied SF (SF_cat=1.25, applied=1.0)', () => {
      const result = evaluateGearmotorCandidate({
        requiredTorque: 500,
        requiredRpm: 60,
        serviceFactor: 1.0,
        candidateTorque: 600,
        candidateSF: 1.25, // Catalog SF meets or exceeds applied SF
        candidateRpm: 60,
      });

      expect(result.passSF).toBe(true);
      expect(result.passTorque).toBe(true);
      expect(result.passRpm).toBe(true);
      expect(result.passAll).toBe(true);
    });

    it('MUST INCLUDE candidate when catalog SF equals applied SF', () => {
      const result = evaluateGearmotorCandidate({
        requiredTorque: 500,
        requiredRpm: 60,
        serviceFactor: 1.5,
        candidateTorque: 600,
        candidateSF: 1.5, // Exact match
        candidateRpm: 60,
      });

      expect(result.passSF).toBe(true);
    });

    it('handles low applied SF (e.g., 0.1) correctly', () => {
      // Per Bob: SF minimum is 0.1, not 0.5
      const result = evaluateGearmotorCandidate({
        requiredTorque: 500,
        requiredRpm: 60,
        serviceFactor: 0.1,
        candidateTorque: 600,
        candidateSF: 0.9, // 0.9 >= 0.1
        candidateRpm: 60,
      });

      expect(result.passSF).toBe(true);
    });
  });

  describe('REGRESSION: Margin Calculation uses RAW required torque (NO SF)', () => {
    it('MUST calculate margin WITHOUT service factor multiplier', () => {
      // CRITICAL REGRESSION TEST: Margin formula is:
      // margin = (catalog_torque / raw_required_torque) - 1
      // NOT: (catalog_torque / (required_torque * SF)) - 1
      const result = evaluateGearmotorCandidate({
        requiredTorque: 500,
        requiredRpm: 60,
        serviceFactor: 1.5, // SF should NOT affect margin
        candidateTorque: 750,
        candidateSF: 1.5,
        candidateRpm: 60,
      });

      // Expected: (750 / 500) - 1 = 0.5 = 50%
      // WRONG (old bug): (750 / 750) - 1 = 0 (if SF was applied to required)
      expect(result.marginPct).toBe(50);
      expect(result.requiredTorqueRaw).toBe(500); // Raw, NOT 750
    });

    it('margin is independent of applied service factor', () => {
      // Same torque values, different SF - margin should be IDENTICAL
      const resultSF1 = evaluateGearmotorCandidate({
        requiredTorque: 400,
        requiredRpm: 60,
        serviceFactor: 1.0,
        candidateTorque: 600,
        candidateSF: 1.0,
        candidateRpm: 60,
      });

      const resultSF2 = evaluateGearmotorCandidate({
        requiredTorque: 400,
        requiredRpm: 60,
        serviceFactor: 2.0, // Different SF
        candidateTorque: 600,
        candidateSF: 2.0,
        candidateRpm: 60,
      });

      // Both should have same margin: (600/400 - 1) * 100 = 50%
      expect(resultSF1.marginPct).toBe(50);
      expect(resultSF2.marginPct).toBe(50);
    });

    it('correctly calculates margin for real-world selection', () => {
      // Conveyor needs 218 lb-in, gearmotor provides 720 lb-in
      const result = evaluateGearmotorCandidate({
        requiredTorque: 218,
        requiredRpm: 60,
        serviceFactor: 1.5,
        candidateTorque: 720,
        candidateSF: 1.5,
        candidateRpm: 60,
      });

      // Margin = (720 / 218) - 1 = 2.3028 = 230.28%
      expect(result.marginPct).toBeCloseTo(230.28, 1);
    });
  });

  // ===========================================================================
  // TORQUE EVALUATION (NO SF ADJUSTMENT)
  // ===========================================================================

  describe('torque evaluation (raw values, no SF)', () => {
    it('passes when catalog torque >= required torque', () => {
      const result = evaluateGearmotorCandidate({
        requiredTorque: 500,
        requiredRpm: 60,
        serviceFactor: 1.5,
        candidateTorque: 500, // Exactly meets
        candidateSF: 1.5,
        candidateRpm: 60,
      });

      expect(result.passTorque).toBe(true);
      expect(result.requiredTorqueRaw).toBe(500);
      expect(result.candidateAvailableTorque).toBe(500);
      expect(result.marginPct).toBe(0);
    });

    it('passes when catalog torque exceeds required torque', () => {
      const result = evaluateGearmotorCandidate({
        requiredTorque: 500,
        requiredRpm: 60,
        serviceFactor: 1.5,
        candidateTorque: 600,
        candidateSF: 1.5,
        candidateRpm: 60,
      });

      expect(result.passTorque).toBe(true);
      expect(result.marginPct).toBeCloseTo(20, 5); // (600/500 - 1) * 100
    });

    it('fails when catalog torque < required torque', () => {
      const result = evaluateGearmotorCandidate({
        requiredTorque: 500,
        requiredRpm: 60,
        serviceFactor: 1.5,
        candidateTorque: 400,
        candidateSF: 1.5,
        candidateRpm: 60,
      });

      expect(result.passTorque).toBe(false);
      expect(result.marginPct).toBeCloseTo(-20, 5); // (400/500 - 1) * 100
    });
  });

  // ===========================================================================
  // RPM EVALUATION
  // ===========================================================================

  describe('RPM evaluation', () => {
    it('passes when RPM is within tolerance', () => {
      const result = evaluateGearmotorCandidate({
        requiredTorque: 500,
        requiredRpm: 60,
        serviceFactor: 1.5,
        candidateTorque: 600,
        candidateSF: 1.5,
        candidateRpm: 65, // ~8% off, within 15%
        speedTolerancePct: 15,
      });

      expect(result.passRpm).toBe(true);
    });

    it('fails when RPM is outside tolerance', () => {
      const result = evaluateGearmotorCandidate({
        requiredTorque: 500,
        requiredRpm: 60,
        serviceFactor: 1.5,
        candidateTorque: 600,
        candidateSF: 1.5,
        candidateRpm: 80, // ~33% off, outside 15%
        speedTolerancePct: 15,
      });

      expect(result.passRpm).toBe(false);
    });

    it('calculates RPM delta percentage correctly', () => {
      const result = evaluateGearmotorCandidate({
        requiredTorque: 500,
        requiredRpm: 100,
        serviceFactor: 1.5,
        candidateTorque: 600,
        candidateSF: 1.5,
        candidateRpm: 110,
      });

      expect(result.rpmDeltaPct).toBe(10); // (110-100)/100 * 100
    });

    it('handles negative RPM delta correctly', () => {
      const result = evaluateGearmotorCandidate({
        requiredTorque: 500,
        requiredRpm: 100,
        serviceFactor: 1.5,
        candidateTorque: 600,
        candidateSF: 1.5,
        candidateRpm: 90,
      });

      expect(result.rpmDeltaPct).toBe(-10); // (90-100)/100 * 100
    });

    it('uses default speed tolerance of 15%', () => {
      const result = evaluateGearmotorCandidate({
        requiredTorque: 500,
        requiredRpm: 100,
        serviceFactor: 1.5,
        candidateTorque: 600,
        candidateSF: 1.5,
        candidateRpm: 114, // 14% off, should pass
      });

      expect(result.passRpm).toBe(true);

      const resultFail = evaluateGearmotorCandidate({
        requiredTorque: 500,
        requiredRpm: 100,
        serviceFactor: 1.5,
        candidateTorque: 600,
        candidateSF: 1.5,
        candidateRpm: 116, // 16% off, should fail
      });

      expect(resultFail.passRpm).toBe(false);
    });
  });

  // ===========================================================================
  // OVERALL PASS/FAIL
  // ===========================================================================

  describe('overall pass/fail (all three conditions)', () => {
    it('passAll requires passTorque, passRpm, AND passSF', () => {
      const passing = evaluateGearmotorCandidate({
        requiredTorque: 500,
        requiredRpm: 60,
        serviceFactor: 1.0,
        candidateTorque: 600, // > 500
        candidateSF: 1.2, // >= 1.0
        candidateRpm: 60, // exact match
      });

      expect(passing.passTorque).toBe(true);
      expect(passing.passRpm).toBe(true);
      expect(passing.passSF).toBe(true);
      expect(passing.passAll).toBe(true);
    });

    it('passAll is false when torque fails', () => {
      const result = evaluateGearmotorCandidate({
        requiredTorque: 500,
        requiredRpm: 60,
        serviceFactor: 1.0,
        candidateTorque: 400, // < 500
        candidateSF: 1.2,
        candidateRpm: 60,
      });

      expect(result.passAll).toBe(false);
      expect(result.passTorque).toBe(false);
      expect(result.passRpm).toBe(true);
      expect(result.passSF).toBe(true);
    });

    it('passAll is false when RPM fails', () => {
      const result = evaluateGearmotorCandidate({
        requiredTorque: 500,
        requiredRpm: 60,
        serviceFactor: 1.0,
        candidateTorque: 600,
        candidateSF: 1.2,
        candidateRpm: 100, // way outside tolerance
        speedTolerancePct: 15,
      });

      expect(result.passAll).toBe(false);
      expect(result.passTorque).toBe(true);
      expect(result.passRpm).toBe(false);
      expect(result.passSF).toBe(true);
    });

    it('passAll is false when SF fails', () => {
      const result = evaluateGearmotorCandidate({
        requiredTorque: 500,
        requiredRpm: 60,
        serviceFactor: 1.5,
        candidateTorque: 600,
        candidateSF: 1.0, // < 1.5
        candidateRpm: 60,
      });

      expect(result.passAll).toBe(false);
      expect(result.passTorque).toBe(true);
      expect(result.passRpm).toBe(true);
      expect(result.passSF).toBe(false);
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('edge cases', () => {
    it('handles zero required torque gracefully', () => {
      const result = evaluateGearmotorCandidate({
        requiredTorque: 0,
        requiredRpm: 60,
        serviceFactor: 1.5,
        candidateTorque: 600,
        candidateSF: 1.5,
        candidateRpm: 60,
      });

      expect(result.marginPct).toBe(0);
      expect(result.passTorque).toBe(true);
    });

    it('handles zero required RPM gracefully', () => {
      const result = evaluateGearmotorCandidate({
        requiredTorque: 500,
        requiredRpm: 0,
        serviceFactor: 1.5,
        candidateTorque: 600,
        candidateSF: 1.5,
        candidateRpm: 60,
      });

      expect(result.rpmDeltaPct).toBe(0);
    });

    it('uses default candidateSF of 1.0 when not provided', () => {
      const result = evaluateGearmotorCandidate({
        requiredTorque: 500,
        requiredRpm: 60,
        serviceFactor: 0.5, // Applied SF below 1.0
        candidateTorque: 600,
        candidateSF: 1.0, // Default
        candidateRpm: 60,
      });

      expect(result.passSF).toBe(true); // 1.0 >= 0.5
    });
  });
});

describe('formatMarginPct', () => {
  it('rounds to nearest integer', () => {
    expect(formatMarginPct(20.4)).toBe(20);
    expect(formatMarginPct(20.5)).toBe(21);
    expect(formatMarginPct(-15.3)).toBe(-15);
  });
});
