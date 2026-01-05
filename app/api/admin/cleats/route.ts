/**
 * Admin Cleats API (v1.23)
 *
 * GET: Fetch all cleat catalog entries (including inactive)
 * POST: Create a new cleat catalog entry
 * PUT: Update an existing cleat catalog entry
 *
 * Note: DELETE is intentionally not implemented - use is_active toggle (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../src/lib/supabase/server';
import { CleatPattern, CLEAT_PATTERNS } from '../../../../src/lib/cleat-catalog';
import { handleAdminWriteError } from '../../../../src/lib/api/handleAdminWriteError';
import { requireBeltAdmin } from '../../../../src/lib/auth/require';

interface CleatCatalogPayload {
  id?: string;
  material_family: string;
  cleat_profile: string;
  cleat_size: string;
  cleat_pattern: CleatPattern;
  min_pulley_dia_12in_solid_in: number;
  min_pulley_dia_12in_drill_siped_in?: number | null;
  notes?: string | null;
  source_doc?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

/**
 * GET /api/admin/cleats
 * Fetch all cleat catalog entries (including inactive)
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const { data: catalog, error } = await supabase
      .from('cleat_catalog')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('cleat_profile', { ascending: true })
      .order('cleat_size', { ascending: true })
      .order('cleat_pattern', { ascending: true });

    if (error) {
      console.error('Cleat catalog fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch cleat catalog', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(catalog || []);
  } catch (error) {
    console.error('Admin cleats API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/cleats
 * Create a new cleat catalog entry
 */
export async function POST(request: NextRequest) {
  try {
    // Require belt admin role before any DB operations
    const authResult = await requireBeltAdmin();
    if (authResult.response) {
      return authResult.response;
    }
    const { user } = authResult;

    const supabase = await createClient();
    const body = await request.json() as CleatCatalogPayload;

    // Validate required fields
    if (!body.material_family) {
      return NextResponse.json(
        { error: 'Missing required field: material_family' },
        { status: 400 }
      );
    }

    if (!body.cleat_profile) {
      return NextResponse.json(
        { error: 'Missing required field: cleat_profile' },
        { status: 400 }
      );
    }

    if (!body.cleat_size) {
      return NextResponse.json(
        { error: 'Missing required field: cleat_size' },
        { status: 400 }
      );
    }

    if (!body.cleat_pattern || !CLEAT_PATTERNS.includes(body.cleat_pattern)) {
      return NextResponse.json(
        { error: `Invalid cleat_pattern. Must be one of: ${CLEAT_PATTERNS.join(', ')}` },
        { status: 400 }
      );
    }

    if (body.min_pulley_dia_12in_solid_in === undefined || body.min_pulley_dia_12in_solid_in <= 0) {
      return NextResponse.json(
        { error: 'min_pulley_dia_12in_solid_in is required and must be > 0' },
        { status: 400 }
      );
    }

    // Check for duplicate (composite key)
    const { data: existing } = await supabase
      .from('cleat_catalog')
      .select('id')
      .eq('material_family', body.material_family)
      .eq('cleat_profile', body.cleat_profile)
      .eq('cleat_size', body.cleat_size)
      .eq('cleat_pattern', body.cleat_pattern)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'A cleat entry with this combination (family, profile, size, pattern) already exists' },
        { status: 409 }
      );
    }

    const { data: newItem, error } = await supabase
      .from('cleat_catalog')
      .insert({
        material_family: body.material_family,
        cleat_profile: body.cleat_profile,
        cleat_size: body.cleat_size,
        cleat_pattern: body.cleat_pattern,
        min_pulley_dia_12in_solid_in: body.min_pulley_dia_12in_solid_in,
        min_pulley_dia_12in_drill_siped_in: body.min_pulley_dia_12in_drill_siped_in ?? null,
        notes: body.notes ?? null,
        source_doc: body.source_doc ?? null,
        sort_order: body.sort_order ?? 0,
        is_active: body.is_active !== false,
      })
      .select()
      .single();

    if (error) {
      return handleAdminWriteError(error, {
        route: '/api/admin/cleats',
        action: 'INSERT',
        table: 'cleat_catalog',
        userId: user.userId,
      });
    }

    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error('Admin cleats POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/cleats
 * Update an existing cleat catalog entry
 */
export async function PUT(request: NextRequest) {
  try {
    // Require belt admin role before any DB operations
    const authResult = await requireBeltAdmin();
    if (authResult.response) {
      return authResult.response;
    }
    const { user } = authResult;

    const supabase = await createClient();
    const body = await request.json() as CleatCatalogPayload;

    if (!body.id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    // Find the existing item
    const { data: existing, error: findError } = await supabase
      .from('cleat_catalog')
      .select('*')
      .eq('id', body.id)
      .maybeSingle();

    if (findError) {
      console.error('Cleat catalog find error:', findError);
      return NextResponse.json(
        { error: 'Failed to find cleat entry', details: findError.message },
        { status: 500 }
      );
    }

    if (!existing) {
      return NextResponse.json(
        { error: 'Cleat entry not found' },
        { status: 404 }
      );
    }

    // Validate cleat_pattern if provided
    if (body.cleat_pattern && !CLEAT_PATTERNS.includes(body.cleat_pattern)) {
      return NextResponse.json(
        { error: `Invalid cleat_pattern. Must be one of: ${CLEAT_PATTERNS.join(', ')}` },
        { status: 400 }
      );
    }

    // Update the item (composite key fields are immutable after creation)
    const { data: updatedItem, error: updateError } = await supabase
      .from('cleat_catalog')
      .update({
        // Composite key fields stay immutable
        min_pulley_dia_12in_solid_in: body.min_pulley_dia_12in_solid_in ?? existing.min_pulley_dia_12in_solid_in,
        min_pulley_dia_12in_drill_siped_in: body.min_pulley_dia_12in_drill_siped_in,
        notes: body.notes,
        source_doc: body.source_doc,
        sort_order: body.sort_order ?? existing.sort_order,
        is_active: body.is_active ?? existing.is_active,
      })
      .eq('id', body.id)
      .select()
      .single();

    if (updateError) {
      return handleAdminWriteError(updateError, {
        route: '/api/admin/cleats',
        action: 'UPDATE',
        table: 'cleat_catalog',
        userId: user.userId,
      });
    }

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error('Admin cleats PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
