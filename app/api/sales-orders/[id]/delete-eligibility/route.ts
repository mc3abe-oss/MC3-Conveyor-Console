/**
 * GET /api/sales-orders/:id/delete-eligibility
 *
 * Check if a Sales Order can be deleted.
 * Returns { canDelete: boolean, reason?: string }
 *
 * Deletion is allowed ONLY when:
 * - Sales Order exists and is not already deleted
 * - Sales Order is NOT linked to a Quote (origin_quote_id is null)
 *
 * This is the SERVER TRUTH for delete eligibility.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../src/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch the sales order with linkage columns
    const { data: salesOrder, error: fetchError } = await supabase
      .from('sales_orders')
      .select('id, base_number, suffix_line, origin_quote_id, deleted_at')
      .eq('id', id)
      .single();

    if (fetchError || !salesOrder) {
      return NextResponse.json(
        { error: 'Sales order not found' },
        { status: 404 }
      );
    }

    // Already deleted?
    if (salesOrder.deleted_at) {
      return NextResponse.json({
        canDelete: false,
        reason: 'Sales Order is already deleted.',
      });
    }

    // Check if SO is linked to a Quote
    if (salesOrder.origin_quote_id) {
      return NextResponse.json({
        canDelete: false,
        reason: 'This Sales Order was converted from a Quote and cannot be deleted.',
        linkedQuoteId: salesOrder.origin_quote_id,
      });
    }

    // SO can be deleted
    return NextResponse.json({
      canDelete: true,
    });
  } catch (error) {
    console.error('Delete eligibility check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
