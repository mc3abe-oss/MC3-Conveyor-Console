#!/usr/bin/env npx ts-node
/**
 * CLI: recipes:test
 *
 * Runs locked golden smoke recipes in comparison_mode=expected.
 * Exits non-zero if any fail.
 *
 * Usage:
 *   pnpm recipes:test
 *   pnpm recipes:test --tier=regression
 *   pnpm recipes:test --all
 */

import { createClient } from '@supabase/supabase-js';
import {
  Recipe,
  RecipeTier,
  runRecipe,
  formatRunResult,
  checkCIBlocking,
  filterRecipesForCI,
  DEFAULT_CI_CONFIG,
} from '../src/lib/recipes';

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing Supabase credentials');
    console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  return createClient(supabaseUrl, supabaseKey);
}

// ============================================================================
// LOAD RECIPES
// ============================================================================

async function loadRecipes(supabase: ReturnType<typeof createClient>): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from('calc_recipes')
    .select('*')
    .eq('recipe_type', 'golden')
    .eq('recipe_status', 'locked');

  if (error) {
    console.error('Error loading recipes:', error.message);
    process.exit(1);
  }

  return data as Recipe[];
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  // Parse args
  let tiers: RecipeTier[] = ['smoke'];
  let runAll = false;

  for (const arg of args) {
    if (arg === '--all') {
      runAll = true;
    } else if (arg.startsWith('--tier=')) {
      const tier = arg.replace('--tier=', '') as RecipeTier;
      if (['smoke', 'regression', 'edge', 'longtail'].includes(tier)) {
        tiers = [tier];
      } else {
        console.error(`Invalid tier: ${tier}`);
        process.exit(1);
      }
    } else if (arg === '--help' || arg === '-h') {
      console.log('Usage: pnpm recipes:test [options]');
      console.log('');
      console.log('Options:');
      console.log('  --tier=<tier>  Run specific tier (smoke|regression|edge|longtail)');
      console.log('  --all          Run all locked golden recipes regardless of tier');
      console.log('  --help, -h     Show this help');
      process.exit(0);
    }
  }

  if (runAll) {
    tiers = ['smoke', 'regression', 'edge', 'longtail'];
  }

  console.log('🧪 Recipe Test Runner');
  console.log(`   Tiers: ${tiers.join(', ')}`);
  console.log('');

  // Load recipes
  const supabase = getSupabaseClient();
  const allRecipes = await loadRecipes(supabase);
  const recipes = filterRecipesForCI(allRecipes, tiers);

  if (recipes.length === 0) {
    console.log('No recipes found matching criteria.');
    console.log('Create locked golden recipes to run tests.');
    process.exit(0);
  }

  console.log(`Found ${recipes.length} recipe(s) to test:`);
  for (const r of recipes) {
    console.log(`  - ${r.name} (${r.recipe_tier})`);
  }
  console.log('');

  // Run recipes
  const results: Array<{ recipe: Recipe; result: Awaited<ReturnType<typeof runRecipe>> }> = [];

  for (const recipe of recipes) {
    console.log(`Running: ${recipe.name}...`);
    const result = await runRecipe({
      recipe,
      comparisonMode: 'expected',
      runContext: 'ci',
    });
    results.push({ recipe, result });

    console.log(formatRunResult(result, recipe));
    console.log('');
  }

  // Check CI blocking
  const ciCheck = checkCIBlocking(results, DEFAULT_CI_CONFIG);

  console.log('━'.repeat(60));
  console.log(ciCheck.summary);
  console.log('━'.repeat(60));

  // Exit with appropriate code
  process.exit(ciCheck.shouldBlock ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
