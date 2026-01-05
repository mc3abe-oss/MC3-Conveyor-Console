#!/usr/bin/env node
/**
 * check-user-roles.mjs - Check and adjust user roles
 *
 * Usage:
 *   node scripts/check-user-roles.mjs
 *
 * Requires .env.local with:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(red('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'));
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function checkAndAdjustRoles() {
  console.log(yellow('\n🔍 Checking user roles...\n'));

  // Get all users
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
    console.error(red(`Error: ${authError.message}`));
    process.exit(1);
  }

  // Get all profiles
  const { data: profiles, error: profileError } = await supabase
    .from('user_profiles')
    .select('*');

  if (profileError) {
    console.error(red(`Error fetching profiles: ${profileError.message}`));
    process.exit(1);
  }

  // Create lookup
  const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

  console.log('Current state:');
  console.log('─'.repeat(60));

  for (const user of authData.users) {
    const profile = profileMap.get(user.id);
    const role = profile?.role || '(no profile)';
    console.log(`  ${user.email}: ${role}`);
  }

  console.log('─'.repeat(60));

  // Find specific users
  const abek = authData.users.find(u => u.email === 'abek@mc3mfg.com');
  const abe = authData.users.find(u => u.email === 'abe@mc3mfg.com');

  // Adjust abek@mc3mfg.com -> SUPER_ADMIN
  if (abek) {
    const abekProfile = profileMap.get(abek.id);
    if (abekProfile?.role !== 'SUPER_ADMIN') {
      console.log(yellow(`\nAdjusting abek@mc3mfg.com to SUPER_ADMIN...`));
      const { error } = await supabase
        .from('user_profiles')
        .upsert({ user_id: abek.id, role: 'SUPER_ADMIN', updated_at: new Date().toISOString() })
        .select();
      if (error) {
        console.error(red(`  Error: ${error.message}`));
      } else {
        console.log(green(`  ✓ abek@mc3mfg.com set to SUPER_ADMIN`));
      }
    } else {
      console.log(green(`\n✓ abek@mc3mfg.com is already SUPER_ADMIN`));
    }
  } else {
    console.log(dim('\nabek@mc3mfg.com not found in auth.users'));
  }

  // Adjust abe@mc3mfg.com -> BELT_USER
  if (abe) {
    const abeProfile = profileMap.get(abe.id);
    if (abeProfile?.role !== 'BELT_USER') {
      console.log(yellow(`\nAdjusting abe@mc3mfg.com to BELT_USER...`));
      const { error } = await supabase
        .from('user_profiles')
        .upsert({ user_id: abe.id, role: 'BELT_USER', updated_at: new Date().toISOString() })
        .select();
      if (error) {
        console.error(red(`  Error: ${error.message}`));
      } else {
        console.log(green(`  ✓ abe@mc3mfg.com set to BELT_USER`));
      }
    } else {
      console.log(green(`\n✓ abe@mc3mfg.com is already BELT_USER`));
    }
  } else {
    console.log(dim('\nabe@mc3mfg.com not found in auth.users'));
  }

  // Final state
  console.log(yellow('\n📋 Final state:\n'));

  const { data: finalProfiles } = await supabase.from('user_profiles').select('*');
  const finalMap = new Map(finalProfiles?.map(p => [p.user_id, p]) || []);

  console.log('─'.repeat(60));
  for (const user of authData.users) {
    const profile = finalMap.get(user.id);
    const role = profile?.role || '(no profile)';
    const marker = role === 'SUPER_ADMIN' ? '👑' : role === 'BELT_ADMIN' ? '🔧' : '👤';
    console.log(`  ${marker} ${user.email}: ${role}`);
  }
  console.log('─'.repeat(60));

  console.log(green('\n✅ Done\n'));
}

checkAndAdjustRoles().catch(err => {
  console.error(red(`Error: ${err.message}`));
  process.exit(1);
});
