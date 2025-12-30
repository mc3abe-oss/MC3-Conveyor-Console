/**
 * Public Cleats API (v1.23)
 *
 * GET: Fetch active cleat catalog entries + center factors for calculator UI
 *
 * Returns only is_active=true entries.
 */

import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '../../../src/lib/supabase/client';
import { CleatCatalogItem, CleatCenterFactor } from '../../../src/lib/cleat-catalog';

export interface CleatsApiResponse {
  catalog: CleatCatalogItem[];
  centerFactors: CleatCenterFactor[];
}

/**
 * GET /api/cleats
 * Fetch active cleat catalog entries and center factors for calculator
 */
export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 503 }
      );
    }

    // Fetch active cleat catalog entries
    const { data: catalog, error: catalogError } = await supabase
      .from('cleat_catalog')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('cleat_profile', { ascending: true })
      .order('cleat_size', { ascending: true });

    if (catalogError) {
      console.error('Cleat catalog fetch error:', catalogError);
      return NextResponse.json(
        { error: 'Failed to fetch cleat catalog', details: catalogError.message },
        { status: 500 }
      );
    }

    // Fetch active center factors
    const { data: centerFactors, error: factorsError } = await supabase
      .from('cleat_center_factors')
      .select('*')
      .eq('is_active', true)
      .order('centers_in', { ascending: false }); // 12, 8, 6, 4 order

    if (factorsError) {
      console.error('Cleat center factors fetch error:', factorsError);
      return NextResponse.json(
        { error: 'Failed to fetch center factors', details: factorsError.message },
        { status: 500 }
      );
    }

    const response: CleatsApiResponse = {
      catalog: catalog || [],
      centerFactors: centerFactors || [],
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Cleats API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
