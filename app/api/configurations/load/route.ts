/**
 * GET /api/configurations/load
 *
 * Load a configuration with its latest revision
 * Query params: reference_type, reference_number, reference_line (optional, default 1)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '../../../../src/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        {
          error: 'Supabase not configured',
          message: 'Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
        },
        { status: 503 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const reference_type = searchParams.get('reference_type');
    const reference_number = searchParams.get('reference_number');
    const reference_line_param = searchParams.get('reference_line') || '1';

    if (!reference_type || !reference_number) {
      return NextResponse.json(
        { error: 'Missing required query parameters: reference_type, reference_number' },
        { status: 400 }
      );
    }

    // Validate reference_number: must be numeric (digits only)
    if (!/^\d+$/.test(reference_number)) {
      return NextResponse.json(
        { error: 'Reference number must be numeric.' },
        { status: 400 }
      );
    }

    // Validate and parse reference_line
    const reference_line = parseInt(reference_line_param, 10);
    if (isNaN(reference_line) || reference_line < 1) {
      return NextResponse.json(
        { error: 'Reference line must be an integer >= 1.' },
        { status: 400 }
      );
    }

    // Find configuration
    const { data: config, error: configError } = await supabase
      .from('configurations')
      .select('*')
      .eq('reference_type', reference_type)
      .eq('reference_number', reference_number)
      .eq('reference_line', reference_line)
      .single();

    if (configError) {
      if (configError.code === 'PGRST116') {
        // No rows returned
        return NextResponse.json(
          { error: 'Configuration not found' },
          { status: 404 }
        );
      }
      console.error('Configuration fetch error:', configError);
      return NextResponse.json(
        { error: 'Failed to load configuration', details: configError.message },
        { status: 500 }
      );
    }

    // Get latest revision
    const { data: revision, error: revisionError } = await supabase
      .from('configuration_revisions')
      .select('*')
      .eq('configuration_id', config.id)
      .order('revision_number', { ascending: false })
      .limit(1)
      .single();

    if (revisionError) {
      console.error('Revision fetch error:', revisionError);
      return NextResponse.json(
        { error: 'Failed to load revision', details: revisionError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      configuration: config,
      revision,
    });
  } catch (error) {
    console.error('Load configuration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
