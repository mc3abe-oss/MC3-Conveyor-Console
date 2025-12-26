/**
 * GET /api/configurations/revisions
 *
 * Get list of revisions for a configuration
 * Query params:
 *   - configuration_id: Required UUID
 *   - include_data: Optional boolean - if true, includes full inputs/application/outputs
 *
 * Uses calc_recipes instead of configuration_revisions table.
 * In calc_recipes, there's only one "revision" per recipe (no history).
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
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 503 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const configuration_id = searchParams.get('configuration_id');
    const includeData = searchParams.get('include_data') === 'true';

    if (!configuration_id) {
      return NextResponse.json(
        { error: 'Missing required query parameter: configuration_id' },
        { status: 400 }
      );
    }

    // Create authenticated Supabase client
    const supabase = await createClient();

    // Get the recipe by ID (configuration_id = recipe.id in new schema)
    const { data: recipe, error: recipeError } = await supabase
      .from('calc_recipes')
      .select('*')
      .eq('id', configuration_id)
      .single();

    if (recipeError) {
      console.error('Recipe fetch error:', recipeError);
      return NextResponse.json(
        { error: 'Configuration not found', details: recipeError.message },
        { status: 404 }
      );
    }

    // Extract config data from the inputs JSONB
    const inputs = recipe.inputs || {};
    const configData = inputs._config || {};
    const slugData = parseConfigSlug(recipe.slug);

    // Build backward-compatible configuration object
    const configuration = {
      id: recipe.id,
      model_key: recipe.model_key,
      reference_type: slugData?.reference_type || configData.reference_type || 'QUOTE',
      reference_number: slugData?.reference_number || configData.reference_number || '',
      reference_line: slugData?.reference_line || configData.reference_line || 1,
      title: configData.title || recipe.name,
      created_at: recipe.created_at,
      updated_at: recipe.updated_at,
    };

    // Build inputs_json without the _config metadata
    const { _config, ...inputs_json } = inputs;

    // Build single revision (calc_recipes doesn't track revision history)
    const revision: Record<string, unknown> = {
      id: recipe.id,
      revision_number: 1,
      created_at: recipe.created_at,
      created_by_user_id: recipe.created_by,
      change_note: recipe.notes,
    };

    // Include full data if requested
    if (includeData) {
      revision.inputs_json = inputs_json;
      revision.application_json = configData.application_json || {};
      revision.outputs_json = recipe.expected_outputs || null;
    }

    // Return single revision in array for backward compatibility
    return NextResponse.json({
      configuration,
      revisions: [revision],
    });
  } catch (error) {
    console.error('Get revisions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
