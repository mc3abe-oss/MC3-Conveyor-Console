/**
 * Tests for CI blocking helper.
 */

import {
  shouldBlockCI,
  checkCIBlocking,
  getCIExitCode,
  filterRecipesForCI,
} from './ci';
import { Recipe, RecipeRunResult, CIBlockingConfig } from './types';

describe('shouldBlockCI', () => {
  const baseRecipe: Recipe = {
    id: 'test-id',
    recipe_type: 'golden',
    recipe_tier: 'smoke',
    name: 'Test Recipe',
    slug: 'test-recipe',
    model_key: 'sliderbed_conveyor_v1',
    model_version_id: 'v1.12.0',
    model_build_id: null,
    model_snapshot_hash: null,
    inputs: {},
    inputs_hash: 'hash',
    expected_outputs: {},
    expected_issues: null,
    tolerances: {},
    tolerance_policy: 'explicit',
    legacy_outputs: null,
    recipe_status: 'locked',
    locked_at: new Date().toISOString(),
    locked_by: 'user-id',
    lock_reason: 'Test lock',
    source: null,
    source_ref: null,
    tags: null,
    notes: null,
    belt_catalog_version: null,
    created_at: new Date().toISOString(),
    created_by: null,
    updated_at: new Date().toISOString(),
    updated_by: null,
  };

  const baseResult: RecipeRunResult = {
    recipe_id: 'test-id',
    model_version_id: 'v1.12.0',
    model_build_id: null,
    model_snapshot_hash: null,
    inputs_hash: 'hash',
    actual_outputs: {},
    outputs_hash: 'hash',
    actual_issues: null,
    comparison_mode: 'expected',
    baseline_recipe_run_id: null,
    baseline_model_version_id: null,
    passed: true,
    output_diff: [],
    issue_diff: null,
    max_drift_rel: null,
    max_drift_field: null,
    run_context: 'ci',
    ci_run_id: null,
    duration_ms: 10,
  };

  it('does not block for reference recipes', () => {
    const recipe: Recipe = { ...baseRecipe, recipe_type: 'reference' };
    const result = shouldBlockCI(recipe, baseResult);
    expect(result.block).toBe(false);
    expect(result.reason).toBe('reference_recipe');
  });

  it('does not block for non-locked golden recipes', () => {
    const recipe: Recipe = { ...baseRecipe, recipe_status: 'active' };
    const result = shouldBlockCI(recipe, baseResult);
    expect(result.block).toBe(false);
    expect(result.reason).toBe('not_locked');
  });

  it('blocks for locked golden smoke recipe that fails', () => {
    const failedResult: RecipeRunResult = {
      ...baseResult,
      passed: false,
      max_drift_rel: 0.05,
      max_drift_field: 'torque',
    };
    const result = shouldBlockCI(baseRecipe, failedResult);
    expect(result.block).toBe(true);
    expect(result.reason).toContain('smoke_tier_failed');
    expect(result.reason).toContain('5.00%');
  });

  it('does not block for passing locked golden smoke recipe', () => {
    const result = shouldBlockCI(baseRecipe, baseResult);
    expect(result.block).toBe(false);
    expect(result.reason).toBe('passed');
  });

  it('does not block for non-blocking tier', () => {
    const recipe: Recipe = { ...baseRecipe, recipe_tier: 'regression' };
    const failedResult: RecipeRunResult = { ...baseResult, passed: false };
    const result = shouldBlockCI(recipe, failedResult);
    expect(result.block).toBe(false);
    expect(result.reason).toBe('tier_regression_non_blocking');
  });

  it('respects neverBlock list', () => {
    const failedResult: RecipeRunResult = { ...baseResult, passed: false };
    const config: CIBlockingConfig = {
      blockingTiers: ['smoke'],
      alwaysBlock: [],
      neverBlock: ['test-recipe'],
    };
    const result = shouldBlockCI(baseRecipe, failedResult, config);
    expect(result.block).toBe(false);
    expect(result.reason).toBe('in_neverBlock_list');
  });

  it('respects alwaysBlock list', () => {
    const recipe: Recipe = { ...baseRecipe, recipe_tier: 'regression' };
    const failedResult: RecipeRunResult = { ...baseResult, passed: false };
    const config: CIBlockingConfig = {
      blockingTiers: ['smoke'],  // regression not in blocking tiers
      alwaysBlock: ['test-recipe'],
      neverBlock: [],
    };
    const result = shouldBlockCI(recipe, failedResult, config);
    expect(result.block).toBe(true);
    expect(result.reason).toContain('always_block_recipe_failed');
  });
});

describe('checkCIBlocking', () => {
  it('returns shouldBlock=false when all pass', () => {
    const recipe: Recipe = {
      id: 'test-id',
      recipe_type: 'golden',
      recipe_tier: 'smoke',
      name: 'Test',
      slug: null,
      model_key: 'test',
      model_version_id: 'v1',
      model_build_id: null,
      model_snapshot_hash: null,
      inputs: {},
      inputs_hash: 'h',
      expected_outputs: {},
      expected_issues: null,
      tolerances: {},
      tolerance_policy: 'explicit',
      legacy_outputs: null,
      recipe_status: 'locked',
      locked_at: new Date().toISOString(),
      locked_by: 'u',
      lock_reason: 'r',
      source: null,
      source_ref: null,
      tags: null,
      notes: null,
      belt_catalog_version: null,
      created_at: new Date().toISOString(),
      created_by: null,
      updated_at: new Date().toISOString(),
      updated_by: null,
    };

    const result: RecipeRunResult = {
      recipe_id: 'test-id',
      model_version_id: 'v1',
      model_build_id: null,
      model_snapshot_hash: null,
      inputs_hash: 'h',
      actual_outputs: {},
      outputs_hash: 'h',
      actual_issues: null,
      comparison_mode: 'expected',
      baseline_recipe_run_id: null,
      baseline_model_version_id: null,
      passed: true,
      output_diff: [],
      issue_diff: null,
      max_drift_rel: null,
      max_drift_field: null,
      run_context: 'ci',
      ci_run_id: null,
      duration_ms: 10,
    };

    const check = checkCIBlocking([{ recipe, result }]);
    expect(check.shouldBlock).toBe(false);
    expect(check.blockers).toHaveLength(0);
    expect(check.summary).toContain('CI OK');
  });
});

describe('getCIExitCode', () => {
  it('returns 0 when not blocked', () => {
    expect(getCIExitCode([])).toBe(0);
  });
});

describe('filterRecipesForCI', () => {
  it('filters by type, status, and tier', () => {
    const recipes: Recipe[] = [
      {
        id: '1',
        recipe_type: 'golden',
        recipe_tier: 'smoke',
        recipe_status: 'locked',
        name: 'Golden Smoke Locked',
        slug: null,
        model_key: 'test',
        model_version_id: 'v1',
        model_build_id: null,
        model_snapshot_hash: null,
        inputs: {},
        inputs_hash: 'h',
        expected_outputs: {},
        expected_issues: null,
        tolerances: {},
        tolerance_policy: 'explicit',
        legacy_outputs: null,
        locked_at: new Date().toISOString(),
        locked_by: 'u',
        lock_reason: 'r',
        source: null,
        source_ref: null,
        tags: null,
        notes: null,
        belt_catalog_version: null,
        created_at: new Date().toISOString(),
        created_by: null,
        updated_at: new Date().toISOString(),
        updated_by: null,
      },
      {
        id: '2',
        recipe_type: 'golden',
        recipe_tier: 'regression',
        recipe_status: 'locked',
        name: 'Golden Regression Locked',
        slug: null,
        model_key: 'test',
        model_version_id: 'v1',
        model_build_id: null,
        model_snapshot_hash: null,
        inputs: {},
        inputs_hash: 'h',
        expected_outputs: {},
        expected_issues: null,
        tolerances: {},
        tolerance_policy: 'explicit',
        legacy_outputs: null,
        locked_at: new Date().toISOString(),
        locked_by: 'u',
        lock_reason: 'r',
        source: null,
        source_ref: null,
        tags: null,
        notes: null,
        belt_catalog_version: null,
        created_at: new Date().toISOString(),
        created_by: null,
        updated_at: new Date().toISOString(),
        updated_by: null,
      },
      {
        id: '3',
        recipe_type: 'reference',
        recipe_tier: 'smoke',
        recipe_status: 'active',
        name: 'Reference',
        slug: null,
        model_key: 'test',
        model_version_id: 'v1',
        model_build_id: null,
        model_snapshot_hash: null,
        inputs: {},
        inputs_hash: 'h',
        expected_outputs: null,
        expected_issues: null,
        tolerances: null,
        tolerance_policy: 'default_fallback',
        legacy_outputs: null,
        locked_at: null,
        locked_by: null,
        lock_reason: null,
        source: null,
        source_ref: null,
        tags: null,
        notes: null,
        belt_catalog_version: null,
        created_at: new Date().toISOString(),
        created_by: null,
        updated_at: new Date().toISOString(),
        updated_by: null,
      },
    ];

    // Default: only smoke tier
    const filtered = filterRecipesForCI(recipes);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('1');

    // With regression tier
    const withRegression = filterRecipesForCI(recipes, ['smoke', 'regression']);
    expect(withRegression).toHaveLength(2);
  });
});
