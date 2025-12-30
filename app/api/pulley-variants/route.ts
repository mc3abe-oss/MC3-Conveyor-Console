/**
 * GET /api/pulley-variants
 *
 * Fetch active pulley variants with their family data
 * Query params:
 *   - includeInactive: 'true' to include inactive variants (admin only)
 *   - familyKey: filter by family key
 *
 * POST /api/pulley-variants (Admin only)
 * Create or update a pulley variant
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '../../../src/lib/supabase/client';
import { validatePulleyVariant } from '../../../src/lib/pulley-families';

export type { PulleyVariant, PulleyVariantWithFamily } from '../../../src/lib/pulley-families';

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
    const familyKey = searchParams.get('familyKey');

    // Build the query - fetch variants with joined family data
    let query = supabase
      .from('pulley_variants')
      .select(`
        *,
        family:pulley_families!pulley_family_key (*)
      `)
      .order('pulley_family_key', { ascending: true })
      .order('pulley_variant_key', { ascending: true });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    if (familyKey) {
      query = query.eq('pulley_family_key', familyKey);
    }

    const { data: variants, error } = await query;

    if (error) {
      console.error('Pulley variants fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch pulley variants', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(variants || []);
  } catch (error) {
    console.error('Pulley variants API error:', error);
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
    const { variant } = body;
    // Note: change_reason extracted but not used yet (no audit table for variants)

    if (!variant) {
      return NextResponse.json(
        { error: 'Missing required field: variant' },
        { status: 400 }
      );
    }

    // Validate variant data
    const validation = validatePulleyVariant(variant);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: 'Invalid variant data',
          details: validation.errors.join('; '),
        },
        { status: 400 }
      );
    }

    // Verify family exists
    const { data: family, error: familyError } = await supabase
      .from('pulley_families')
      .select('pulley_family_key')
      .eq('pulley_family_key', variant.pulley_family_key)
      .single();

    if (familyError || !family) {
      return NextResponse.json(
        { error: 'Invalid family key: family not found' },
        { status: 400 }
      );
    }

    // Upsert the variant
    const { data, error } = await supabase
      .from('pulley_variants')
      .upsert(variant, { onConflict: 'pulley_variant_key' })
      .select()
      .single();

    if (error) {
      console.error('Pulley variant upsert error:', error);
      return NextResponse.json(
        { error: 'Failed to save pulley variant', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Pulley variant POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
