/**
 * GET /api/pulley-families
 *
 * Fetch active pulley families
 * Query params:
 *   - includeInactive: 'true' to include inactive families (admin only)
 *
 * POST /api/pulley-families (Admin only)
 * Create or update a pulley family
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '../../../src/lib/supabase/client';
import { validatePulleyFamily } from '../../../src/lib/pulley-families';

export type { PulleyFamily } from '../../../src/lib/pulley-families';

export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    let query = supabase
      .from('pulley_families')
      .select('*')
      .order('manufacturer', { ascending: true })
      .order('shell_od_in', { ascending: true });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data: families, error } = await query;

    if (error) {
      console.error('Pulley families fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch pulley families', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(families || []);
  } catch (error) {
    console.error('Pulley families API error:', error);
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
    const { family } = body;
    // Note: change_reason extracted but not used yet (no audit table for families)

    if (!family) {
      return NextResponse.json(
        { error: 'Missing required field: family' },
        { status: 400 }
      );
    }

    // Validate family data
    const validation = validatePulleyFamily(family);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: 'Invalid family data',
          details: validation.errors.join('; '),
        },
        { status: 400 }
      );
    }

    // Upsert the family
    const { data, error } = await supabase
      .from('pulley_families')
      .upsert(family, { onConflict: 'pulley_family_key' })
      .select()
      .single();

    if (error) {
      console.error('Pulley family upsert error:', error);
      return NextResponse.json(
        { error: 'Failed to save pulley family', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Pulley family POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
