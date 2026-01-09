#!/usr/bin/env node
/**
 * Manually Confirm a User's Email
 * Usage: node scripts/confirm-user.mjs <user-id>
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  process.exit(1);
}

const userId = process.argv[2];

if (!userId) {
  console.error('Usage: node scripts/confirm-user.mjs <user-id>');
  console.error('Run "node scripts/audit-auth.mjs" to list unconfirmed users and their IDs.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log(`Confirming user: ${userId}`);

  // Update user to confirm email
  const { data, error } = await supabase.auth.admin.updateUserById(userId, {
    email_confirm: true,
  });

  if (error) {
    console.error('Error confirming user:', error.message);
    process.exit(1);
  }

  console.log('✓ User confirmed successfully!');
  console.log('  Email:', data.user.email);
  console.log('  Confirmed at:', data.user.email_confirmed_at);
}

main();
