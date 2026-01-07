/**
 * Tests for Gearmotor Candidate Evaluation Helper
 *
 * CANONICAL FORMULAS:
 * - required_torque_with_sf = required_torque * service_factor
 * - candidate_available_torque = catalog_torque (raw, no SF applied)
 * - passTorque = candidate_available_torque >= required_torque_with_sf
 * - marginPct = (candidate_available_torque - required_torque_with_sf) / required_torque_with_sf * 100
 */

import { evaluateGearmotorCandidate, formatMarginPct } from './evaluate';

describe('evaluateGearmotorCandidate', () => {
  describe('torque evaluation with service factor', () => {
    it('passes when catalog torque meets required torque WITH SF', () => {
      // Required: 500 lb-in, SF: 1.5
      // Required with SF: 500 * 1.5 = 750 lb-in
      // Candidate: 750 lb-in (exactly meets)
      const result = evaluateGearmotorCandidate({
        requiredTorque: 500,
        requiredRpm: 60,
        serviceFactor: 1.5,
        candidateTorque: 750,
        candidateRpm: 60,
      });

      expect(result.passTorque).toBe(true);
      expect(result.requiredTorqueWithSF).toBe(750);
      expect(result.candidateAvailableTorque).toBe(750);
      expect(result.marginPct).toBe(0);
    });

    it('passes when catalog torque exceeds required torque WITH SF', () => {
      // Required: 500 lb-in, SF: 1.5
      // Required with SF: 500 * 1.5 = 750 lb-in
      // Candidate: 900 lb-in (20% margin)
      const result = evaluateGearmotorCandidate({
        requiredTorque: 500,
        requiredRpm: 60,
        serviceFactor: 1.5,
        candidateTorque: 900,
        candidateRpm: 60,
      });

      expect(result.passTorque).toBe(true);
      expect(result.marginPct).toBe(20); // (900-750)/750 * 100 = 20%
    });

    it('fails when catalog torque is below required torque WITH SF', () => {
      // Required: 500 lb-in, SF: 1.5
      // Required with SF: 500 * 1.5 = 750 lb-in
      // Candidate: 600 lb-in (below 750)
      const result = evaluateGearmotorCandidate({
        requiredTorque: 500,
        requiredRpm: 60,
        serviceFactor: 1.5,
        candidateTorque: 600,
        candidateRpm: 60,
      });

      expect(result.passTorque).toBe(false);
      expect(result.marginPct).toBe(-20); // (600-750)/750 * 100 = -20%
    });

    it('SF < 1.0 makes requirement easier to meet', () => {
      // Required: 500 lb-in, SF: 0.8
      // Required with SF: 500 * 0.8 = 400 lb-in
      // Candidate: 450 lb-in (passes)
      const result = evaluateGearmotorCandidate({
        requiredTorque: 500,
        requiredRpm: 60,
        serviceFactor: 0.8,
        candidateTorque: 450,
        candidateRpm: 60,
      });

      expect(result.passTorque).toBe(true);
      expect(result.requiredTorqueWithSF).toBe(400);
      expect(result.marginPct).toBeCloseTo(12.5); // (450-400)/400 * 100 = 12.5%
    });

    it('SF > 1.0 makes requirement harder to meet', () => {
      // Required: 500 lb-in, SF: 2.0
      // Required with SF: 500 * 2.0 = 1000 lb-in
      // Candidate: 800 lb-in (fails)
      const result = evaluateGearmotorCandidate({
        requiredTorque: 500,
        requiredRpm: 60,
        serviceFactor: 2.0,
        candidateTorque: 800,
        candidateRpm: 60,
      });

      expect(result.passTorque).toBe(false);
      expect(result.requiredTorqueWithSF).toBe(1000);
      expect(result.marginPct).toBe(-20); // (800-1000)/1000 * 100 = -20%
    });
  });

  describe('candidate available torque is raw catalog value', () => {
    it('candidateAvailableTorque equals raw catalog torque (no SF applied)', () => {
      const result = evaluateGearmotorCandidate({
        requiredTorque: 500,
        requiredRpm: 60,
        serviceFactor: 1.5,
        candidateTorque: 600,
        candidateRpm: 60,
      });

      // candidateAvailableTorque should be raw catalog value, NOT multiplied by SF
      expect(result.candidateAvailableTorque).toBe(600);
    });
  });

  describe('RPM evaluation', () => {
    it('passes when RPM is within tolerance', () => {
      const result = evaluateGearmotorCandidate({
        requiredTorque: 500,
        requiredRpm: 60,
        serviceFactor: 1.5,
        candidateTorque: 800,
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
        candidateTorque: 800,
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
        candidateTorque: 800,
        candidateRpm: 110,
      });

      // (110 - 100) / 100 * 100 = 10%
      expect(result.rpmDeltaPct).toBe(10);
    });

    it('handles negative RPM delta correctly', () => {
      const result = evaluateGearmotorCandidate({
        requiredTorque: 500,
        requiredRpm: 100,
        serviceFactor: 1.5,
        candidateTorque: 800,
        candidateRpm: 90,
      });

      // (90 - 100) / 100 * 100 = -10%
      expect(result.rpmDeltaPct).toBe(-10);
    });
  });

  describe('overall pass/fail', () => {
    it('passAll is true only when both torque and RPM pass', () => {
      const passing = evaluateGearmotorCandidate({
        requiredTorque: 500,
        requiredRpm: 60,
        serviceFactor: 1.5,
        candidateTorque: 800, // 800 >= 750 (500*1.5)
        candidateRpm: 60,
      });

      expect(passing.passAll).toBe(true);
    });

    it('passAll is false when torque fails', () => {
      const result = evaluateGearmotorCandidate({
        requiredTorque: 500,
        requiredRpm: 60,
        serviceFactor: 1.5,
        candidateTorque: 600, // 600 < 750 (500*1.5)
        candidateRpm: 60,
      });

      expect(result.passAll).toBe(false);
      expect(result.passTorque).toBe(false);
      expect(result.passRpm).toBe(true);
    });

    it('passAll is false when RPM fails', () => {
      const result = evaluateGearmotorCandidate({
        requiredTorque: 500,
        requiredRpm: 60,
        serviceFactor: 1.5,
        candidateTorque: 800,
        candidateRpm: 100, // way outside tolerance
        speedTolerancePct: 15,
      });

      expect(result.passAll).toBe(false);
      expect(result.passTorque).toBe(true);
      expect(result.passRpm).toBe(false);
    });
  });

  describe('margin calculation', () => {
    it('margin is (candidate - required_with_sf) / required_with_sf * 100', () => {
      // Required: 400 lb-in, SF: 1.25
      // Required with SF: 400 * 1.25 = 500 lb-in
      // Candidate: 600 lb-in
      // Margin: (600 - 500) / 500 * 100 = 20%
      const result = evaluateGearmotorCandidate({
        requiredTorque: 400,
        requiredRpm: 60,
        serviceFactor: 1.25,
        candidateTorque: 600,
        candidateRpm: 60,
      });

      expect(result.requiredTorqueWithSF).toBe(500);
      expect(result.marginPct).toBe(20);
    });

    it('margin is negative for failing candidates', () => {
      // Required: 400 lb-in, SF: 1.25
      // Required with SF: 400 * 1.25 = 500 lb-in
      // Candidate: 400 lb-in
      // Margin: (400 - 500) / 500 * 100 = -20%
      const result = evaluateGearmotorCandidate({
        requiredTorque: 400,
        requiredRpm: 60,
        serviceFactor: 1.25,
        candidateTorque: 400,
        candidateRpm: 60,
      });

      expect(result.marginPct).toBe(-20);
      expect(result.passTorque).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('handles zero required torque gracefully', () => {
      const result = evaluateGearmotorCandidate({
        requiredTorque: 0,
        requiredRpm: 60,
        serviceFactor: 1.5,
        candidateTorque: 600,
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
        candidateTorque: 800,
        candidateRpm: 60,
      });

      expect(result.rpmDeltaPct).toBe(0);
    });

    it('uses default speed tolerance of 15%', () => {
      const result = evaluateGearmotorCandidate({
        requiredTorque: 500,
        requiredRpm: 100,
        serviceFactor: 1.5,
        candidateTorque: 800,
        candidateRpm: 114, // 14% off, should pass with default 15%
      });

      expect(result.passRpm).toBe(true);

      const resultFail = evaluateGearmotorCandidate({
        requiredTorque: 500,
        requiredRpm: 100,
        serviceFactor: 1.5,
        candidateTorque: 800,
        candidateRpm: 116, // 16% off, should fail with default 15%
      });

      expect(resultFail.passRpm).toBe(false);
    });
  });

  describe('real-world scenario', () => {
    it('correctly evaluates a typical conveyor gearmotor selection', () => {
      // Scenario: Belt conveyor needs 218 lb-in torque at 60 RPM
      // User selects SF = 1.5 (standard)
      // Required with SF: 218 * 1.5 = 327 lb-in
      // Candidate: 720 lb-in at 60 RPM (passes with good margin)
      const result = evaluateGearmotorCandidate({
        requiredTorque: 218,
        requiredRpm: 60,
        serviceFactor: 1.5,
        candidateTorque: 720,
        candidateRpm: 60,
      });

      expect(result.passTorque).toBe(true);
      expect(result.passRpm).toBe(true);
      expect(result.passAll).toBe(true);
      expect(result.requiredTorqueWithSF).toBe(327);
      expect(result.candidateAvailableTorque).toBe(720);
      // Margin: (720 - 327) / 327 * 100 ≈ 120%
      expect(result.marginPct).toBeCloseTo(120.18, 1);
    });

    it('correctly rejects underpowered gearmotor', () => {
      // Same scenario but weaker gearmotor
      // Required with SF: 218 * 1.5 = 327 lb-in
      // Candidate: 300 lb-in (fails)
      const result = evaluateGearmotorCandidate({
        requiredTorque: 218,
        requiredRpm: 60,
        serviceFactor: 1.5,
        candidateTorque: 300,
        candidateRpm: 60,
      });

      expect(result.passTorque).toBe(false);
      expect(result.passAll).toBe(false);
      // Margin: (300 - 327) / 327 * 100 ≈ -8.3%
      expect(result.marginPct).toBeCloseTo(-8.26, 1);
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
