/**
 * GET /api/applications/:id/delete-eligibility
 *
 * Check if an application can be hard deleted.
 * Returns { canHardDelete: boolean, reasons: string[] }
 *
 * Hard delete is allowed ONLY when ALL conditions are met:
 * 1. Application has NO quote_id (not linked to a Quote)
 * 2. Application has NO sales_order_id (not linked to a Sales Order)
 * 3. Application status is DRAFT (not FINALIZED or SO_CREATED)
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
        canHardDelete: false,
        reasons: ['already_deleted'],
      });
    }

    const reasons: string[] = [];

    // Check for Quote linkage (DB column)
    if (application.quote_id) {
      reasons.push('linked_to_quote');
    }

    // Check for Sales Order linkage (DB column)
    if (application.sales_order_id) {
      reasons.push('linked_to_sales_order');
    }

    // Check application status (v1.47)
    const status = application.application_status || 'DRAFT';
    if (status === 'FINALIZED') {
      reasons.push('status_finalized');
    } else if (status === 'SO_CREATED') {
      reasons.push('status_so_created');
    }

    // Can hard delete only if no linkage AND status is DRAFT
    const canHardDelete = reasons.length === 0;

    return NextResponse.json({
      canHardDelete,
      reasons,
      application_status: status,
      // Debug info
      debug: {
        quote_id: application.quote_id || null,
        sales_order_id: application.sales_order_id || null,
        application_status: status,
      },
    });
  } catch (error) {
    console.error('Delete eligibility check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
