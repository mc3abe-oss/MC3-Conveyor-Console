/**
 * Next.js Middleware - Auth Gate
 *
 * Protects all routes except public ones (login, signup, assets).
 * Refreshes session on each request to prevent unexpected logouts.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from './src/lib/supabase/middleware';

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/signup'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    // Still update session in case user is already logged in
    const { supabaseResponse } = await updateSession(request);
    return supabaseResponse;
  }

  // Check authentication
  const { user, supabaseResponse } = await updateSession(request);

  if (!user) {
    // Redirect to login with return URL
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
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
