/**
 * NORD Parts Admin API
 *
 * Reads from vendor_components table (single source of truth for NORD parts).
 * This is a READ-ONLY admin view. Parts are managed via seed scripts from
 * authoritative CSV catalogs.
 *
 * GET: List all NORD vendor components
 */

import { NextResponse } from 'next/server';
import { createClient } from '../../../../../src/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Query vendor_components for NORD parts (single source of truth)
    const { data, error } = await supabase
      .from('vendor_components')
      .select('*')
      .eq('vendor', 'NORD')
      .order('component_type', { ascending: true })
      .order('vendor_part_number', { ascending: true });

    if (error) {
      console.error('[NORD Parts API] GET error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform to a consistent admin view format
    const parts = (data || []).map((row) => ({
      id: row.id,
      pn: row.vendor_part_number,
      name: row.description || row.vendor_part_number,
      component_type: row.component_type,
      family: 'NORD',
      series: row.metadata_json?.product_line || 'FLEXBLOC',
      size_key: row.metadata_json?.gear_unit_size || row.metadata_json?.size_code || null,
      part_type: row.component_type,
      mounting_style: row.metadata_json?.mounting_variant || null,
      output_type: row.metadata_json?.output_shaft_option_key || null,
      bore_in: row.metadata_json?.bore_in || row.metadata_json?.bushing_bore_in || null,
      ratio: row.metadata_json?.total_ratio || row.metadata_json?.ratio || null,
      description: row.description,
      metadata: row.metadata_json,
      is_active: true,
      source: 'catalog',
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return NextResponse.json(parts);
  } catch (err) {
    console.error('[NORD Parts API] GET exception:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST and PUT are disabled - parts come from catalog CSVs via seed scripts
// Manual editing would create dual source of truth problems
