/**
 * RBAC Utilities
 *
 * Role-based access control helpers for the Belt Conveyor application.
 * Server-side only - do not import in client components.
 */

import { NextResponse } from 'next/server';
import { createClient } from '../supabase/server';

/**
 * Available roles in the system.
 * Ordered by privilege level (highest to lowest).
 */
export type Role = 'SUPER_ADMIN' | 'BELT_ADMIN' | 'BELT_USER';

/**
 * Default role for users without a profile.
 */
export const DEFAULT_ROLE: Role = 'BELT_USER';

/**
 * Session user info returned by getSessionUser.
 */
export interface SessionUser {
  userId: string;
  email: string;
}

/**
 * Get the current session user from cookies.
 * Returns null if not authenticated.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return {
    userId: user.id,
    email: user.email || '',
  };
}

/**
 * Get the role for a user ID from user_profiles.
 * Returns BELT_USER if no profile exists (defensive default).
 */
export async function getUserRole(userId: string): Promise<Role> {
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[RBAC] Error fetching user role:', error);
    return DEFAULT_ROLE;
  }

  if (!profile || !profile.role) {
    return DEFAULT_ROLE;
  }

  // Validate role is a known value
  const role = profile.role as string;
  if (role === 'SUPER_ADMIN' || role === 'BELT_ADMIN' || role === 'BELT_USER') {
    return role;
  }

  console.warn(`[RBAC] Unknown role "${role}" for user ${userId}, defaulting to BELT_USER`);
  return DEFAULT_ROLE;
}

/**
 * Check if a role has belt admin access (BELT_ADMIN or SUPER_ADMIN).
 */
export function canBeltAdmin(role: Role): boolean {
  return role === 'BELT_ADMIN' || role === 'SUPER_ADMIN';
}

/**
 * Check if a role is SUPER_ADMIN.
 */
export function isSuperAdmin(role: Role): boolean {
  return role === 'SUPER_ADMIN';
}

// ============================================================================
// Response Helpers
// ============================================================================

/**
 * Standard 401 Unauthorized response.
 */
export function unauthorized(): NextResponse {
  return NextResponse.json(
    {
      error: 'UNAUTHORIZED',
      message: 'Authentication required.',
    },
    { status: 401 }
  );
}

/**
 * Standard 403 Forbidden response.
 */
export function forbidden(message = 'Admin permissions required.'): NextResponse {
  return NextResponse.json(
    {
      error: 'FORBIDDEN',
      message,
    },
    { status: 403 }
  );
}
