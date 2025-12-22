/**
 * Supabase Auth Hook: Before User Created
 *
 * This edge function runs before a new user is created.
 * It enforces the @mc3mfg.com domain restriction.
 *
 * DEPLOYMENT:
 * 1. Install Supabase CLI: npm install -g supabase
 * 2. Link project: supabase link --project-ref dubadsxdgrvtjbxzettz
 * 3. Deploy: supabase functions deploy before-user-created
 * 4. In Supabase Dashboard > Auth > Hooks:
 *    - Enable "Before User Created" hook
 *    - Select this function
 *
 * HOOK PAYLOAD (log this once to confirm structure):
 * {
 *   "user": {
 *     "email": "user@example.com",
 *     ...
 *   }
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import * as jose from 'https://deno.land/x/jose@v4.14.4/index.ts';

const ALLOWED_DOMAINS = ['@mc3mfg.com', '@clearcode.ca'];

interface AuthHookPayload {
  user: {
    email?: string;
    [key: string]: unknown;
  };
}

serve(async (req) => {
  try {
    // Verify the webhook signature from Supabase Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid Authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const secret = Deno.env.get('AUTH_HOOK_SECRET');

    if (!secret) {
      console.error('AUTH_HOOK_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify the JWT token using the webhook secret
    try {
      const secretKey = new TextEncoder().encode(secret);
      await jose.jwtVerify(token, secretKey, {
        issuer: 'supabase',
        audience: 'authenticated',
      });
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const payload: AuthHookPayload = await req.json();

    // Log payload structure for debugging (remove in production)
    console.log('Auth hook payload:', JSON.stringify(payload, null, 2));

    // Extract and normalize email
    const email = (payload.user?.email ?? '').toLowerCase().trim();

    if (!email) {
      return new Response(
        JSON.stringify({
          decision: 'reject',
          message: 'Email address is required.',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
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
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Allow the signup
    console.log(`Approved signup: ${email}`);
    return new Response(
      JSON.stringify({
        decision: 'continue',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Auth hook error:', error);
    // On error, reject to be safe
    return new Response(
      JSON.stringify({
        decision: 'reject',
        message: 'An error occurred during signup validation.',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
