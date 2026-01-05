#!/usr/bin/env node
/**
 * backfill-user-profiles.mjs - Create user_profiles for auth users missing them
 *
 * This script is IDEMPOTENT - safe to run multiple times.
 * It only inserts profiles for users that don't have one.
 *
 * Usage:
 *   source .env.local
 *   node scripts/backfill-user-profiles.mjs
 *
 * Environment variables:
 *   NEXT_PUBLIC_SUPABASE_URL - Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key (required for auth.users access)
 *
 * Output:
 *   - Total auth users count
 *   - Existing profiles count
 *   - Newly inserted profiles count
 */

import { createClient } from '@supabase/supabase-js';

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error(red('Missing NEXT_PUBLIC_SUPABASE_URL'));
  console.error(dim('Source your .env.local first: source .env.local'));
  process.exit(1);
}

if (!serviceRoleKey) {
  console.error(red('Missing SUPABASE_SERVICE_ROLE_KEY'));
  console.error(dim('This script requires service role access to read auth.users'));
  console.error(dim('Add SUPABASE_SERVICE_ROLE_KEY to your .env.local'));
  process.exit(1);
}

// Create client with service role (bypasses RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function backfillUserProfiles() {
  console.log(dim('='.repeat(60)));
  console.log('Backfill User Profiles');
  console.log(dim('='.repeat(60)));
  console.log();

  // Step 1: Get all auth users
  console.log(dim('Fetching auth users...'));
  const { data: authUsersResponse, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.error(red(`Failed to fetch auth users: ${authError.message}`));
    process.exit(1);
  }

  const authUsers = authUsersResponse.users || [];
  console.log(`Total auth users: ${green(authUsers.length)}`);

  // Step 2: Get existing user_profiles
  console.log(dim('Fetching existing user_profiles...'));
  const { data: existingProfiles, error: profilesError } = await supabase
    .from('user_profiles')
    .select('user_id');

  if (profilesError) {
    console.error(red(`Failed to fetch profiles: ${profilesError.message}`));
    process.exit(1);
  }

  const existingUserIds = new Set((existingProfiles || []).map((p) => p.user_id));
  console.log(`Existing profiles: ${green(existingUserIds.size)}`);

  // Step 3: Find users missing profiles
  const missingUsers = authUsers.filter((u) => !existingUserIds.has(u.id));
  console.log(`Users missing profiles: ${yellow(missingUsers.length)}`);
  console.log();

  if (missingUsers.length === 0) {
    console.log(green('All users have profiles. Nothing to backfill.'));
    return;
  }

  // Step 4: Insert missing profiles with BELT_USER role
  console.log(dim('Inserting missing profiles...'));

  const profilesToInsert = missingUsers.map((user) => ({
    user_id: user.id,
    role: 'BELT_USER',
  }));

  const { data: inserted, error: insertError } = await supabase
    .from('user_profiles')
    .insert(profilesToInsert)
    .select();

  if (insertError) {
    console.error(red(`Failed to insert profiles: ${insertError.message}`));
    process.exit(1);
  }

  console.log();
  console.log(dim('-'.repeat(60)));
  console.log(green(`Successfully inserted ${inserted.length} new profiles`));
  console.log(dim('-'.repeat(60)));
  console.log();

  // Print summary of inserted users
  console.log('Newly created profiles:');
  for (const user of missingUsers) {
    console.log(`  ${dim(user.id)} - ${user.email || '(no email)'}`);
  }
}

backfillUserProfiles()
  .then(() => {
    console.log();
    console.log(green('Backfill complete.'));
    process.exit(0);
  })
  .catch((err) => {
    console.error(red(`Error: ${err.message}`));
    process.exit(1);
  });
