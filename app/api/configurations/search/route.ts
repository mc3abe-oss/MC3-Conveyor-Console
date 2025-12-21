/**
 * GET /api/configurations/search
 *
 * Search configurations by reference_number and title
 * Query params:
 * - reference_type: QUOTE | SALES_ORDER | ALL (default: ALL)
 * - q: search query (searches reference_number and title using ILIKE)
 * - limit: max results (default: 20, max: 100)
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
    const referenceType = searchParams.get('reference_type') || 'ALL';
    const query = searchParams.get('q') || '';
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam), 100) : 20;

    // Build query
    let queryBuilder = supabase
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
      `);

    // Filter by reference_type if not ALL
    if (referenceType !== 'ALL') {
      queryBuilder = queryBuilder.eq('reference_type', referenceType);
    }

    // Search by reference_number or title
    if (query) {
      queryBuilder = queryBuilder.or(
        `reference_number.ilike.%${query}%,title.ilike.%${query}%`
      );
    }

    const { data: configurations, error } = await queryBuilder
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Search configurations error:', error);
      return NextResponse.json(
        { error: 'Failed to search configurations', details: error.message },
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
    console.error('Search configurations API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
