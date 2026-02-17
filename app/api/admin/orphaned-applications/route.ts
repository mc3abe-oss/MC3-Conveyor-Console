/**
 * GET /api/admin/orphaned-applications
 *
 * List all applications that are not linked to any Quote or Sales Order.
 * These are orphaned records that can be safely deleted.
 *
 * Admin-only endpoint for cleanup purposes.
 * Requires BELT_ADMIN or SUPER_ADMIN role.
 */

import { NextResponse } from 'next/server';
import { createClient } from '../../../../src/lib/supabase/server';
import { requireBeltAdmin } from '../../../../src/lib/auth/require';
import { createLogger } from '../../../../src/lib/logger';
import { ErrorCodes } from '../../../../src/lib/logger/error-codes';

const logger = createLogger().child({ module: 'api.orphaned-applications' });

export async function GET() {
  try {
    // Require belt admin role before any DB operations
    const authResult = await requireBeltAdmin();
    if (authResult.response) {
      return authResult.response;
    }

    const supabase = await createClient();

    // Find applications with no quote_id AND no sales_order_id
    const { data: orphaned, error } = await supabase
      .from('calc_recipes')
      .select('id, name, slug, created_at, updated_at, is_active')
      .is('quote_id', null)
      .is('sales_order_id', null)
      .order('updated_at', { ascending: false });

    if (error) {
      logger.error('api.orphaned-applications.fetch.failed', { errorCode: ErrorCodes.DB_QUERY_FAILED, error });
      return NextResponse.json(
        { error: 'Failed to fetch orphaned applications' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      applications: orphaned || [],
      count: orphaned?.length || 0,
    });
  } catch (error) {
    logger.error('api.orphaned-applications.get.failed', { errorCode: ErrorCodes.API_INTERNAL_ERROR, error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
