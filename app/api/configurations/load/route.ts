/**
 * GET /api/configurations/load
 *
 * Load a configuration from calc_recipes table.
 * Query params: reference_type, reference_number, reference_line (optional, default 1)
 *
 * Uses calc_recipes instead of configurations table to avoid RLS issues.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../src/lib/supabase/server';
import { isSupabaseConfigured } from '../../../../src/lib/supabase/client';
import { normalizeEnvironmentFactors } from '../../../../src/models/sliderbed_v1/schema';

/**
 * Build a unique slug for the recipe from reference fields
 */
function buildRecipeSlug(referenceType: string, referenceNumber: string, referenceLine: number): string {
  return `config:${referenceType.toLowerCase()}:${referenceNumber}:${referenceLine}`;
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

    // Create authenticated Supabase client
    const supabase = await createClient();

    // Build slug to find the recipe
    const slug = buildRecipeSlug(reference_type, reference_number, reference_line);

    // Find recipe by slug
    const { data: recipe, error: recipeError } = await supabase
      .from('calc_recipes')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (recipeError) {
      console.error('Recipe fetch error:', recipeError);
      return NextResponse.json(
        { error: 'Failed to load configuration', details: recipeError.message },
        { status: 500 }
      );
    }

    if (!recipe) {
      return NextResponse.json(
        { error: 'Configuration not found' },
        { status: 404 }
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

    // Build backward-compatible response
    const configuration = {
      id: recipe.id,
      model_key: recipe.model_key,
      reference_type: configData.reference_type || reference_type,
      reference_number: configData.reference_number || reference_number,
      reference_line: configData.reference_line || reference_line,
      line_key: String(configData.reference_line || reference_line),
      title: configData.title || recipe.name,
      created_by_user_id: recipe.created_by,
      created_at: recipe.created_at,
      updated_at: recipe.updated_at,
    };

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

    return NextResponse.json({
      configuration,
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
