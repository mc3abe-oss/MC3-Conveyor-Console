/**
 * GET /api/belts
 *
 * Fetch belt catalog items.
 * By default, returns only active belts.
 * Use ?includeInactive=true to include inactive belts (for admin pages).
 *
 * Returns: [{ catalog_key, display_name, piw, pil, min_pulley_dia_no_vguide_in, min_pulley_dia_with_vguide_in, ... }]
 *
 * POST /api/belts (Admin only)
 * Create or update a belt catalog item
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin, isSupabaseConfigured, isAdminConfigured } from '../../../src/lib/supabase/client';
import { validateMaterialProfile } from '../../../src/lib/belt-catalog';

// Re-export types for backward compatibility
export type { BeltCatalogItem, BeltMaterialProfile } from '../../../src/lib/belt-catalog';

export async function GET(request: NextRequest) {
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        {
          error: 'Supabase not configured',
          message: 'Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local',
        },
        { status: 503 }
      );
    }

    // Check for includeInactive query param (for admin pages)
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    // Query belt_catalog table
    let query = supabase
      .from('belt_catalog')
      .select('*')
      .order('display_name', { ascending: true });

    // Only filter by is_active if not including inactive
    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data: belts, error } = await query;

    if (error) {
      console.error('Belt catalog fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch belt catalog', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(belts || []);
  } catch (error) {
    console.error('Belt catalog API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { belt, change_reason } = body;

    if (!belt || !change_reason) {
      return NextResponse.json(
        { error: 'Missing required fields: belt, change_reason' },
        { status: 400 }
      );
    }

    // Validate material_profile if provided (v1.11)
    if (belt.material_profile !== undefined && belt.material_profile !== null) {
      const validation = validateMaterialProfile(belt.material_profile);
      if (!validation.isValid) {
        return NextResponse.json(
          {
            error: 'Invalid material_profile',
            details: validation.errors.join('; '),
          },
          { status: 400 }
        );
      }
      // Ensure version is set
      if (belt.material_profile_version === undefined) {
        belt.material_profile_version = 1;
      }
    }

    // Use admin client (bypasses RLS) for belt catalog management
    // Set session variables for audit
    await supabaseAdmin.rpc('set_config', {
      setting: 'app.change_reason',
      value: change_reason,
    });

    // Upsert the belt using admin client
    const { data, error } = await supabaseAdmin
      .from('belt_catalog')
      .upsert(belt, { onConflict: 'catalog_key' })
      .select()
      .single();

    if (error) {
      console.error('Belt catalog upsert error:', error);
      return NextResponse.json(
        { error: 'Failed to save belt', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Belt catalog POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
