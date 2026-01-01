/**
 * Admin Catalog Items API
 *
 * GET: Fetch all catalog items for a given catalog_key (including inactive)
 * POST: Create a new catalog item
 * PUT: Update an existing catalog item
 *
 * Note: DELETE is intentionally not implemented to preserve data integrity
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, getCurrentUserId } from '../../../../src/lib/supabase/server';

interface CatalogItemPayload {
  catalog_key: string;
  item_key: string;
  label: string;
  sort_order?: number | null;
  is_active?: boolean;
}

/**
 * GET /api/admin/catalog-items?catalog_key=xxx
 * Fetch all items for a catalog (including inactive)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const searchParams = request.nextUrl.searchParams;
    const catalog_key = searchParams.get('catalog_key');

    if (!catalog_key) {
      return NextResponse.json(
        { error: 'Missing required query parameter: catalog_key' },
        { status: 400 }
      );
    }

    // Fetch all items (including inactive) for admin view
    const { data: items, error } = await supabase
      .from('catalog_items')
      .select('*')
      .eq('catalog_key', catalog_key)
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('label', { ascending: true });

    if (error) {
      console.error('Catalog items fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch catalog items', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(items || []);
  } catch (error) {
    console.error('Admin catalog items API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/catalog-items
 * Create a new catalog item
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json() as CatalogItemPayload;

    if (!body.catalog_key || !body.item_key || !body.label) {
      return NextResponse.json(
        { error: 'Missing required fields: catalog_key, item_key, label' },
        { status: 400 }
      );
    }

    // Check if item_key already exists for this catalog
    const { data: existing } = await supabase
      .from('catalog_items')
      .select('id')
      .eq('catalog_key', body.catalog_key)
      .eq('item_key', body.item_key)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'An item with this key already exists' },
        { status: 409 }
      );
    }

    const { data: newItem, error } = await supabase
      .from('catalog_items')
      .insert({
        catalog_key: body.catalog_key,
        item_key: body.item_key,
        label: body.label,
        sort_order: body.sort_order || null,
        is_active: body.is_active !== false,
      })
      .select()
      .single();

    if (error) {
      console.error('Catalog item insert error:', error);
      return NextResponse.json(
        { error: 'Failed to create catalog item', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error('Admin catalog items POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/catalog-items
 * Update an existing catalog item
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json() as CatalogItemPayload;

    if (!body.catalog_key || !body.item_key) {
      return NextResponse.json(
        { error: 'Missing required fields: catalog_key, item_key' },
        { status: 400 }
      );
    }

    // Find the existing item
    const { data: existing, error: findError } = await supabase
      .from('catalog_items')
      .select('id')
      .eq('catalog_key', body.catalog_key)
      .eq('item_key', body.item_key)
      .maybeSingle();

    if (findError) {
      console.error('Catalog item find error:', findError);
      return NextResponse.json(
        { error: 'Failed to find catalog item', details: findError.message },
        { status: 500 }
      );
    }

    if (!existing) {
      return NextResponse.json(
        { error: 'Catalog item not found' },
        { status: 404 }
      );
    }

    // Update the item
    const { data: updatedItem, error: updateError } = await supabase
      .from('catalog_items')
      .update({
        label: body.label,
        sort_order: body.sort_order,
        is_active: body.is_active,
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (updateError) {
      console.error('Catalog item update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update catalog item', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error('Admin catalog items PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
