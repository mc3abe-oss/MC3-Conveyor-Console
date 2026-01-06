#!/usr/bin/env node
/**
 * Backfill Script: Canonicalize existing recipe inputs
 *
 * This script:
 * 1. Fetches all recipes from calc_recipes
 * 2. Canonicalizes their inputs
 * 3. Updates user_inputs_json and inputs_hash
 * 4. Preserves original inputs column for audit
 *
 * Safe to run multiple times (idempotent).
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/backfill-recipe-inputs.mjs
 *
 * Options:
 *   --dry-run    Show what would be updated without making changes
 *   --verbose    Show detailed output for each recipe
 *   --id=UUID    Only process a specific recipe ID
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// ============================================================================
// CANONICALIZATION LOGIC (duplicated from src/lib/recipes/canon for portability)
// ============================================================================

const DEPRECATED_KEYS = ['send_to_estimating'];

const DERIVED_CATALOG_KEYS = [
  'belt_min_pulley_dia_no_vguide_in',
  'belt_min_pulley_dia_with_vguide_in',
];

const ALIAS_MAP = {
  'drive_rpm': 'drive_rpm_input',
};

const MODE_GATED_KEYS = {
  'speed_mode': {
    'belt_speed': ['drive_rpm_input', 'drive_rpm'],
  },
};

function canonicalizeRecipeInputs(rawInputs) {
  const removedKeys = [];
  const result = { ...rawInputs };

  // Rule 1: Drop deprecated keys
  for (const key of DEPRECATED_KEYS) {
    if (key in result) {
      delete result[key];
      removedKeys.push({ key, reason: 'deprecated' });
    }
  }

  // Rule 2: Collapse aliases
  for (const [oldKey, newKey] of Object.entries(ALIAS_MAP)) {
    if (oldKey in result) {
      if (!(newKey in result)) {
        result[newKey] = result[oldKey];
      }
      delete result[oldKey];
      removedKeys.push({ key: oldKey, reason: `aliased to ${newKey}` });
    }
  }

  // Rule 3: Drop derived catalog keys
  for (const key of DERIVED_CATALOG_KEYS) {
    if (key in result) {
      delete result[key];
      removedKeys.push({ key, reason: 'derived from catalog' });
    }
  }

  // Rule 4: Drop mode-gated keys based on current mode
  for (const [modeKey, modeMap] of Object.entries(MODE_GATED_KEYS)) {
    const modeValue = result[modeKey];
    if (typeof modeValue === 'string' && modeValue in modeMap) {
      const keysToRemove = modeMap[modeValue];
      for (const key of keysToRemove) {
        if (key in result) {
          delete result[key];
          removedKeys.push({ key, reason: `inactive in ${modeKey}=${modeValue} mode` });
        }
      }
    }
  }

  // Rule 5: Strip undefined and null values
  for (const [key, value] of Object.entries(result)) {
    if (value === undefined || value === null) {
      delete result[key];
      removedKeys.push({ key, reason: 'null/undefined' });
    }
  }

  return { userInputs: result, removedKeys };
}

function hashCanonical(obj) {
  const canonical = JSON.stringify(obj, Object.keys(obj).sort());
  return crypto.createHash('sha256').update(canonical).digest('hex').slice(0, 16);
}

// ============================================================================
// MAIN SCRIPT
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose');
  const idArg = args.find(a => a.startsWith('--id='));
  const specificId = idArg ? idArg.split('=')[1] : null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('='.repeat(60));
  console.log('Recipe Inputs Backfill Script');
  console.log('='.repeat(60));
  if (dryRun) console.log('DRY RUN MODE - no changes will be made');
  if (specificId) console.log(`Processing only recipe ID: ${specificId}`);
  console.log();

  // Fetch recipes
  let query = supabase.from('calc_recipes').select('id, name, inputs, user_inputs_json, inputs_hash');
  if (specificId) {
    query = query.eq('id', specificId);
  }

  const { data: recipes, error: fetchError } = await query;

  if (fetchError) {
    console.error('Error fetching recipes:', fetchError.message);
    process.exit(1);
  }

  console.log(`Found ${recipes.length} recipes to process`);
  console.log();

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const recipe of recipes) {
    try {
      const rawInputs = recipe.inputs || {};
      const { userInputs, removedKeys } = canonicalizeRecipeInputs(rawInputs);
      const newHash = hashCanonical(userInputs);

      // Check if already up to date
      const existingHash = recipe.inputs_hash;
      const existingUserInputs = recipe.user_inputs_json;

      // Compare by hash - if hash matches and user_inputs_json exists, skip
      if (existingUserInputs && existingHash === newHash) {
        if (verbose) {
          console.log(`[SKIP] ${recipe.name} (${recipe.id}) - already canonicalized`);
        }
        skipped++;
        continue;
      }

      if (verbose || dryRun) {
        console.log(`[${dryRun ? 'WOULD UPDATE' : 'UPDATE'}] ${recipe.name} (${recipe.id})`);
        if (removedKeys.length > 0) {
          console.log(`  Removed keys: ${removedKeys.map(r => r.key).join(', ')}`);
        }
        if (existingHash !== newHash) {
          console.log(`  Hash: ${existingHash} -> ${newHash}`);
        }
      }

      if (!dryRun) {
        const { error: updateError } = await supabase
          .from('calc_recipes')
          .update({
            user_inputs_json: userInputs,
            inputs_hash: newHash,
            updated_at: new Date().toISOString(),
          })
          .eq('id', recipe.id);

        if (updateError) {
          console.error(`  Error updating ${recipe.id}:`, updateError.message);
          errors++;
          continue;
        }
      }

      updated++;
    } catch (err) {
      console.error(`Error processing ${recipe.id}:`, err.message);
      errors++;
    }
  }

  console.log();
  console.log('='.repeat(60));
  console.log('Summary:');
  console.log(`  Total: ${recipes.length}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped (already done): ${skipped}`);
  console.log(`  Errors: ${errors}`);
  console.log('='.repeat(60));

  if (dryRun) {
    console.log();
    console.log('This was a dry run. Run without --dry-run to apply changes.');
  }
}

main().catch(console.error);
