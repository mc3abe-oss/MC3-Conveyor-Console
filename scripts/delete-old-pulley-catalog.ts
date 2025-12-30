#!/usr/bin/env npx ts-node
/**
 * One-time script: Delete Old Pulley Catalog
 *
 * After migrating to the new pulley_families/pulley_variants model,
 * this script deletes all entries from the old pulley_catalog table.
 *
 * WARNING: This is a destructive operation. Run only after:
 * 1. New pulley families/variants are seeded
 * 2. UI is updated to use pulley_variant_key
 * 3. All tests pass
 *
 * Usage:
 *   npx ts-node scripts/delete-old-pulley-catalog.ts
 *
 * NOTE: This script requires SUPABASE_SERVICE_ROLE_KEY for write access.
 */

import * as fs from 'fs';
import * as path from 'path';

// Load .env.local manually
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

import { createClient } from '@supabase/supabase-js';

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing Supabase credentials');
    console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  return createClient(supabaseUrl, supabaseKey);
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('Deleting old pulley catalog entries...\n');

  const supabase = getSupabaseClient();

  // First, count existing entries
  const { data: countData, error: countError } = await supabase
    .from('pulley_catalog')
    .select('id', { count: 'exact', head: true });

  if (countError) {
    console.error('Error counting pulley catalog entries:', countError.message);
    process.exit(1);
  }

  const count = countData?.length ?? 0;
  console.log(`Found ${count} entries in pulley_catalog table.`);

  if (count === 0) {
    console.log('No entries to delete. Exiting.');
    return;
  }

  // Confirm before deletion
  console.log('\nWARNING: This will permanently delete all pulley_catalog entries.');
  console.log('Make sure new pulley_families/pulley_variants are seeded and tested.');
  console.log('\nProceeding with deletion in 3 seconds...');

  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Delete all entries
  const { error: deleteError } = await supabase
    .from('pulley_catalog')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Trick to delete all rows

  if (deleteError) {
    console.error('Error deleting pulley catalog entries:', deleteError.message);
    process.exit(1);
  }

  console.log(`\nDeleted ${count} entries from pulley_catalog.`);
  console.log('Old pulley catalog has been cleared.');
}

main().catch((err) => {
  console.error('Delete script failed:', err);
  process.exit(1);
});
