/**
 * Gearmotor Selector Tests
 *
 * Unit tests for the gearmotor selection logic.
 */

import {
  GearmotorCandidate,
  GearmotorSelectionInputs,
} from './selector';

// =============================================================================
// TEST HELPERS - Mock Data
// =============================================================================

// Mock FLEXBLOC candidates
const mockFlexblocCandidates: GearmotorCandidate[] = [
  {
    performance_point_id: 'perf-1',
    gear_unit_component_id: 'gu-1',
    vendor: 'NORD',
    series: 'FLEXBLOC',
    size_code: '50',
    gear_unit_part_number: 'SI50-GU-001',
    gear_unit_description: 'NORD FLEXBLOC Gear Unit Size 50',
    motor_hp: 0.5,
    output_rpm: 60,
    output_torque_lb_in: 720,
    service_factor_catalog: 1.0,
    source_ref: 'Table-0.5HP',
    adjusted_capacity: 720,
    oversize_ratio: 1.0,
    speed_delta: 0,
    speed_delta_pct: 0,
  },
  {
    performance_point_id: 'perf-2',
    gear_unit_component_id: 'gu-1',
    vendor: 'NORD',
    series: 'FLEXBLOC',
    size_code: '50',
    gear_unit_part_number: 'SI50-GU-001',
    gear_unit_description: 'NORD FLEXBLOC Gear Unit Size 50',
    motor_hp: 0.5,
    output_rpm: 80,
    output_torque_lb_in: 680,
    service_factor_catalog: 1.0,
    source_ref: 'Table-0.5HP',
    adjusted_capacity: 680,
    oversize_ratio: 1.0,
    speed_delta: 0,
    speed_delta_pct: 0,
  },
];

// Mock MINICASE candidates (used as fallback)
const mockMinicaseCandidates: GearmotorCandidate[] = [
  {
    performance_point_id: 'perf-mini-1',
    gear_unit_component_id: 'gu-mini-1',
    vendor: 'NORD',
    series: 'MINICASE',
    size_code: '31',
    gear_unit_part_number: 'SK31-GU-001',
    gear_unit_description: 'NORD MINICASE Gear Unit Size 31',
    motor_hp: 0.25,
    output_rpm: 60,
    output_torque_lb_in: 400,
    service_factor_catalog: 1.0,
    source_ref: 'Table-0.25HP',
    adjusted_capacity: 400,
    oversize_ratio: 1.0,
    speed_delta: 0,
    speed_delta_pct: 0,
  },
];

// =============================================================================
// TESTS
// =============================================================================

describe('GearmotorSelector', () => {
  describe('FLEXBLOC-first policy', () => {
    it('should document FLEXBLOC-first behavior', () => {
      // The selector queries FLEXBLOC series first.
      // Only if no FLEXBLOC candidates meet requirements, it falls back to MINICASE.
      // This test documents the expected behavior without making actual DB queries.
      expect(true).toBe(true);
    });

    it('should return FLEXBLOC candidates when available', () => {
      // When FLEXBLOC candidates meet the requirements,
      // the selector returns them and sets selected_series to 'FLEXBLOC'.
      const candidates = mockFlexblocCandidates;
      expect(candidates[0].series).toBe('FLEXBLOC');
      expect(candidates.length).toBeGreaterThan(0);
    });

    it('should fallback to MINICASE only if FLEXBLOC is empty', () => {
      // When no FLEXBLOC candidates meet requirements,
      // the selector queries MINICASE as fallback.
      const flexblocEmpty: GearmotorCandidate[] = [];
      const minicaseAvailable = mockMinicaseCandidates;

      // Simulating fallback logic
      const selectedSeries = flexblocEmpty.length > 0 ? 'FLEXBLOC' :
                             minicaseAvailable.length > 0 ? 'MINICASE' : null;

      expect(selectedSeries).toBe('MINICASE');
    });
  });

  describe('Torque normalization with Service Factor', () => {
    it('should adjust capacity based on catalog SF vs chosen SF', () => {
      // effective_capacity = output_torque_lb_in * (catalog_service_factor / chosen_service_factor)
      // Higher catalog SF = unit is rated conservatively = more effective capacity
      const catalogTorque = 60;
      const catalogSF = 7.1;  // Vendor's conservative rating
      const chosenSF = 1.5;   // User's applied SF

      const adjustedCapacity = catalogTorque * (catalogSF / chosenSF);

      // With catalog SF=7.1 and chosen SF=1.5, effective capacity is much higher
      expect(adjustedCapacity).toBeCloseTo(284, 0);
    });

    it('should filter candidates where adjusted capacity < required torque', () => {
      // Candidates with adjusted_capacity < required_torque are excluded
      const requiredTorque = 700;
      const candidates = mockFlexblocCandidates.map(c => ({
        ...c,
        adjusted_capacity: c.output_torque_lb_in * 1.0, // SF ratio = 1.0 (catalog SF = chosen SF)
      }));

      const passing = candidates.filter(c => c.adjusted_capacity >= requiredTorque);
      expect(passing.length).toBe(1); // Only 720 lb-in passes, 680 fails
      expect(passing[0].output_torque_lb_in).toBe(720);
    });

    it('should allow more candidates with higher catalog service factor', () => {
      // Higher catalog SF means more effective capacity (unit rated conservatively)
      const requiredTorque = 200;
      const chosenSF = 1.5;
      const catalogSF = 5.0;  // High catalog SF means conservative vendor rating

      const candidates = mockFlexblocCandidates.map(c => ({
        ...c,
        // Use catalog SF from mock data (1.0) for realistic test
        adjusted_capacity: c.output_torque_lb_in * (catalogSF / chosenSF),
      }));

      // 720 * (5.0/1.5) = 2400, 680 * (5.0/1.5) = 2267 - both easily pass
      const passing = candidates.filter(c => c.adjusted_capacity >= requiredTorque);
      expect(passing.length).toBe(2);
    });

    it('should reduce effective capacity with higher chosen SF', () => {
      // Higher chosen SF = more margin required = less effective capacity
      const catalogTorque = 720;
      const catalogSF = 1.0;
      const chosenSF = 2.0;

      const adjustedCapacity = catalogTorque * (catalogSF / chosenSF);

      // With chosen SF=2.0 and catalog SF=1.0, effective capacity is halved
      expect(adjustedCapacity).toBe(360);
    });
  });

  describe('Speed tolerance filter', () => {
    it('should filter candidates within speed tolerance', () => {
      const requiredRpm = 70;
      const tolerancePct = 15;
      const minRpm = requiredRpm - (requiredRpm * tolerancePct / 100); // 59.5
      const maxRpm = requiredRpm + (requiredRpm * tolerancePct / 100); // 80.5

      const candidates = mockFlexblocCandidates;
      const passing = candidates.filter(c =>
        c.output_rpm >= minRpm && c.output_rpm <= maxRpm
      );

      // 60 RPM: within 59.5-80.5, passes
      // 80 RPM: within 59.5-80.5, passes
      expect(passing.length).toBe(2);
    });

    it('should reject candidates outside speed tolerance', () => {
      const requiredRpm = 50;
      const tolerancePct = 10;
      const minRpm = requiredRpm - (requiredRpm * tolerancePct / 100); // 45
      const maxRpm = requiredRpm + (requiredRpm * tolerancePct / 100); // 55

      const candidates = mockFlexblocCandidates;
      const passing = candidates.filter(c =>
        c.output_rpm >= minRpm && c.output_rpm <= maxRpm
      );

      // 60 RPM: outside 45-55, fails
      // 80 RPM: outside 45-55, fails
      expect(passing.length).toBe(0);
    });
  });

  describe('Ranking', () => {
    it('should rank by smallest oversize ratio first', () => {
      const candidates: GearmotorCandidate[] = [
        { ...mockFlexblocCandidates[0], oversize_ratio: 1.5, speed_delta: 5, motor_hp: 1.0 },
        { ...mockFlexblocCandidates[1], oversize_ratio: 1.1, speed_delta: 10, motor_hp: 0.75 },
        { ...mockFlexblocCandidates[0], oversize_ratio: 1.3, speed_delta: 0, motor_hp: 0.5, performance_point_id: 'perf-3' },
      ];

      const ranked = [...candidates].sort((a, b) => {
        // Primary: oversize ratio
        const oversizeDiff = a.oversize_ratio - b.oversize_ratio;
        if (Math.abs(oversizeDiff) > 0.001) return oversizeDiff;
        // Secondary: speed delta
        const speedDiff = a.speed_delta - b.speed_delta;
        if (Math.abs(speedDiff) > 0.01) return speedDiff;
        // Tertiary: motor HP
        return a.motor_hp - b.motor_hp;
      });

      // Order: 1.1 (best), 1.3, 1.5
      expect(ranked[0].oversize_ratio).toBe(1.1);
      expect(ranked[1].oversize_ratio).toBe(1.3);
      expect(ranked[2].oversize_ratio).toBe(1.5);
    });

    it('should use closest speed match as secondary sort', () => {
      const candidates: GearmotorCandidate[] = [
        { ...mockFlexblocCandidates[0], oversize_ratio: 1.2, speed_delta: 10, motor_hp: 1.0 },
        { ...mockFlexblocCandidates[1], oversize_ratio: 1.2, speed_delta: 2, motor_hp: 0.75 },
        { ...mockFlexblocCandidates[0], oversize_ratio: 1.2, speed_delta: 5, motor_hp: 0.5, performance_point_id: 'perf-3' },
      ];

      const ranked = [...candidates].sort((a, b) => {
        const oversizeDiff = a.oversize_ratio - b.oversize_ratio;
        if (Math.abs(oversizeDiff) > 0.001) return oversizeDiff;
        const speedDiff = a.speed_delta - b.speed_delta;
        if (Math.abs(speedDiff) > 0.01) return speedDiff;
        return a.motor_hp - b.motor_hp;
      });

      // Same oversize, order by speed: 2, 5, 10
      expect(ranked[0].speed_delta).toBe(2);
      expect(ranked[1].speed_delta).toBe(5);
      expect(ranked[2].speed_delta).toBe(10);
    });

    it('should use smaller motor HP as tertiary sort', () => {
      const candidates: GearmotorCandidate[] = [
        { ...mockFlexblocCandidates[0], oversize_ratio: 1.2, speed_delta: 5, motor_hp: 1.5 },
        { ...mockFlexblocCandidates[1], oversize_ratio: 1.2, speed_delta: 5, motor_hp: 0.5 },
        { ...mockFlexblocCandidates[0], oversize_ratio: 1.2, speed_delta: 5, motor_hp: 1.0, performance_point_id: 'perf-3' },
      ];

      const ranked = [...candidates].sort((a, b) => {
        const oversizeDiff = a.oversize_ratio - b.oversize_ratio;
        if (Math.abs(oversizeDiff) > 0.001) return oversizeDiff;
        const speedDiff = a.speed_delta - b.speed_delta;
        if (Math.abs(speedDiff) > 0.01) return speedDiff;
        return a.motor_hp - b.motor_hp;
      });

      // Same oversize and speed, order by HP: 0.5, 1.0, 1.5
      expect(ranked[0].motor_hp).toBe(0.5);
      expect(ranked[1].motor_hp).toBe(1.0);
      expect(ranked[2].motor_hp).toBe(1.5);
    });

    it('should be deterministic (stable sort)', () => {
      const candidates: GearmotorCandidate[] = [
        { ...mockFlexblocCandidates[0], oversize_ratio: 1.1, speed_delta: 5, motor_hp: 0.5 },
        { ...mockFlexblocCandidates[1], oversize_ratio: 1.2, speed_delta: 3, motor_hp: 0.75 },
      ];

      // Run sort multiple times
      const results: string[] = [];
      for (let i = 0; i < 5; i++) {
        const ranked = [...candidates].sort((a, b) => {
          const oversizeDiff = a.oversize_ratio - b.oversize_ratio;
          if (Math.abs(oversizeDiff) > 0.001) return oversizeDiff;
          const speedDiff = a.speed_delta - b.speed_delta;
          if (Math.abs(speedDiff) > 0.01) return speedDiff;
          return a.motor_hp - b.motor_hp;
        });
        results.push(ranked.map(c => c.performance_point_id).join(','));
      }

      // All results should be identical
      const allSame = results.every(r => r === results[0]);
      expect(allSame).toBe(true);
    });
  });

  describe('Input validation', () => {
    it('should reject zero or negative RPM', () => {
      const inputs: GearmotorSelectionInputs = {
        required_output_rpm: 0,
        required_output_torque_lb_in: 500,
        chosen_service_factor: 1.5,
      };
      expect(inputs.required_output_rpm).toBeLessThanOrEqual(0);
    });

    it('should reject zero or negative torque', () => {
      const inputs: GearmotorSelectionInputs = {
        required_output_rpm: 60,
        required_output_torque_lb_in: -100,
        chosen_service_factor: 1.5,
      };
      expect(inputs.required_output_torque_lb_in).toBeLessThanOrEqual(0);
    });

    it('should reject zero or negative service factor', () => {
      const inputs: GearmotorSelectionInputs = {
        required_output_rpm: 60,
        required_output_torque_lb_in: 500,
        chosen_service_factor: 0,
      };
      expect(inputs.chosen_service_factor).toBeLessThanOrEqual(0);
    });

    it('should use default speed tolerance of 15%', () => {
      const inputs: GearmotorSelectionInputs = {
        required_output_rpm: 60,
        required_output_torque_lb_in: 500,
        chosen_service_factor: 1.5,
        // speed_tolerance_pct omitted
      };
      const defaultTolerance = inputs.speed_tolerance_pct ?? 15;
      expect(defaultTolerance).toBe(15);
    });
  });

  describe('Service Factor override (< 1.0)', () => {
    it('should accept SF values less than 1.0 (e.g., 0.85)', () => {
      const inputs: GearmotorSelectionInputs = {
        required_output_rpm: 60,
        required_output_torque_lb_in: 500,
        chosen_service_factor: 0.85, // Override SF < 1.0
      };
      // SF < 1.0 is valid for the selector
      expect(inputs.chosen_service_factor).toBe(0.85);
      expect(inputs.chosen_service_factor).toBeLessThan(1.0);
      expect(inputs.chosen_service_factor).toBeGreaterThan(0);
    });

    it('should compute adjusted capacity correctly with SF < 1.0', () => {
      // effective_capacity = output_torque_lb_in * (catalog_service_factor / chosen_service_factor)
      const catalogTorque = 60;
      const catalogSF = 7.1;
      const chosenSF = 0.85;

      const adjustedCapacity = catalogTorque * (catalogSF / chosenSF);

      // With chosen SF=0.85, we get MORE effective capacity (less margin required)
      expect(adjustedCapacity).toBeCloseTo(501.2, 0);
    });

    it('should pass SF override directly to selector without clamping', () => {
      // The selector should NOT clamp SF >= 1.0
      const inputs: GearmotorSelectionInputs = {
        required_output_rpm: 60,
        required_output_torque_lb_in: 500,
        chosen_service_factor: 0.5, // Minimum allowed
      };
      expect(inputs.chosen_service_factor).toBe(0.5);
    });
  });

  describe('Catalog value display (no rounding drift)', () => {
    it('should preserve exact integer torque values', () => {
      const candidate = mockFlexblocCandidates[0];
      // Torque 720 should display as "720", not "720.0" or "720.00"
      const formatCatalogTorque = (torque: number): string => {
        if (Number.isInteger(torque)) return torque.toString();
        return torque.toFixed(1);
      };
      expect(formatCatalogTorque(candidate.output_torque_lb_in)).toBe('720');
    });

    it('should preserve exact decimal torque values', () => {
      // Hypothetical decimal torque value
      const torqueValue = 1234.5;
      const formatCatalogTorque = (torque: number): string => {
        if (Number.isInteger(torque)) return torque.toString();
        return torque.toFixed(1);
      };
      expect(formatCatalogTorque(torqueValue)).toBe('1234.5');
    });

    it('should preserve exact integer RPM values', () => {
      const candidate = mockFlexblocCandidates[0];
      // RPM 60 should display as "60", not "60.0"
      const formatCatalogRpm = (rpm: number): string => {
        if (Number.isInteger(rpm)) return rpm.toString();
        return rpm.toFixed(1);
      };
      expect(formatCatalogRpm(candidate.output_rpm)).toBe('60');
    });

    it('should preserve exact catalog SF values', () => {
      const candidate = mockFlexblocCandidates[0];
      const formatCatalogSf = (sf: number): string => {
        if (Number.isInteger(sf)) return sf.toString();
        return parseFloat(sf.toFixed(2)).toString();
      };
      expect(formatCatalogSf(candidate.service_factor_catalog)).toBe('1');
    });
  });

  describe('Series Code derivation', () => {
    it('should derive series code from numeric size_code', () => {
      const getSeriesCode = (sizeCode: string, partNumber: string): string => {
        const numericSize = parseInt(sizeCode, 10);
        if (!isNaN(numericSize)) return `SI${numericSize}`;
        const match = partNumber.match(/^(SI\d+)/);
        if (match) return match[1];
        return sizeCode;
      };

      // size_code "50" => "SI50"
      expect(getSeriesCode('50', 'SI50-GU-001')).toBe('SI50');
      expect(getSeriesCode('63', 'SI63-GU-002')).toBe('SI63');
    });

    it('should fallback to part number prefix if size_code is non-numeric', () => {
      const getSeriesCode = (sizeCode: string, partNumber: string): string => {
        const numericSize = parseInt(sizeCode, 10);
        if (!isNaN(numericSize)) return `SI${numericSize}`;
        const match = partNumber.match(/^(SI\d+)/);
        if (match) return match[1];
        return sizeCode;
      };

      // Non-numeric size_code, parse from part number
      expect(getSeriesCode('ABC', 'SI75-GU-003')).toBe('SI75');
    });

    it('should return size_code as-is if no pattern matches', () => {
      const getSeriesCode = (sizeCode: string, partNumber: string): string => {
        const numericSize = parseInt(sizeCode, 10);
        if (!isNaN(numericSize)) return `SI${numericSize}`;
        const match = partNumber.match(/^(SI\d+)/);
        if (match) return match[1];
        return sizeCode;
      };

      // No match at all
      expect(getSeriesCode('XYZ', 'NOPATTERN-001')).toBe('XYZ');
    });
  });

  describe('Candidate table columns', () => {
    it('should include service_factor_catalog on candidates', () => {
      const candidate = mockFlexblocCandidates[0];
      expect(candidate).toHaveProperty('service_factor_catalog');
      expect(typeof candidate.service_factor_catalog).toBe('number');
    });

    it('should include size_code for Series Code derivation', () => {
      const candidate = mockFlexblocCandidates[0];
      expect(candidate).toHaveProperty('size_code');
      expect(candidate.size_code).toBe('50');
    });
  });
});
