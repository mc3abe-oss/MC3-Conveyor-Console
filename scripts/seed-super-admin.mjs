#!/usr/bin/env node
/**
 * seed-super-admin.mjs - Seed initial SUPER_ADMIN user
 *
 * Creates or updates a user_profile with SUPER_ADMIN role.
 *
 * Usage:
 *   SUPER_ADMIN_EMAIL=admin@example.com node scripts/seed-super-admin.mjs
 *
 * Environment variables:
 *   SUPER_ADMIN_EMAIL - Email of user to promote (required)
 *   NEXT_PUBLIC_SUPABASE_URL - Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key (bypasses RLS)
 *
 * The script will:
 * 1. Look up the user by email in auth.users
 * 2. Create or update their user_profiles row with role = 'SUPER_ADMIN'
 */

import { createClient } from '@supabase/supabase-js';

// Colors for console output
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

// Validate environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;

if (!supabaseUrl) {
  console.error(red('Error: NEXT_PUBLIC_SUPABASE_URL not set'));
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.error(red('Error: SUPABASE_SERVICE_ROLE_KEY not set'));
  console.error(dim('This script requires service role access to bypass RLS.'));
  process.exit(1);
}

if (!superAdminEmail) {
  console.error(red('Error: SUPER_ADMIN_EMAIL not set'));
  console.error(dim('Usage: SUPER_ADMIN_EMAIL=admin@example.com node scripts/seed-super-admin.mjs'));
  process.exit(1);
}

// Create Supabase admin client (service role bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function seedSuperAdmin() {
  console.log(yellow('\n🔐 Seeding SUPER_ADMIN user...\n'));
  console.log(dim(`  Email: ${superAdminEmail}`));
  console.log(dim(`  Supabase: ${supabaseUrl}\n`));

  // Step 1: Look up user by email
  console.log('Step 1: Looking up user by email...');

  const { data: authData, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.error(red(`  Error listing users: ${authError.message}`));
    process.exit(1);
  }

  const user = authData.users.find(
    (u) => u.email?.toLowerCase() === superAdminEmail.toLowerCase()
  );

  if (!user) {
    console.error(red(`  User not found with email: ${superAdminEmail}`));
    console.error(dim('  The user must sign up first before they can be promoted.'));
    console.error(dim('  Alternatively, create the user in Supabase Dashboard.'));
    process.exit(1);
  }

  console.log(green(`  ✓ Found user: ${user.id}`));

  // Step 2: Upsert user_profile with SUPER_ADMIN role
  console.log('\nStep 2: Setting SUPER_ADMIN role...');

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .upsert(
      {
        user_id: user.id,
        role: 'SUPER_ADMIN',
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id',
      }
    )
    .select()
    .single();

  if (profileError) {
    console.error(red(`  Error setting role: ${profileError.message}`));
    process.exit(1);
  }

  console.log(green(`  ✓ Role set to SUPER_ADMIN`));

  // Step 3: Verify
  console.log('\nStep 3: Verifying...');

  const { data: verifyData, error: verifyError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (verifyError || verifyData?.role !== 'SUPER_ADMIN') {
    console.error(red(`  Verification failed!`));
    process.exit(1);
  }

  console.log(green(`  ✓ Verified: ${verifyData.role}`));

  // Summary
  console.log(green('\n✅ SUPER_ADMIN seeded successfully!\n'));
  console.log(dim('Profile:'));
  console.log(dim(`  user_id: ${verifyData.user_id}`));
  console.log(dim(`  role: ${verifyData.role}`));
  console.log(dim(`  created_at: ${verifyData.created_at}`));
  console.log(dim(`  updated_at: ${verifyData.updated_at}`));
  console.log('');
}

seedSuperAdmin().catch((err) => {
  console.error(red(`\nUnexpected error: ${err.message}`));
  process.exit(1);
});
