/**
 * GET /api/product-families
 *
 * Fetches active product families from the database for the Product Picker UI.
 * Returns products sorted by sort_order with their descriptions and model keys.
 */

import { NextResponse } from 'next/server';
import { createClient } from '../../../src/lib/supabase/server';
import { isSupabaseConfigured } from '../../../src/lib/supabase/client';

export interface ProductFamily {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  model_key: string | null;
  is_active: boolean;
  sort_order: number;
}

// Default descriptions for known products (fallback if DB column doesn't exist)
const DEFAULT_DESCRIPTIONS: Record<string, string> = {
  'belt-conveyor': 'Slider bed and roller bed belt conveyor configurations',
  'magnetic-conveyor': 'Magnetic slider bed conveyor configurations',
};

const DEFAULT_MODEL_KEYS: Record<string, string> = {
  'belt-conveyor': 'belt_conveyor_v1',
  'magnetic-conveyor': 'magnetic_conveyor_v1',
};

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 503 }
      );
    }

    const supabase = await createClient();

    // Try to fetch with new columns first
    let { data, error } = await supabase
      .from('product_families')
      .select('id, name, slug, short_description, model_key, is_active, sort_order')
      .order('sort_order', { ascending: true });

    // If the new columns don't exist yet (migration not applied), fall back to basic columns
    if (error && error.code === '42703') {
      const fallbackResult = await supabase
        .from('product_families')
        .select('id, name, slug, is_active, sort_order')
        .order('sort_order', { ascending: true });

      if (fallbackResult.error) {
        console.error('Error fetching product families (fallback):', fallbackResult.error);
        return NextResponse.json(
          { error: 'Failed to fetch product families', details: fallbackResult.error.message },
          { status: 500 }
        );
      }

      // Add default descriptions and model_keys for known products
      data = (fallbackResult.data || []).map((product) => ({
        ...product,
        short_description: DEFAULT_DESCRIPTIONS[product.slug] || null,
        model_key: DEFAULT_MODEL_KEYS[product.slug] || null,
      }));
    } else if (error) {
      console.error('Error fetching product families:', error);
      return NextResponse.json(
        { error: 'Failed to fetch product families', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Product families API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
