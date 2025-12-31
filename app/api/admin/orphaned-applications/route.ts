/**
 * GET /api/admin/orphaned-applications
 *
 * List all applications that are not linked to any Quote or Sales Order.
 * These are orphaned records that can be safely deleted.
 *
 * Admin-only endpoint for cleanup purposes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../src/lib/supabase/server';

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();

    // Find applications with no quote_id AND no sales_order_id
    const { data: orphaned, error } = await supabase
      .from('calc_recipes')
      .select('id, name, slug, created_at, updated_at, is_active')
      .is('quote_id', null)
      .is('sales_order_id', null)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching orphaned applications:', error);
      return NextResponse.json(
        { error: 'Failed to fetch orphaned applications' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      applications: orphaned || [],
      count: orphaned?.length || 0,
    });
  } catch (error) {
    console.error('Orphaned applications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
