/**
 * API Route: Pulley Library Models
 *
 * CRUD operations for pulley_library_models table.
 * These are the concrete, selectable pulley options with size/limit constraints.
 *
 * Level 1: pulley_library_styles - conceptual (DRUM, WING, SPIRAL_WING)
 * Level 2: pulley_library_models - concrete (PCI_DRUM_4IN, PCI_DRUM_6IN, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../src/lib/supabase/server';
import { handleAdminWriteError } from '../../../../src/lib/api/handleAdminWriteError';
import { requireBeltAdmin } from '../../../../src/lib/auth/require';

export interface PulleyLibraryModel {
  model_key: string;
  display_name: string;
  description: string | null;
  style_key: string;
  shell_od_in: number;
  default_shell_wall_in: number;
  allowed_wall_steps_in: number[];
  face_width_min_in: number;
  face_width_max_in: number;
  face_width_allowance_in: number;
  eligible_drive: boolean;
  eligible_tail: boolean;
  eligible_dirty_side: boolean;
  eligible_crown: boolean;
  eligible_v_guided: boolean;
  eligible_lagging: boolean;
  tube_stress_limit_flat_psi: number | null;
  tube_stress_limit_vgroove_psi: number | null;
  notes: string | null;
  source_doc: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // Joined style info (optional, from query)
  style?: {
    name: string;
    style_type: string;
  };
}

/**
 * GET: Fetch all pulley library models
 * Query params:
 *   - active_only: boolean (default true)
 *   - position: 'DRIVE' | 'TAIL' - filter by position eligibility
 *   - include_style: boolean - include joined style info
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active_only') !== 'false';
    const position = searchParams.get('position');

    let query = supabase.from('pulley_library_models').select('*');

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    // Filter by position eligibility
    if (position === 'DRIVE') {
      query = query.eq('eligible_drive', true);
    } else if (position === 'TAIL') {
      query = query.eq('eligible_tail', true);
    }

    query = query
      .order('sort_order', { ascending: true })
      .order('display_name', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching pulley models:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data as PulleyLibraryModel[]);
  } catch (error) {
    console.error('Error in pulley models GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST: Create a new pulley library model
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
    const body = await request.json();

    // Validate required fields
    if (!body.model_key || typeof body.model_key !== 'string' || body.model_key.trim() === '') {
      return NextResponse.json(
        { error: 'model_key is required and must be a non-empty string' },
        { status: 400 }
      );
    }
    if (!body.display_name || typeof body.display_name !== 'string') {
      return NextResponse.json(
        { error: 'display_name is required' },
        { status: 400 }
      );
    }
    if (!body.style_key) {
      return NextResponse.json(
        { error: 'style_key is required (must reference an existing style)' },
        { status: 400 }
      );
    }
    if (typeof body.shell_od_in !== 'number' || body.shell_od_in <= 0) {
      return NextResponse.json(
        { error: 'shell_od_in is required and must be positive' },
        { status: 400 }
      );
    }
    if (typeof body.default_shell_wall_in !== 'number' || body.default_shell_wall_in <= 0) {
      return NextResponse.json(
        { error: 'default_shell_wall_in is required and must be positive' },
        { status: 400 }
      );
    }
    if (typeof body.face_width_min_in !== 'number' || body.face_width_min_in < 0) {
      return NextResponse.json(
        { error: 'face_width_min_in is required' },
        { status: 400 }
      );
    }
    if (typeof body.face_width_max_in !== 'number' || body.face_width_max_in < body.face_width_min_in) {
      return NextResponse.json(
        { error: 'face_width_max_in is required and must be >= face_width_min_in' },
        { status: 400 }
      );
    }

    // Normalize key
    const normalizedKey = body.model_key.trim().toUpperCase().replace(/\s+/g, '_');

    // Check for duplicate
    const { data: existing } = await supabase
      .from('pulley_library_models')
      .select('model_key')
      .eq('model_key', normalizedKey)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: `Model key '${normalizedKey}' already exists` },
        { status: 409 }
      );
    }

    // Verify style_key exists
    const { data: styleExists } = await supabase
      .from('pulley_library_styles')
      .select('key')
      .eq('key', body.style_key)
      .single();

    if (!styleExists) {
      return NextResponse.json(
        { error: `Style '${body.style_key}' not found` },
        { status: 400 }
      );
    }

    const insertData = {
      model_key: normalizedKey,
      display_name: body.display_name.trim(),
      description: body.description?.trim() || null,
      style_key: body.style_key,
      shell_od_in: body.shell_od_in,
      default_shell_wall_in: body.default_shell_wall_in,
      allowed_wall_steps_in: body.allowed_wall_steps_in || [0.134, 0.188, 0.250],
      face_width_min_in: body.face_width_min_in,
      face_width_max_in: body.face_width_max_in,
      face_width_allowance_in: body.face_width_allowance_in ?? 2.0,
      eligible_drive: body.eligible_drive ?? true,
      eligible_tail: body.eligible_tail ?? true,
      eligible_dirty_side: body.eligible_dirty_side ?? false,
      eligible_crown: body.eligible_crown ?? true,
      eligible_v_guided: body.eligible_v_guided ?? false,
      eligible_lagging: body.eligible_lagging ?? true,
      tube_stress_limit_flat_psi: body.tube_stress_limit_flat_psi ?? null,
      tube_stress_limit_vgroove_psi: body.tube_stress_limit_vgroove_psi ?? null,
      notes: body.notes?.trim() || null,
      source_doc: body.source_doc?.trim() || null,
      is_active: body.is_active ?? true,
      sort_order: body.sort_order ?? 0,
    };

    const { data, error } = await supabase
      .from('pulley_library_models')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      return handleAdminWriteError(error, {
        route: '/api/admin/pulley-models',
        action: 'INSERT',
        table: 'pulley_library_models',
        userId: user.userId,
      });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error in pulley models POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT: Update an existing pulley library model
 * Note: model_key and style_key are immutable after creation
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
    const body = await request.json();

    if (!body.model_key) {
      return NextResponse.json(
        { error: 'model_key is required for update' },
        { status: 400 }
      );
    }

    // Check model exists
    const { data: existing } = await supabase
      .from('pulley_library_models')
      .select('model_key, style_key')
      .eq('model_key', body.model_key)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: `Model '${body.model_key}' not found` },
        { status: 404 }
      );
    }

    // Prevent style_key change (identity is immutable)
    if (body.style_key !== undefined && body.style_key !== existing.style_key) {
      return NextResponse.json(
        { error: 'style_key is immutable. Create a new model instead.' },
        { status: 400 }
      );
    }

    // Build update object (exclude model_key and style_key)
    const updateData: Record<string, unknown> = {};

    if (body.display_name !== undefined) updateData.display_name = body.display_name.trim();
    if (body.description !== undefined) updateData.description = body.description?.trim() || null;
    if (body.shell_od_in !== undefined) updateData.shell_od_in = body.shell_od_in;
    if (body.default_shell_wall_in !== undefined) updateData.default_shell_wall_in = body.default_shell_wall_in;
    if (body.allowed_wall_steps_in !== undefined) updateData.allowed_wall_steps_in = body.allowed_wall_steps_in;
    if (body.face_width_min_in !== undefined) updateData.face_width_min_in = body.face_width_min_in;
    if (body.face_width_max_in !== undefined) updateData.face_width_max_in = body.face_width_max_in;
    if (body.face_width_allowance_in !== undefined) updateData.face_width_allowance_in = body.face_width_allowance_in;
    if (body.eligible_drive !== undefined) updateData.eligible_drive = body.eligible_drive;
    if (body.eligible_tail !== undefined) updateData.eligible_tail = body.eligible_tail;
    if (body.eligible_dirty_side !== undefined) updateData.eligible_dirty_side = body.eligible_dirty_side;
    if (body.eligible_crown !== undefined) updateData.eligible_crown = body.eligible_crown;
    if (body.eligible_v_guided !== undefined) updateData.eligible_v_guided = body.eligible_v_guided;
    if (body.eligible_lagging !== undefined) updateData.eligible_lagging = body.eligible_lagging;
    if (body.tube_stress_limit_flat_psi !== undefined) updateData.tube_stress_limit_flat_psi = body.tube_stress_limit_flat_psi;
    if (body.tube_stress_limit_vgroove_psi !== undefined) updateData.tube_stress_limit_vgroove_psi = body.tube_stress_limit_vgroove_psi;
    if (body.notes !== undefined) updateData.notes = body.notes?.trim() || null;
    if (body.source_doc !== undefined) updateData.source_doc = body.source_doc?.trim() || null;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;
    if (body.sort_order !== undefined) updateData.sort_order = body.sort_order;

    const { data, error } = await supabase
      .from('pulley_library_models')
      .update(updateData)
      .eq('model_key', body.model_key)
      .select()
      .single();

    if (error) {
      return handleAdminWriteError(error, {
        route: '/api/admin/pulley-models',
        action: 'UPDATE',
        table: 'pulley_library_models',
        userId: user.userId,
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in pulley models PUT:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Soft delete (set is_active = false)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Require belt admin role before any DB operations
    const authResult = await requireBeltAdmin();
    if (authResult.response) {
      return authResult.response;
    }
    const { user } = authResult;

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const modelKey = searchParams.get('model_key');

    if (!modelKey) {
      return NextResponse.json(
        { error: 'model_key query parameter is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('pulley_library_models')
      .update({ is_active: false })
      .eq('model_key', modelKey)
      .select()
      .single();

    if (error) {
      return handleAdminWriteError(error, {
        route: '/api/admin/pulley-models',
        action: 'DELETE',
        table: 'pulley_library_models',
        userId: user.userId,
      });
    }

    if (!data) {
      return NextResponse.json(
        { error: `Model '${modelKey}' not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, deactivated: data });
  } catch (error) {
    console.error('Error in pulley models DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
