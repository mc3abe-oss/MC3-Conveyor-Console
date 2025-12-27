/**
 * GET /api/pulleys
 *
 * Fetch active pulley catalog items
 * Returns: PulleyCatalogItem[]
 *
 * POST /api/pulleys (Admin only)
 * Create or update a pulley catalog item with audit trail
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '../../../src/lib/supabase/client';
import { validatePulleyCatalogItem } from '../../../src/lib/pulley-catalog';

// Re-export types
export type { PulleyCatalogItem } from '../../../src/lib/pulley-catalog';

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

    // Query pulley_catalog table
    const { data: pulleys, error } = await supabase
      .from('pulley_catalog')
      .select('*')
      .eq('is_active', true)
      .order('display_name', { ascending: true });

    if (error) {
      console.error('Pulley catalog fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch pulley catalog', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(pulleys || []);
  } catch (error) {
    console.error('Pulley catalog API error:', error);
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
    const { pulley, change_reason } = body;

    if (!pulley || !change_reason) {
      return NextResponse.json(
        { error: 'Missing required fields: pulley, change_reason' },
        { status: 400 }
      );
    }

    // Validate pulley data
    const validation = validatePulleyCatalogItem(pulley);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: 'Invalid pulley data',
          details: validation.errors.join('; '),
        },
        { status: 400 }
      );
    }

    // Set session variables for audit
    await supabase.rpc('set_config', {
      setting: 'app.change_reason',
      value: change_reason,
    });

    // Upsert the pulley
    const { data, error } = await supabase
      .from('pulley_catalog')
      .upsert(pulley, { onConflict: 'catalog_key' })
      .select()
      .single();

    if (error) {
      console.error('Pulley catalog upsert error:', error);
      return NextResponse.json(
        { error: 'Failed to save pulley', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Pulley catalog POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
