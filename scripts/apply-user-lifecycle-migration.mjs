#!/usr/bin/env node
/**
 * Apply User Lifecycle Migration
 *
 * Applies the user_profiles deactivation columns and user_admin_audit table.
 * Run with: source .env.local && node scripts/apply-user-lifecycle-migration.mjs
 */

import { createClient } from '@supabase/supabase-js';

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(red('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'));
  console.error(dim('Run: source .env.local && node scripts/apply-user-lifecycle-migration.mjs'));
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function runMigration() {
  console.log(dim('='.repeat(60)));
  console.log('Applying User Lifecycle Migration');
  console.log(dim('='.repeat(60)));
  console.log();

  // Check current schema - we can't run DDL via RPC, need to check status
  console.log(dim('Checking current schema...'));

  // Check if columns already exist
  const { data: columns, error: columnsError } = await supabase
    .from('user_profiles')
    .select('*')
    .limit(1);

  if (columnsError) {
    console.error(red(`Error checking user_profiles: ${columnsError.message}`));
    process.exit(1);
  }

  // Get column names from the result
  const existingColumns = columns && columns[0] ? Object.keys(columns[0]) : [];
  console.log(`Existing columns: ${existingColumns.join(', ')}`);

  const hasIsActive = existingColumns.includes('is_active');
  const hasDeactivatedAt = existingColumns.includes('deactivated_at');
  const hasDeactivatedBy = existingColumns.includes('deactivated_by');

  if (hasIsActive && hasDeactivatedAt && hasDeactivatedBy) {
    console.log(green('user_profiles already has deactivation columns'));
  } else {
    console.log(red('Missing columns detected. Please run the migration SQL manually:'));
    console.log(dim('supabase/migrations/20260105200000_user_lifecycle.sql'));
    console.log();
    console.log('Required SQL:');
    console.log(`
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ NULL;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS deactivated_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON public.user_profiles(is_active);
    `);
  }

  // Check if audit table exists
  console.log();
  console.log(dim('Checking user_admin_audit table...'));

  const { data: auditData, error: auditError } = await supabase
    .from('user_admin_audit')
    .select('id')
    .limit(1);

  if (auditError && auditError.code === '42P01') {
    // Table doesn't exist
    console.log(red('user_admin_audit table does not exist'));
    console.log('Please run the CREATE TABLE SQL from the migration file');
  } else if (auditError) {
    // Might be RLS blocking - table might exist
    console.log(dim(`Note: ${auditError.message}`));
    console.log(dim('Table may exist but RLS is blocking read'));
  } else {
    console.log(green('user_admin_audit table exists'));
  }

  console.log();
  console.log(dim('='.repeat(60)));
  console.log('Migration check complete');
  console.log(dim('If columns/tables are missing, apply the migration SQL via Supabase Dashboard'));
  console.log(dim('='.repeat(60)));
}

runMigration().catch((err) => {
  console.error(red(`Error: ${err.message}`));
  process.exit(1);
});
