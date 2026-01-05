/**
 * Require Helpers for Route Handlers
 *
 * Server-side authorization guards that return standardized responses.
 * Use these in API route handlers to enforce authentication and role requirements.
 */

import {
  getSessionUser,
  getUserRole,
  canBeltAdmin,
  isSuperAdmin,
  unauthorized,
  forbidden,
  Role,
  SessionUser,
} from './rbac';

/**
 * Result of a require check.
 * Either { user, role } on success, or { response } on failure.
 */
export type RequireResult =
  | { user: SessionUser; role: Role; response?: never }
  | { response: Response; user?: never; role?: never };

/**
 * Require authentication.
 * Returns user info and role, or a 401 response.
 */
export async function requireAuth(): Promise<RequireResult> {
  const user = await getSessionUser();

  if (!user) {
    return { response: unauthorized() };
  }

  const role = await getUserRole(user.userId);

  return { user, role };
}

/**
 * Require BELT_ADMIN or SUPER_ADMIN role.
 * Returns user info and role, or a 401/403 response.
 */
export async function requireBeltAdmin(): Promise<RequireResult> {
  const user = await getSessionUser();

  if (!user) {
    return { response: unauthorized() };
  }

  const role = await getUserRole(user.userId);

  if (!canBeltAdmin(role)) {
    console.warn(
      `[RBAC] Belt admin access denied for user ${user.userId} (${user.email}) with role ${role}`
    );
    return { response: forbidden('Belt admin permissions required.') };
  }

  return { user, role };
}

/**
 * Require SUPER_ADMIN role.
 * Returns user info and role, or a 401/403 response.
 */
export async function requireSuperAdmin(): Promise<RequireResult> {
  const user = await getSessionUser();

  if (!user) {
    return { response: unauthorized() };
  }

  const role = await getUserRole(user.userId);

  if (!isSuperAdmin(role)) {
    console.warn(
      `[RBAC] Super admin access denied for user ${user.userId} (${user.email}) with role ${role}`
    );
    return { response: forbidden('Super admin permissions required.') };
  }

  return { user, role };
}
