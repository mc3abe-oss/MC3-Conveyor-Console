/**
 * GET /api/quotes/[id]
 * Get a single quote with all related entities
 *
 * PATCH /api/quotes/[id]
 * Update a quote (blocked if is_read_only = true)
 *
 * DELETE /api/quotes/[id]
 * Soft delete a quote (sets deleted_at)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../src/lib/supabase/server';
import { QuoteUpdate } from '../../../../src/lib/database/quote-types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch quote
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    // Fetch related entities in parallel
    const [specsRes, notesRes, attachmentsRes, scopeLinesRes, salesOrderRes] = await Promise.all([
      supabase
        .from('specs')
        .select('*')
        .eq('parent_type', 'quote')
        .eq('parent_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('notes')
        .select('*')
        .eq('parent_type', 'quote')
        .eq('parent_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('attachments')
        .select('*')
        .eq('parent_type', 'quote')
        .eq('parent_id', id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
      supabase
        .from('scope_lines')
        .select('*')
        .eq('parent_type', 'quote')
        .eq('parent_id', id)
        .is('deleted_at', null)
        .order('position', { ascending: true }),
      // If converted, fetch the sales order
      quote.converted_to_sales_order_id
        ? supabase
            .from('sales_orders')
            .select('*')
            .eq('id', quote.converted_to_sales_order_id)
            .single()
        : Promise.resolve({ data: null, error: null }),
    ]);

    return NextResponse.json({
      ...quote,
      specs: specsRes.data || [],
      notes: notesRes.data || [],
      attachments: attachmentsRes.data || [],
      scope_lines: scopeLinesRes.data || [],
      sales_order: salesOrderRes.data || null,
    });
  } catch (error) {
    console.error('Quote GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check if quote exists and is editable
    const { data: existing, error: fetchError } = await supabase
      .from('quotes')
      .select('is_read_only, quote_status')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    if (existing.is_read_only) {
      return NextResponse.json(
        { error: 'Quote is read-only (already converted)' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const updates: QuoteUpdate = {};

    // Only allow specific fields to be updated
    if (body.customer_name !== undefined) updates.customer_name = body.customer_name;
    if (body.customer_email !== undefined) updates.customer_email = body.customer_email;
    if (body.quote_status !== undefined) {
      // Validate status transitions
      const validStatuses = ['draft', 'sent', 'won', 'lost'];
      if (!validStatuses.includes(body.quote_status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }
      updates.quote_status = body.quote_status;
    }

    updates.updated_at = new Date().toISOString();

    const { data: quote, error } = await supabase
      .from('quotes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Quote update error:', error);
      return NextResponse.json(
        { error: 'Failed to update quote', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(quote);
  } catch (error) {
    console.error('Quote PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Soft delete
    const { data: quote, error } = await supabase
      .from('quotes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Quote DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
