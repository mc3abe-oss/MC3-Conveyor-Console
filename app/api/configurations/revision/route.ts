/**
 * GET /api/configurations/revision
 *
 * Get a specific revision by ID (now fetches from calc_recipes)
 * Query params: id
 *
 * Uses calc_recipes instead of configuration_revisions table.
 * In calc_recipes, the recipe ID is the revision ID (no revision history).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../src/lib/supabase/server';
import { isSupabaseConfigured } from '../../../../src/lib/supabase/client';
import { normalizeEnvironmentFactors } from '../../../../src/models/sliderbed_v1/schema';

export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 503 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required query parameter: id' },
        { status: 400 }
      );
    }

    // Create authenticated Supabase client
    const supabase = await createClient();

    // Get recipe by ID (in calc_recipes, recipe ID = revision ID)
    const { data: recipe, error } = await supabase
      .from('calc_recipes')
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
      console.error('Recipe fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to load revision', details: error.message },
        { status: 500 }
      );
    }

    // Extract config data from the inputs JSONB
    const inputs = recipe.inputs || {};
    const configData = inputs._config || {};

    // Build inputs_json without the _config metadata
    const { _config, ...inputs_json } = inputs;

    // Normalize environment_factors for backward compatibility (v1.9)
    if (inputs_json.environment_factors !== undefined) {
      inputs_json.environment_factors = normalizeEnvironmentFactors(
        inputs_json.environment_factors
      );
    }

    // Build backward-compatible revision object
    const revision = {
      id: recipe.id,
      configuration_id: recipe.id,
      revision_number: 1, // calc_recipes doesn't track revisions
      inputs_json,
      parameters_json: configData.parameters_json || {},
      application_json: configData.application_json || {},
      outputs_json: recipe.expected_outputs || null,
      warnings_json: recipe.expected_issues || null,
      change_note: recipe.notes,
      created_by_user_id: recipe.created_by,
      created_at: recipe.created_at,
    };

    return NextResponse.json({ revision });
  } catch (error) {
    console.error('Get revision error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
