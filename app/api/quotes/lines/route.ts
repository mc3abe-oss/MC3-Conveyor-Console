/**
 * GET /api/quotes/lines
 * List all quote lines - ONE ROW PER (quote_base, suffix, job_line)
 *
 * This endpoint joins the quotes table with calc_recipes to show:
 * - All unique quote lines that have applications
 * - Latest revision info per line
 * - Revision count per line
 *
 * Returns:
 *   - quote_number: Display string (Q12, Q12.1, etc.)
 *   - base_number: The quote base number
 *   - suffix_line: The suffix (null, 1, 2, etc.)
 *   - job_line: The job line number (1, 2, 3, etc.)
 *   - customer_name: Customer name
 *   - quote_status: Status of the quote record
 *   - revision_count: Number of revisions for this line
 *   - latest_updated_at: When the latest revision was updated
 *   - latest_application_id: ID of the latest application
 */

import { NextResponse } from 'next/server';
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

export async function GET() {
  try {
    const supabase = await createClient();

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
    const rows: QuoteLineRow[] = [];

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

      rows.push({
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

    // Sort by base_number, suffix_line, job_line
    rows.sort((a, b) => {
      if (a.base_number !== b.base_number) return a.base_number - b.base_number;
      const aSuffix = a.suffix_line ?? 0;
      const bSuffix = b.suffix_line ?? 0;
      if (aSuffix !== bSuffix) return aSuffix - bSuffix;
      return a.job_line - b.job_line;
    });

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Quote lines API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
