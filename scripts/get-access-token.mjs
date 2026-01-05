#!/usr/bin/env node
/**
 * get-access-token.mjs - Sign in and output access token for testing
 *
 * Usage:
 *   TEST_EMAIL=user@example.com TEST_PASSWORD=xxx node scripts/get-access-token.mjs
 *
 * Environment variables:
 *   NEXT_PUBLIC_SUPABASE_URL - Supabase project URL (from .env.local)
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY - Supabase anon key (from .env.local)
 *   TEST_EMAIL - Email to sign in with
 *   TEST_PASSWORD - Password (not logged)
 *
 * Output:
 *   JSON with access_token and user_id
 */

import { createClient } from '@supabase/supabase-js';

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const testEmail = process.env.TEST_EMAIL;
const testPassword = process.env.TEST_PASSWORD;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(red('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'));
  console.error(dim('Source your .env.local first: source .env.local'));
  process.exit(1);
}

if (!testEmail || !testPassword) {
  console.error(red('Missing TEST_EMAIL or TEST_PASSWORD'));
  console.error(dim('Usage: TEST_EMAIL=x TEST_PASSWORD=y node scripts/get-access-token.mjs'));
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function getAccessToken() {
  console.error(dim(`Signing in as ${testEmail}...`));

  const { data, error } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (error) {
    console.error(red(`Sign-in failed: ${error.message}`));
    process.exit(1);
  }

  const { session, user } = data;

  if (!session || !user) {
    console.error(red('No session returned'));
    process.exit(1);
  }

  // Output JSON to stdout (for piping/capture)
  const result = {
    email: user.email,
    user_id: user.id,
    access_token: session.access_token,
    expires_at: session.expires_at,
  };

  console.log(JSON.stringify(result, null, 2));

  console.error(green(`\n✓ Token obtained for ${user.email}`));
  console.error(dim(`  User ID: ${user.id}`));
  console.error(dim(`  Expires: ${new Date(session.expires_at * 1000).toISOString()}`));
}

getAccessToken().catch((err) => {
  console.error(red(`Error: ${err.message}`));
  process.exit(1);
});
