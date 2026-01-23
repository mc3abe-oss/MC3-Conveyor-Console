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
import { supabaseAdmin } from '../../../src/lib/supabase/client';
import { getCreatorDisplayOrNull } from '../../../src/lib/user-display';

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

    // Enrich sales orders with creator display from associated applications
    const salesOrders = dataResult.data || [];

    // Get applications associated with these sales orders to get creator info
    if (salesOrders.length > 0) {
      const soIds = salesOrders.map(so => so.id);

      // Fetch applications linked to these sales orders (include updated_at for revision tracking)
      const { data: apps } = await supabase
        .from('calc_recipes')
        .select('id, sales_order_id, created_by, created_by_display, updated_at, inputs, model_key')
        .in('sales_order_id', soIds)
        .is('deleted_at', null)
        .eq('is_active', true);

      // Build map of sales_order_id -> enrichment info (creator, revisions, latest_updated_at, job_line, model_key)
      const enrichmentMap = new Map<string, {
        created_by: string | null;
        created_by_display: string | null;
        revision_count: number;
        latest_updated_at: string | null;
        job_line: number | null;
        model_key: string | null;
      }>();

      for (const app of apps || []) {
        if (!app.sales_order_id) continue;

        // Extract job_line from inputs._config (config is stored inside inputs JSON)
        const inputs = app.inputs as { _config?: { reference_line?: number } } | null;
        const jobLine = inputs?._config?.reference_line ?? null;

        const existing = enrichmentMap.get(app.sales_order_id);
        if (!existing) {
          enrichmentMap.set(app.sales_order_id, {
            created_by: app.created_by,
            created_by_display: app.created_by_display,
            revision_count: 1,
            latest_updated_at: app.updated_at,
            job_line: jobLine,
            model_key: app.model_key as string | null,
          });
        } else {
          existing.revision_count++;
          // Track most recent update
          if (app.updated_at && (!existing.latest_updated_at || new Date(app.updated_at) > new Date(existing.latest_updated_at))) {
            existing.latest_updated_at = app.updated_at;
            // Update model_key to latest as well
            existing.model_key = app.model_key as string | null;
          }
          // Use job_line from first app if not set
          if (existing.job_line === null && jobLine !== null) {
            existing.job_line = jobLine;
          }
        }
      }

      // Get unique creator user IDs that need lookup (no stamped display)
      const userIdsNeedingLookup = [...new Set(
        [...enrichmentMap.values()]
          .filter(c => c.created_by && !c.created_by_display)
          .map(c => c.created_by!)
      )];

      // Fetch user info for runtime lookup
      const userDisplayMap = new Map<string, string>();
      if (userIdsNeedingLookup.length > 0 && supabaseAdmin) {
        try {
          const { data: usersResponse } = await supabaseAdmin.auth.admin.listUsers();
          for (const user of usersResponse?.users || []) {
            if (userIdsNeedingLookup.includes(user.id)) {
              const display = getCreatorDisplayOrNull(
                user.email,
                user.user_metadata as { first_name?: string; last_name?: string } | undefined
              );
              if (display) userDisplayMap.set(user.id, display);
            }
          }
        } catch (err) {
          console.error('Error fetching user info:', err);
        }
      }

      // Attach enrichment data to each sales order
      for (const so of salesOrders) {
        const enrichment = enrichmentMap.get(so.id);
        if (enrichment) {
          (so as any).created_by_display = enrichment.created_by_display
            || (enrichment.created_by ? userDisplayMap.get(enrichment.created_by) : null)
            || null;
          (so as any).revision_count = enrichment.revision_count;
          (so as any).latest_updated_at = enrichment.latest_updated_at;
          (so as any).job_line = enrichment.job_line;
          (so as any).model_key = enrichment.model_key;
        } else {
          (so as any).revision_count = 0;
          (so as any).latest_updated_at = null;
          (so as any).job_line = null;
          (so as any).model_key = null;
        }
      }
    }

    return NextResponse.json({
      data: salesOrders,
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

      // Check for duplicate base_number + suffix_line combination
      // Same base with different suffix is allowed (e.g., 32884 and 32884.1)
      let dupQuery = supabase
        .from('sales_orders')
        .select('id')
        .eq('base_number', finalBaseNumber)
        .is('deleted_at', null);

      // Match suffix_line exactly (null vs number matters)
      if (suffix_line != null) {
        dupQuery = dupQuery.eq('suffix_line', suffix_line);
      } else {
        dupQuery = dupQuery.is('suffix_line', null);
      }

      const { data: existing } = await dupQuery.maybeSingle();

      if (existing) {
        return NextResponse.json(
          { error: 'This number already exists.' },
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
          { error: 'This number already exists.' },
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
