/**
 * GET /api/sales-orders
 * List all sales orders (excludes soft-deleted by default)
 *
 * Query params:
 *   - origin_quote_id: filter by source quote (optional)
 *   - include_deleted: 'true' to include soft-deleted (optional)
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
    const originQuoteId = searchParams.get('origin_quote_id');
    const baseNumber = searchParams.get('base_number');
    const includeDeleted = searchParams.get('include_deleted') === 'true';

    let query = supabase
      .from('sales_orders')
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by origin quote if provided
    if (originQuoteId) {
      query = query.eq('origin_quote_id', originQuoteId);
    }

    // Filter by base_number if provided
    if (baseNumber) {
      query = query.eq('base_number', parseInt(baseNumber, 10));
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
