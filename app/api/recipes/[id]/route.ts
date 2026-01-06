/**
 * Recipe Detail API Routes
 *
 * GET /api/recipes/[id] - Fetch single recipe with runs
 * PATCH /api/recipes/[id] - Update recipe metadata (name, notes, role, tags)
 * DELETE /api/recipes/[id] - Hard delete recipe (admin only, no role restrictions)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '../../../../src/lib/supabase/client';
import {
  RecipeRole,
  RECIPE_ROLES,
  deriveRoleFromLegacy,
  RecipeType,
  RecipeStatus,
} from '../../../../src/lib/recipes/types';
import { requireBeltAdmin } from '../../../../src/lib/auth/require';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * Get effective role from recipe data.
 * Uses role column if set, otherwise derives from legacy fields.
 */
function getEffectiveRole(recipe: {
  role?: RecipeRole | null;
  recipe_type: RecipeType;
  recipe_status: RecipeStatus;
}): RecipeRole {
  if (recipe.role) return recipe.role;
  return deriveRoleFromLegacy(recipe.recipe_type, recipe.recipe_status);
}

// ============================================================================
// GET - Fetch recipe detail
// ============================================================================

export async function GET(_request: NextRequest, { params }: RouteParams) {
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

    // Add computed role for backward compatibility
    const recipeWithRole = {
      ...recipe,
      role: getEffectiveRole(recipe),
    };

    return NextResponse.json({
      recipe: recipeWithRole,
      runs: runs || [],
    });
  } catch (error) {
    console.error('Recipe detail API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================================================
// PATCH - Update recipe metadata
// ============================================================================

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 503 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { name, notes, role, tags, role_change_reason } = body;

    // Fetch current recipe
    const { data: currentRecipe, error: fetchError } = await supabase
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

    const currentRole = getEffectiveRole(currentRecipe);

    // Validate role if provided
    if (role !== undefined) {
      if (!RECIPE_ROLES.includes(role)) {
        return NextResponse.json(
          { error: `Invalid role. Must be one of: ${RECIPE_ROLES.join(', ')}` },
          { status: 400 }
        );
      }

      // Downgrade from golden requires admin (for now, we block it entirely)
      // TODO: Add admin check when auth is fully implemented
      if (currentRole === 'golden' && role !== 'golden') {
        return NextResponse.json(
          {
            error: 'Cannot downgrade from golden role',
            message: 'Golden recipes are protected. Contact admin to change role.',
          },
          { status: 403 }
        );
      }

      // Upgrading to golden requires a reason
      if (role === 'golden' && currentRole !== 'golden' && !role_change_reason) {
        return NextResponse.json(
          { error: 'Reason required when upgrading to golden role' },
          { status: 400 }
        );
      }
    }

    // Build update payload
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return NextResponse.json({ error: 'Name must be a non-empty string' }, { status: 400 });
      }
      updatePayload.name = name.trim();
    }

    if (notes !== undefined) {
      updatePayload.notes = notes;
    }

    if (tags !== undefined) {
      updatePayload.tags = tags;
    }

    if (role !== undefined) {
      updatePayload.role = role;

      // Also update legacy fields for backward compatibility
      if (role === 'golden') {
        updatePayload.recipe_type = 'golden';
        updatePayload.recipe_status = 'active';
      } else if (role === 'deprecated') {
        updatePayload.recipe_type = 'reference';
        updatePayload.recipe_status = 'deprecated';
      } else if (role === 'regression') {
        updatePayload.recipe_type = 'reference';
        updatePayload.recipe_status = 'active';
      } else {
        updatePayload.recipe_type = 'reference';
        updatePayload.recipe_status = 'draft';
      }

      // Append role change reason to notes if provided
      if (role_change_reason) {
        const timestamp = new Date().toISOString();
        const existingNotes = currentRecipe.notes || '';
        const newNote = `[${timestamp}] Role changed from ${currentRole} to ${role}: ${role_change_reason}`;
        updatePayload.notes = existingNotes ? `${existingNotes}\n\n${newNote}` : newNote;
      }
    }

    // Update recipe
    const { data: updatedRecipe, error: updateError } = await supabase
      .from('calc_recipes')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Recipe update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update recipe', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...updatedRecipe,
      role: getEffectiveRole(updatedRecipe),
    });
  } catch (error) {
    console.error('Recipe PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================================================
// DELETE - Delete recipe (admin only, hard delete)
// ============================================================================

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    // Require BELT_ADMIN or SUPER_ADMIN role
    const auth = await requireBeltAdmin();
    if (auth.response) {
      return auth.response;
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 503 }
      );
    }

    const { id } = await params;

    // Verify recipe exists
    const { data: currentRecipe, error: fetchError } = await supabase
      .from('calc_recipes')
      .select('id, name')
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

    // Hard delete - no role checks, admins can delete anything
    const { error: deleteError } = await supabase
      .from('calc_recipes')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Recipe delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete recipe', details: deleteError.message },
        { status: 500 }
      );
    }

    console.log(`[DELETE] Recipe ${id} (${currentRecipe.name}) deleted by ${auth.user.email}`);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Recipe DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
