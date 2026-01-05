/**
 * handleAdminWriteError.ts
 *
 * Converts Postgres RLS permission failures into clean HTTP 403 responses.
 * Phase 1.5: Error normalization for admin API routes.
 *
 * RLS Error Signatures:
 * - PostgreSQL error code 42501 (insufficient_privilege)
 * - Message containing "row-level security policy"
 * - Message containing "permission denied"
 */

import { NextResponse } from 'next/server';
import { PostgrestError } from '@supabase/supabase-js';

/**
 * Standard 403 response payload for admin permission denials
 */
export interface AdminForbiddenPayload {
  error: 'FORBIDDEN';
  message: string;
}

/**
 * Context for logging permission denials
 */
export interface AdminWriteContext {
  route: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  userId?: string;
}

/**
 * Check if an error is an RLS permission denial
 */
export function isRLSError(error: PostgrestError | null): boolean {
  if (!error) return false;

  // Check PostgreSQL error code for insufficient privilege
  if (error.code === '42501') {
    return true;
  }

  // Check message for RLS-related phrases
  const message = error.message?.toLowerCase() || '';
  if (
    message.includes('row-level security') ||
    message.includes('permission denied') ||
    message.includes('violates row-level security policy')
  ) {
    return true;
  }

  return false;
}

/**
 * Handle admin write errors with proper 403 mapping for RLS failures.
 *
 * Usage:
 * ```ts
 * const { data, error } = await supabase.from('table').insert(...);
 * if (error) {
 *   return handleAdminWriteError(error, {
 *     route: '/api/admin/v-guides',
 *     action: 'INSERT',
 *     table: 'v_guides',
 *     userId,
 *   });
 * }
 * ```
 */
export function handleAdminWriteError(
  error: PostgrestError,
  context: AdminWriteContext
): NextResponse<AdminForbiddenPayload | { error: string; details?: string }> {
  if (isRLSError(error)) {
    // Log permission denial at WARN level
    console.warn(
      `[RBAC] Permission denied: ${context.action} on ${context.table}`,
      {
        route: context.route,
        userId: context.userId || '(unknown)',
        code: error.code,
      }
    );

    return NextResponse.json(
      {
        error: 'FORBIDDEN' as const,
        message: 'Admin permissions required.',
      },
      { status: 403 }
    );
  }

  // Not an RLS error - return 500 with original error details
  console.error(`[Admin API] ${context.route} ${context.action} error:`, error);

  return NextResponse.json(
    {
      error: `Failed to ${context.action.toLowerCase()} ${context.table.replace(/_/g, ' ')}`,
      details: error.message,
    },
    { status: 500 }
  );
}

/**
 * Convenience function to create 403 response directly (for edge cases)
 */
export function forbiddenResponse(
  message = 'Admin permissions required.'
): NextResponse<AdminForbiddenPayload> {
  return NextResponse.json(
    {
      error: 'FORBIDDEN' as const,
      message,
    },
    { status: 403 }
  );
}
