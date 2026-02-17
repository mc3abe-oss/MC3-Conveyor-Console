/**
 * GET /api/catalog
 *
 * Fetch catalog items for a given catalog_key
 * Query params: key (required)
 *
 * Returns: [{ item_key, label }]
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../src/lib/supabase/client';
import { createLogger } from '../../../src/lib/logger';
import { ErrorCodes } from '../../../src/lib/logger/error-codes';

const logger = createLogger().child({ module: 'api.catalog' });

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
    const catalog_key = searchParams.get('key');

    // Validate required parameter
    if (!catalog_key) {
      return NextResponse.json(
        { error: 'Missing required query parameter: key' },
        { status: 400 }
      );
    }

    // Query catalog_items table (using admin client to bypass RLS for read-only catalog data)
    const { data: items, error } = await supabaseAdmin
      .from('catalog_items')
      .select('item_key, label, description_long')
      .eq('catalog_key', catalog_key)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('label', { ascending: true });

    if (error) {
      logger.error('api.catalog.fetch.failed', { errorCode: ErrorCodes.CATALOG_FETCH_FAILED, error });
      return NextResponse.json(
        { error: 'Failed to fetch catalog items', details: error.message },
        { status: 500 }
      );
    }

    // Return array of { item_key, label }
    return NextResponse.json(items || []);
  } catch (error) {
    logger.error('api.catalog.get.failed', { errorCode: ErrorCodes.API_INTERNAL_ERROR, error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
