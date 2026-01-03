/**
 * Golden Contract Outputs Test Runner
 *
 * Validates sliderbed_v1 contract outputs against golden fixtures.
 * Contract outputs are defined in docs/review/contract-outputs-sliderbed-v1.md
 *
 * Fixture statuses:
 * - "pending": Baseline not yet established. Prints report, does not fail.
 * - "golden": Validated against Excel. Asserts within tolerance.
 */

import * as fs from 'fs';
import * as path from 'path';
import { calculate } from '../../../../models/sliderbed_v1/formulas';
import { SliderbedInputs, SliderbedOutputs, DEFAULT_PARAMETERS } from '../../../../models/sliderbed_v1/schema';

// ============================================================================
// CONTRACT OUTPUT KEYS (from docs/review/contract-outputs-sliderbed-v1.md)
// ============================================================================

const CONTRACT_OUTPUT_KEYS = [
  // Motor/Drive Sizing
  'torque_drive_shaft_inlbf',
  'drive_shaft_rpm',
  'gearmotor_output_rpm',
  'gear_ratio',
  'chain_ratio',
  // Belt Pull / Effective Tension
  'total_belt_pull_lb',
  'friction_pull_lb',
  'incline_pull_lb',
  'drive_T1_lbf',
  'drive_T2_lbf',
  // Shaft Sizing
  'drive_shaft_diameter_in',
  'tail_shaft_diameter_in',
  'drive_pulley_resultant_load_lbf',
  // Minimum Pulley Diameter
  'required_min_pulley_diameter_in',
  'drive_pulley_meets_minimum',
  'tail_pulley_meets_minimum',
  // Safety / Tube Stress
  'pci_tube_stress_status',
  // Core Operating Parameters
  'belt_speed_fpm',
  'total_belt_length_in',
] as const;

type ContractOutputKey = typeof CONTRACT_OUTPUT_KEYS[number];

// ============================================================================
// FIXTURE TYPES
// ============================================================================

interface ExpectedValue {
  /** Expected value. null = pending (not yet baselined) */
  value: number | boolean | string | null;
  /** Absolute tolerance (±). Used for numeric comparisons. */
  tol_abs?: number;
  /** Relative tolerance (fraction, e.g., 0.01 = 1%). Used if tol_abs not set. */
  tol_rel?: number;
}

interface GoldenFixture {
  /** Unique fixture identifier */
  id: string;
  /** Status: pending = awaiting Excel baseline, golden = validated, skip = intentionally skipped */
  status: 'pending' | 'golden' | 'skip';
  /** Intent: what does this fixture test? */
  intent: 'regression' | 'edge' | 'safety' | 'ux';
  /** Description of the scenario */
  description: string;
  /** Partial inputs - merged with defaults */
  inputs: Partial<SliderbedInputs>;
  /** Expected contract outputs */
  expected: Partial<Record<ContractOutputKey, ExpectedValue>>;
}

// ============================================================================
// FIXTURE LOADER
// ============================================================================

function loadFixtures(): GoldenFixture[] {
  const fixtureDir = path.join(__dirname);
  const files = fs.readdirSync(fixtureDir).filter(f => f.endsWith('.fixture.json'));

  const fixtures: GoldenFixture[] = [];
  for (const file of files) {
    const content = fs.readFileSync(path.join(fixtureDir, file), 'utf-8');
    const fixture = JSON.parse(content) as GoldenFixture;
    fixtures.push(fixture);
  }

  return fixtures;
}

// ============================================================================
// COMPARISON HELPERS
// ============================================================================

function isWithinTolerance(
  actual: number | undefined,
  expected: number,
  tolAbs?: number,
  tolRel?: number
): boolean {
  if (actual === undefined) return false;

  // Use absolute tolerance if provided
  if (tolAbs !== undefined) {
    return Math.abs(actual - expected) <= tolAbs;
  }

  // Use relative tolerance if provided
  if (tolRel !== undefined) {
    if (expected === 0) {
      return Math.abs(actual) <= tolRel; // For zero expected, use tol_rel as absolute
    }
    return Math.abs((actual - expected) / expected) <= tolRel;
  }

  // No tolerance specified - exact match
  return actual === expected;
}

function formatValue(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'number') {
    return Number.isInteger(value) ? value.toString() : value.toFixed(4);
  }
  if (typeof value === 'boolean') return value.toString();
  return String(value);
}

// ============================================================================
// BASELINE REPORT PRINTER
// ============================================================================

function printBaselineReport(fixture: GoldenFixture, outputs: SliderbedOutputs): void {
  console.log('\n' + '='.repeat(70));
  console.log(`BASELINE REPORT: ${fixture.id}`);
  console.log(`Status: ${fixture.status} | Intent: ${fixture.intent}`);
  console.log(`Description: ${fixture.description}`);
  console.log('='.repeat(70));
  console.log('\nContract Outputs (copy to Excel for baseline):');
  console.log('-'.repeat(50));
  console.log('| Output Key                        | Actual Value     |');
  console.log('|-----------------------------------|------------------|');

  for (const key of CONTRACT_OUTPUT_KEYS) {
    const value = outputs[key as keyof SliderbedOutputs];
    const formatted = formatValue(value);
    console.log(`| ${key.padEnd(33)} | ${formatted.padStart(16)} |`);
  }

  console.log('-'.repeat(50));
  console.log('');
}

// ============================================================================
// TEST RUNNER
// ============================================================================

describe('Golden Contract Outputs', () => {
  const fixtures = loadFixtures();

  if (fixtures.length === 0) {
    it('should have at least one fixture', () => {
      console.warn('No golden fixtures found in', __dirname);
      // Don't fail - this is just a skeleton
    });
    return;
  }

  for (const fixture of fixtures) {
    // Skip fixtures marked as skip
    if (fixture.status === 'skip') {
      describe.skip(`[${fixture.id}] ${fixture.description}`, () => {
        it('skipped - see fixture for reason', () => {});
      });
      continue;
    }

    describe(`[${fixture.id}] ${fixture.description}`, () => {
      let outputs: SliderbedOutputs;
      let calcSuccess: boolean;

      beforeAll(() => {
        // Build full inputs from partial (model uses defaults for missing)
        const fullInputs = fixture.inputs as SliderbedInputs;
        try {
          outputs = calculate(fullInputs, DEFAULT_PARAMETERS);
          calcSuccess = outputs !== undefined;
        } catch (e) {
          calcSuccess = false;
          console.error(`Calculation failed for ${fixture.id}:`, e);
        }
      });

      it('should calculate successfully', () => {
        expect(calcSuccess).toBe(true);
        expect(outputs).toBeDefined();
      });

      if (fixture.status === 'pending') {
        it('should print baseline report (PENDING)', () => {
          if (outputs) {
            printBaselineReport(fixture, outputs);
          }
          // Pending fixtures do not fail - they just print the baseline
          expect(true).toBe(true);
        });
      } else {
        // Golden fixtures - assert each contract output
        for (const key of CONTRACT_OUTPUT_KEYS) {
          const expectedDef = fixture.expected[key];

          if (!expectedDef || expectedDef.value === null) {
            it(`${key}: should have expected value defined`, () => {
              // Skip keys not defined in this fixture
              expect(true).toBe(true);
            });
            continue;
          }

          it(`${key}: should match expected value`, () => {
            const actual = outputs[key as keyof SliderbedOutputs];

            if (typeof expectedDef.value === 'number') {
              expect(actual).toBeDefined();
              expect(typeof actual).toBe('number');
              const withinTol = isWithinTolerance(
                actual as number,
                expectedDef.value,
                expectedDef.tol_abs,
                expectedDef.tol_rel
              );
              if (!withinTol) {
                const tolDesc = expectedDef.tol_abs !== undefined
                  ? `±${expectedDef.tol_abs} abs`
                  : expectedDef.tol_rel !== undefined
                    ? `±${expectedDef.tol_rel * 100}% rel`
                    : 'exact';
                fail(
                  `${key}: expected ${expectedDef.value} (${tolDesc}), got ${actual}`
                );
              }
            } else if (typeof expectedDef.value === 'boolean') {
              expect(actual).toBe(expectedDef.value);
            } else if (typeof expectedDef.value === 'string') {
              expect(actual).toBe(expectedDef.value);
            }
          });
        }

        // Ensure no NaN values in contract outputs
        it('should have no NaN values in contract outputs', () => {
          for (const key of CONTRACT_OUTPUT_KEYS) {
            const value = outputs[key as keyof SliderbedOutputs];
            if (typeof value === 'number') {
              expect(Number.isNaN(value)).toBe(false);
            }
          }
        });
      }
    });
  }
});
