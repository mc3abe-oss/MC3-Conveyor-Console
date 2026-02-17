/**
 * Auth Callback Route
 *
 * Handles email confirmation callbacks from Supabase Auth.
 * Supports both PKCE flow (code) and token-based flow (token_hash).
 */

import { createServerClient } from '@supabase/ssr';
import type { EmailOtpType } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createLogger } from '../../../../src/lib/logger';
import { ErrorCodes } from '../../../../src/lib/logger/error-codes';

const logger = createLogger().child({ module: 'api.auth-callback' });

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/';

  logger.info('api.auth-callback.received', {
    hasCode: !!code,
    hasTokenHash: !!token_hash,
    type,
    next,
    origin,
  });

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

  // Handle PKCE flow (code parameter)
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      logger.info('api.auth-callback.pkce.completed', { email: data.session.user.email });
      return NextResponse.redirect(new URL(next, origin));
    }

    logger.error('api.auth-callback.pkce.failed', { errorCode: ErrorCodes.AUTH_UNAUTHORIZED, error: error?.message || 'No session returned' });
  }

  // Handle token-based flow (token_hash parameter) - used by magic links
  if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error && data.session) {
      logger.info('api.auth-callback.token.completed', { email: data.session.user.email });
      return NextResponse.redirect(new URL(next, origin));
    }

    logger.error('api.auth-callback.token.failed', { errorCode: ErrorCodes.AUTH_UNAUTHORIZED, error: error?.message || 'No session returned' });
  }

  // If no valid auth params or error, redirect to login with error
  const loginUrl = new URL('/login', origin);
  loginUrl.searchParams.set('error', 'auth_callback_error');
  return NextResponse.redirect(loginUrl);
}
