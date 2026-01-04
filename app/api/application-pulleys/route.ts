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

import { LaggingPattern, isValidLaggingPattern } from '../../../src/lib/lagging-patterns';

// Re-export for convenience
export type { LaggingPattern } from '../../../src/lib/lagging-patterns';

export type WallValidationStatus = 'NOT_VALIDATED' | 'PASS' | 'RECOMMEND_UPGRADE' | 'FAIL_ENGINEERING_REQUIRED';

// Pulley Balancing types
export type BalanceMethod = 'static' | 'dynamic';
export type BalanceSource = 'internal_guideline' | 'vendor_spec' | 'user_override';

export interface ApplicationPulley {
  id: string;
  application_line_id: string;
  position: PulleyPosition;
  style_key: string;
  model_key: string | null;  // v1.24: FK to pulley_library_models
  face_profile: FaceProfile;
  v_guide_key: string | null;
  lagging_type: LaggingType;
  lagging_thickness_in: number | null;
  lagging_pattern: LaggingPattern | null;
  lagging_pattern_notes: string | null;
  face_width_in: number | null;
  shell_od_in: number | null;
  shell_wall_in: number | null;
  hub_centers_in: number | null;
  finished_od_in: number | null;
  enforce_pci_checks: boolean;
  override_reason: string | null;  // v1.24: for when user deviates from defaults
  wall_validation_status: WallValidationStatus;  // v1.24
  wall_validation_result: Record<string, unknown> | null;  // v1.24: JSONB
  // v1.30: Hub Connection (PCI Pages 12-14)
  hub_connection_type: string | null;
  bushing_system: string | null;
  // Pulley Balancing
  balance_required: boolean;
  balance_method: BalanceMethod | null;
  balance_rpm: number | null;
  balance_grade: string | null;
  balance_source: BalanceSource | null;
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

    // Validate lagging pattern
    const laggingPattern = body.lagging_pattern || 'none';
    if (!isValidLaggingPattern(laggingPattern)) {
      return NextResponse.json(
        { error: `Invalid lagging_pattern. Must be one of: none, smooth, herringbone_clockwise, herringbone_counterclockwise, straight_grooves, diamond, custom` },
        { status: 400 }
      );
    }

    // Lagging pattern must be 'none' when lagging is disabled
    if (laggingType === 'NONE' && laggingPattern !== 'none') {
      return NextResponse.json(
        { error: 'lagging_pattern must be "none" when lagging_type is NONE' },
        { status: 400 }
      );
    }

    // Custom pattern requires notes
    if (laggingPattern === 'custom' && !body.lagging_pattern_notes?.trim()) {
      return NextResponse.json(
        { error: 'lagging_pattern_notes is required when lagging_pattern is "custom"' },
        { status: 400 }
      );
    }

    // Compute finished_od_in from shell_od_in + 2 * lagging_thickness
    const shellOdIn = body.shell_od_in ?? null;
    const laggingThicknessIn = laggingType !== 'NONE' ? (body.lagging_thickness_in ?? 0) : 0;
    const finishedOdIn = shellOdIn != null ? shellOdIn + 2 * laggingThicknessIn : null;

    const upsertData = {
      application_line_id: body.application_line_id,
      position: body.position,
      style_key: body.style_key,
      model_key: body.model_key ?? null,  // v1.24: Persist model_key for hydration
      face_profile: faceProfile,
      v_guide_key: faceProfile === 'V_GUIDED' ? body.v_guide_key : null,
      lagging_type: laggingType,
      lagging_thickness_in: laggingType !== 'NONE' ? body.lagging_thickness_in : null,
      lagging_pattern: laggingPattern,
      lagging_pattern_notes: laggingPattern === 'custom' || body.lagging_pattern_notes?.trim()
        ? body.lagging_pattern_notes?.trim() || null
        : null,
      face_width_in: body.face_width_in ?? null,
      shell_od_in: shellOdIn,
      shell_wall_in: body.shell_wall_in ?? null,
      hub_centers_in: body.hub_centers_in ?? null,
      finished_od_in: finishedOdIn,  // v1.24: Computed finished OD
      enforce_pci_checks: body.enforce_pci_checks ?? false,
      wall_validation_status: body.wall_validation_status ?? 'NOT_VALIDATED',  // v1.24
      wall_validation_result: body.wall_validation_result ?? null,  // v1.24
      // v1.30: Hub Connection (PCI Pages 12-14)
      hub_connection_type: body.hub_connection_type ?? null,
      bushing_system: body.bushing_system ?? null,
      // Pulley Balancing
      balance_required: body.balance_required ?? false,
      balance_method: body.balance_required ? (body.balance_method ?? 'dynamic') : null,
      balance_rpm: body.balance_rpm ?? null,
      balance_grade: body.balance_grade?.trim() || null,
      balance_source: body.balance_source ?? 'internal_guideline',
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
