/**
 * Public V-Guides API (v1.22.1)
 *
 * GET: Fetch active v-guides for calculator dropdown
 *
 * Returns only active v-guides ordered by sort_order.
 * Used by calculator components to populate V-Guide selection.
 *
 * Schema (v1.22.1):
 * - key: K-code (K10, K13, etc.) - canonical identifier
 * - na_letter: Optional NA letter alias (O, A, B, C)
 * - label: Display label, format "O (K10)" or "K10"
 *
 * NOTE: Utility functions (translateVGuideKey, NA_LETTER_TO_KCODE) are in
 * src/lib/v-guide-utils.ts to comply with Next.js route export restrictions.
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../src/lib/supabase/client';

// Re-export VGuideItem type for consumers
export interface VGuideItem {
  key: string;              // K-code (K10, K13, etc.)
  na_letter: string | null; // Optional NA letter (O, A, B, C)
  label: string;            // Display label
  // PVC min pulley values (default)
  min_pulley_dia_solid_in: number;
  min_pulley_dia_notched_in: number;
  // PU min pulley values (v1.26) - null if not applicable
  min_pulley_dia_solid_pu_in: number | null;
  min_pulley_dia_notched_pu_in: number | null;
}

/**
 * GET /api/v-guides
 * Fetch active v-guides for calculator use
 */
export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error: service role not available' },
        { status: 503 }
      );
    }

    const { data: items, error } = await supabaseAdmin
      .from('v_guides')
      .select('key, na_letter, label, min_pulley_dia_solid_in, min_pulley_dia_notched_in, min_pulley_dia_solid_pu_in, min_pulley_dia_notched_pu_in')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('V-guides fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch v-guides', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(items || []);
  } catch (error) {
    console.error('V-guides API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
