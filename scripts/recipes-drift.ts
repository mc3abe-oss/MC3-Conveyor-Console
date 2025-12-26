#!/usr/bin/env npx ts-node
/**
 * CLI: recipes:drift
 *
 * Runs reference recipes in comparison_mode=previous or baseline.
 * Prints summary and top drift fields.
 *
 * Usage:
 *   pnpm recipes:drift
 *   pnpm recipes:drift --mode=legacy
 *   pnpm recipes:drift --top=10
 */

import { createClient } from '@supabase/supabase-js';
import {
  Recipe,
  RecipeRunResult,
  ComparisonMode,
  runRecipe,
  formatRunResult,
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

async function loadReferenceRecipes(supabase: ReturnType<typeof createClient>): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from('calc_recipes')
    .select('*')
    .eq('recipe_type', 'reference')
    .in('recipe_status', ['active', 'draft']);

  if (error) {
    console.error('Error loading recipes:', error.message);
    process.exit(1);
  }

  return data as Recipe[];
}

// ============================================================================
// DRIFT SUMMARY
// ============================================================================

interface DriftEntry {
  recipe: Recipe;
  field: string;
  driftRel: number;
  expected: unknown;
  actual: unknown;
}

function collectDriftEntries(
  results: Array<{ recipe: Recipe; result: RecipeRunResult }>
): DriftEntry[] {
  const entries: DriftEntry[] = [];

  for (const { recipe, result } of results) {
    if (!result.output_diff) continue;

    for (const comp of result.output_diff) {
      if (comp.fieldType === 'numeric' && comp.deltaRel !== undefined && comp.deltaRel > 0) {
        entries.push({
          recipe,
          field: comp.field,
          driftRel: comp.deltaRel,
          expected: comp.expected,
          actual: comp.actual,
        });
      }
    }
  }

  // Sort by drift descending
  entries.sort((a, b) => b.driftRel - a.driftRel);

  return entries;
}

function printDriftSummary(entries: DriftEntry[], top: number) {
  console.log('');
  console.log('━'.repeat(60));
  console.log('TOP DRIFT FIELDS');
  console.log('━'.repeat(60));

  if (entries.length === 0) {
    console.log('No drift detected.');
    return;
  }

  const topEntries = entries.slice(0, top);

  for (let i = 0; i < topEntries.length; i++) {
    const e = topEntries[i];
    const pct = (e.driftRel * 100).toFixed(4);
    console.log(`${i + 1}. ${e.field} (${e.recipe.name})`);
    console.log(`   Drift: ${pct}%`);
    console.log(`   Expected: ${e.expected} → Actual: ${e.actual}`);
    console.log('');
  }

  if (entries.length > top) {
    console.log(`... and ${entries.length - top} more fields with drift`);
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  // Parse args
  let mode: ComparisonMode = 'expected';  // For reference, we compare against expected_outputs or legacy_outputs
  let top = 10;

  for (const arg of args) {
    if (arg.startsWith('--mode=')) {
      const m = arg.replace('--mode=', '') as ComparisonMode;
      if (['expected', 'baseline', 'legacy', 'previous'].includes(m)) {
        mode = m;
      } else {
        console.error(`Invalid mode: ${m}`);
        process.exit(1);
      }
    } else if (arg.startsWith('--top=')) {
      const t = parseInt(arg.replace('--top=', ''), 10);
      if (!isNaN(t) && t > 0) {
        top = t;
      }
    } else if (arg === '--help' || arg === '-h') {
      console.log('Usage: pnpm recipes:drift [options]');
      console.log('');
      console.log('Options:');
      console.log('  --mode=<mode>  Comparison mode (expected|baseline|legacy|previous)');
      console.log('  --top=<n>      Show top N drift fields (default: 10)');
      console.log('  --help, -h     Show this help');
      process.exit(0);
    }
  }

  console.log('📊 Recipe Drift Analyzer');
  console.log(`   Mode: ${mode}`);
  console.log(`   Top: ${top}`);
  console.log('');

  // Load recipes
  const supabase = getSupabaseClient();
  const recipes = await loadReferenceRecipes(supabase);

  if (recipes.length === 0) {
    console.log('No reference recipes found.');
    console.log('Create reference recipes to track drift.');
    process.exit(0);
  }

  console.log(`Found ${recipes.length} reference recipe(s):`);
  for (const r of recipes) {
    console.log(`  - ${r.name} (${r.recipe_tier})`);
  }
  console.log('');

  // Run recipes
  const results: Array<{ recipe: Recipe; result: RecipeRunResult }> = [];
  let passCount = 0;
  let failCount = 0;
  let skipCount = 0;

  for (const recipe of recipes) {
    // Determine effective mode based on what's available
    let effectiveMode = mode;
    if (mode === 'legacy' && !recipe.legacy_outputs) {
      effectiveMode = 'expected';
    }
    if (effectiveMode === 'expected' && !recipe.expected_outputs) {
      console.log(`⚪ SKIP ${recipe.name} (no expected_outputs)`);
      skipCount++;
      continue;
    }

    console.log(`Running: ${recipe.name}...`);
    const result = await runRecipe({
      recipe,
      comparisonMode: effectiveMode,
      runContext: 'regression_sweep',
    });
    results.push({ recipe, result });

    if (result.passed === null) {
      skipCount++;
    } else if (result.passed) {
      passCount++;
    } else {
      failCount++;
    }

    console.log(formatRunResult(result, recipe));
    console.log('');
  }

  // Print summary
  console.log('━'.repeat(60));
  console.log('SUMMARY');
  console.log('━'.repeat(60));
  console.log(`  Passed:  ${passCount}`);
  console.log(`  Failed:  ${failCount}`);
  console.log(`  Skipped: ${skipCount}`);
  console.log(`  Total:   ${recipes.length}`);

  // Print drift summary
  const driftEntries = collectDriftEntries(results);
  printDriftSummary(driftEntries, top);

  // Exit 0 regardless - drift analysis is informational
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
