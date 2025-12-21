/**
 * GET /api/configurations/recent
 *
 * Get recent configurations ordered by updated_at
 * Query params: limit (default: 20, max: 100)
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
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam), 100) : 20;

    // Fetch recent configurations with latest revision metadata
    const { data: configurations, error } = await supabase
      .from('configurations')
      .select(`
        id,
        model_key,
        reference_type,
        reference_number,
        line_key,
        title,
        updated_at,
        created_at
      `)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Recent configurations fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch configurations', details: error.message },
        { status: 500 }
      );
    }

    // For each configuration, fetch the latest revision number
    const configurationsWithRevision = await Promise.all(
      (configurations || []).map(async (config) => {
        const { data: latestRevision } = await supabase
          .from('configuration_revisions')
          .select('revision_number')
          .eq('configuration_id', config.id)
          .order('revision_number', { ascending: false })
          .limit(1)
          .maybeSingle();

        return {
          ...config,
          latest_revision_number: latestRevision?.revision_number || 0,
        };
      })
    );

    return NextResponse.json(configurationsWithRevision);
  } catch (error) {
    console.error('Recent configurations API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
