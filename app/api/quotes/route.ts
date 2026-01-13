/**
 * GET /api/quotes
 * List quotes with search, filters, and pagination
 *
 * Query params:
 *   - search: text search on quote_number, customer_name (optional)
 *   - status: QuoteStatus filter (optional)
 *   - rangeDays: '30' | '90' - filter by created_at within N days (optional)
 *   - page: page number, 1-based (default: 1)
 *   - pageSize: items per page (default: 100, max: 100)
 *   - include_deleted: 'true' to include soft-deleted (optional)
 *
 * Response: { data: Quote[], total: number, page: number, pageSize: number }
 *
 * POST /api/quotes
 * Create a new quote with user-provided number
 *
 * Body:
 *   - base_number: number (required) - The quote base number (e.g., 62633)
 *   - suffix_line: number (optional) - The suffix line (e.g., 2 for "62633.2")
 *   - customer_name: string (optional)
 *   - customer_email: string (optional)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, getCurrentUserId } from '../../../src/lib/supabase/server';
import { QuoteStatus } from '../../../src/lib/database/quote-types';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Parse query params
    const search = searchParams.get('search')?.trim() || '';
    const statusFilter = searchParams.get('status') as QuoteStatus | null;
    const rangeDays = searchParams.get('rangeDays');
    const baseNumber = searchParams.get('base_number');
    const includeDeleted = searchParams.get('include_deleted') === 'true';

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '100', 10)));
    const offset = (page - 1) * pageSize;

    // Build query - use count to get total
    let countQuery = supabase
      .from('quotes')
      .select('*', { count: 'exact', head: true });

    let dataQuery = supabase
      .from('quotes')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    // Apply filters to both queries
    const applyFilters = (query: typeof countQuery | typeof dataQuery) => {
      // Exclude soft-deleted by default
      if (!includeDeleted) {
        query = query.is('deleted_at', null);
      }

      // Filter by status if provided
      if (statusFilter) {
        query = query.eq('quote_status', statusFilter);
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

      // Search filter - search quote_number and customer_name
      if (search) {
        // Use OR filter for search across multiple fields
        query = query.or(`quote_number.ilike.%${search}%,customer_name.ilike.%${search}%`);
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
      console.error('Quotes count error:', countResult.error);
      return NextResponse.json(
        { error: 'Failed to fetch quotes', details: countResult.error.message },
        { status: 500 }
      );
    }

    if (dataResult.error) {
      console.error('Quotes fetch error:', dataResult.error);
      return NextResponse.json(
        { error: 'Failed to fetch quotes', details: dataResult.error.message },
        { status: 500 }
      );
    }

    // Add base_number to response if not present (for backward compat)
    const quotesWithBase = (dataResult.data || []).map(q => {
      if (q.base_number === undefined && q.quote_number) {
        // Extract base_number from quote_number like "Q62633" or "Q62633.2"
        const match = q.quote_number.match(/^Q?(\d+)/i);
        return { ...q, base_number: match ? parseInt(match[1], 10) : 0 };
      }
      return q;
    });

    return NextResponse.json({
      data: quotesWithBase,
      total: countResult.count || 0,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('Quotes API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userId = await getCurrentUserId();

    const body = await request.json();
    const { base_number, suffix_line, customer_name, customer_email } = body;

    // Validate base_number is provided
    if (!base_number || typeof base_number !== 'number' || base_number < 1) {
      return NextResponse.json(
        { error: 'base_number is required and must be a positive integer' },
        { status: 400 }
      );
    }

    // Validate suffix_line if provided
    if (suffix_line !== undefined && suffix_line !== null) {
      if (typeof suffix_line !== 'number' || suffix_line < 1) {
        return NextResponse.json(
          { error: 'suffix_line must be a positive integer if provided' },
          { status: 400 }
        );
      }
    }

    // Build the quote_number string (always required in current schema)
    const quoteNumber = suffix_line
      ? `Q${base_number}.${suffix_line}`
      : `Q${base_number}`;

    // Check for duplicate base_number + suffix_line combination
    // Same base with different suffix is allowed (e.g., 62633 and 62633.1)
    let dupQuery = supabase
      .from('quotes')
      .select('id')
      .eq('quote_number', quoteNumber)
      .is('deleted_at', null);

    const { data: existing } = await dupQuery.maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'This number already exists.' },
        { status: 409 }
      );
    }

    // Create the quote - use quote_number (works with current schema)
    // base_number and suffix_line will be added when migration is run
    const quoteRow: Record<string, unknown> = {
      quote_number: quoteNumber,
      quote_status: 'draft',
      is_read_only: false,
      customer_name: customer_name || null,
      customer_email: customer_email || null,
      created_by: userId || null,
    };

    const { data: quote, error } = await supabase
      .from('quotes')
      .insert(quoteRow)
      .select()
      .single();

    if (error) {
      console.error('Quote create error:', error);
      return NextResponse.json(
        { error: 'Failed to create quote', details: error.message },
        { status: 500 }
      );
    }

    // Return with base_number for the frontend
    return NextResponse.json({
      ...quote,
      base_number: base_number,
      suffix_line: suffix_line || null,
    }, { status: 201 });
  } catch (error) {
    console.error('Quote POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
