/**
 * POST /api/recipes/[id]/duplicate
 *
 * Duplicate a recipe with a new ID.
 * - Name becomes "{original name} (copy)"
 * - Role defaults to 'reference' (golden becomes reference)
 * - Same inputs and expected_outputs
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '../../../../../src/lib/supabase/client';
import {
  RecipeRole,
  deriveRoleFromLegacy,
  RecipeType,
  RecipeStatus,
} from '../../../../../src/lib/recipes/types';

type RouteParams = { params: Promise<{ id: string }> };

function getEffectiveRole(recipe: {
  role?: RecipeRole | null;
  recipe_type: RecipeType;
  recipe_status: RecipeStatus;
}): RecipeRole {
  if (recipe.role) return recipe.role;
  return deriveRoleFromLegacy(recipe.recipe_type, recipe.recipe_status);
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 503 }
      );
    }

    const { id } = await params;

    // Fetch source recipe
    const { data: sourceRecipe, error: fetchError } = await supabase
      .from('calc_recipes')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
      }
      return NextResponse.json(
        { error: 'Failed to fetch recipe', details: fetchError.message },
        { status: 500 }
      );
    }

    const sourceRole = getEffectiveRole(sourceRecipe);

    // Determine new role (golden becomes reference, others stay same)
    const newRole: RecipeRole = sourceRole === 'golden' ? 'reference' : sourceRole;

    // Map role to legacy fields (newRole will never be 'golden' due to above logic)
    let newRecipeType: RecipeType = 'reference';
    let newRecipeStatus: RecipeStatus = 'draft';
    if (newRole === 'deprecated') {
      newRecipeStatus = 'deprecated';
    } else if (newRole === 'regression') {
      newRecipeStatus = 'active';
    }
    // 'reference' uses defaults: recipe_type='reference', recipe_status='draft'

    // Build new recipe row
    const newRecipe: Record<string, unknown> = {
      name: `${sourceRecipe.name} (copy)`,
      slug: null, // Clear slug to avoid conflicts
      recipe_type: newRecipeType,
      recipe_tier: sourceRecipe.recipe_tier,
      recipe_status: newRecipeStatus,
      role: newRole,
      model_key: sourceRecipe.model_key,
      model_version_id: sourceRecipe.model_version_id,
      model_build_id: sourceRecipe.model_build_id,
      model_snapshot_hash: sourceRecipe.model_snapshot_hash,
      inputs: sourceRecipe.inputs,
      inputs_hash: sourceRecipe.inputs_hash,
      expected_outputs: sourceRecipe.expected_outputs,
      expected_issues: sourceRecipe.expected_issues,
      tolerances: sourceRecipe.tolerances,
      tolerance_policy: sourceRecipe.tolerance_policy,
      legacy_outputs: sourceRecipe.legacy_outputs,
      source: sourceRecipe.source,
      source_ref: sourceRecipe.source_ref,
      tags: sourceRecipe.tags,
      notes: `Duplicated from recipe ${sourceRecipe.id} (${sourceRecipe.name})`,
      belt_catalog_version: sourceRecipe.belt_catalog_version,
    };

    // Insert new recipe
    const { data: duplicatedRecipe, error: insertError } = await supabase
      .from('calc_recipes')
      .insert(newRecipe)
      .select()
      .single();

    if (insertError) {
      console.error('Recipe duplicate error:', insertError);
      return NextResponse.json(
        { error: 'Failed to duplicate recipe', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ...duplicatedRecipe,
        role: newRole,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Recipe duplicate API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
