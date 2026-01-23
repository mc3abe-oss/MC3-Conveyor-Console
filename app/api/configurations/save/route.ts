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
import { isSupabaseConfigured, supabaseAdmin } from '../../../../src/lib/supabase/client';
import { hashCanonical, stripUndefined } from '../../../../src/lib/recipes/hash';
import { MODEL_VERSION_ID } from '../../../../src/lib/model-identity';
import {
  parseApplicationCode,
  isApplicationCodeError,
  APPLICATION_CODE_HELP,
} from '../../../../src/lib/applicationCode';
import { formatCreatorDisplay } from '../../../../src/lib/user-display';

interface SaveRequestBody {
  reference_type: 'QUOTE' | 'SALES_ORDER';  // v1: Every application must be linked to Quote or SO
  reference_number: string;      // Base number as string (e.g., "62633")
  reference_suffix?: number;     // Optional suffix (e.g., 2 for "62633.2")
  reference_line?: number;       // Job line within the reference
  reference_id?: string;         // UUID of the quote or sales_order (for FK linkage)
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
  outputs_stale?: boolean;       // True if outputs exist but inputs have changed since calculation
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
      reference_id,           // UUID of the quote or sales_order
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
      outputs_stale = false,
    } = body;

    // Validate required fields
    if (!reference_type || !reference_number || !model_key || !inputs_json) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate reference_number: accepts two formats:
    // 1. Full application code: "32853" or "32853.1" (5-digit base + optional .X release)
    // 2. Base-only + separate reference_suffix: reference_number="32853", reference_suffix=1
    let parsedAppCode = parseApplicationCode(reference_number);

    // If parsing fails but reference_number is just the base and we have reference_suffix,
    // try combining them (backward compatibility with separate base + suffix)
    if (isApplicationCodeError(parsedAppCode) && reference_suffix != null) {
      const combinedCode = `${reference_number}.${reference_suffix}`;
      parsedAppCode = parseApplicationCode(combinedCode);
    }

    // If parsing succeeded as base-only but we have a separate reference_suffix,
    // re-parse with combined code to get the full normalized form
    if (!isApplicationCodeError(parsedAppCode) && parsedAppCode.releaseIndex == null && reference_suffix != null) {
      const combinedCode = `${parsedAppCode.base}.${reference_suffix}`;
      parsedAppCode = parseApplicationCode(combinedCode);
    }

    if (isApplicationCodeError(parsedAppCode)) {
      return NextResponse.json(
        { error: `Invalid reference number: ${parsedAppCode.error}. ${APPLICATION_CODE_HELP}` },
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
    // Use the full normalized application code (including release suffix if present)
    const slug = buildRecipeSlug(reference_type, parsedAppCode.code, lineNumber);

    // Extract base number from parsed application code (5-digit integer)
    const referenceNumberBase = parseInt(parsedAppCode.base, 10);

    // Build the combined inputs object (stores all config data)
    // Use release index from parsed code (e.g., 1 from "32853.1"), falling back to passed reference_suffix
    const releaseIndex = parsedAppCode.releaseIndex ?? reference_suffix ?? null;

    const combinedInputs = stripUndefined({
      ...inputs_json,
      _config: {
        reference_type,
        reference_number: parsedAppCode.code, // Full normalized code (e.g., "32853.1")
        reference_number_base: referenceNumberBase, // 5-digit base as number
        reference_suffix: releaseIndex,       // Release index (e.g., 1 from ".1")
        reference_line: lineNumber,           // Job line within the application
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
        // TOP-LEVEL applicationId for easy access
        applicationId: existingRecipe.id,
        recipe: {
          id: existingRecipe.id,
          slug,
          updated_at: existingRecipe.updated_at,
        },
        // Include configuration and revision for frontend compatibility
        configuration: {
          id: existingRecipe.id,
          reference_type,
          reference_number: parsedAppCode.code,
          reference_line: lineNumber,
        },
        revision: {
          id: existingRecipe.id,
          revision_number: 1,
        },
      });
    }

    // Build recipe name for display
    const recipeName = title || `${reference_type} ${parsedAppCode.code} Line ${lineNumber}`;

    // Determine calculation status based on outputs and staleness
    const hasOutputs = !!outputs_json;
    const isCalculated = hasOutputs && !outputs_stale;

    // Determine FK linkage based on reference_type and reference_id
    // These FKs are the SERVER TRUTH for delete eligibility
    const quoteId = (reference_type === 'QUOTE' && reference_id) ? reference_id : null;
    const salesOrderId = (reference_type === 'SALES_ORDER' && reference_id) ? reference_id : null;

    // Determine product family based on model_key
    // This is the authoritative source for routing to the correct product UI
    let productFamilySlug = 'belt-conveyor'; // Safe default
    if (model_key.toLowerCase().includes('magnetic')) {
      productFamilySlug = 'magnetic-conveyor';
    }
    // Note: belt, sliderbed, rollerbed all map to belt-conveyor (default)

    // Look up product_family_id
    const { data: productFamily, error: productFamilyError } = await supabase
      .from('product_families')
      .select('id')
      .eq('slug', productFamilySlug)
      .single();

    if (productFamilyError || !productFamily) {
      console.error('Product family lookup error:', productFamilyError);
      return NextResponse.json(
        { error: 'Failed to resolve product family', details: productFamilyError?.message },
        { status: 500 }
      );
    }

    // Build the recipe row
    const recipeRow: Record<string, unknown> = {
      slug,
      name: recipeName,
      recipe_type: 'reference',
      recipe_tier: 'regression',
      recipe_status: 'active',
      model_key,
      model_version_id: MODEL_VERSION_ID, // From canonical model identity
      inputs: combinedInputs,
      inputs_hash: inputsHash,
      source: 'calculator',
      source_ref: parsedAppCode.code,
      notes: change_note || null,
      tolerance_policy: 'default_fallback',
      updated_by: userId,
      // FK linkage columns (determines delete eligibility)
      quote_id: quoteId,
      sales_order_id: salesOrderId,
      // Product family (determines routing to correct product UI)
      product_family_id: productFamily.id,
      // Calculation status tracking (v1.21)
      calculation_status: isCalculated ? 'calculated' : 'draft',
      is_calculated: isCalculated,
      outputs_stale: hasOutputs && outputs_stale,
      last_calculated_at: isCalculated ? new Date().toISOString() : null,
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
      // Insert new recipe - stamp creator info
      recipeRow.created_by = userId;

      // Fetch user info to build display name
      if (supabaseAdmin) {
        try {
          const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
          if (userData?.user) {
            const metadata = userData.user.user_metadata as { first_name?: string; last_name?: string } | undefined;
            recipeRow.created_by_display = formatCreatorDisplay(userData.user.email, metadata);
          }
        } catch (err) {
          console.error('Failed to fetch user info for creator display:', err);
          // Continue without display name - it can be derived at read time
        }
      }

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

    // Determine save feedback message
    let saveMessage: string;
    if (isCalculated) {
      saveMessage = 'Saved Calculated Results';
    } else if (hasOutputs && outputs_stale) {
      saveMessage = 'Saved Draft (results are stale)';
    } else {
      saveMessage = 'Saved Draft (not calculated)';
    }

    return NextResponse.json({
      status: existingRecipe ? 'updated' : 'created',
      // TOP-LEVEL applicationId for easy access
      applicationId: recipe.id,
      recipe: {
        id: recipe.id,
        slug: recipe.slug,
        name: recipe.name,
        created_at: recipe.created_at,
        updated_at: recipe.updated_at,
      },
      // Calculation status fields (v1.21)
      calculation_status: isCalculated ? 'calculated' : 'draft',
      is_calculated: isCalculated,
      outputs_stale: hasOutputs && outputs_stale,
      last_calculated_at: isCalculated ? recipe.updated_at : null,
      save_message: saveMessage,
      // Backward compatibility fields
      configuration: {
        id: recipe.id,
        reference_type,
        reference_number: parsedAppCode.code,
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
