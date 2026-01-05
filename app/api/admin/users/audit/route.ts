/**
 * User Admin Audit Log API
 *
 * GET: Get audit log entries (SUPER_ADMIN only)
 * - Returns paginated audit log entries
 * - Supports filtering by action type
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '../../../../../src/lib/auth/require';
import { getAuditLog, AuditAction } from '../../../../../src/lib/auth/audit';

const VALID_ACTIONS: AuditAction[] = [
  'INVITE',
  'RESEND_INVITE',
  'SEND_MAGIC_LINK',
  'SEND_PASSWORD_RESET',
  'DEACTIVATE',
  'REACTIVATE',
  'FORCE_SIGNOUT',
  'ROLE_CHANGE',
];

export async function GET(request: NextRequest) {
  try {
    // Require super admin
    const authResult = await requireSuperAdmin();
    if (authResult.response) {
      return authResult.response;
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const actionFilter = searchParams.get('action') as AuditAction | null;

    // Validate action filter if provided
    if (actionFilter && !VALID_ACTIONS.includes(actionFilter)) {
      return NextResponse.json(
        { error: `Invalid action filter. Must be one of: ${VALID_ACTIONS.join(', ')}` },
        { status: 400 }
      );
    }

    // Get audit log
    const result = await getAuditLog(limit, offset);

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    // Filter by action if specified
    let entries = result.entries;
    if (actionFilter) {
      entries = entries.filter((e) => e.action === actionFilter);
    }

    return NextResponse.json({
      entries,
      total: result.total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[Admin] Get audit log error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
