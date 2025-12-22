/**
 * Supabase Auth Hook: Before User Created
 *
 * This edge function runs before a new user is created.
 * It enforces domain restrictions for signup.
 *
 * DEPLOYMENT:
 * 1. Deploy: supabase functions deploy before-user-created
 * 2. In Supabase Dashboard > Auth > Hooks:
 *    - Add "Before User Created" hook
 *    - Select HTTP endpoint
 *    - Enter function URL (leave secret blank)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const ALLOWED_DOMAINS = ['@mc3mfg.com', '@clearcode.ca'];

interface AuthHookPayload {
  user: {
    email?: string;
    [key: string]: unknown;
  };
}

serve(async (req) => {
  try {
    const payload: AuthHookPayload = await req.json();

    // Log payload for debugging
    console.log('Auth hook payload:', JSON.stringify(payload, null, 2));

    // Extract and normalize email
    const email = (payload.user?.email ?? '').toLowerCase().trim();

    if (!email) {
      return new Response(
        JSON.stringify({
          decision: 'reject',
          message: 'Email address is required.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check domain restriction
    if (!ALLOWED_DOMAINS.some((domain) => email.endsWith(domain))) {
      console.log(`Rejected signup attempt: ${email}`);
      return new Response(
        JSON.stringify({
          decision: 'reject',
          message: `Only ${ALLOWED_DOMAINS.join(' or ')} email addresses are allowed.`,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Allow the signup
    console.log(`Approved signup: ${email}`);
    return new Response(
      JSON.stringify({ decision: 'continue' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Auth hook error:', error);
    return new Response(
      JSON.stringify({
        decision: 'reject',
        message: 'An error occurred during signup validation.',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
