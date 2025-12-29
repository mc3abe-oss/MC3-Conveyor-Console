/**
 * POST /api/configurations/save
 *
 * Save or update a configuration using calc_recipes table.
 * Includes deduplication: identical payloads will not trigger updates.
 *
 * Uses calc_recipes instead of configurations table to avoid RLS issues.
 * Config data is stored in the inputs JSONB field.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, getCurrentUserId } from '../../../../src/lib/supabase/server';
import { isSupabaseConfigured } from '../../../../src/lib/supabase/client';
import { hashCanonical, stripUndefined } from '../../../../src/lib/recipes/hash';

interface SaveRequestBody {
  reference_type: 'QUOTE' | 'SALES_ORDER';
  reference_number: string;      // Base number as string (e.g., "62633")
  reference_suffix?: number;     // Optional suffix (e.g., 2 for "62633.2")
  reference_line?: number;       // Job line within the reference
  customer_name?: string;        // Customer name
  quantity?: number;             // Conveyor quantity
  model_key: string;
  title?: string;
  inputs_json: any;
  parameters_json: any;
  application_json: any;
  outputs_json?: any;
  warnings_json?: any;
  change_note?: string;
}

/**
 * Build a unique slug for the recipe from reference fields
 */
function buildRecipeSlug(referenceType: string, referenceNumber: string, referenceLine: number): string {
  return `config:${referenceType.toLowerCase()}:${referenceNumber}:${referenceLine}`;
}

export async function POST(request: NextRequest) {
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

    const body = await request.json() as SaveRequestBody;

    const {
      reference_type,
      reference_number,
      reference_suffix,
      reference_line = 1,
      customer_name,
      quantity,
      model_key,
      title,
      inputs_json,
      parameters_json,
      application_json,
      outputs_json,
      warnings_json,
      change_note,
    } = body;

    // Validate required fields
    if (!reference_type || !reference_number || !model_key || !inputs_json) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    // Validate reference_line: must be integer >= 1
    const lineNumber = Number(reference_line);
    if (!Number.isInteger(lineNumber) || lineNumber < 1) {
      return NextResponse.json(
        { error: 'Reference line must be an integer >= 1.' },
        { status: 400 }
      );
    }

    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Create authenticated Supabase client
    const supabase = await createClient();

    // Build unique slug for this configuration
    const slug = buildRecipeSlug(reference_type, reference_number, lineNumber);

    // Parse reference_number as base number
    const referenceNumberBase = parseInt(reference_number, 10);

    // Build the combined inputs object (stores all config data)
    const combinedInputs = stripUndefined({
      ...inputs_json,
      _config: {
        reference_type,
        reference_number,              // Keep string for backward compat
        reference_number_base: referenceNumberBase, // Store as number
        reference_suffix: reference_suffix ?? null,
        reference_line: lineNumber,    // Job line
        customer_name: customer_name ?? null,
        quantity: quantity ?? 1,
        title,
        parameters_json,
        application_json,
      },
    });

    // Compute inputs hash for deduplication
    const inputsHash = hashCanonical(combinedInputs);

    // Check if recipe with this slug already exists
    const { data: existingRecipe, error: fetchError } = await supabase
      .from('calc_recipes')
      .select('id, inputs_hash, updated_at')
      .eq('slug', slug)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching existing recipe:', fetchError);
      return NextResponse.json(
        { error: 'Failed to check existing configuration', details: fetchError.message },
        { status: 500 }
      );
    }

    // Check for duplicate - if hash matches, no update needed
    if (existingRecipe && existingRecipe.inputs_hash === inputsHash) {
      return NextResponse.json({
        status: 'no_change',
        message: 'No changes detected.',
        recipe: {
          id: existingRecipe.id,
          slug,
          updated_at: existingRecipe.updated_at,
        },
        // Include configuration and revision for frontend compatibility
        configuration: {
          id: existingRecipe.id,
          reference_type,
          reference_number,
          reference_line: lineNumber,
        },
        revision: {
          id: existingRecipe.id,
          revision_number: 1,
        },
      });
    }

    // Build recipe name for display
    const recipeName = title || `${reference_type} ${reference_number} Line ${lineNumber}`;

    // Build the recipe row
    const recipeRow: Record<string, unknown> = {
      slug,
      name: recipeName,
      recipe_type: 'reference',
      recipe_tier: 'regression',
      recipe_status: 'active',
      model_key,
      model_version_id: 'v1.13.0', // Current version
      inputs: combinedInputs,
      inputs_hash: inputsHash,
      source: 'calculator',
      source_ref: reference_number,
      notes: change_note || null,
      tolerance_policy: 'default_fallback',
      updated_by: userId,
    };

    // Store outputs if provided
    if (outputs_json) {
      recipeRow.expected_outputs = stripUndefined(outputs_json);
    }

    // Store warnings/issues if provided
    if (warnings_json) {
      recipeRow.expected_issues = warnings_json;
    }

    let recipe;
    let recipeError;

    if (existingRecipe) {
      // Update existing recipe
      const result = await supabase
        .from('calc_recipes')
        .update(recipeRow)
        .eq('id', existingRecipe.id)
        .select()
        .single();

      recipe = result.data;
      recipeError = result.error;
    } else {
      // Insert new recipe
      recipeRow.created_by = userId;
      const result = await supabase
        .from('calc_recipes')
        .insert(recipeRow)
        .select()
        .single();

      recipe = result.data;
      recipeError = result.error;
    }

    if (recipeError) {
      console.error('Recipe save error:', recipeError);
      return NextResponse.json(
        { error: 'Failed to save configuration', details: recipeError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: existingRecipe ? 'updated' : 'created',
      recipe: {
        id: recipe.id,
        slug: recipe.slug,
        name: recipe.name,
        created_at: recipe.created_at,
        updated_at: recipe.updated_at,
      },
      // Backward compatibility fields
      configuration: {
        id: recipe.id,
        reference_type,
        reference_number,
        reference_line: lineNumber,
        title: recipe.name,
      },
      revision: {
        id: recipe.id,
        revision_number: 1, // calc_recipes doesn't track revisions
      },
    });
  } catch (error) {
    console.error('Save configuration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
