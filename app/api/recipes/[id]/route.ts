/**
 * GET /api/recipes/[id]
 *
 * Fetch a single engineering recipe by ID from calc_recipes.
 * Also fetches recent runs from recipe_runs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '../../../../src/lib/supabase/client';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 503 }
      );
    }

    const { id } = await params;

    // Fetch recipe
    const { data: recipe, error: recipeError } = await supabase
      .from('calc_recipes')
      .select('*')
      .eq('id', id)
      .single();

    if (recipeError) {
      if (recipeError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
      }
      console.error('Recipe fetch error:', recipeError);
      return NextResponse.json(
        { error: 'Failed to fetch recipe', details: recipeError.message },
        { status: 500 }
      );
    }

    // Fetch recent runs for this recipe
    const { data: runs, error: runsError } = await supabase
      .from('recipe_runs')
      .select('*')
      .eq('recipe_id', id)
      .order('run_at', { ascending: false })
      .limit(20);

    if (runsError) {
      console.error('Recipe runs fetch error:', runsError);
      // Don't fail the whole request, just log it
    }

    return NextResponse.json({
      recipe,
      runs: runs || [],
    });
  } catch (error) {
    console.error('Recipe detail API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
