/**
 * GET /api/configurations/revisions
 *
 * Get list of revisions for a configuration
 * Query params: configuration_id
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../src/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const configuration_id = searchParams.get('configuration_id');

    if (!configuration_id) {
      return NextResponse.json(
        { error: 'Missing required query parameter: configuration_id' },
        { status: 400 }
      );
    }

    // Get all revisions for this configuration
    const { data: revisions, error } = await supabase
      .from('configuration_revisions')
      .select('id, revision_number, created_at, created_by_user_id, change_note')
      .eq('configuration_id', configuration_id)
      .order('revision_number', { ascending: false });

    if (error) {
      console.error('Revisions fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to load revisions', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ revisions });
  } catch (error) {
    console.error('Get revisions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
