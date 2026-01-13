#!/usr/bin/env node
/**
 * Zombie Sales Order Detection and Cleanup Script
 *
 * A "zombie" Sales Order is one where:
 * 1. SO exists (deleted_at IS NULL)
 * 2. But has NO active applications (calc_recipes with sales_order_id = SO.id, is_active=true, deleted_at IS NULL)
 *
 * This script:
 * 1. Detects zombie SOs
 * 2. For SOs NOT linked to a Quote (origin_quote_id IS NULL) - deletes them
 * 3. For SOs linked to a Quote - just reports them (manual review needed)
 *
 * Usage:
 *   node scripts/cleanup-zombie-sales-orders.mjs           # Dry run (report only)
 *   node scripts/cleanup-zombie-sales-orders.mjs --delete  # Actually delete zombies
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const isDryRun = !process.argv.includes('--delete');

async function main() {
  console.log('='.repeat(60));
  console.log('ZOMBIE SALES ORDER DETECTION' + (isDryRun ? ' (DRY RUN)' : ' (WILL DELETE)'));
  console.log('='.repeat(60));

  // Step 1: Get all active Sales Orders
  const { data: allSOs, error: soError } = await supabase
    .from('sales_orders')
    .select('id, base_number, suffix_line, origin_quote_id, customer_name, created_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (soError) {
    console.error('Error fetching sales orders:', soError);
    process.exit(1);
  }

  console.log(`\nFound ${allSOs.length} active Sales Orders`);

  // Step 2: For each SO, check if it has active applications
  const zombies = [];
  const linkedZombies = [];

  for (const so of allSOs) {
    const { count, error: countError } = await supabase
      .from('calc_recipes')
      .select('*', { count: 'exact', head: true })
      .eq('sales_order_id', so.id)
      .eq('is_active', true)
      .is('deleted_at', null);

    if (countError) {
      console.error(`Error checking apps for SO ${so.base_number}:`, countError);
      continue;
    }

    if (count === 0) {
      // This is a zombie - no active applications
      if (so.origin_quote_id) {
        linkedZombies.push(so);
      } else {
        zombies.push(so);
      }
    }
  }

  // Report zombies not linked to quotes (can be deleted)
  console.log('\n' + '-'.repeat(60));
  console.log('ZOMBIES NOT LINKED TO QUOTE (safe to delete):');
  console.log('-'.repeat(60));

  if (zombies.length === 0) {
    console.log('None found.');
  } else {
    for (const so of zombies) {
      const soNum = so.suffix_line ? `${so.base_number}.${so.suffix_line}` : so.base_number;
      console.log(`  SO${soNum} - Customer: ${so.customer_name || 'N/A'} - Created: ${new Date(so.created_at).toLocaleDateString()}`);
    }
    console.log(`\nTotal: ${zombies.length} zombie(s)`);
  }

  // Report zombies linked to quotes (need manual review)
  console.log('\n' + '-'.repeat(60));
  console.log('ZOMBIES LINKED TO QUOTE (need manual review):');
  console.log('-'.repeat(60));

  if (linkedZombies.length === 0) {
    console.log('None found.');
  } else {
    for (const so of linkedZombies) {
      const soNum = so.suffix_line ? `${so.base_number}.${so.suffix_line}` : so.base_number;
      console.log(`  SO${soNum} - Origin Quote: ${so.origin_quote_id} - Customer: ${so.customer_name || 'N/A'}`);
    }
    console.log(`\nTotal: ${linkedZombies.length} zombie(s) linked to quotes`);
    console.log('These SOs were created from Quote conversion but have no applications.');
    console.log('This may indicate a conversion issue. Manual review recommended.');
  }

  // Step 3: Delete zombies if not dry run
  if (!isDryRun && zombies.length > 0) {
    console.log('\n' + '-'.repeat(60));
    console.log('DELETING ZOMBIES...');
    console.log('-'.repeat(60));

    let deleted = 0;
    let failed = 0;

    for (const so of zombies) {
      const soNum = so.suffix_line ? `${so.base_number}.${so.suffix_line}` : so.base_number;

      // Delete SO-level entities first
      await Promise.all([
        supabase.from('specs').delete().eq('parent_type', 'sales_order').eq('parent_id', so.id),
        supabase.from('notes').delete().eq('parent_type', 'sales_order').eq('parent_id', so.id),
        supabase.from('attachments').delete().eq('parent_type', 'sales_order').eq('parent_id', so.id),
        supabase.from('scope_lines').delete().eq('parent_type', 'sales_order').eq('parent_id', so.id),
      ]);

      // Delete the SO
      const { error: deleteError } = await supabase
        .from('sales_orders')
        .delete()
        .eq('id', so.id);

      if (deleteError) {
        console.error(`  FAILED: SO${soNum} - ${deleteError.message}`);
        failed++;
      } else {
        console.log(`  DELETED: SO${soNum}`);
        deleted++;
      }
    }

    console.log(`\nResults: ${deleted} deleted, ${failed} failed`);
  } else if (isDryRun && zombies.length > 0) {
    console.log('\n[DRY RUN] No changes made. Run with --delete to remove zombies.');
  }

  console.log('\n' + '='.repeat(60));
  console.log('DONE');
  console.log('='.repeat(60));
}

main().catch(console.error);
