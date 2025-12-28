/**
 * GET /api/sales-orders
 * List all sales orders (excludes soft-deleted by default)
 *
 * Query params:
 *   - origin_quote_id: filter by source quote (optional)
 *   - include_deleted: 'true' to include soft-deleted (optional)
 *
 * NOTE: Sales Orders cannot be created directly via POST.
 * They are created ONLY through Quote conversion: POST /api/quotes/[id]/convert
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../src/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const originQuoteId = searchParams.get('origin_quote_id');
    const includeDeleted = searchParams.get('include_deleted') === 'true';

    let query = supabase
      .from('sales_orders')
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by origin quote if provided
    if (originQuoteId) {
      query = query.eq('origin_quote_id', originQuoteId);
    }

    // Exclude soft-deleted by default
    if (!includeDeleted) {
      query = query.is('deleted_at', null);
    }

    const { data: salesOrders, error } = await query;

    if (error) {
      console.error('Sales orders fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch sales orders', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(salesOrders || []);
  } catch (error) {
    console.error('Sales orders API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST is intentionally not implemented here.
// Sales Orders can only be created via Quote conversion.
export async function POST() {
  return NextResponse.json(
    { error: 'Sales Orders cannot be created directly. Use POST /api/quotes/[id]/convert to convert a won quote.' },
    { status: 405 }
  );
}
