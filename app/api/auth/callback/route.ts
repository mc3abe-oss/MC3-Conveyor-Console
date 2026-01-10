/**
 * Auth Callback Route
 *
 * Handles email confirmation callbacks from Supabase Auth.
 * Exchanges the auth code for a session and redirects to the app.
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  console.log('[Auth Callback] Received request:', {
    hasCode: !!code,
    next,
    origin,
    params: Object.fromEntries(searchParams.entries())
  });

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      console.log('[Auth Callback] Session established for:', data.session.user.email);
      return NextResponse.redirect(new URL(next, origin));
    }

    console.error('[Auth Callback] Code exchange error:', error?.message || 'No session returned');
  }

  // If no code or error, redirect to login with error
  const loginUrl = new URL('/login', origin);
  loginUrl.searchParams.set('error', 'auth_callback_error');
  return NextResponse.redirect(loginUrl);
}
