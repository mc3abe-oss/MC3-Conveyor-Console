/**
 * GET /api/sales-orders/[id]/notes
 * List all notes for a sales order
 *
 * POST /api/sales-orders/[id]/notes
 * Add a note to a sales order
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, getCurrentUserId } from '../../../../../src/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: notes, error } = await supabase
      .from('notes')
      .select('*')
      .eq('parent_type', 'sales_order')
      .eq('parent_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Notes fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch notes', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(notes || []);
  } catch (error) {
    console.error('Notes GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const userId = await getCurrentUserId();

    // Check if sales order exists
    const { data: so, error: soError } = await supabase
      .from('sales_orders')
      .select('id')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (soError || !so) {
      return NextResponse.json({ error: 'Sales order not found' }, { status: 404 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const { data: note, error } = await supabase
      .from('notes')
      .insert({
        parent_type: 'sales_order',
        parent_id: id,
        content: content.trim(),
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      console.error('Note create error:', error);
      return NextResponse.json(
        { error: 'Failed to create note', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error('Notes POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
