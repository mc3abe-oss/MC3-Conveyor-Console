/**
 * User Admin Audit Log
 *
 * Helper functions for logging user administration actions.
 * All admin actions should be logged for auditability.
 */

import { createClient } from '../supabase/server';

/**
 * Audit action types
 */
export type AuditAction =
  | 'INVITE'
  | 'RESEND_INVITE'
  | 'SEND_MAGIC_LINK'
  | 'SEND_PASSWORD_RESET'
  | 'DEACTIVATE'
  | 'REACTIVATE'
  | 'FORCE_SIGNOUT'
  | 'ROLE_CHANGE';

/**
 * Log an admin action to the audit table.
 *
 * @param actorUserId - The user performing the action
 * @param targetUserId - The user being acted upon
 * @param action - The type of action
 * @param details - Optional additional details (e.g., old role, new role)
 */
export async function logAuditAction(
  actorUserId: string,
  targetUserId: string,
  action: AuditAction,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.from('user_admin_audit').insert({
      actor_user_id: actorUserId,
      target_user_id: targetUserId,
      action,
      details: details || null,
    });

    if (error) {
      // Log error but don't fail the main operation
      console.error('[Audit] Failed to log audit action:', error);
    }
  } catch (err) {
    // Log error but don't fail the main operation
    console.error('[Audit] Error logging audit action:', err);
  }
}

/**
 * Get audit log entries.
 * Only callable by SUPER_ADMIN (enforced by RLS).
 *
 * @param limit - Maximum number of entries to return
 * @param offset - Offset for pagination
 */
export async function getAuditLog(
  limit = 100,
  offset = 0
): Promise<{
  entries: AuditEntry[];
  total: number;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // Get total count
    const { count, error: countError } = await supabase
      .from('user_admin_audit')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      return { entries: [], total: 0, error: countError.message };
    }

    // Get entries
    const { data, error } = await supabase
      .from('user_admin_audit')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return { entries: [], total: 0, error: error.message };
    }

    return {
      entries: (data || []).map((row) => ({
        id: row.id,
        actorUserId: row.actor_user_id,
        targetUserId: row.target_user_id,
        action: row.action as AuditAction,
        details: row.details as Record<string, unknown> | null,
        createdAt: row.created_at,
      })),
      total: count || 0,
    };
  } catch (err) {
    return {
      entries: [],
      total: 0,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Audit log entry
 */
export interface AuditEntry {
  id: string;
  actorUserId: string;
  targetUserId: string;
  action: AuditAction;
  details: Record<string, unknown> | null;
  createdAt: string;
}
