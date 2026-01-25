/**
 * GET /api/applications/:id/delete-eligibility
 *
 * Check if an application can be hard deleted.
 * Returns { canDelete: boolean, hasLinkage: boolean, linkageInfo: {...} }
 *
 * ALWAYS allows delete (canDelete: true) unless already deleted.
 * Commercial linkage (Quote/SO) does NOT prevent deletion - user can always delete.
 * Returns linkage info for UI to show in confirmation dialog.
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

    // Fetch the application with linkage columns and status
    const { data: application, error: fetchError } = await supabase
      .from('calc_recipes')
      .select('id, name, quote_id, sales_order_id, deleted_at, is_active, application_status')
      .eq('id', id)
      .single();

    if (fetchError || !application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Already deleted?
    if (application.deleted_at || application.is_active === false) {
      return NextResponse.json({
        canDelete: false,
        canHardDelete: false, // Backward compat
        reason: 'already_deleted',
      });
    }

    // Determine linkage for UI display (does NOT block delete)
    const hasQuoteLinkage = !!application.quote_id;
    const hasSalesOrderLinkage = !!application.sales_order_id;
    const hasCommercialLinkage = hasQuoteLinkage || hasSalesOrderLinkage;
    const status = application.application_status || 'DRAFT';

    // ALWAYS allow delete regardless of linkage or status
    return NextResponse.json({
      canDelete: true,
      canHardDelete: true, // Backward compat
      // Linkage info for UI confirmation dialog
      hasCommercialLinkage,
      linkageInfo: {
        quote_id: application.quote_id || null,
        sales_order_id: application.sales_order_id || null,
        linked_to_quote: hasQuoteLinkage,
        linked_to_sales_order: hasSalesOrderLinkage,
      },
      application_status: status,
      application_name: application.name,
    });
  } catch (error) {
    console.error('Delete eligibility check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
