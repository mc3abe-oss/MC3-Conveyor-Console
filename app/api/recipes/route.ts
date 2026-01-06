/**
 * GET /api/recipes
 *
 * Fetch engineering recipes (CI fixtures) from calc_recipes table.
 * By default, returns only fixtures (is_fixture = true).
 * Application snapshots (quotes/sales orders) are excluded.
 *
 * Query params:
 *   - type: 'golden' | 'reference' (optional filter)
 *   - tier: 'smoke' | 'regression' | 'edge' | 'longtail' (optional filter)
 *   - status: 'draft' | 'active' | 'locked' | 'deprecated' (optional filter)
 *   - include_applications: 'true' to include non-fixtures (default: false)
 *
 * POST /api/recipes
 *
 * Create a new engineering recipe (fixture).
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
import { canonicalizeRecipeInputs } from '../../../src/lib/recipes/canon/canonicalize-inputs';

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
    const includeApplications = searchParams.get('include_applications') === 'true';

    // Build query
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

    // CRITICAL: Only show fixtures (CI recipes) unless explicitly requested
    // This prevents application snapshots (quotes/sales orders) from appearing
    if (!includeApplications) {
      query = query.eq('is_fixture', true);
    }

    let { data: recipes, error } = await query;

    // Fallback: if is_fixture column doesn't exist, fetch all and filter client-side
    // This handles the case where migration hasn't been applied yet
    if (error?.message?.includes('is_fixture')) {
      console.warn('is_fixture column not found, falling back to unfiltered query');

      // Re-run query without is_fixture filter
      let fallbackQuery = supabase
        .from('calc_recipes')
        .select('*')
        .order('updated_at', { ascending: false });

      if (typeFilter) fallbackQuery = fallbackQuery.eq('recipe_type', typeFilter);
      if (tierFilter) fallbackQuery = fallbackQuery.eq('recipe_tier', tierFilter);
      if (statusFilter) fallbackQuery = fallbackQuery.eq('recipe_status', statusFilter);

      const fallbackResult = await fallbackQuery;
      recipes = fallbackResult.data;
      error = fallbackResult.error;

      // Filter client-side: exclude records that look like applications
      if (!includeApplications && recipes) {
        recipes = recipes.filter((r: Record<string, unknown>) =>
          r.quote_id === null &&
          r.sales_order_id === null &&
          !(r.name as string)?.startsWith('SALES_ORDER') &&
          !(r.name as string)?.startsWith('QUOTE') &&
          !(r.name as string)?.match(/^(SO|Q)\d+/)
        );
      }
    }

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

    // Normalize inputs (strip undefined)
    const normalizedInputs = stripUndefined(inputs);

    // Canonicalize inputs - produce clean user_inputs
    const { userInputs, removedKeys } = canonicalizeRecipeInputs(normalizedInputs);

    // Compute hash from CANONICALIZED inputs (not raw)
    const inputsHash = hashCanonical(userInputs);

    // Log removed keys for debugging (in development)
    if (removedKeys.length > 0 && process.env.NODE_ENV === 'development') {
      console.log('Recipe inputs canonicalization removed keys:', removedKeys);
    }

    // Build the recipe row
    const recipeRow: Record<string, unknown> = {
      name: name.trim(),
      recipe_type,
      recipe_tier: 'regression', // Default tier
      recipe_status: 'draft', // Default status
      model_key,
      model_version_id,
      inputs: normalizedInputs, // Keep raw inputs for audit
      user_inputs_json: userInputs, // Store canonical inputs
      inputs_hash: inputsHash, // Hash computed from canonical inputs
      source: 'calculator',
      notes: notes || null,
      tolerance_policy: recipe_type === 'golden' ? 'explicit' : 'default_fallback',
      is_fixture: true, // Engineering recipes are CI fixtures
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
