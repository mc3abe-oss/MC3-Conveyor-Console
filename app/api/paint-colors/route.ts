/**
 * GET /api/paint-colors
 *
 * Fetch powder color options for a given category (conveyor or guarding)
 * Query params:
 *   - category: 'conveyor' | 'guarding' (required)
 *
 * Returns: [{ id, code, name, description, is_stock, is_default, sort_order }]
 * Sorted: stock items first, then non-stock, then by sort_order, then name
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../src/lib/supabase/client';

export interface PowderColorOption {
  id: string;
  code: string;
  name: string;
  description: string;
  is_stock: boolean;
  is_default: boolean;
  sort_order: number;
}

export async function GET(request: NextRequest) {
  try {
    // Check if admin client is available
    if (!supabaseAdmin) {
      return NextResponse.json(
        {
          error: 'Server configuration error',
          message: 'Service role key not configured'
        },
        { status: 503 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');

    // Validate required parameter
    if (!category) {
      return NextResponse.json(
        { error: 'Missing required query parameter: category' },
        { status: 400 }
      );
    }

    // Validate category value
    if (!['conveyor', 'guarding'].includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category. Must be "conveyor" or "guarding"' },
        { status: 400 }
      );
    }

    // Determine the default field based on category
    const defaultField = category === 'conveyor' ? 'is_default_conveyor' : 'is_default_guarding';

    // Query powder_colors table
    // Scope must be 'both' or match the category
    const { data: items, error } = await supabaseAdmin
      .from('powder_colors')
      .select(`id, code, name, description, is_stock, ${defaultField}, sort_order`)
      .or(`scope.eq.both,scope.eq.${category}`)
      .eq('is_active', true)
      .order('is_stock', { ascending: false }) // Stock first
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Powder colors fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch powder color options', details: error.message },
        { status: 500 }
      );
    }

    // Transform the response to use generic 'is_default' field
    const transformed: PowderColorOption[] = (items || []).map((item) => ({
      id: item.id,
      code: item.code,
      name: item.name,
      description: item.description,
      is_stock: item.is_stock,
      is_default: item[defaultField as keyof typeof item] as boolean,
      sort_order: item.sort_order,
    }));

    // Return array of powder color options
    return NextResponse.json(transformed);
  } catch (error) {
    console.error('Powder colors API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
