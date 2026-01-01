/**
 * GET /api/quotes/lines
 * List all quote lines - ONE ROW PER (quote_base, suffix, job_line)
 *
 * Query params:
 *   - search: text search on quote_number, customer_name (optional)
 *   - status: QuoteStatus filter (optional)
 *   - rangeDays: '30' | '90' - filter by latest_updated_at within N days (optional)
 *   - page: page number, 1-based (default: 1)
 *   - pageSize: items per page (default: 100, max: 100)
 *
 * Response: { data: QuoteLine[], total: number, page: number, pageSize: number }
 *
 * This endpoint joins the quotes table with calc_recipes to show:
 * - All unique quote lines that have applications
 * - Latest revision info per line
 * - Revision count per line
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../src/lib/supabase/server';

interface QuoteLineRow {
  quote_number: string;
  base_number: number;
  suffix_line: number | null;
  job_line: number;
  customer_name: string | null;
  quote_status: string;
  revision_count: number;
  latest_updated_at: string;
  latest_application_id: string;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Parse query params
    const search = searchParams.get('search')?.trim().toLowerCase() || '';
    const statusFilter = searchParams.get('status') || '';
    const rangeDays = searchParams.get('rangeDays');

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '100', 10)));

    // Get all calc_recipes with QUOTE reference type
    const { data: recipes, error: recipesError } = await supabase
      .from('calc_recipes')
      .select('id, created_at, updated_at, inputs')
      .order('updated_at', { ascending: false });

    if (recipesError) {
      console.error('Recipes fetch error:', recipesError);
      return NextResponse.json(
        { error: 'Failed to fetch applications', details: recipesError.message },
        { status: 500 }
      );
    }

    // Filter to quotes only and extract config
    const quoteRecipes = (recipes || [])
      .filter(r => r.inputs?._config?.reference_type === 'QUOTE')
      .map(r => ({
        id: r.id,
        updated_at: r.updated_at,
        created_at: r.created_at,
        config: r.inputs._config,
      }));

    // Get quotes table for customer_name and status
    const { data: quotes, error: quotesError } = await supabase
      .from('quotes')
      .select('*')
      .is('deleted_at', null);

    if (quotesError) {
      console.error('Quotes fetch error:', quotesError);
      // Continue without quotes table data - we can still show calc_recipes data
    }

    // Build a map of quote_number -> quote record for lookup
    const quoteMap = new Map<string, (typeof quotes extends (infer T)[] | null ? T : never)>();
    for (const q of quotes || []) {
      if (q.quote_number) {
        quoteMap.set(q.quote_number, q);
      }
    }

    // Group calc_recipes by (base, suffix, job_line)
    const groups = new Map<string, {
      base_number: number;
      suffix_line: number | null;
      job_line: number;
      revisions: typeof quoteRecipes;
    }>();

    for (const recipe of quoteRecipes) {
      const base = parseInt(recipe.config.reference_number_base || recipe.config.reference_number, 10);
      const suffix = recipe.config.reference_suffix ?? null;
      const jobLine = recipe.config.reference_line ?? 1;

      if (isNaN(base)) continue;

      const key = `${base}-${suffix ?? 'null'}-${jobLine}`;

      if (!groups.has(key)) {
        groups.set(key, {
          base_number: base,
          suffix_line: suffix,
          job_line: jobLine,
          revisions: [],
        });
      }
      groups.get(key)!.revisions.push(recipe);
    }

    // Build output rows
    const allRows: QuoteLineRow[] = [];

    for (const [, group] of groups) {
      // Sort revisions by updated_at desc to get latest
      group.revisions.sort((a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

      const latest = group.revisions[0];

      // Build quote_number string
      const quoteNumber = group.suffix_line != null && group.suffix_line >= 1
        ? `Q${group.base_number}.${group.suffix_line}`
        : `Q${group.base_number}`;

      // Look up quote record for customer and status
      const quoteRecord = quoteMap.get(quoteNumber);

      allRows.push({
        quote_number: quoteNumber,
        base_number: group.base_number,
        suffix_line: group.suffix_line,
        job_line: group.job_line,
        customer_name: latest.config.customer_name || quoteRecord?.customer_name || null,
        quote_status: quoteRecord?.quote_status || 'draft',
        revision_count: group.revisions.length,
        latest_updated_at: latest.updated_at,
        latest_application_id: latest.id,
      });
    }

    // Sort by latest_updated_at DESC (most recent first)
    allRows.sort((a, b) =>
      new Date(b.latest_updated_at).getTime() - new Date(a.latest_updated_at).getTime()
    );

    // Apply filters
    let filteredRows = allRows;

    // Date range filter
    if (rangeDays && !search) {
      const daysAgo = parseInt(rangeDays, 10);
      if (!isNaN(daysAgo) && daysAgo > 0) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
        filteredRows = filteredRows.filter(row =>
          new Date(row.latest_updated_at) >= cutoffDate
        );
      }
    }

    // Status filter
    if (statusFilter) {
      filteredRows = filteredRows.filter(row => row.quote_status === statusFilter);
    }

    // Search filter
    if (search) {
      filteredRows = filteredRows.filter(row => {
        const quoteNumMatch = row.quote_number.toLowerCase().includes(search);
        const customerMatch = row.customer_name?.toLowerCase().includes(search) || false;
        return quoteNumMatch || customerMatch;
      });
    }

    // Calculate total before pagination
    const total = filteredRows.length;

    // Apply pagination
    const offset = (page - 1) * pageSize;
    const paginatedRows = filteredRows.slice(offset, offset + pageSize);

    return NextResponse.json({
      data: paginatedRows,
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('Quote lines API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
