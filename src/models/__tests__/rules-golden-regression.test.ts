/**
 * GOLDEN REGRESSION TEST — Phase 2 Dedup Safety Net
 *
 * Verifies that the consolidated sliderbed_v1/rules.ts produces identical output
 * to the pre-dedup golden fixtures. These fixtures were generated BEFORE
 * belt_conveyor_v1/rules.ts was deleted.
 *
 * Primary assertion: sliderbed_v1 path (no productKey) output is unchanged.
 * This is what production uses for ALL products via engine.ts.
 *
 * Secondary assertion: belt_conveyor_v1 path (productKey='belt_conveyor_v1')
 * matches sliderbed output except for 2 product-name-templated messages.
 */

import * as fs from 'fs';
import * as path from 'path';

import {
  validate,
  applyApplicationRules,
  validateInputs,
} from '../sliderbed_v1/rules';

import { DEFAULT_PARAMETERS } from '../belt_conveyor_v1';

interface GoldenFixture {
  name: string;
  description: string;
  inputs: Record<string, unknown>;
  sliderbed_v1: {
    validateInputs: { errors: unknown[] };
    applyApplicationRules: { errors: unknown[]; warnings: unknown[] };
    validate: { errors: unknown[]; warnings: unknown[] };
  };
  belt_conveyor_v1: {
    validateInputs: { errors: unknown[] };
    applyApplicationRules: { errors: unknown[]; warnings: unknown[] };
    validate: { errors: unknown[]; warnings: unknown[] };
  };
}

const goldensDir = path.join(__dirname, '__goldens__');
const goldenFiles = fs.readdirSync(goldensDir).filter((f) => f.endsWith('.json'));

describe('Golden regression — sliderbed_v1 path (production)', () => {
  for (const file of goldenFiles) {
    const golden: GoldenFixture = JSON.parse(
      fs.readFileSync(path.join(goldensDir, file), 'utf-8')
    );

    describe(golden.name, () => {
      it('validateInputs errors match golden', () => {
        const errors = validateInputs(golden.inputs as any);
        expect(errors).toEqual(golden.sliderbed_v1.validateInputs.errors);
      });

      it('applyApplicationRules errors+warnings match golden', () => {
        const result = applyApplicationRules(golden.inputs as any);
        expect(result.errors).toEqual(golden.sliderbed_v1.applyApplicationRules.errors);
        expect(result.warnings).toEqual(golden.sliderbed_v1.applyApplicationRules.warnings);
      });

      it('validate errors+warnings match golden', () => {
        const result = validate(golden.inputs as any, DEFAULT_PARAMETERS as any);
        expect(result.errors).toEqual(golden.sliderbed_v1.validate.errors);
        expect(result.warnings).toEqual(golden.sliderbed_v1.validate.warnings);
      });
    });
  }
});

describe('Golden regression — belt_conveyor_v1 path (productKey templating)', () => {
  for (const file of goldenFiles) {
    const golden: GoldenFixture = JSON.parse(
      fs.readFileSync(path.join(goldensDir, file), 'utf-8')
    );

    describe(golden.name, () => {
      it('validate with productKey includes all sliderbed golden items (plus belt-only premium flags)', () => {
        const result = validate(
          golden.inputs as any,
          DEFAULT_PARAMETERS as any,
          'belt_conveyor_v1'
        );
        const goldenResult = golden.sliderbed_v1.validate;

        // Errors must match exactly (premium flags are warnings, not errors)
        expect(result.errors.length).toBe(goldenResult.errors.length);
        for (let i = 0; i < result.errors.length; i++) {
          expect((result.errors[i] as any).field).toBe((goldenResult.errors[i] as any).field);
          expect((result.errors[i] as any).severity).toBe((goldenResult.errors[i] as any).severity);
        }

        // Warnings: belt path may have additional premium flag items (BELT_ONLY rule).
        // All golden sliderbed warnings must appear in same order, with premium flags appended.
        const nonPremiumWarnings = result.warnings.filter(
          (w) => (w as any).field !== 'premium'
        );
        const premiumWarnings = result.warnings.filter(
          (w) => (w as any).field === 'premium'
        );

        // Non-premium warnings match golden exactly
        expect(nonPremiumWarnings.length).toBe(goldenResult.warnings.length);
        for (let i = 0; i < nonPremiumWarnings.length; i++) {
          expect((nonPremiumWarnings[i] as any).field).toBe((goldenResult.warnings[i] as any).field);
          expect((nonPremiumWarnings[i] as any).severity).toBe((goldenResult.warnings[i] as any).severity);
        }

        // Premium warnings (if any) must have field='premium' and severity='info'
        for (const pw of premiumWarnings) {
          expect((pw as any).field).toBe('premium');
          expect((pw as any).severity).toBe('info');
        }
      });

      it('product-name-templated messages say "belt conveyor" not "sliderbed"', () => {
        const result = validate(
          golden.inputs as any,
          DEFAULT_PARAMETERS as any,
          'belt_conveyor_v1'
        );

        // Any message mentioning a product name should say "belt conveyor"
        const allItems = [...result.errors, ...result.warnings];
        for (const item of allItems) {
          const msg = (item as any).message as string;
          if (msg.includes('belt conveyor') || msg.includes('Belt conveyor')) {
            // Correct — belt product gets belt wording
            expect(msg).not.toMatch(/sliderbed conveyor/i);
          }
          if (msg.includes('sliderbed conveyor') || msg.includes('Sliderbed conveyor')) {
            // This would be a bug — belt product should not get sliderbed wording
            fail(`Belt product got sliderbed wording: "${msg}"`);
          }
        }
      });
    });
  }
});
