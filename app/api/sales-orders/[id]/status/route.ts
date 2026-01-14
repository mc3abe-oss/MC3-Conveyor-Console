/**
 * POST /api/sales-orders/[id]/status
 *
 * Toggle scope status between draft and set.
 * Draft → Set: Creates a new revision snapshot
 * Set → Draft: No revision created
 *
 * Request body: { status: 'draft' | 'set' }
 */

import { NextRequest, NextResponse } from 'next/server';
import { transitionScopeStatus, getLatestRevision } from '../../../../../src/lib/scope';
import { getCurrentUserId } from '../../../../../src/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const userId = await getCurrentUserId();

    const body = await request.json();
    const { status } = body;

    // Validate status value
    if (status !== 'draft' && status !== 'set') {
      return NextResponse.json(
        { error: 'Invalid status. Must be "draft" or "set".' },
        { status: 400 }
      );
    }

    // Perform the transition
    const result = await transitionScopeStatus('sales_order', id, status, userId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update status' },
        { status: 400 }
      );
    }

    // Get revision details if available
    let revisionInfo = null;
    if (result.revision) {
      const latestRevision = await getLatestRevision('sales_order', id);
      if (latestRevision) {
        revisionInfo = {
          id: latestRevision.id,
          revision_number: latestRevision.revision_number,
          created_at: latestRevision.created_at,
          created_by_user_id: latestRevision.created_by_user_id,
        };
      }
    }

    return NextResponse.json({
      success: true,
      status: result.status,
      revision: revisionInfo,
    });
  } catch (error) {
    console.error('Sales order status update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/sales-orders/[id]/status
 *
 * Get the current scope status and revision info for a sales order.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const { getEntityStatusInfo } = await import('../../../../../src/lib/scope');
    const info = await getEntityStatusInfo('sales_order', id);

    if (!info) {
      return NextResponse.json({ error: 'Sales order not found' }, { status: 404 });
    }

    // Get latest revision details if available
    let revisionInfo = null;
    if (info.current_revision_id) {
      const latestRevision = await getLatestRevision('sales_order', id);
      if (latestRevision) {
        revisionInfo = {
          id: latestRevision.id,
          revision_number: latestRevision.revision_number,
          created_at: latestRevision.created_at,
          created_by_user_id: latestRevision.created_by_user_id,
        };
      }
    }

    return NextResponse.json({
      status: info.scope_status,
      current_revision_id: info.current_revision_id,
      current_revision_number: info.current_revision_number,
      revision: revisionInfo,
    });
  } catch (error) {
    console.error('Sales order status GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
