/**
 * GET /api/catalog
 *
 * Fetch catalog items for a given catalog_key
 * Query params: key (required)
 *
 * Returns: [{ item_key, label }]
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '../../../src/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        {
          error: 'Supabase not configured',
          message: 'Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
        },
        { status: 503 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const catalog_key = searchParams.get('key');

    // Validate required parameter
    if (!catalog_key) {
      return NextResponse.json(
        { error: 'Missing required query parameter: key' },
        { status: 400 }
      );
    }

    // Query catalog_items table
    const { data: items, error } = await supabase
      .from('catalog_items')
      .select('item_key, label')
      .eq('catalog_key', catalog_key)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('label', { ascending: true });

    if (error) {
      console.error('Catalog fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch catalog items', details: error.message },
        { status: 500 }
      );
    }

    // Return array of { item_key, label }
    return NextResponse.json(items || []);
  } catch (error) {
    console.error('Catalog API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
