/**
 * Belt Catalog Item API (v1.23)
 *
 * GET /api/belts/[id] - Get belt details with usage count
 * DELETE /api/belts/[id] - Hard delete belt (only if usageCount == 0)
 * PATCH /api/belts/[id] - Update belt (used for activate/deactivate)
 *
 * Belt references are stored in:
 * - calc_recipes.inputs JSONB (belt_catalog_key field)
 * - configuration_revisions.inputs_json (legacy, belt_catalog_key field)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin, isSupabaseConfigured, isAdminConfigured } from '../../../../src/lib/supabase/client';

interface BeltUsageBreakdown {
  applications: number;
  configurations: number;
}

interface BeltUsageResult {
  usageCount: number;
  breakdown: BeltUsageBreakdown;
}

/**
 * Get belt usage count by catalog_key
 *
 * Checks:
 * - calc_recipes.inputs->>'belt_catalog_key' (applications/recipes)
 * - configuration_revisions.inputs_json->>'belt_catalog_key' (legacy configs)
 *
 * @param catalogKey - The belt's catalog_key (not UUID id)
 * @returns Usage count and breakdown
 */
async function getBeltUsageCount(catalogKey: string): Promise<BeltUsageResult> {
  const client = supabaseAdmin || supabase;

  // Count calc_recipes (applications) referencing this belt
  // Using raw SQL via RPC or text search since Supabase JS doesn't support JSONB operators directly
  const { count: appCount, error: appError } = await client
    .from('calc_recipes')
    .select('*', { count: 'exact', head: true })
    .filter('inputs->belt_catalog_key', 'eq', catalogKey);

  if (appError) {
    console.error('Error counting belt usage in calc_recipes:', appError);
  }

  // Count configuration_revisions (legacy configs) referencing this belt
  const { count: configCount, error: configError } = await client
    .from('configuration_revisions')
    .select('*', { count: 'exact', head: true })
    .filter('inputs_json->belt_catalog_key', 'eq', catalogKey);

  if (configError) {
    console.error('Error counting belt usage in configuration_revisions:', configError);
  }

  const applications = appCount || 0;
  const configurations = configCount || 0;

  return {
    usageCount: applications + configurations,
    breakdown: {
      applications,
      configurations,
    },
  };
}

/**
 * GET /api/belts/[id]
 * Get belt details with usage information
 */
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

    // Fetch belt by id
    const { data: belt, error } = await supabase
      .from('belt_catalog')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !belt) {
      return NextResponse.json(
        { error: 'Belt not found' },
        { status: 404 }
      );
    }

    // Get usage count
    const usage = await getBeltUsageCount(belt.catalog_key);

    return NextResponse.json({
      belt,
      usage,
    });
  } catch (error) {
    console.error('Belt GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/belts/[id]
 * Hard delete belt - ONLY allowed if usageCount == 0
 */
export async function DELETE(
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

    if (!isAdminConfigured() || !supabaseAdmin) {
      return NextResponse.json(
        { error: 'Admin access not configured. Please set SUPABASE_SERVICE_ROLE_KEY.' },
        { status: 503 }
      );
    }

    const { id } = await params;

    // Fetch belt to get catalog_key
    const { data: belt, error: fetchError } = await supabaseAdmin
      .from('belt_catalog')
      .select('id, catalog_key, display_name')
      .eq('id', id)
      .single();

    if (fetchError || !belt) {
      return NextResponse.json(
        { error: 'Belt not found' },
        { status: 404 }
      );
    }

    // Check usage
    const usage = await getBeltUsageCount(belt.catalog_key);

    if (usage.usageCount > 0) {
      return NextResponse.json(
        {
          error: 'Belt is in use and cannot be deleted. Deactivate instead.',
          usageCount: usage.usageCount,
          breakdown: usage.breakdown,
        },
        { status: 409 }
      );
    }

    // Hard delete
    const { error: deleteError } = await supabaseAdmin
      .from('belt_catalog')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Belt delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete belt', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: `Belt "${belt.display_name}" deleted successfully`,
    });
  } catch (error) {
    console.error('Belt DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/belts/[id]
 * Update belt - used for activate/deactivate
 * Body: { is_active: boolean, change_reason: string }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 503 }
      );
    }

    if (!isAdminConfigured() || !supabaseAdmin) {
      return NextResponse.json(
        { error: 'Admin access not configured. Please set SUPABASE_SERVICE_ROLE_KEY.' },
        { status: 503 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { is_active, change_reason } = body;

    if (typeof is_active !== 'boolean') {
      return NextResponse.json(
        { error: 'is_active must be a boolean' },
        { status: 400 }
      );
    }

    if (!change_reason || typeof change_reason !== 'string') {
      return NextResponse.json(
        { error: 'change_reason is required' },
        { status: 400 }
      );
    }

    // Verify belt exists
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('belt_catalog')
      .select('id, display_name')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Belt not found' },
        { status: 404 }
      );
    }

    // Update the belt
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('belt_catalog')
      .update({ is_active })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Belt update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update belt', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      belt: updated,
      message: is_active
        ? `Belt "${existing.display_name}" activated`
        : `Belt "${existing.display_name}" deactivated`,
    });
  } catch (error) {
    console.error('Belt PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
