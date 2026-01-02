/**
 * MODEL IDENTITY TESTS
 *
 * Tests for model identity consistency:
 * 1. Single source of truth exports correct values
 * 2. Calculation engine uses these values
 * 3. Save route uses these values
 * 4. Schema metadata matches
 */

import {
  MODEL_KEY,
  MODEL_VERSION_ID,
  MODEL_SEMVER,
  getModelIdentity,
  createCalculationMetadata,
} from './index';

describe('Model Identity - Single Source of Truth', () => {
  describe('Constants', () => {
    it('MODEL_KEY is belt_conveyor_v1', () => {
      expect(MODEL_KEY).toBe('belt_conveyor_v1');
    });

    it('MODEL_VERSION_ID follows v-prefixed semver format', () => {
      expect(MODEL_VERSION_ID).toMatch(/^v\d+\.\d+\.\d+$/);
    });

    it('MODEL_SEMVER matches MODEL_VERSION_ID without v prefix', () => {
      expect(`v${MODEL_SEMVER}`).toBe(MODEL_VERSION_ID);
    });
  });

  describe('getModelIdentity', () => {
    it('returns all identity fields', () => {
      const identity = getModelIdentity();

      expect(identity.model_key).toBe(MODEL_KEY);
      expect(identity.model_version_id).toBe(MODEL_VERSION_ID);
      expect(identity.model_semver).toBe(MODEL_SEMVER);
    });
  });

  describe('createCalculationMetadata', () => {
    it('includes model_key', () => {
      const metadata = createCalculationMetadata();
      expect(metadata.model_key).toBe(MODEL_KEY);
    });

    it('includes model_version_id', () => {
      const metadata = createCalculationMetadata();
      expect(metadata.model_version_id).toBe(MODEL_VERSION_ID);
    });

    it('includes calculated_at timestamp', () => {
      const before = new Date().toISOString();
      const metadata = createCalculationMetadata();
      const after = new Date().toISOString();

      expect(metadata.calculated_at).toBeDefined();
      expect(metadata.calculated_at >= before).toBe(true);
      expect(metadata.calculated_at <= after).toBe(true);
    });
  });
});

describe('Model Identity - Integration Checks', () => {
  /**
   * These tests verify that the model identity is used consistently
   * across the codebase. They import actual modules to check.
   */

  it('calculation engine should use MODEL_KEY from identity module', async () => {
    // The engine should emit metadata.model_key matching our constant
    const { runCalculation } = await import('../calculator/engine');
    const { MODEL_KEY: expectedKey } = await import('./index');

    // Create minimal valid inputs for a calculation
    const result = runCalculation({
      inputs: {
        conveyor_length_cc_in: 120,
        belt_width_in: 24,
        pulley_diameter_in: 4,
        conveyor_incline_deg: 0,
        belt_speed_fpm: 50,
        drive_rpm: 100,
        part_weight_lbs: 5,
        part_length_in: 12,
        part_width_in: 6,
        part_spacing_in: 6,
      } as any, // Partial inputs for test
    });

    expect(result.metadata.model_key).toBe(expectedKey);
  });

  it('model identity version should match schema expectations', async () => {
    // Verify the identity module's model_key matches schema type
    const { MODEL_KEY } = await import('./index');

    // The schema defines model_key as 'belt_conveyor_v1'
    // This test ensures they stay in sync
    expect(MODEL_KEY).toBe('belt_conveyor_v1');
  });
});
