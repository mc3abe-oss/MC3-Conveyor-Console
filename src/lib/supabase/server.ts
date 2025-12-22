/**
 * Supabase Server Client
 *
 * For use in Server Components, Route Handlers, and Server Actions.
 * Handles cookie-based session management.
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  );
}

/**
 * Get the current authenticated user's ID from the session.
 * Returns null if not authenticated.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/**
 * Get the current authenticated user's ID, throwing if not authenticated.
 * Use this in protected routes where auth is guaranteed by middleware.
 */
export async function requireUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error('Not authenticated');
  }
  return userId;
}
