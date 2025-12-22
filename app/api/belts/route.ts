/**
 * GET /api/belts
 *
 * Fetch active belt catalog items
 * Returns: [{ catalog_key, display_name, piw, pil, min_pulley_dia_no_vguide_in, min_pulley_dia_with_vguide_in, ... }]
 *
 * POST /api/belts (Admin only - for future use)
 * Create or update a belt catalog item
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '../../../src/lib/supabase/client';

export interface BeltCatalogItem {
  id: string;
  catalog_key: string;
  display_name: string;
  manufacturer: string | null;
  material: string;
  surface: string | null;
  food_grade: boolean;
  cut_resistant: boolean;
  oil_resistant: boolean;
  abrasion_resistant: boolean;
  antistatic: boolean;
  thickness_in: number | null;
  piw: number;
  pil: number;
  min_pulley_dia_no_vguide_in: number;
  min_pulley_dia_with_vguide_in: number;
  notes: string | null;
  tags: string[] | null;
  is_active: boolean;
}

export async function GET() {
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

    // Query belt_catalog table
    const { data: belts, error } = await supabase
      .from('belt_catalog')
      .select(
        `
        id,
        catalog_key,
        display_name,
        manufacturer,
        material,
        surface,
        food_grade,
        cut_resistant,
        oil_resistant,
        abrasion_resistant,
        antistatic,
        thickness_in,
        piw,
        pil,
        min_pulley_dia_no_vguide_in,
        min_pulley_dia_with_vguide_in,
        notes,
        tags,
        is_active
      `
      )
      .eq('is_active', true)
      .order('display_name', { ascending: true });

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

    const body = await request.json();
    const { belt, change_reason } = body;

    if (!belt || !change_reason) {
      return NextResponse.json(
        { error: 'Missing required fields: belt, change_reason' },
        { status: 400 }
      );
    }

    // Set session variables for audit
    await supabase.rpc('set_config', {
      setting: 'app.change_reason',
      value: change_reason,
    });

    // Upsert the belt
    const { data, error } = await supabase
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
