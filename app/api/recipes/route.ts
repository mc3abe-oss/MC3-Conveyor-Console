/**
 * GET /api/recipes
 *
 * Fetch engineering recipes from calc_recipes table.
 * Returns all recipes (golden + reference) for engineers/admins.
 *
 * Query params:
 *   - type: 'golden' | 'reference' (optional filter)
 *   - tier: 'smoke' | 'regression' | 'edge' | 'longtail' (optional filter)
 *   - status: 'draft' | 'active' | 'locked' | 'deprecated' (optional filter)
 *
 * POST /api/recipes
 *
 * Create a new engineering recipe.
 * Body:
 *   - name: string (required)
 *   - recipe_type: 'golden' | 'reference' (required)
 *   - notes: string | null (optional)
 *   - inputs: object (required)
 *   - outputs: object (required for golden, optional for reference)
 *   - model_key: string (required)
 *   - model_version_id: string (required)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '../../../src/lib/supabase/client';
import { hashCanonical, stripUndefined } from '../../../src/lib/recipes/hash';

export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        {
          error: 'Supabase not configured',
          message: 'Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local',
        },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get('type');
    const tierFilter = searchParams.get('tier');
    const statusFilter = searchParams.get('status');

    // Build query - no domain/commercial filters
    let query = supabase
      .from('calc_recipes')
      .select('*')
      .order('updated_at', { ascending: false });

    // Apply optional filters
    if (typeFilter) {
      query = query.eq('recipe_type', typeFilter);
    }
    if (tierFilter) {
      query = query.eq('recipe_tier', tierFilter);
    }
    if (statusFilter) {
      query = query.eq('recipe_status', statusFilter);
    }

    const { data: recipes, error } = await query;

    if (error) {
      console.error('Recipes fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch recipes', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(recipes || []);
  } catch (error) {
    console.error('Recipes API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { name, recipe_type, notes, inputs, outputs, model_key, model_version_id } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!recipe_type || !['golden', 'reference'].includes(recipe_type)) {
      return NextResponse.json({ error: 'recipe_type must be "golden" or "reference"' }, { status: 400 });
    }

    if (!inputs || typeof inputs !== 'object') {
      return NextResponse.json({ error: 'inputs is required' }, { status: 400 });
    }

    if (!model_key || !model_version_id) {
      return NextResponse.json({ error: 'model_key and model_version_id are required' }, { status: 400 });
    }

    // Golden recipes require outputs
    if (recipe_type === 'golden' && (!outputs || typeof outputs !== 'object')) {
      return NextResponse.json({ error: 'Golden recipes require outputs' }, { status: 400 });
    }

    // Normalize inputs and compute hash
    const normalizedInputs = stripUndefined(inputs);
    const inputsHash = hashCanonical(normalizedInputs);

    // Build the recipe row
    const recipeRow: Record<string, unknown> = {
      name: name.trim(),
      recipe_type,
      recipe_tier: 'regression', // Default tier
      recipe_status: 'draft', // Default status
      model_key,
      model_version_id,
      inputs: normalizedInputs,
      inputs_hash: inputsHash,
      source: 'calculator',
      notes: notes || null,
      tolerance_policy: recipe_type === 'golden' ? 'explicit' : 'default_fallback',
    };

    // For golden recipes, store expected outputs and default tolerances
    if (recipe_type === 'golden') {
      recipeRow.expected_outputs = stripUndefined(outputs);
      // Default tolerances for golden recipes (can be refined later)
      recipeRow.tolerances = {
        '*': { rel: 0.001 }, // 0.1% default relative tolerance
      };
    }

    // Insert into calc_recipes
    const { data: recipe, error } = await supabase
      .from('calc_recipes')
      .insert(recipeRow)
      .select()
      .single();

    if (error) {
      console.error('Recipe create error:', error);
      return NextResponse.json(
        { error: 'Failed to create recipe', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(recipe, { status: 201 });
  } catch (error) {
    console.error('Recipe POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
