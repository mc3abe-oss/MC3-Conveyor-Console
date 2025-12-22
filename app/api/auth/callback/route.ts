/**
 * Auth Callback Route
 *
 * Handles email confirmation callbacks from Supabase Auth.
 * Exchanges the auth code for a session and redirects to the app.
 */

import { NextResponse } from 'next/server';
import { createClient } from '../../../../src/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  // If no code or error, redirect to login with error
  const loginUrl = new URL('/login', origin);
  loginUrl.searchParams.set('error', 'auth_callback_error');
  return NextResponse.redirect(loginUrl);
}
