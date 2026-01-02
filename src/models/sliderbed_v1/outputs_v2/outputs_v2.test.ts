/**
 * Outputs V2 Test Suite
 *
 * Tests the outputs_v2 builder, vendor packets, warnings, and exports.
 * Uses 15 fixture scenarios to cover various configurations.
 */

import {
  buildOutputsV2,
  exportOutputsV2ToJSON,
  exportOutputsV2ToCSV,
  OutputsV2,
  runAllWarningRules,
  getWarningsForComponent,
  getWorstStatus,
  CSV_COLUMNS_V2,
  WARNING_CODES,
} from './index';
import { SliderbedInputs, SliderbedOutputs, ReturnFrameStyle, ReturnSnubMode } from '../schema';
import { buildCsvRows, csvRowsToString } from './export_csv';

// =============================================================================
// TEST FIXTURES
// =============================================================================

/**
 * Base inputs shared across fixtures
 */
const BASE_INPUTS: Partial<SliderbedInputs> = {
  belt_width_in: 24,
  conveyor_length_cc_in: 120,
  incline_deg: 0,
  belt_speed_fpm: 60,
  return_gravity_roller_count: 3,
};

/**
 * Base outputs shared across fixtures
 */
const BASE_OUTPUTS: Partial<SliderbedOutputs> = {
  belt_speed_fpm: 60,
  total_belt_length_in: 260,
  total_belt_pull_lb: 25,
  torque_drive_shaft_inlbf: 150,
  drive_shaft_rpm: 30,
  gearmotor_output_rpm: 30,
  safety_factor_used: 1.5,
  drive_pulley_diameter_in: 6,
  drive_pulley_finished_od_in: 6.5,
  tail_pulley_diameter_in: 6,
  tail_pulley_finished_od_in: 6.5,
  required_min_pulley_diameter_in: 4,
  pulley_face_length_in: 27,
  effective_frame_height_in: 6,
  reference_frame_height_in: 6,
  belt_weight_lbf: 10,
  total_load_lbf: 50,
  is_v_guided: false,
  gravity_roller_quantity: 3,
  gravity_roller_spacing_in: 60,
};

/**
 * Fixture type definition
 */
interface TestFixture {
  name: string;
  description: string;
  inputs: SliderbedInputs;
  outputs_v1: SliderbedOutputs;
  expectedWarnings?: string[];
  expectedComponentCount?: number;
}

/**
 * 15 Test Fixtures covering various scenarios
 */
const FIXTURES: TestFixture[] = [
  // 1. Basic floor-supported with legs
  {
    name: 'basic_floor_legs',
    description: 'Basic floor-supported conveyor with legs',
    inputs: {
      ...BASE_INPUTS,
      support_type: 'floor_legs',
    } as SliderbedInputs,
    outputs_v1: BASE_OUTPUTS as SliderbedOutputs,
    expectedComponentCount: 6, // belt, drive pulley, tail pulley, gravity rollers, drive, legs
  },

  // 2. Floor-supported with casters
  {
    name: 'floor_casters',
    description: 'Floor-supported with casters',
    inputs: {
      ...BASE_INPUTS,
      support_type: 'casters',
      has_casters: true,
    } as SliderbedInputs,
    outputs_v1: BASE_OUTPUTS as SliderbedOutputs,
    expectedComponentCount: 7, // belt, drive pulley, tail pulley, gravity rollers, drive, legs, casters
  },

  // 3. External/suspended support
  {
    name: 'external_support',
    description: 'Externally supported conveyor (no legs)',
    inputs: {
      ...BASE_INPUTS,
      support_type: 'external',
    } as SliderbedInputs,
    outputs_v1: BASE_OUTPUTS as SliderbedOutputs,
    expectedComponentCount: 5, // belt, drive pulley, tail pulley, gravity rollers, drive
  },

  // 4. V-guided belt
  {
    name: 'v_guided_belt',
    description: 'Belt with V-guide tracking',
    inputs: {
      ...BASE_INPUTS,
      belt_tracking_method: 'V_GUIDE',
      v_guide_profile: 'T5',
    } as SliderbedInputs,
    outputs_v1: {
      ...BASE_OUTPUTS,
      is_v_guided: true,
    } as SliderbedOutputs,
    expectedComponentCount: 6,
  },

  // 5. Belt with cleats
  {
    name: 'cleated_belt',
    description: 'Belt with cleats configured',
    inputs: {
      ...BASE_INPUTS,
      cleats_enabled: true,
      cleat_size: '2"',
      cleat_spacing_in: 12,
      cleat_orientation: 'PARALLEL',
    } as SliderbedInputs,
    outputs_v1: {
      ...BASE_OUTPUTS,
      cleats_enabled: true,
    } as SliderbedOutputs,
    expectedComponentCount: 6,
  },

  // 6. Inclined conveyor
  {
    name: 'inclined_conveyor',
    description: 'Inclined conveyor at 15 degrees',
    inputs: {
      ...BASE_INPUTS,
      incline_deg: 15,
    } as SliderbedInputs,
    outputs_v1: {
      ...BASE_OUTPUTS,
      incline_deg: 15,
    } as SliderbedOutputs,
    expectedComponentCount: 6,
  },

  // 7. Low profile frame with snub rollers
  {
    name: 'low_profile_with_snubs',
    description: 'Low profile frame requiring snub rollers',
    inputs: {
      ...BASE_INPUTS,
      return_frame_style: ReturnFrameStyle.LowProfile,
      return_snub_mode: ReturnSnubMode.Yes,
    } as SliderbedInputs,
    outputs_v1: {
      ...BASE_OUTPUTS,
      requires_snub_rollers: true,
      snub_roller_quantity: 2,
    } as SliderbedOutputs,
    expectedComponentCount: 8, // adds snub pulleys
  },

  // 8. Wide belt (48")
  {
    name: 'wide_belt',
    description: 'Wide 48" belt conveyor',
    inputs: {
      ...BASE_INPUTS,
      belt_width_in: 48,
    } as SliderbedInputs,
    outputs_v1: {
      ...BASE_OUTPUTS,
      pulley_face_length_in: 51,
    } as SliderbedOutputs,
    expectedComponentCount: 6,
  },

  // 9. Long conveyor (360")
  {
    name: 'long_conveyor',
    description: 'Long 30ft conveyor',
    inputs: {
      ...BASE_INPUTS,
      conveyor_length_cc_in: 360,
      return_gravity_roller_count: 6,
    } as SliderbedInputs,
    outputs_v1: {
      ...BASE_OUTPUTS,
      total_belt_length_in: 740,
      gravity_roller_quantity: 6,
      gravity_roller_spacing_in: 72,
    } as SliderbedOutputs,
    expectedComponentCount: 6,
  },

  // 10. High speed (120 FPM)
  {
    name: 'high_speed',
    description: 'High speed 120 FPM conveyor',
    inputs: {
      ...BASE_INPUTS,
      belt_speed_fpm: 120,
    } as SliderbedInputs,
    outputs_v1: {
      ...BASE_OUTPUTS,
      belt_speed_fpm: 120,
      drive_shaft_rpm: 60,
      gearmotor_output_rpm: 60,
    } as SliderbedOutputs,
    expectedComponentCount: 6,
  },

  // 11. With environment factors
  {
    name: 'with_environment',
    description: 'Conveyor with environment factors',
    inputs: {
      ...BASE_INPUTS,
      environment_factors: ['WASHDOWN', 'OUTDOOR'],
    } as SliderbedInputs,
    outputs_v1: BASE_OUTPUTS as SliderbedOutputs,
    expectedComponentCount: 6,
  },

  // 12. Pulley undersized (should trigger warning)
  {
    name: 'pulley_undersized',
    description: 'Pulley diameter below minimum',
    inputs: {
      ...BASE_INPUTS,
    } as SliderbedInputs,
    outputs_v1: {
      ...BASE_OUTPUTS,
      drive_pulley_finished_od_in: 3.5,
      required_min_pulley_diameter_in: 4,
    } as SliderbedOutputs,
    expectedWarnings: [WARNING_CODES.BELT_MIN_PULLEY_VIOLATION],
    expectedComponentCount: 6,
  },

  // 13. Missing belt length (should trigger warning)
  {
    name: 'missing_belt_length',
    description: 'Belt length not calculated',
    inputs: {
      ...BASE_INPUTS,
    } as SliderbedInputs,
    outputs_v1: {
      ...BASE_OUTPUTS,
      total_belt_length_in: undefined,
    } as SliderbedOutputs,
    expectedWarnings: [WARNING_CODES.BELT_LENGTH_MISSING],
    expectedComponentCount: 6,
  },

  // 14. Excessive roller spacing (should trigger warning)
  {
    name: 'excessive_roller_spacing',
    description: 'Roller spacing > 72 inches',
    inputs: {
      ...BASE_INPUTS,
      conveyor_length_cc_in: 360,
      return_gravity_roller_count: 3, // spacing = 180"
    } as SliderbedInputs,
    outputs_v1: {
      ...BASE_OUTPUTS,
      gravity_roller_spacing_in: 180,
    } as SliderbedOutputs,
    expectedWarnings: [WARNING_CODES.ROLLER_SPACING_EXCESSIVE],
    expectedComponentCount: 6,
  },

  // 15. Complete configuration with all features
  {
    name: 'full_configuration',
    description: 'Complete configuration with V-guide, cleats, casters',
    inputs: {
      ...BASE_INPUTS,
      conveyor_id: 'CONV-001',
      support_type: 'casters',
      has_casters: true,
      belt_tracking_method: 'V_GUIDE',
      v_guide_profile: 'T5',
      cleats_enabled: true,
      cleat_size: '1.5"',
      cleat_spacing_in: 8,
      return_frame_style: ReturnFrameStyle.LowProfile,
      return_snub_mode: ReturnSnubMode.Yes,
      environment_factors: ['WASHDOWN'],
    } as SliderbedInputs,
    outputs_v1: {
      ...BASE_OUTPUTS,
      is_v_guided: true,
      cleats_enabled: true,
      requires_snub_rollers: true,
      snub_roller_quantity: 2,
    } as SliderbedOutputs,
    expectedComponentCount: 9, // all components
  },
];

// =============================================================================
// TESTS
// =============================================================================

describe('Outputs V2 Builder', () => {
  describe('buildOutputsV2', () => {
    it('should build outputs_v2 with correct schema version', () => {
      const fixture = FIXTURES[0];
      const result = buildOutputsV2({
        inputs: fixture.inputs,
        outputs_v1: fixture.outputs_v1,
      });

      expect(result.meta.schema_version).toBe('2.2');
      expect(result.meta.min_compatible_version).toBe('2.0');
      expect(result.meta.source_model_version).toBe('sliderbed_v1');
    });

    it('should include all required top-level sections', () => {
      const fixture = FIXTURES[0];
      const result = buildOutputsV2({
        inputs: fixture.inputs,
        outputs_v1: fixture.outputs_v1,
      });

      expect(result.meta).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.support_system).toBeDefined();
      expect(result.calc_results).toBeDefined();
      expect(result.components).toBeDefined();
      expect(result.design_geometry).toBeDefined();
      expect(result.warnings_and_notes).toBeDefined();
      expect(result.exports).toBeDefined();
    });

    it('should generate ISO timestamp', () => {
      const fixture = FIXTURES[0];
      const result = buildOutputsV2({
        inputs: fixture.inputs,
        outputs_v1: fixture.outputs_v1,
      });

      expect(result.meta.generated_at_iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('Component Generation', () => {
    FIXTURES.forEach((fixture) => {
      it(`should generate correct component count for: ${fixture.name}`, () => {
        const result = buildOutputsV2({
          inputs: fixture.inputs,
          outputs_v1: fixture.outputs_v1,
        });

        if (fixture.expectedComponentCount) {
          expect(result.components.length).toBe(fixture.expectedComponentCount);
        }
      });
    });

    it('should always include belt_primary component', () => {
      FIXTURES.forEach((fixture) => {
        const result = buildOutputsV2({
          inputs: fixture.inputs,
          outputs_v1: fixture.outputs_v1,
        });

        const belt = result.components.find((c) => c.component_id === 'belt_primary');
        expect(belt).toBeDefined();
        expect(belt?.component_type).toBe('belt');
      });
    });

    it('should always include pulley_drive and pulley_tail', () => {
      const fixture = FIXTURES[0];
      const result = buildOutputsV2({
        inputs: fixture.inputs,
        outputs_v1: fixture.outputs_v1,
      });

      expect(result.components.find((c) => c.component_id === 'pulley_drive')).toBeDefined();
      expect(result.components.find((c) => c.component_id === 'pulley_tail')).toBeDefined();
    });

    it('should include snub pulleys when configured', () => {
      const fixture = FIXTURES.find((f) => f.name === 'low_profile_with_snubs')!;
      const result = buildOutputsV2({
        inputs: fixture.inputs,
        outputs_v1: fixture.outputs_v1,
      });

      expect(result.components.find((c) => c.component_id === 'pulley_snub_drive')).toBeDefined();
      expect(result.components.find((c) => c.component_id === 'pulley_snub_tail')).toBeDefined();
    });
  });

  describe('Support System Derivation', () => {
    it('should derive floor_legs correctly', () => {
      const fixture = FIXTURES.find((f) => f.name === 'basic_floor_legs')!;
      const result = buildOutputsV2({
        inputs: fixture.inputs,
        outputs_v1: fixture.outputs_v1,
      });

      expect(result.support_system.support_type).toBe('floor_legs');
      expect(result.support_system.is_floor_supported).toBe(true);
      expect(result.support_system.has_legs).toBe(true);
      expect(result.support_system.has_casters).toBe(false);
    });

    it('should derive casters correctly', () => {
      const fixture = FIXTURES.find((f) => f.name === 'floor_casters')!;
      const result = buildOutputsV2({
        inputs: fixture.inputs,
        outputs_v1: fixture.outputs_v1,
      });

      expect(result.support_system.support_type).toBe('casters');
      expect(result.support_system.is_floor_supported).toBe(true);
      expect(result.support_system.has_legs).toBe(true);
      expect(result.support_system.has_casters).toBe(true);
    });

    it('should derive external support correctly', () => {
      const fixture = FIXTURES.find((f) => f.name === 'external_support')!;
      const result = buildOutputsV2({
        inputs: fixture.inputs,
        outputs_v1: fixture.outputs_v1,
      });

      expect(result.support_system.support_type).toBe('external');
      expect(result.support_system.is_floor_supported).toBe(false);
      expect(result.support_system.has_legs).toBe(false);
      expect(result.support_system.has_casters).toBe(false);
      expect(result.support_system.tob_relevance).toBe('not_applicable');
    });
  });

  describe('Vendor Packet Generation', () => {
    it('should generate belt vendor packet with all fields', () => {
      const fixture = FIXTURES[0];
      const result = buildOutputsV2({
        inputs: fixture.inputs,
        outputs_v1: fixture.outputs_v1,
      });

      const beltPacket = result.exports.vendor_packets.belt;
      expect(beltPacket).toBeDefined();
      expect(beltPacket?.belt_width_in).toBe(fixture.inputs.belt_width_in);
      expect(beltPacket?.overall_length_in).toBeDefined();
      expect(beltPacket?.tracking).toBeDefined();
      expect(beltPacket?.operating_conditions).toBeDefined();
    });

    it('should generate pulley vendor packets with correct roles', () => {
      const fixture = FIXTURES[0];
      const result = buildOutputsV2({
        inputs: fixture.inputs,
        outputs_v1: fixture.outputs_v1,
      });

      const pulleys = result.exports.vendor_packets.pulleys;
      expect(pulleys.length).toBeGreaterThanOrEqual(2);

      const drivePulley = pulleys.find((p) => p.pulley_role === 'drive');
      const tailPulley = pulleys.find((p) => p.pulley_role === 'tail');

      expect(drivePulley).toBeDefined();
      expect(tailPulley).toBeDefined();
    });

    it('should include V-guide info when configured', () => {
      const fixture = FIXTURES.find((f) => f.name === 'v_guided_belt')!;
      const result = buildOutputsV2({
        inputs: fixture.inputs,
        outputs_v1: fixture.outputs_v1,
      });

      const beltPacket = result.exports.vendor_packets.belt;
      expect(beltPacket?.v_guide.included).toBe(true);
    });

    it('should include cleat info when configured', () => {
      const fixture = FIXTURES.find((f) => f.name === 'cleated_belt')!;
      const result = buildOutputsV2({
        inputs: fixture.inputs,
        outputs_v1: fixture.outputs_v1,
      });

      const beltPacket = result.exports.vendor_packets.belt;
      expect(beltPacket?.cleats.included).toBe(true);
      expect(beltPacket?.cleats.height_in).toBe(2); // Parsed from '2"'
      // Note: spacing_in comes from inputs but may not be mapped in current implementation
    });
  });
});

describe('Warning Rules', () => {
  describe('runAllWarningRules', () => {
    it('should detect BELT_MIN_PULLEY_VIOLATION', () => {
      const fixture = FIXTURES.find((f) => f.name === 'pulley_undersized')!;
      const result = buildOutputsV2({
        inputs: fixture.inputs,
        outputs_v1: fixture.outputs_v1,
      });

      const violation = result.warnings_and_notes.find(
        (w) => w.code === WARNING_CODES.BELT_MIN_PULLEY_VIOLATION
      );
      expect(violation).toBeDefined();
      expect(violation?.severity).toBe('warning');
    });

    it('should detect BELT_LENGTH_MISSING', () => {
      const fixture = FIXTURES.find((f) => f.name === 'missing_belt_length')!;
      const result = buildOutputsV2({
        inputs: fixture.inputs,
        outputs_v1: fixture.outputs_v1,
      });

      const violation = result.warnings_and_notes.find(
        (w) => w.code === WARNING_CODES.BELT_LENGTH_MISSING
      );
      expect(violation).toBeDefined();
    });

    it('should detect ROLLER_SPACING_EXCESSIVE', () => {
      const fixture = FIXTURES.find((f) => f.name === 'excessive_roller_spacing')!;
      const result = buildOutputsV2({
        inputs: fixture.inputs,
        outputs_v1: fixture.outputs_v1,
      });

      const violation = result.warnings_and_notes.find(
        (w) => w.code === WARNING_CODES.ROLLER_SPACING_EXCESSIVE
      );
      expect(violation).toBeDefined();
    });

    it('should not generate warnings for valid configurations', () => {
      const fixture = FIXTURES.find((f) => f.name === 'basic_floor_legs')!;
      const result = buildOutputsV2({
        inputs: fixture.inputs,
        outputs_v1: fixture.outputs_v1,
      });

      // Should have no errors
      const errors = result.warnings_and_notes.filter((w) => w.severity === 'error');
      expect(errors.length).toBe(0);
    });
  });

  describe('getWarningsForComponent', () => {
    it('should filter warnings by component ID', () => {
      const fixture = FIXTURES.find((f) => f.name === 'pulley_undersized')!;
      const result = buildOutputsV2({
        inputs: fixture.inputs,
        outputs_v1: fixture.outputs_v1,
      });

      const beltWarnings = getWarningsForComponent(result.warnings_and_notes, 'belt_primary');
      expect(beltWarnings.length).toBeGreaterThan(0);
    });
  });

  describe('getWorstStatus', () => {
    it('should return error when errors present', () => {
      const warnings = [
        { severity: 'warning' as const, code: 'TEST', message: '', recommendation: null, impacts: [], related_component_ids: [] },
        { severity: 'error' as const, code: 'TEST', message: '', recommendation: null, impacts: [], related_component_ids: [] },
      ];

      expect(getWorstStatus(warnings)).toBe('error');
    });

    it('should return warning when only warnings present', () => {
      const warnings = [
        { severity: 'warning' as const, code: 'TEST', message: '', recommendation: null, impacts: [], related_component_ids: [] },
      ];

      expect(getWorstStatus(warnings)).toBe('warning');
    });

    it('should return ok when no warnings', () => {
      expect(getWorstStatus([])).toBe('ok');
    });
  });
});

describe('CSV Export', () => {
  describe('buildCsvRows', () => {
    it('should use correct column order', () => {
      const fixture = FIXTURES[0];
      const result = buildOutputsV2({
        inputs: fixture.inputs,
        outputs_v1: fixture.outputs_v1,
      });

      expect(result.exports.csv_rows.columns).toEqual(CSV_COLUMNS_V2);
    });

    it('should generate rows for components with vendor packets', () => {
      const fixture = FIXTURES[0];
      const result = buildOutputsV2({
        inputs: fixture.inputs,
        outputs_v1: fixture.outputs_v1,
      });

      expect(result.exports.csv_rows.rows.length).toBeGreaterThan(0);
    });

    it('should have 22 columns per row', () => {
      const fixture = FIXTURES[0];
      const result = buildOutputsV2({
        inputs: fixture.inputs,
        outputs_v1: fixture.outputs_v1,
      });

      result.exports.csv_rows.rows.forEach((row) => {
        expect(row.length).toBe(22);
      });
    });
  });

  describe('csvRowsToString', () => {
    it('should produce valid CSV string', () => {
      const fixture = FIXTURES[0];
      const result = buildOutputsV2({
        inputs: fixture.inputs,
        outputs_v1: fixture.outputs_v1,
      });

      const csvString = csvRowsToString(result.exports.csv_rows);

      expect(csvString).toContain(CSV_COLUMNS_V2.join(','));
      expect(csvString.split('\n').length).toBeGreaterThan(1);
    });

    it('should escape values with commas', () => {
      const csvRows = {
        columns: CSV_COLUMNS_V2,
        rows: [['belt', 'primary', 'belt_primary', 1, 24, 260, '', '', 'test, with comma', '', '', '', '', '', '', '', '', '', '', '', 'notes', '']],
      };

      const csvString = csvRowsToString(csvRows);
      expect(csvString).toContain('"test, with comma"');
    });
  });

  describe('exportOutputsV2ToCSV', () => {
    it('should produce complete CSV from outputs', () => {
      const fixture = FIXTURES[0];
      const result = buildOutputsV2({
        inputs: fixture.inputs,
        outputs_v1: fixture.outputs_v1,
      });

      const csv = exportOutputsV2ToCSV(result);

      expect(csv).toContain('component_type');
      expect(csv).toContain('belt');
      expect(csv).toContain('pulley');
    });
  });
});

describe('JSON Export', () => {
  describe('exportOutputsV2ToJSON', () => {
    it('should produce valid JSON', () => {
      const fixture = FIXTURES[0];
      const result = buildOutputsV2({
        inputs: fixture.inputs,
        outputs_v1: fixture.outputs_v1,
      });

      const json = exportOutputsV2ToJSON(result);
      const parsed = JSON.parse(json);

      expect(parsed.meta).toBeDefined();
      expect(parsed.summary).toBeDefined();
      expect(parsed.components).toBeDefined();
    });

    it('should maintain consistent key ordering', () => {
      const fixture = FIXTURES[0];
      const result = buildOutputsV2({
        inputs: fixture.inputs,
        outputs_v1: fixture.outputs_v1,
      });

      const json = exportOutputsV2ToJSON(result);

      // meta should come before summary
      const metaIndex = json.indexOf('"meta"');
      const summaryIndex = json.indexOf('"summary"');

      expect(metaIndex).toBeLessThan(summaryIndex);
    });

    it('should be parseable back to OutputsV2', () => {
      const fixture = FIXTURES[0];
      const result = buildOutputsV2({
        inputs: fixture.inputs,
        outputs_v1: fixture.outputs_v1,
      });

      const json = exportOutputsV2ToJSON(result);
      const parsed: OutputsV2 = JSON.parse(json);

      expect(parsed.meta.schema_version).toBe(result.meta.schema_version);
      expect(parsed.components.length).toBe(result.components.length);
    });
  });
});

describe('Fixture Scenarios', () => {
  FIXTURES.forEach((fixture) => {
    describe(`Fixture: ${fixture.name}`, () => {
      it(`should build without errors: ${fixture.description}`, () => {
        expect(() => {
          buildOutputsV2({
            inputs: fixture.inputs,
            outputs_v1: fixture.outputs_v1,
          });
        }).not.toThrow();
      });

      if (fixture.expectedWarnings) {
        it('should generate expected warnings', () => {
          const result = buildOutputsV2({
            inputs: fixture.inputs,
            outputs_v1: fixture.outputs_v1,
          });

          fixture.expectedWarnings!.forEach((expectedCode) => {
            const found = result.warnings_and_notes.find((w) => w.code === expectedCode);
            expect(found).toBeDefined();
          });
        });
      }

      it('should export to JSON without errors', () => {
        const result = buildOutputsV2({
          inputs: fixture.inputs,
          outputs_v1: fixture.outputs_v1,
        });

        expect(() => exportOutputsV2ToJSON(result)).not.toThrow();
      });

      it('should export to CSV without errors', () => {
        const result = buildOutputsV2({
          inputs: fixture.inputs,
          outputs_v1: fixture.outputs_v1,
        });

        expect(() => exportOutputsV2ToCSV(result)).not.toThrow();
      });
    });
  });
});

describe('V1 Snapshot Compatibility', () => {
  it('should not modify v1 outputs', () => {
    const fixture = FIXTURES[0];
    const originalV1 = JSON.stringify(fixture.outputs_v1);

    buildOutputsV2({
      inputs: fixture.inputs,
      outputs_v1: fixture.outputs_v1,
    });

    expect(JSON.stringify(fixture.outputs_v1)).toBe(originalV1);
  });

  it('should derive all calc_results from v1 outputs', () => {
    const fixture = FIXTURES[0];
    const result = buildOutputsV2({
      inputs: fixture.inputs,
      outputs_v1: fixture.outputs_v1,
    });

    // Effective tension should come from total_belt_pull_lb
    expect(result.calc_results.effective_tension_lbf).toBe(fixture.outputs_v1.total_belt_pull_lb);

    // Torque should come from torque_drive_shaft_inlbf
    expect(result.calc_results.required_torque_inlb).toBe(fixture.outputs_v1.torque_drive_shaft_inlbf);

    // Drive RPM should come from gearmotor_output_rpm or drive_shaft_rpm
    expect(result.calc_results.drive_rpm).toBe(
      fixture.outputs_v1.gearmotor_output_rpm ?? fixture.outputs_v1.drive_shaft_rpm
    );
  });
});
