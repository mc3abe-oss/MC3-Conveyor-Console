/**
 * GET /api/sales-orders
 * List sales orders with search, filters, and pagination
 *
 * Query params:
 *   - search: text search on sales_order_number, customer_name (optional)
 *   - rangeDays: '30' | '90' - filter by created_at within N days (optional)
 *   - page: page number, 1-based (default: 1)
 *   - pageSize: items per page (default: 100, max: 100)
 *   - origin_quote_id: filter by source quote (optional)
 *   - include_deleted: 'true' to include soft-deleted (optional)
 *
 * Response: { data: SalesOrder[], total: number, page: number, pageSize: number }
 *
 * POST /api/sales-orders
 * Create a new sales order directly (without quote conversion)
 *
 * Body:
 *   - customer_name: string (required)
 *   - customer_email: string (optional)
 *
 * NOTE: Sales Orders can also be created through Quote conversion:
 * POST /api/quotes/[id]/convert
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, getCurrentUserId } from '../../../src/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Parse query params
    const search = searchParams.get('search')?.trim() || '';
    const rangeDays = searchParams.get('rangeDays');
    const originQuoteId = searchParams.get('origin_quote_id');
    const baseNumber = searchParams.get('base_number');
    const includeDeleted = searchParams.get('include_deleted') === 'true';

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '100', 10)));
    const offset = (page - 1) * pageSize;

    // Build query - use count to get total
    let countQuery = supabase
      .from('sales_orders')
      .select('*', { count: 'exact', head: true });

    let dataQuery = supabase
      .from('sales_orders')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    // Apply filters to both queries
    const applyFilters = (query: typeof countQuery | typeof dataQuery) => {
      // Exclude soft-deleted by default
      if (!includeDeleted) {
        query = query.is('deleted_at', null);
      }

      // Filter by origin quote if provided
      if (originQuoteId) {
        query = query.eq('origin_quote_id', originQuoteId);
      }

      // Filter by base_number if provided (legacy)
      if (baseNumber) {
        query = query.eq('base_number', parseInt(baseNumber, 10));
      }

      // Date range filter (only if no search or explicitly requested)
      if (rangeDays && !search) {
        const daysAgo = parseInt(rangeDays, 10);
        if (!isNaN(daysAgo) && daysAgo > 0) {
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
          query = query.gte('created_at', cutoffDate.toISOString());
        }
      }

      // Search filter - search sales_order_number and customer_name
      if (search) {
        // Use OR filter for search across multiple fields
        query = query.or(`sales_order_number.ilike.%${search}%,customer_name.ilike.%${search}%`);
      }

      return query;
    };

    countQuery = applyFilters(countQuery) as typeof countQuery;
    dataQuery = applyFilters(dataQuery) as typeof dataQuery;

    // Execute both queries
    const [countResult, dataResult] = await Promise.all([
      countQuery,
      dataQuery,
    ]);

    if (countResult.error) {
      console.error('Sales orders count error:', countResult.error);
      return NextResponse.json(
        { error: 'Failed to fetch sales orders', details: countResult.error.message },
        { status: 500 }
      );
    }

    if (dataResult.error) {
      console.error('Sales orders fetch error:', dataResult.error);
      return NextResponse.json(
        { error: 'Failed to fetch sales orders', details: dataResult.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: dataResult.data || [],
      total: countResult.count || 0,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('Sales orders API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userId = await getCurrentUserId();
    const body = await request.json();

    const { base_number, suffix_line, customer_name, customer_email } = body;

    // Determine the base number: use provided or auto-generate
    let finalBaseNumber: number;

    if (base_number !== undefined && base_number !== null && base_number !== '') {
      // User provided a base number - validate it
      const parsed = typeof base_number === 'string' ? parseInt(base_number, 10) : base_number;
      if (isNaN(parsed) || parsed < 1) {
        return NextResponse.json(
          { error: 'base_number must be a positive integer' },
          { status: 400 }
        );
      }
      finalBaseNumber = parsed;

      // Check for duplicate base_number
      const { data: existing } = await supabase
        .from('sales_orders')
        .select('id')
        .eq('base_number', finalBaseNumber)
        .is('deleted_at', null)
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          { error: `Sales Order number '${finalBaseNumber}' already exists.` },
          { status: 409 }
        );
      }
    } else {
      // No base number provided - auto-generate
      const { data: generatedNumber, error: genError } = await supabase.rpc('next_sales_order_base_number');

      if (genError) {
        console.error('SO base number generation error:', genError);
        return NextResponse.json(
          { error: 'Failed to generate sales order base number', details: genError.message },
          { status: 500 }
        );
      }
      finalBaseNumber = generatedNumber;
    }

    // Build the display number (e.g., "SO30884" or "SO30884.2")
    const displayNumber = suffix_line
      ? `SO${finalBaseNumber}.${suffix_line}`
      : `SO${finalBaseNumber}`;

    // Create the Sales Order
    const { data: salesOrder, error: soError } = await supabase
      .from('sales_orders')
      .insert({
        base_number: finalBaseNumber,
        suffix_line: suffix_line || null,
        sales_order_number: displayNumber,
        origin_quote_id: null, // Direct creation, no origin quote
        customer_name: customer_name?.trim() || null,
        customer_email: customer_email?.trim() || null,
        created_by: userId,
      })
      .select()
      .single();

    if (soError) {
      console.error('Sales order creation error:', soError);
      // Check for unique constraint violation
      if (soError.code === '23505') {
        return NextResponse.json(
          { error: `Sales Order number '${finalBaseNumber}' already exists.` },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to create sales order', details: soError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(salesOrder, { status: 201 });
  } catch (error) {
    console.error('Sales order POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
