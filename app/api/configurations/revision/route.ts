/**
 * GET /api/configurations/revision
 *
 * Get a specific revision by ID
 * Query params: id
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../src/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required query parameter: id' },
        { status: 400 }
      );
    }

    // Get revision by ID
    const { data: revision, error } = await supabase
      .from('configuration_revisions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Revision not found' },
          { status: 404 }
        );
      }
      console.error('Revision fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to load revision', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ revision });
  } catch (error) {
    console.error('Get revision error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
