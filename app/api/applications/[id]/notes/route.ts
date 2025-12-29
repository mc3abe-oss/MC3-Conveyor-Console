/**
 * GET /api/applications/[id]/notes
 * List all notes for an application
 *
 * POST /api/applications/[id]/notes
 * Add a note to an application (immutable after creation)
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

    // Verify application exists
    const { data: app, error: appError } = await supabase
      .from('calc_recipes')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (appError || !app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const { data: notes, error } = await supabase
      .from('notes')
      .select('*')
      .eq('application_id', id)
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

    // Verify application exists
    const { data: app, error: appError } = await supabase
      .from('calc_recipes')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (appError || !app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const { data: note, error } = await supabase
      .from('notes')
      .insert({
        application_id: id,
        parent_type: 'application', // For backward compat
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
