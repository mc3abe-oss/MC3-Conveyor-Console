/**
 * GET /api/quotes
 * List all quotes (excludes soft-deleted by default)
 *
 * Query params:
 *   - status: QuoteStatus filter (optional)
 *   - include_deleted: 'true' to include soft-deleted (optional)
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
    const statusFilter = searchParams.get('status') as QuoteStatus | null;
    const includeDeleted = searchParams.get('include_deleted') === 'true';

    let query = supabase
      .from('quotes')
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by status if provided
    if (statusFilter) {
      query = query.eq('quote_status', statusFilter);
    }

    // Exclude soft-deleted by default
    if (!includeDeleted) {
      query = query.is('deleted_at', null);
    }

    const { data: quotes, error } = await query;

    if (error) {
      console.error('Quotes fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch quotes', details: error.message },
        { status: 500 }
      );
    }

    // Add base_number to response if not present (for backward compat)
    const quotesWithBase = (quotes || []).map(q => {
      if (q.base_number === undefined && q.quote_number) {
        // Extract base_number from quote_number like "Q62633" or "Q62633.2"
        const match = q.quote_number.match(/^Q?(\d+)/i);
        return { ...q, base_number: match ? parseInt(match[1], 10) : 0 };
      }
      return q;
    });

    return NextResponse.json(quotesWithBase);
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

    // Check if quote_number already exists
    const { data: existing } = await supabase
      .from('quotes')
      .select('id')
      .eq('quote_number', quoteNumber)
      .is('deleted_at', null)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: `Quote ${quoteNumber} already exists` },
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
