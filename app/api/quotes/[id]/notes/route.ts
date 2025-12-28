/**
 * GET /api/quotes/[id]/notes
 * List all notes for a quote
 *
 * POST /api/quotes/[id]/notes
 * Add a note to a quote (immutable after creation)
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
      .eq('parent_type', 'quote')
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

    // Check if quote exists and is not read-only
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('is_read_only')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    if (quote.is_read_only) {
      return NextResponse.json(
        { error: 'Quote is read-only (already converted)' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const { data: note, error } = await supabase
      .from('notes')
      .insert({
        parent_type: 'quote',
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
