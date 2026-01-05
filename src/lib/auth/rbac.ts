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
 * User profile data including role and active status.
 */
export interface UserProfile {
  role: Role;
  isActive: boolean;
}

/**
 * Get the profile for a user ID from user_profiles.
 * Returns default values if no profile exists (defensive default).
 * Handles pre-migration state where is_active column may not exist.
 */
export async function getUserProfile(userId: string): Promise<UserProfile> {
  const supabase = await createClient();

  // Try to fetch with is_active column first
  let { data: profile, error } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', userId)
    .maybeSingle();

  // If is_active column doesn't exist (pre-migration), fall back to just role
  if (error && error.code === '42703') {
    const fallback = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (fallback.error) {
      console.error('[RBAC] Error fetching user profile:', fallback.error);
      return { role: DEFAULT_ROLE, isActive: true };
    }

    profile = fallback.data ? { ...fallback.data, is_active: true } : null;
    error = null;
  }

  if (error) {
    console.error('[RBAC] Error fetching user profile:', error);
    return { role: DEFAULT_ROLE, isActive: true };
  }

  if (!profile) {
    return { role: DEFAULT_ROLE, isActive: true };
  }

  // Validate role is a known value
  const role = profile.role as string;
  const validRole = (role === 'SUPER_ADMIN' || role === 'BELT_ADMIN' || role === 'BELT_USER')
    ? role as Role
    : DEFAULT_ROLE;

  if (validRole !== role) {
    console.warn(`[RBAC] Unknown role "${role}" for user ${userId}, defaulting to BELT_USER`);
  }

  // Default is_active to true if column doesn't exist yet (pre-migration)
  const isActive = profile.is_active ?? true;

  return { role: validRole, isActive };
}

/**
 * Get the role for a user ID from user_profiles.
 * Returns BELT_USER if no profile exists (defensive default).
 * @deprecated Use getUserProfile instead for is_active support
 */
export async function getUserRole(userId: string): Promise<Role> {
  const profile = await getUserProfile(userId);
  return profile.role;
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

/**
 * 403 response for deactivated users.
 */
export function deactivated(): NextResponse {
  return NextResponse.json(
    {
      error: 'DEACTIVATED',
      message: 'Account is deactivated. Contact an administrator.',
    },
    { status: 403 }
  );
}
