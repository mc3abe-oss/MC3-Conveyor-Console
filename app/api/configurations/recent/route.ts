/**
 * GET /api/configurations/recent
 *
 * Get recent configurations ordered by updated_at
 * Query params: limit (default: 20, max: 100)
 *
 * Uses calc_recipes instead of configurations table to avoid RLS issues.
 * Only returns recipes with slug starting with "config:" (user configurations).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../src/lib/supabase/server';
import { isSupabaseConfigured } from '../../../../src/lib/supabase/client';

/**
 * Parse a config slug back to reference fields
 * Slug format: config:{reference_type}:{reference_number}:{reference_line}
 */
function parseConfigSlug(slug: string): { reference_type: string; reference_number: string; reference_line: number } | null {
  if (!slug?.startsWith('config:')) return null;
  const parts = slug.split(':');
  if (parts.length < 4) return null;
  return {
    reference_type: parts[1].toUpperCase(),
    reference_number: parts[2],
    reference_line: parseInt(parts[3], 10) || 1,
  };
}

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

    // Create authenticated Supabase client
    const supabase = await createClient();

    // Fetch recent recipes that are user configurations (slug starts with "config:")
    const { data: recipes, error } = await supabase
      .from('calc_recipes')
      .select(`
        id,
        slug,
        name,
        model_key,
        inputs,
        updated_at,
        created_at
      `)
      .like('slug', 'config:%')
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Recent configurations fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch configurations', details: error.message },
        { status: 500 }
      );
    }

    // Transform recipes to configuration format
    const configurations = (recipes || []).map((recipe) => {
      const slugData = parseConfigSlug(recipe.slug);
      const configData = recipe.inputs?._config || {};

      return {
        id: recipe.id,
        model_key: recipe.model_key,
        reference_type: slugData?.reference_type || configData.reference_type || 'QUOTE',
        reference_number: slugData?.reference_number || configData.reference_number || '',
        line_key: String(slugData?.reference_line || configData.reference_line || 1),
        title: configData.title || recipe.name,
        updated_at: recipe.updated_at,
        created_at: recipe.created_at,
        latest_revision_number: 1, // calc_recipes doesn't track revisions
      };
    });

    return NextResponse.json(configurations);
  } catch (error) {
    console.error('Recent configurations API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
