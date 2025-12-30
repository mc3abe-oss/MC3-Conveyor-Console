/**
 * Belt Usage API (v1.23)
 *
 * GET /api/belts/[id]/usage - Get belt usage count
 *
 * Returns how many times a belt is referenced in saved artifacts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin, isSupabaseConfigured } from '../../../../../src/lib/supabase/client';

/**
 * GET /api/belts/[id]/usage
 * Get belt usage count and breakdown
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 503 }
      );
    }

    const { id } = await params;
    const client = supabaseAdmin || supabase;

    // Fetch belt by id to get catalog_key
    const { data: belt, error } = await client
      .from('belt_catalog')
      .select('id, catalog_key, display_name')
      .eq('id', id)
      .single();

    if (error || !belt) {
      return NextResponse.json(
        { error: 'Belt not found' },
        { status: 404 }
      );
    }

    // Count calc_recipes (applications) referencing this belt
    const { count: appCount, error: appError } = await client
      .from('calc_recipes')
      .select('*', { count: 'exact', head: true })
      .filter('inputs->belt_catalog_key', 'eq', belt.catalog_key);

    if (appError) {
      console.error('Error counting belt usage in calc_recipes:', appError);
    }

    // Count configuration_revisions (legacy configs) referencing this belt
    const { count: configCount, error: configError } = await client
      .from('configuration_revisions')
      .select('*', { count: 'exact', head: true })
      .filter('inputs_json->belt_catalog_key', 'eq', belt.catalog_key);

    if (configError) {
      console.error('Error counting belt usage in configuration_revisions:', configError);
    }

    const applications = appCount || 0;
    const configurations = configCount || 0;
    const usageCount = applications + configurations;

    return NextResponse.json({
      usageCount,
      breakdown: {
        applications,
        configurations,
      },
    });
  } catch (error) {
    console.error('Belt usage API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
