/**
 * Supabase Auth Hook: Before User Created
 *
 * This edge function runs before a new user is created.
 * It enforces domain restrictions for signup.
 *
 * DEPLOYMENT:
 * 1. Deploy: supabase functions deploy before-user-created
 * 2. Set secret: supabase secrets set AUTH_HOOK_SECRET=<base64-secret-without-v1-whsec-prefix>
 * 3. In Supabase Dashboard > Auth > Hooks:
 *    - Add "Before User Created" hook
 *    - Select HTTP endpoint
 *    - Enter function URL
 *    - Generate and save the webhook secret
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';

const ALLOWED_DOMAINS = ['@mc3mfg.com', '@clearcode.ca'];

interface AuthHookPayload {
  user: {
    email?: string;
    [key: string]: unknown;
  };
}

serve(async (req) => {
  // Get the raw body for signature verification
  const rawBody = await req.text();

  // Verify the webhook signature
  const secret = Deno.env.get('AUTH_HOOK_SECRET');
  if (secret) {
    const webhookId = req.headers.get('webhook-id');
    const webhookTimestamp = req.headers.get('webhook-timestamp');
    const webhookSignature = req.headers.get('webhook-signature');

    if (!webhookId || !webhookTimestamp || !webhookSignature) {
      console.error('Missing webhook headers');
      return new Response(
        JSON.stringify({ error: 'Missing webhook headers' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    try {
      const wh = new Webhook(secret);
      wh.verify(rawBody, {
        'webhook-id': webhookId,
        'webhook-timestamp': webhookTimestamp,
        'webhook-signature': webhookSignature,
      });
    } catch (err) {
      console.error('Webhook verification failed:', err);
      return new Response(
        JSON.stringify({ error: 'Invalid webhook signature' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  try {
    const payload: AuthHookPayload = JSON.parse(rawBody);

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
