/**
 * MODEL IDENTITY TESTS
 *
 * Tests for model identity consistency:
 * 1. Single source of truth exports correct values
 * 2. MODEL_KEY, MODEL_VERSION_ID, MODEL_SEMVER are distinct
 * 3. Calculation engine uses these values
 * 4. Emitted metadata matches canonical exports
 */

import {
  MODEL_KEY,
  MODEL_VERSION_ID,
  MODEL_SEMVER,
  getModelIdentity,
  createCalculationMetadata,
} from './index';

describe('Model Identity - Single Source of Truth', () => {
  describe('Constants - Format Validation', () => {
    it('MODEL_KEY is belt_conveyor_v1', () => {
      // Canonical key per belt_conveyor_v1/schema.ts which states
      // "This model supersedes sliderbed_conveyor_v1"
      expect(MODEL_KEY).toBe('belt_conveyor_v1');
    });

    it('MODEL_VERSION_ID is a stable immutable ID (not semver)', () => {
      // Format: {model_key}.{major_version}
      expect(MODEL_VERSION_ID).toMatch(/^belt_conveyor_v1\.\d+$/);
      expect(MODEL_VERSION_ID).toBe('belt_conveyor_v1.0');
    });

    it('MODEL_SEMVER is human-readable semver format', () => {
      // Format: major.minor.patch
      expect(MODEL_SEMVER).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('MODEL_VERSION_ID and MODEL_SEMVER are distinct (not overloaded)', () => {
      // VERSION_ID is for provenance, SEMVER is for display
      expect(MODEL_VERSION_ID).not.toBe(MODEL_SEMVER);
      expect(MODEL_VERSION_ID).not.toContain(MODEL_SEMVER);
    });
  });

  describe('getModelIdentity', () => {
    it('returns all three identity fields', () => {
      const identity = getModelIdentity();

      expect(identity.model_key).toBe(MODEL_KEY);
      expect(identity.model_version_id).toBe(MODEL_VERSION_ID);
      expect(identity.model_semver).toBe(MODEL_SEMVER);
    });
  });

  describe('createCalculationMetadata', () => {
    it('includes all identity fields plus timestamp', () => {
      const metadata = createCalculationMetadata();

      expect(metadata.model_key).toBe(MODEL_KEY);
      expect(metadata.model_version_id).toBe(MODEL_VERSION_ID);
      expect(metadata.model_semver).toBe(MODEL_SEMVER);
      expect(metadata.calculated_at).toBeDefined();
    });

    it('calculated_at is a valid ISO timestamp', () => {
      const before = new Date().toISOString();
      const metadata = createCalculationMetadata();
      const after = new Date().toISOString();

      expect(metadata.calculated_at >= before).toBe(true);
      expect(metadata.calculated_at <= after).toBe(true);
    });
  });
});

describe('Model Identity - Consistency Invariants', () => {
  /**
   * These tests verify that emitted metadata matches canonical exports.
   * Engine output == saved metadata == UI displayed metadata.
   */

  it('engine emits metadata matching canonical identity', async () => {
    const { runCalculation } = await import('../calculator/engine');
    const { MODEL_KEY, MODEL_VERSION_ID } = await import('./index');

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
      } as any,
    });

    // Emitted metadata must match canonical exports
    expect(result.metadata.model_key).toBe(MODEL_KEY);
    expect(result.metadata.model_version_id).toBe(MODEL_VERSION_ID);
  });

  it('MODEL_KEY matches schema CalculationMetadata type', () => {
    // belt_conveyor_v1/schema.ts defines:
    //   model_key: 'belt_conveyor_v1' in CalculationMetadata
    // This ensures type and runtime value are consistent
    expect(MODEL_KEY).toBe('belt_conveyor_v1');
  });
});

describe('Model Identity - No Hard-Coded Conflicts', () => {
  /**
   * Document what values should NOT exist elsewhere in codebase.
   * These tests serve as documentation of the cleanup.
   */

  it('documents removed hard-coded values', () => {
    // The following hard-coded values have been removed:
    // - 'v1.13.0' from save/route.ts (replaced with MODEL_VERSION_ID)
    // - 'sliderbed_v1_factory_default' from engine.ts (replaced with MODEL_VERSION_ID)
    // - 'belt_conveyor_v1' literals from engine.ts and belt_conveyor_v1/index.ts
    //   (replaced with MODEL_KEY import)
    expect(true).toBe(true);
  });
});
