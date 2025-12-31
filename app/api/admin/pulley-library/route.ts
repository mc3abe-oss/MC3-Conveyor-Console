/**
 * API Route: Pulley Library Styles
 *
 * CRUD operations for pulley_library_styles table.
 * This is admin-managed engineering truth for pulley styles.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../src/lib/supabase/server';

// Pulley style type from the database enum
export type PulleyStyleType = 'DRUM' | 'WING' | 'SPIRAL_WING';

export interface PulleyLibraryStyle {
  key: string;
  name: string;
  description: string | null;
  style_type: PulleyStyleType;
  material_class: string;
  eligible_drive: boolean;
  eligible_tail: boolean;
  eligible_dirty_side: boolean;
  eligible_crown: boolean;
  eligible_v_guided: boolean;
  eligible_lagging: boolean;
  face_width_rule: string;
  face_width_allowance_in: number | null;
  face_width_min_in: number | null;
  face_width_max_in: number | null;
  tube_stress_limit_flat_psi: number | null;
  tube_stress_limit_vgroove_psi: number | null;
  notes: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * GET: Fetch all pulley library styles
 * Query params:
 *   - active_only: boolean (default true) - only return is_active=true styles
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active_only') !== 'false';

    let query = supabase
      .from('pulley_library_styles')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching pulley library styles:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data as PulleyLibraryStyle[]);
  } catch (error) {
    console.error('Error in pulley library GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST: Create a new pulley library style
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // Validate required fields
    if (!body.key || typeof body.key !== 'string' || body.key.trim() === '') {
      return NextResponse.json(
        { error: 'Key is required and must be a non-empty string' },
        { status: 400 }
      );
    }
    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      return NextResponse.json(
        { error: 'Name is required and must be a non-empty string' },
        { status: 400 }
      );
    }
    if (!body.style_type || !['DRUM', 'WING', 'SPIRAL_WING'].includes(body.style_type)) {
      return NextResponse.json(
        { error: 'Style type must be DRUM, WING, or SPIRAL_WING' },
        { status: 400 }
      );
    }

    // Normalize key to uppercase with underscores
    const normalizedKey = body.key.trim().toUpperCase().replace(/\s+/g, '_');

    // Check for duplicate key
    const { data: existing } = await supabase
      .from('pulley_library_styles')
      .select('key')
      .eq('key', normalizedKey)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: `Key '${normalizedKey}' already exists` },
        { status: 409 }
      );
    }

    const insertData = {
      key: normalizedKey,
      name: body.name.trim(),
      description: body.description?.trim() || null,
      style_type: body.style_type,
      material_class: body.material_class || 'STEEL',
      eligible_drive: body.eligible_drive ?? true,
      eligible_tail: body.eligible_tail ?? true,
      eligible_dirty_side: body.eligible_dirty_side ?? false,
      eligible_crown: body.eligible_crown ?? true,
      eligible_v_guided: body.eligible_v_guided ?? false,
      eligible_lagging: body.eligible_lagging ?? true,
      face_width_rule: body.face_width_rule || 'BELT_PLUS_ALLOWANCE',
      face_width_allowance_in: body.face_width_allowance_in ?? 2.0,
      face_width_min_in: body.face_width_min_in ?? null,
      face_width_max_in: body.face_width_max_in ?? null,
      tube_stress_limit_flat_psi: body.tube_stress_limit_flat_psi ?? 10000,
      tube_stress_limit_vgroove_psi: body.tube_stress_limit_vgroove_psi ?? 3400,
      notes: body.notes?.trim() || null,
      is_active: body.is_active ?? true,
      sort_order: body.sort_order ?? 0,
    };

    const { data, error } = await supabase
      .from('pulley_library_styles')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating pulley style:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error in pulley library POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT: Update an existing pulley library style
 * Note: Key is immutable after creation
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    if (!body.key) {
      return NextResponse.json(
        { error: 'Key is required for update' },
        { status: 400 }
      );
    }

    // Check style exists
    const { data: existing } = await supabase
      .from('pulley_library_styles')
      .select('key')
      .eq('key', body.key)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: `Style '${body.key}' not found` },
        { status: 404 }
      );
    }

    // Build update object (exclude key - it's immutable)
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.description !== undefined) updateData.description = body.description?.trim() || null;
    if (body.style_type !== undefined) updateData.style_type = body.style_type;
    if (body.material_class !== undefined) updateData.material_class = body.material_class;
    if (body.eligible_drive !== undefined) updateData.eligible_drive = body.eligible_drive;
    if (body.eligible_tail !== undefined) updateData.eligible_tail = body.eligible_tail;
    if (body.eligible_dirty_side !== undefined) updateData.eligible_dirty_side = body.eligible_dirty_side;
    if (body.eligible_crown !== undefined) updateData.eligible_crown = body.eligible_crown;
    if (body.eligible_v_guided !== undefined) updateData.eligible_v_guided = body.eligible_v_guided;
    if (body.eligible_lagging !== undefined) updateData.eligible_lagging = body.eligible_lagging;
    if (body.face_width_rule !== undefined) updateData.face_width_rule = body.face_width_rule;
    if (body.face_width_allowance_in !== undefined) updateData.face_width_allowance_in = body.face_width_allowance_in;
    if (body.face_width_min_in !== undefined) updateData.face_width_min_in = body.face_width_min_in;
    if (body.face_width_max_in !== undefined) updateData.face_width_max_in = body.face_width_max_in;
    if (body.tube_stress_limit_flat_psi !== undefined) updateData.tube_stress_limit_flat_psi = body.tube_stress_limit_flat_psi;
    if (body.tube_stress_limit_vgroove_psi !== undefined) updateData.tube_stress_limit_vgroove_psi = body.tube_stress_limit_vgroove_psi;
    if (body.notes !== undefined) updateData.notes = body.notes?.trim() || null;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;
    if (body.sort_order !== undefined) updateData.sort_order = body.sort_order;

    const { data, error } = await supabase
      .from('pulley_library_styles')
      .update(updateData)
      .eq('key', body.key)
      .select()
      .single();

    if (error) {
      console.error('Error updating pulley style:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in pulley library PUT:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Soft delete (set is_active = false)
 * We never hard delete catalog entries
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json(
        { error: 'Key query parameter is required' },
        { status: 400 }
      );
    }

    // Soft delete
    const { data, error } = await supabase
      .from('pulley_library_styles')
      .update({ is_active: false })
      .eq('key', key)
      .select()
      .single();

    if (error) {
      console.error('Error deactivating pulley style:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json(
        { error: `Style '${key}' not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, deactivated: data });
  } catch (error) {
    console.error('Error in pulley library DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
