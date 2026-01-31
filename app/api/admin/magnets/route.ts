/**
 * Magnet Catalog Admin API
 *
 * CRUD operations for magnet_catalog table.
 *
 * GET: Fetch all magnets (with optional filters)
 *   Query params:
 *   - material_type: 'ceramic' | 'neo'
 *   - cross_section_key: e.g., '1.00x1.38'
 *   - include_inactive: 'true' to include deactivated magnets
 *
 * POST: Create new magnet
 * PUT: Update existing magnet
 * DELETE: Soft delete (set is_active = false)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../src/lib/supabase/server';
import { requireBeltAdmin } from '../../../../src/lib/auth/require';

interface MagnetPayload {
  id?: string;
  part_number: string;
  name: string;
  description?: string | null;
  cross_section_key: string;
  material_type: 'ceramic' | 'neo';
  grade: '5' | '8' | '35' | '50';
  length_in: number;
  width_in: number;
  height_in: number;
  weight_lb: number;
  hold_force_proxy_lb: number;
  efficiency_factor: number;
  is_active?: boolean;
}

/**
 * GET /api/admin/magnets
 * Fetch all magnets with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const materialType = searchParams.get('material_type');
    const crossSectionKey = searchParams.get('cross_section_key');
    const includeInactive = searchParams.get('include_inactive') === 'true';

    let query = supabase
      .from('magnet_catalog')
      .select('*')
      .order('material_type', { ascending: true })
      .order('part_number', { ascending: true });

    // Apply filters
    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    if (materialType) {
      query = query.eq('material_type', materialType);
    }

    if (crossSectionKey) {
      query = query.eq('cross_section_key', crossSectionKey);
    }

    const { data: magnets, error } = await query;

    if (error) {
      console.error('Error fetching magnets:', error);
      return NextResponse.json(
        { error: 'Failed to fetch magnets', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(magnets || []);
  } catch (error) {
    console.error('Error in GET /api/admin/magnets:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/magnets
 * Create a new magnet
 */
export async function POST(request: NextRequest) {
  try {
    // Check authorization
    const authResult = await requireBeltAdmin();
    if (authResult.response) {
      return authResult.response;
    }

    const supabase = await createClient();
    const body: MagnetPayload = await request.json();

    // Validate required fields
    if (!body.part_number?.trim()) {
      return NextResponse.json(
        { error: 'Part number is required' },
        { status: 400 }
      );
    }

    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Check for duplicate part_number
    const { data: existing } = await supabase
      .from('magnet_catalog')
      .select('id')
      .eq('part_number', body.part_number)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: `Magnet with part number "${body.part_number}" already exists` },
        { status: 409 }
      );
    }

    // Insert new magnet
    const { data: newMagnet, error } = await supabase
      .from('magnet_catalog')
      .insert({
        part_number: body.part_number.trim(),
        name: body.name.trim(),
        description: body.description?.trim() || null,
        cross_section_key: body.cross_section_key,
        material_type: body.material_type,
        grade: body.grade,
        length_in: body.length_in,
        width_in: body.width_in,
        height_in: body.height_in,
        weight_lb: body.weight_lb,
        hold_force_proxy_lb: body.hold_force_proxy_lb,
        efficiency_factor: body.efficiency_factor ?? 1.0,
        is_active: body.is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating magnet:', error);
      return NextResponse.json(
        { error: 'Failed to create magnet', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(newMagnet, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/admin/magnets:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/magnets
 * Update an existing magnet
 */
export async function PUT(request: NextRequest) {
  try {
    // Check authorization
    const authResult = await requireBeltAdmin();
    if (authResult.response) {
      return authResult.response;
    }

    const supabase = await createClient();
    const body: MagnetPayload = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: 'Magnet ID is required for updates' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.part_number?.trim()) {
      return NextResponse.json(
        { error: 'Part number is required' },
        { status: 400 }
      );
    }

    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Check for duplicate part_number (excluding current magnet)
    const { data: existing } = await supabase
      .from('magnet_catalog')
      .select('id')
      .eq('part_number', body.part_number)
      .neq('id', body.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: `Another magnet with part number "${body.part_number}" already exists` },
        { status: 409 }
      );
    }

    // Update magnet
    const { data: updatedMagnet, error } = await supabase
      .from('magnet_catalog')
      .update({
        part_number: body.part_number.trim(),
        name: body.name.trim(),
        description: body.description?.trim() || null,
        cross_section_key: body.cross_section_key,
        material_type: body.material_type,
        grade: body.grade,
        length_in: body.length_in,
        width_in: body.width_in,
        height_in: body.height_in,
        weight_lb: body.weight_lb,
        hold_force_proxy_lb: body.hold_force_proxy_lb,
        efficiency_factor: body.efficiency_factor ?? 1.0,
        is_active: body.is_active ?? true,
      })
      .eq('id', body.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating magnet:', error);
      return NextResponse.json(
        { error: 'Failed to update magnet', details: error.message },
        { status: 500 }
      );
    }

    if (!updatedMagnet) {
      return NextResponse.json(
        { error: 'Magnet not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedMagnet);
  } catch (error) {
    console.error('Error in PUT /api/admin/magnets:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/magnets
 * Soft delete (deactivate) a magnet
 */
export async function DELETE(request: NextRequest) {
  try {
    // Check authorization
    const authResult = await requireBeltAdmin();
    if (authResult.response) {
      return authResult.response;
    }

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Magnet ID is required' },
        { status: 400 }
      );
    }

    // Soft delete by setting is_active = false
    const { data: deactivatedMagnet, error } = await supabase
      .from('magnet_catalog')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error deactivating magnet:', error);
      return NextResponse.json(
        { error: 'Failed to deactivate magnet', details: error.message },
        { status: 500 }
      );
    }

    if (!deactivatedMagnet) {
      return NextResponse.json(
        { error: 'Magnet not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Magnet deactivated', magnet: deactivatedMagnet });
  } catch (error) {
    console.error('Error in DELETE /api/admin/magnets:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
