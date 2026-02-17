/**
 * Require Helpers for Route Handlers
 *
 * Server-side authorization guards that return standardized responses.
 * Use these in API route handlers to enforce authentication and role requirements.
 *
 * IMPORTANT: All require* functions now check is_active status.
 * Deactivated users will receive a 403 DEACTIVATED response.
 */

import {
  getSessionUser,
  getUserProfile,
  canBeltAdmin,
  isSuperAdmin,
  unauthorized,
  forbidden,
  deactivated,
  Role,
  SessionUser,
} from './rbac';
import { createLogger } from '../logger';
import { ErrorCodes } from '../logger/error-codes';

const logger = createLogger().child({ module: 'auth-require' });

/**
 * Result of a require check.
 * Either { user, role } on success, or { response } on failure.
 */
export type RequireResult =
  | { user: SessionUser; role: Role; response?: never }
  | { response: Response; user?: never; role?: never };

/**
 * Require authentication.
 * Returns user info and role, or a 401/403 response.
 * Blocks deactivated users with 403 DEACTIVATED.
 */
export async function requireAuth(): Promise<RequireResult> {
  const user = await getSessionUser();

  if (!user) {
    return { response: unauthorized() };
  }

  const profile = await getUserProfile(user.userId);

  // Block deactivated users
  if (!profile.isActive) {
    logger.warn('auth.rbac.user-deactivated', { errorCode: ErrorCodes.AUTH_USER_DEACTIVATED, userId: user.userId, email: user.email });
    return { response: deactivated() };
  }

  return { user, role: profile.role };
}

/**
 * Require BELT_ADMIN or SUPER_ADMIN role.
 * Returns user info and role, or a 401/403 response.
 * Blocks deactivated users with 403 DEACTIVATED.
 */
export async function requireBeltAdmin(): Promise<RequireResult> {
  const user = await getSessionUser();

  if (!user) {
    return { response: unauthorized() };
  }

  const profile = await getUserProfile(user.userId);

  // Block deactivated users
  if (!profile.isActive) {
    logger.warn('auth.rbac.user-deactivated', { errorCode: ErrorCodes.AUTH_USER_DEACTIVATED, userId: user.userId, email: user.email });
    return { response: deactivated() };
  }

  if (!canBeltAdmin(profile.role)) {
    logger.warn('auth.rbac.belt-admin-denied', { errorCode: ErrorCodes.AUTH_INSUFFICIENT_ROLE, userId: user.userId, email: user.email, role: profile.role });
    return { response: forbidden('Belt admin permissions required.') };
  }

  return { user, role: profile.role };
}

/**
 * Require SUPER_ADMIN role.
 * Returns user info and role, or a 401/403 response.
 * Blocks deactivated users with 403 DEACTIVATED.
 */
export async function requireSuperAdmin(): Promise<RequireResult> {
  const user = await getSessionUser();

  if (!user) {
    return { response: unauthorized() };
  }

  const profile = await getUserProfile(user.userId);

  // Block deactivated users
  if (!profile.isActive) {
    logger.warn('auth.rbac.user-deactivated', { errorCode: ErrorCodes.AUTH_USER_DEACTIVATED, userId: user.userId, email: user.email });
    return { response: deactivated() };
  }

  if (!isSuperAdmin(profile.role)) {
    logger.warn('auth.rbac.super-admin-denied', { errorCode: ErrorCodes.AUTH_INSUFFICIENT_ROLE, userId: user.userId, email: user.email, role: profile.role });
    return { response: forbidden('Super admin permissions required.') };
  }

  return { user, role: profile.role };
}
