/**
 * Admin V-Guides API (v1.26)
 *
 * GET: Fetch all v-guides (including inactive)
 * POST: Create a new v-guide
 * PUT: Update an existing v-guide
 *
 * Schema (v1.26):
 * - key: K-code (K10, K13, etc.) - canonical identifier
 * - na_letter: Optional NA letter alias (O, A, B, C)
 * - label: Display label, computed as "K10 (O)" or "K10"
 * - PVC min pulley: min_pulley_dia_solid_in, min_pulley_dia_notched_in (required)
 * - PU min pulley: min_pulley_dia_solid_pu_in, min_pulley_dia_notched_pu_in (optional)
 *
 * Note: DELETE is intentionally not implemented to preserve data integrity
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../src/lib/supabase/server';
import { handleAdminWriteError } from '../../../../src/lib/api/handleAdminWriteError';
import { requireBeltAdmin } from '../../../../src/lib/auth/require';

interface VGuidePayload {
  key: string;                          // K-code (K10, K13, etc.)
  na_letter?: string | null;            // Optional NA letter (O, A, B, C)
  // PVC min pulley values (required)
  min_pulley_dia_solid_in: number;
  min_pulley_dia_notched_in: number;
  // PU min pulley values (optional, v1.26)
  min_pulley_dia_solid_pu_in?: number | null;
  min_pulley_dia_notched_pu_in?: number | null;
  notes?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

/**
 * Build display label from key and na_letter
 * Format: "K10 (O)" if na_letter exists, else "K10"
 */
function buildLabel(key: string, naLetter?: string | null): string {
  if (naLetter) {
    return `${key} (${naLetter})`;
  }
  return key;
}

/**
 * GET /api/admin/v-guides
 * Fetch all v-guides (including inactive)
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const { data: items, error } = await supabase
      .from('v_guides')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('key', { ascending: true });

    if (error) {
      console.error('V-guides fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch v-guides', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(items || []);
  } catch (error) {
    console.error('Admin v-guides API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/v-guides
 * Create a new v-guide
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
    const body = await request.json() as VGuidePayload;

    // Validate required fields
    if (!body.key) {
      return NextResponse.json(
        { error: 'Missing required field: key (K-code)' },
        { status: 400 }
      );
    }

    // Validate key format (K followed by digits)
    if (!/^K\d+/.test(body.key)) {
      return NextResponse.json(
        { error: 'Key must be a K-code (e.g., K10, K13, K17)' },
        { status: 400 }
      );
    }

    // Validate na_letter if provided (single letter)
    if (body.na_letter && !/^[A-Z]$/.test(body.na_letter)) {
      return NextResponse.json(
        { error: 'NA Letter must be a single uppercase letter (e.g., O, A, B, C)' },
        { status: 400 }
      );
    }

    if (body.min_pulley_dia_solid_in === undefined || body.min_pulley_dia_solid_in <= 0) {
      return NextResponse.json(
        { error: 'min_pulley_dia_solid_in is required and must be > 0' },
        { status: 400 }
      );
    }

    if (body.min_pulley_dia_notched_in === undefined || body.min_pulley_dia_notched_in <= 0) {
      return NextResponse.json(
        { error: 'min_pulley_dia_notched_in is required and must be > 0' },
        { status: 400 }
      );
    }

    // Check if key already exists
    const { data: existing } = await supabase
      .from('v_guides')
      .select('id')
      .eq('key', body.key)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'A v-guide with this K-code already exists' },
        { status: 409 }
      );
    }

    // Build label
    const label = buildLabel(body.key, body.na_letter);

    const { data: newItem, error } = await supabase
      .from('v_guides')
      .insert({
        key: body.key,
        na_letter: body.na_letter || null,
        label,
        min_pulley_dia_solid_in: body.min_pulley_dia_solid_in,
        min_pulley_dia_notched_in: body.min_pulley_dia_notched_in,
        min_pulley_dia_solid_pu_in: body.min_pulley_dia_solid_pu_in ?? null,
        min_pulley_dia_notched_pu_in: body.min_pulley_dia_notched_pu_in ?? null,
        notes: body.notes || null,
        sort_order: body.sort_order ?? 0,
        is_active: body.is_active !== false,
      })
      .select()
      .single();

    if (error) {
      return handleAdminWriteError(error, {
        route: '/api/admin/v-guides',
        action: 'INSERT',
        table: 'v_guides',
        userId: user.userId,
      });
    }

    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error('Admin v-guides POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/v-guides
 * Update an existing v-guide
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
    const body = await request.json() as VGuidePayload;

    if (!body.key) {
      return NextResponse.json(
        { error: 'Missing required field: key' },
        { status: 400 }
      );
    }

    // Find the existing item
    const { data: existing, error: findError } = await supabase
      .from('v_guides')
      .select('id')
      .eq('key', body.key)
      .maybeSingle();

    if (findError) {
      console.error('V-guide find error:', findError);
      return NextResponse.json(
        { error: 'Failed to find v-guide', details: findError.message },
        { status: 500 }
      );
    }

    if (!existing) {
      return NextResponse.json(
        { error: 'V-guide not found' },
        { status: 404 }
      );
    }

    // Validate na_letter if provided
    if (body.na_letter && !/^[A-Z]$/.test(body.na_letter)) {
      return NextResponse.json(
        { error: 'NA Letter must be a single uppercase letter' },
        { status: 400 }
      );
    }

    // Build label
    const label = buildLabel(body.key, body.na_letter);

    // Update the item (key is immutable after creation)
    const { data: updatedItem, error: updateError } = await supabase
      .from('v_guides')
      .update({
        na_letter: body.na_letter ?? null,
        label,
        min_pulley_dia_solid_in: body.min_pulley_dia_solid_in,
        min_pulley_dia_notched_in: body.min_pulley_dia_notched_in,
        min_pulley_dia_solid_pu_in: body.min_pulley_dia_solid_pu_in ?? null,
        min_pulley_dia_notched_pu_in: body.min_pulley_dia_notched_pu_in ?? null,
        notes: body.notes,
        sort_order: body.sort_order,
        is_active: body.is_active,
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (updateError) {
      return handleAdminWriteError(updateError, {
        route: '/api/admin/v-guides',
        action: 'UPDATE',
        table: 'v_guides',
        userId: user.userId,
      });
    }

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error('Admin v-guides PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
