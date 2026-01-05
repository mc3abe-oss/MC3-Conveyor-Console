/**
 * Admin Cleat Center Factors API (v1.23)
 *
 * GET: Fetch all center factors (including inactive)
 * POST: Create a new center factor
 * PUT: Update an existing center factor
 *
 * Note: DELETE is intentionally not implemented - use is_active toggle (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../src/lib/supabase/server';
import { handleAdminWriteError } from '../../../../../src/lib/api/handleAdminWriteError';
import { requireBeltAdmin } from '../../../../../src/lib/auth/require';

interface CleatCenterFactorPayload {
  id?: string;
  material_family: string;
  centers_in: number;
  factor: number;
  notes?: string | null;
  is_active?: boolean;
}

const VALID_CENTERS = [4, 6, 8, 12];

/**
 * GET /api/admin/cleats/factors
 * Fetch all center factors (including inactive)
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const { data: factors, error } = await supabase
      .from('cleat_center_factors')
      .select('*')
      .order('material_family', { ascending: true })
      .order('centers_in', { ascending: false }); // 12, 8, 6, 4

    if (error) {
      console.error('Center factors fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch center factors', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(factors || []);
  } catch (error) {
    console.error('Admin center factors API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/cleats/factors
 * Create a new center factor
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
    const body = await request.json() as CleatCenterFactorPayload;

    // Validate required fields
    if (!body.material_family) {
      return NextResponse.json(
        { error: 'Missing required field: material_family' },
        { status: 400 }
      );
    }

    if (!body.centers_in || !VALID_CENTERS.includes(body.centers_in)) {
      return NextResponse.json(
        { error: `centers_in must be one of: ${VALID_CENTERS.join(', ')}` },
        { status: 400 }
      );
    }

    if (body.factor === undefined || body.factor <= 0) {
      return NextResponse.json(
        { error: 'factor is required and must be > 0' },
        { status: 400 }
      );
    }

    // Check for duplicate (composite key)
    const { data: existing } = await supabase
      .from('cleat_center_factors')
      .select('id')
      .eq('material_family', body.material_family)
      .eq('centers_in', body.centers_in)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'A center factor with this combination (family, centers) already exists' },
        { status: 409 }
      );
    }

    const { data: newItem, error } = await supabase
      .from('cleat_center_factors')
      .insert({
        material_family: body.material_family,
        centers_in: body.centers_in,
        factor: body.factor,
        notes: body.notes ?? null,
        is_active: body.is_active !== false,
      })
      .select()
      .single();

    if (error) {
      return handleAdminWriteError(error, {
        route: '/api/admin/cleats/factors',
        action: 'INSERT',
        table: 'cleat_center_factors',
        userId: user.userId,
      });
    }

    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error('Admin center factors POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/cleats/factors
 * Update an existing center factor
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
    const body = await request.json() as CleatCenterFactorPayload;

    if (!body.id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    // Find the existing item
    const { data: existing, error: findError } = await supabase
      .from('cleat_center_factors')
      .select('*')
      .eq('id', body.id)
      .maybeSingle();

    if (findError) {
      console.error('Center factor find error:', findError);
      return NextResponse.json(
        { error: 'Failed to find center factor', details: findError.message },
        { status: 500 }
      );
    }

    if (!existing) {
      return NextResponse.json(
        { error: 'Center factor not found' },
        { status: 404 }
      );
    }

    // Update the item (composite key fields are immutable)
    const { data: updatedItem, error: updateError } = await supabase
      .from('cleat_center_factors')
      .update({
        factor: body.factor ?? existing.factor,
        notes: body.notes,
        is_active: body.is_active ?? existing.is_active,
      })
      .eq('id', body.id)
      .select()
      .single();

    if (updateError) {
      return handleAdminWriteError(updateError, {
        route: '/api/admin/cleats/factors',
        action: 'UPDATE',
        table: 'cleat_center_factors',
        userId: user.userId,
      });
    }

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error('Admin center factors PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
