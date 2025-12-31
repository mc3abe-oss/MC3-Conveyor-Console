/**
 * API Route: Application Pulleys
 *
 * CRUD operations for per-application-line pulley configurations.
 * Links to calc_recipes via application_line_id = calc_recipes.id
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../src/lib/supabase/server';

// Types from database enums
export type PulleyPosition = 'DRIVE' | 'TAIL';
export type FaceProfile = 'FLAT' | 'CROWNED' | 'V_GUIDED';
export type LaggingType = 'NONE' | 'RUBBER' | 'URETHANE';

export interface ApplicationPulley {
  id: string;
  application_line_id: string;
  position: PulleyPosition;
  style_key: string;
  face_profile: FaceProfile;
  v_guide_key: string | null;
  lagging_type: LaggingType;
  lagging_thickness_in: number | null;
  face_width_in: number | null;
  shell_od_in: number | null;
  shell_wall_in: number | null;
  hub_centers_in: number | null;
  finished_od_in: number | null;
  enforce_pci_checks: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * GET: Fetch pulleys for an application line
 * Query params:
 *   - line_id: UUID (required) - The application line ID (calc_recipes.id)
 *   - position: DRIVE | TAIL (optional) - Filter by position
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const lineId = searchParams.get('line_id');
    const position = searchParams.get('position');

    if (!lineId) {
      return NextResponse.json(
        { error: 'line_id query parameter is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('application_pulleys')
      .select('*')
      .eq('application_line_id', lineId);

    if (position) {
      query = query.eq('position', position);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching application pulleys:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data as ApplicationPulley[]);
  } catch (error) {
    console.error('Error in application pulleys GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST: Create or upsert a pulley configuration
 * Upserts based on (application_line_id, position) unique constraint
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // Validate required fields
    if (!body.application_line_id) {
      return NextResponse.json(
        { error: 'application_line_id is required' },
        { status: 400 }
      );
    }
    if (!body.position || !['DRIVE', 'TAIL'].includes(body.position)) {
      return NextResponse.json(
        { error: 'position must be DRIVE or TAIL' },
        { status: 400 }
      );
    }
    if (!body.style_key) {
      return NextResponse.json(
        { error: 'style_key is required' },
        { status: 400 }
      );
    }

    // Validate style_key exists
    const { data: style, error: styleError } = await supabase
      .from('pulley_library_styles')
      .select('key, eligible_drive, eligible_tail, eligible_crown, eligible_v_guided')
      .eq('key', body.style_key)
      .eq('is_active', true)
      .single();

    if (styleError || !style) {
      return NextResponse.json(
        { error: `Style '${body.style_key}' not found or inactive` },
        { status: 400 }
      );
    }

    // Validate position eligibility
    if (body.position === 'DRIVE' && !style.eligible_drive) {
      return NextResponse.json(
        { error: `Style '${body.style_key}' is not eligible for drive position` },
        { status: 400 }
      );
    }
    if (body.position === 'TAIL' && !style.eligible_tail) {
      return NextResponse.json(
        { error: `Style '${body.style_key}' is not eligible for tail position` },
        { status: 400 }
      );
    }

    // Validate face_profile compatibility
    const faceProfile = body.face_profile || 'FLAT';
    if (faceProfile === 'CROWNED' && !style.eligible_crown) {
      return NextResponse.json(
        { error: `Style '${body.style_key}' does not support crowned profile` },
        { status: 400 }
      );
    }
    if (faceProfile === 'V_GUIDED' && !style.eligible_v_guided) {
      return NextResponse.json(
        { error: `Style '${body.style_key}' does not support V-guided profile` },
        { status: 400 }
      );
    }

    // Validate V-guide key required for V_GUIDED profile
    if (faceProfile === 'V_GUIDED' && !body.v_guide_key) {
      return NextResponse.json(
        { error: 'v_guide_key is required when face_profile is V_GUIDED' },
        { status: 400 }
      );
    }

    // Validate lagging thickness required for non-NONE lagging
    const laggingType = body.lagging_type || 'NONE';
    if (laggingType !== 'NONE' && body.lagging_thickness_in === undefined) {
      return NextResponse.json(
        { error: 'lagging_thickness_in is required when lagging_type is not NONE' },
        { status: 400 }
      );
    }

    const upsertData = {
      application_line_id: body.application_line_id,
      position: body.position,
      style_key: body.style_key,
      face_profile: faceProfile,
      v_guide_key: faceProfile === 'V_GUIDED' ? body.v_guide_key : null,
      lagging_type: laggingType,
      lagging_thickness_in: laggingType !== 'NONE' ? body.lagging_thickness_in : null,
      face_width_in: body.face_width_in ?? null,
      shell_od_in: body.shell_od_in ?? null,
      shell_wall_in: body.shell_wall_in ?? null,
      hub_centers_in: body.hub_centers_in ?? null,
      enforce_pci_checks: body.enforce_pci_checks ?? false,
      notes: body.notes?.trim() || null,
    };

    // Upsert based on (application_line_id, position)
    const { data, error } = await supabase
      .from('application_pulleys')
      .upsert(upsertData, {
        onConflict: 'application_line_id,position',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting application pulley:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error in application pulleys POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Remove a pulley configuration
 * Query params:
 *   - id: UUID (required) - The application pulley ID
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'id query parameter is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('application_pulleys')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting application pulley:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in application pulleys DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
