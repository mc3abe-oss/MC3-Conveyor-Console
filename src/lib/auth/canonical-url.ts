/**
 * Canonical URL Utility for Auth Email Links
 *
 * Returns the canonical production URL for use in auth email confirmation links.
 * This ensures email links always point to the production domain, never to
 * preview deployments or local URLs.
 *
 * IMPORTANT: This must NEVER fall back to VERCEL_URL or request origin for email links.
 */

/**
 * Get the canonical production app URL.
 *
 * Priority:
 * 1. NEXT_PUBLIC_APP_URL (explicit production URL)
 *
 * This function is intentionally strict and will throw if no canonical URL is configured.
 * For auth email links, we must never use preview deployment URLs.
 *
 * @throws Error if NEXT_PUBLIC_APP_URL is not set
 */
export function getCanonicalAppUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    // In development, provide a helpful error message
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[Auth] NEXT_PUBLIC_APP_URL not set. ' +
          'For local development, set NEXT_PUBLIC_APP_URL=http://localhost:3000 in .env.local. ' +
          'For production, set it to your canonical domain (e.g., https://app.example.com).'
      );
      // Allow localhost fallback in development only
      return 'http://localhost:3000';
    }

    // In production, this is a critical configuration error
    throw new Error(
      'NEXT_PUBLIC_APP_URL environment variable is required for auth email links. ' +
        'Set this to your production domain in Vercel environment variables.'
    );
  }

  // Ensure URL doesn't have trailing slash
  return appUrl.replace(/\/$/, '');
}

/**
 * Get the auth callback URL for email confirmation links.
 * This is the URL that Supabase will redirect to after email confirmation.
 */
export function getAuthCallbackUrl(): string {
  return `${getCanonicalAppUrl()}/api/auth/callback`;
}

/**
 * Log which base URL is being used for auth email links.
 * Call this during signup to verify correct configuration.
 */
export function logAuthEmailUrlSource(): void {
  const url = getCanonicalAppUrl();
  console.log(`[Auth] Email confirmation links will use: ${url}`);
}
