/**
 * Next.js Middleware - Auth Gate (FAIL-CLOSED)
 *
 * Security model:
 * - ALL routes protected by default (fail-closed)
 * - Public routes must be EXPLICITLY allowlisted
 * - Errors redirect to login (never allow through)
 * - Dev bypass ONLY when AUTH_BYPASS_DEV=true AND NODE_ENV=development
 */

import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from './src/lib/supabase/middleware';

/**
 * EXPLICIT PUBLIC ROUTES ALLOWLIST
 *
 * Only these routes are accessible without authentication.
 * All other routes require valid auth or will redirect to /login.
 */
export const PUBLIC_ROUTES = ['/login', '/signup', '/reset-password', '/forgot-password'];

/**
 * Check if dev bypass is enabled.
 * ONLY allows bypass when BOTH conditions are true:
 * - NODE_ENV === 'development'
 * - AUTH_BYPASS_DEV === 'true'
 */
function isDevBypassEnabled(): boolean {
  return (
    process.env.NODE_ENV === 'development' &&
    process.env.AUTH_BYPASS_DEV === 'true'
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if Supabase is configured
  const supabaseConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase not configured, check for dev bypass
  if (!supabaseConfigured) {
    if (isDevBypassEnabled()) {
      // Dev bypass enabled: allow request through
      console.warn('[Auth] Dev bypass enabled - skipping auth');
      return NextResponse.next();
    }

    // No bypass: return 503 error (not silent pass-through)
    console.error('[Auth] Supabase not configured and no dev bypass');
    return NextResponse.json(
      {
        error: 'Authentication service not configured',
        message: 'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, or enable AUTH_BYPASS_DEV=true in development',
      },
      { status: 503 }
    );
  }

  try {
    // Allow public routes (still update session if logged in)
    if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
      const { supabaseResponse } = await updateSession(request);
      return supabaseResponse;
    }

    // Check authentication for protected routes
    const { user, supabaseResponse } = await updateSession(request);

    if (!user) {
      // Not authenticated: redirect to login with return URL
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }

    return supabaseResponse;
  } catch (error) {
    // FAIL-CLOSED: On ANY error, redirect to login
    // Never allow request through on error
    console.error('[Auth] Middleware error (fail-closed):', error);
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    loginUrl.searchParams.set('error', 'auth_error');
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (images, etc.)
     * - api/auth routes (auth callbacks)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/auth).*)',
  ],
};
