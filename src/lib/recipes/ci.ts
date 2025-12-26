/**
 * RECIPE SYSTEM - CI BLOCKING HELPER
 *
 * Determines whether a recipe run result should block CI.
 *
 * Rules:
 * - Reference recipes never block
 * - Only locked golden recipes can block
 * - Only blocking tiers (default: smoke) block by default
 * - alwaysBlock/neverBlock lists provide escape hatches
 */

import {
  Recipe,
  RecipeRunResult,
  CIBlockingConfig,
  CIBlockingResult,
  DEFAULT_CI_CONFIG,
  RecipeTier,
} from './types';

/**
 * Determine if a recipe run should block CI.
 *
 * @param recipe - Recipe that was run
 * @param result - Run result
 * @param config - CI blocking configuration
 * @returns Whether to block and reason
 */
export function shouldBlockCI(
  recipe: Recipe,
  result: RecipeRunResult,
  config: CIBlockingConfig = DEFAULT_CI_CONFIG
): CIBlockingResult {
  // Reference recipes never block
  if (recipe.recipe_type === 'reference') {
    return { block: false, reason: 'reference_recipe' };
  }

  // Must be locked golden to block
  if (recipe.recipe_status !== 'locked') {
    return { block: false, reason: 'not_locked' };
  }

  // Check escape hatches
  if (recipe.slug && config.neverBlock.includes(recipe.slug)) {
    return { block: false, reason: 'in_neverBlock_list' };
  }

  if (recipe.slug && config.alwaysBlock.includes(recipe.slug)) {
    if (result.passed === false) {
      return {
        block: true,
        reason: `always_block_recipe_failed: ${recipe.slug}`,
      };
    }
    return { block: false, reason: 'always_block_passed' };
  }

  // Tier-based blocking
  if (!config.blockingTiers.includes(recipe.recipe_tier)) {
    return { block: false, reason: `tier_${recipe.recipe_tier}_non_blocking` };
  }

  // Blocking tier + failed = block
  if (result.passed === false) {
    const driftInfo = result.max_drift_field && result.max_drift_rel !== null
      ? `: ${result.max_drift_field} drifted ${(result.max_drift_rel * 100).toFixed(2)}%`
      : '';
    return {
      block: true,
      reason: `${recipe.recipe_tier}_tier_failed${driftInfo}`,
    };
  }

  return { block: false, reason: 'passed' };
}

/**
 * Check multiple recipe results for CI blocking.
 *
 * @param results - Array of [recipe, result] pairs
 * @param config - CI blocking configuration
 * @returns Object with overall block status and per-recipe results
 */
export function checkCIBlocking(
  results: Array<{ recipe: Recipe; result: RecipeRunResult }>,
  config: CIBlockingConfig = DEFAULT_CI_CONFIG
): {
  shouldBlock: boolean;
  blockers: Array<{ recipe: Recipe; result: RecipeRunResult; reason: string }>;
  summary: string;
} {
  const blockers: Array<{ recipe: Recipe; result: RecipeRunResult; reason: string }> = [];

  for (const { recipe, result } of results) {
    const check = shouldBlockCI(recipe, result, config);
    if (check.block) {
      blockers.push({ recipe, result, reason: check.reason });
    }
  }

  const shouldBlock = blockers.length > 0;

  const summary = shouldBlock
    ? `CI BLOCKED: ${blockers.length} recipe(s) failed\n${blockers
        .map((b) => `  - ${b.recipe.name}: ${b.reason}`)
        .join('\n')}`
    : `CI OK: ${results.length} recipe(s) checked, all passed`;

  return { shouldBlock, blockers, summary };
}

/**
 * Get CI exit code based on blocking status.
 *
 * @param results - Recipe results
 * @param config - CI configuration
 * @returns Exit code (0 = pass, 1 = blocked)
 */
export function getCIExitCode(
  results: Array<{ recipe: Recipe; result: RecipeRunResult }>,
  config: CIBlockingConfig = DEFAULT_CI_CONFIG
): number {
  const { shouldBlock } = checkCIBlocking(results, config);
  return shouldBlock ? 1 : 0;
}

/**
 * Filter recipes by type and tier for CI runs.
 *
 * @param recipes - All recipes
 * @param tiers - Tiers to include (default: ['smoke'])
 * @returns Filtered recipes
 */
export function filterRecipesForCI(
  recipes: Recipe[],
  tiers: RecipeTier[] = ['smoke']
): Recipe[] {
  return recipes.filter(
    (r) =>
      r.recipe_type === 'golden' &&
      r.recipe_status === 'locked' &&
      tiers.includes(r.recipe_tier)
  );
}
