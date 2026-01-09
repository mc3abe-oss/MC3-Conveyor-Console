#!/usr/bin/env node
/**
 * Audit Supabase Auth Users
 * Lists all users and identifies those with unconfirmed emails.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers();

  if (error) {
    console.error('Error listing users:', error.message);
    process.exit(1);
  }

  console.log('=== SUPABASE AUTH AUDIT ===\n');
  console.log('Total users:', users.length);

  const unconfirmed = users.filter(u => !u.email_confirmed_at);
  const confirmed = users.filter(u => u.email_confirmed_at);

  console.log('Confirmed:', confirmed.length);
  console.log('Unconfirmed (stuck):', unconfirmed.length);

  if (unconfirmed.length > 0) {
    console.log('\n--- Unconfirmed Users ---');
    for (const u of unconfirmed) {
      console.log('  Email:', u.email);
      console.log('  ID:', u.id);
      console.log('  Created:', u.created_at);
      console.log('  Last sign in:', u.last_sign_in_at || 'Never');
      console.log('');
    }

    console.log('\n--- To manually confirm a user, run: ---');
    console.log('node scripts/confirm-user.mjs <user-id>');
  }

  if (confirmed.length > 0) {
    console.log('\n--- Sample Confirmed Users ---');
    for (const u of confirmed.slice(0, 3)) {
      console.log('  Email:', u.email);
      console.log('  Confirmed:', u.email_confirmed_at);
      console.log('');
    }
  }
}

main();
