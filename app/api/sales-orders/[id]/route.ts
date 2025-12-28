/**
 * GET /api/sales-orders/[id]
 * Get a single sales order with all related entities and origin quote
 *
 * PATCH /api/sales-orders/[id]
 * Update a sales order (customer info only for now)
 *
 * DELETE /api/sales-orders/[id]
 * Soft delete a sales order
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../src/lib/supabase/server';
import { SalesOrderUpdate } from '../../../../src/lib/database/quote-types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch sales order
    const { data: salesOrder, error: soError } = await supabase
      .from('sales_orders')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (soError || !salesOrder) {
      return NextResponse.json({ error: 'Sales order not found' }, { status: 404 });
    }

    // Fetch related entities and origin quote in parallel
    const [specsRes, notesRes, attachmentsRes, scopeLinesRes, originQuoteRes] = await Promise.all([
      supabase
        .from('specs')
        .select('*')
        .eq('parent_type', 'sales_order')
        .eq('parent_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('notes')
        .select('*')
        .eq('parent_type', 'sales_order')
        .eq('parent_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('attachments')
        .select('*')
        .eq('parent_type', 'sales_order')
        .eq('parent_id', id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
      supabase
        .from('scope_lines')
        .select('*')
        .eq('parent_type', 'sales_order')
        .eq('parent_id', id)
        .is('deleted_at', null)
        .order('position', { ascending: true }),
      // Always fetch origin quote (sales orders always have one)
      supabase
        .from('quotes')
        .select('*')
        .eq('id', salesOrder.origin_quote_id)
        .single(),
    ]);

    return NextResponse.json({
      ...salesOrder,
      specs: specsRes.data || [],
      notes: notesRes.data || [],
      attachments: attachmentsRes.data || [],
      scope_lines: scopeLinesRes.data || [],
      origin_quote: originQuoteRes.data || null,
    });
  } catch (error) {
    console.error('Sales order GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check if sales order exists
    const { data: existing, error: fetchError } = await supabase
      .from('sales_orders')
      .select('id')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Sales order not found' }, { status: 404 });
    }

    const body = await request.json();
    const updates: SalesOrderUpdate = {};

    // Only allow specific fields to be updated
    if (body.customer_name !== undefined) updates.customer_name = body.customer_name;
    if (body.customer_email !== undefined) updates.customer_email = body.customer_email;

    updates.updated_at = new Date().toISOString();

    const { data: salesOrder, error } = await supabase
      .from('sales_orders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Sales order update error:', error);
      return NextResponse.json(
        { error: 'Failed to update sales order', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(salesOrder);
  } catch (error) {
    console.error('Sales order PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Soft delete
    const { data: salesOrder, error } = await supabase
      .from('sales_orders')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error || !salesOrder) {
      return NextResponse.json({ error: 'Sales order not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Sales order DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
