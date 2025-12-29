/**
 * GET /api/applications/[id]/vault
 * Get all vault data for an application in one call
 *
 * Returns:
 *   - specs: current specs only
 *   - notes: all notes
 *   - attachments: non-deleted attachments
 *   - scope_lines: non-deleted scope lines
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../src/lib/supabase/server';

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

    // Fetch all vault data in parallel
    const [specsResult, notesResult, attachmentsResult, scopeLinesResult] = await Promise.all([
      supabase
        .from('specs')
        .select('*')
        .eq('application_id', id)
        .eq('is_current', true)
        .order('key', { ascending: true }),
      supabase
        .from('notes')
        .select('*')
        .eq('application_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('attachments')
        .select('*')
        .eq('application_id', id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
      supabase
        .from('scope_lines')
        .select('*')
        .eq('application_id', id)
        .is('deleted_at', null)
        .order('position', { ascending: true }),
    ]);

    // Check for errors
    if (specsResult.error) {
      console.error('Specs fetch error:', specsResult.error);
    }
    if (notesResult.error) {
      console.error('Notes fetch error:', notesResult.error);
    }
    if (attachmentsResult.error) {
      console.error('Attachments fetch error:', attachmentsResult.error);
    }
    if (scopeLinesResult.error) {
      console.error('Scope lines fetch error:', scopeLinesResult.error);
    }

    return NextResponse.json({
      specs: specsResult.data || [],
      notes: notesResult.data || [],
      attachments: attachmentsResult.data || [],
      scope_lines: scopeLinesResult.data || [],
    });
  } catch (error) {
    console.error('Vault GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
