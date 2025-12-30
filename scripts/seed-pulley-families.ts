#!/usr/bin/env npx ts-node
/**
 * One-time script: Seed Pulley Families and Variants
 *
 * Seeds the pulley_families and pulley_variants tables with PCI data.
 *
 * Usage:
 *   npx ts-node scripts/seed-pulley-families.ts
 *
 * NOTE: This script requires SUPABASE_SERVICE_ROLE_KEY for write access.
 */

import * as fs from 'fs';
import * as path from 'path';

// Load .env.local manually
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

import { createClient } from '@supabase/supabase-js';

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing Supabase credentials');
    console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  return createClient(supabaseUrl, supabaseKey);
}

// ============================================================================
// SEED DATA
// ============================================================================

const PULLEY_FAMILIES = [
  {
    pulley_family_key: 'PCI_FC_8IN_48_5_K17',
    manufacturer: 'PCI',
    style: 'Flat Face',
    material: 'Mild steel',
    shell_od_in: 8.0,
    face_width_in: 48.5,
    shell_wall_in: 0.134,
    is_crowned: false,
    crown_type: null,
    v_groove_section: 'K17',
    v_groove_top_width_in: 0.919,
    v_groove_bottom_width_in: 0.595,
    v_groove_depth_in: 0.496,
    version: 1,
    source: 'PCL-Q143384 + 143384-2.ASSEMBLY + 143384-4.ASSEMBLY',
    notes: 'Standard MC3 pulley family built by PCI. Shaft package is application-only.',
    is_active: true,
  },
  {
    pulley_family_key: 'PCI_FC_4IN_42_5_K10',
    manufacturer: 'PCI',
    style: 'Flat Face',
    material: 'Mild steel',
    shell_od_in: 4.0,
    face_width_in: 42.5,
    shell_wall_in: 0.12,
    is_crowned: false,
    crown_type: null,
    v_groove_section: 'K10',
    v_groove_top_width_in: 0.65,
    v_groove_bottom_width_in: 0.447,
    v_groove_depth_in: 0.312,
    version: 1,
    source: 'PCL-Q173498 + 173498-1.ASSEMBLY + 173498-2.ASSEMBLY',
    notes: 'Standard MC3 pulley family built by PCI. Shaft package is application-only.',
    is_active: true,
  },
  // TODO: FAMILY 3 (Crowned) - requires crowned pulley PDFs for data extraction
  // Once PDFs are available, extract:
  // - shell_od_in, face_width_in, shell_wall_in
  // - crown_type
  // - lagging details for variants
  // - finished_od_in, bore, groove info
];

const PULLEY_VARIANTS = [
  // FAMILY 1 VARIANTS (8" Flat Face)
  {
    pulley_variant_key: 'PCI_FC_8IN_48_5_K17_LAGGED_BUSHED',
    pulley_family_key: 'PCI_FC_8IN_48_5_K17',
    bore_in: 1.938,
    hub_style: 'XTH25 integral hubs + XTB25 bushing',
    bearing_type: 'bushing',
    lagging_type: 'SBR',
    lagging_thickness_in: 0.25,
    lagging_durometer_shore_a: 60,
    finished_od_in: 8.5,
    runout_max_in: 0.03,
    paint_spec: 'Paint ends only',
    version: 1,
    source: 'PCL-Q143384 item 1 + 143384-2.ASSEMBLY',
    notes: 'Quoted part F08ZX48HFZZZXX257ZC.',
    is_active: true,
  },
  {
    pulley_variant_key: 'PCI_FC_8IN_48_5_K17_BEARING',
    pulley_family_key: 'PCI_FC_8IN_48_5_K17',
    bore_in: 1.938,
    hub_style: 'Bearing hub',
    bearing_type: 'Timken',
    lagging_type: 'none',
    lagging_thickness_in: null,
    lagging_durometer_shore_a: null,
    finished_od_in: null, // Uses family shell_od_in
    runout_max_in: 0.06,
    paint_spec: 'SW Enamel RAL7024',
    version: 1,
    source: 'PCL-Q143384 item 2 + 143384-4.ASSEMBLY',
    notes: 'Quoted part F08ZX48HF031T3007ZZ.',
    is_active: true,
  },
  // FAMILY 2 VARIANTS (4" Flat Face)
  {
    pulley_variant_key: 'PCI_FC_4IN_42_5_K10_LAGGED_BUSHED',
    pulley_family_key: 'PCI_FC_4IN_42_5_K10',
    bore_in: 1.25,
    hub_style: 'XTH15 integral hubs + XTB15 bushing',
    bearing_type: 'bushing',
    lagging_type: 'SBR',
    lagging_thickness_in: 0.25,
    lagging_durometer_shore_a: 60,
    finished_od_in: 4.5,
    runout_max_in: 0.03,
    paint_spec: 'Paint ends only',
    version: 1,
    source: 'PCL-Q173498 item 1 + 173498-1.ASSEMBLY',
    notes: 'Quoted part F04ZW42HFZZZX015KZC.',
    is_active: true,
  },
  {
    pulley_variant_key: 'PCI_FC_4IN_42_5_K10_BEARING',
    pulley_family_key: 'PCI_FC_4IN_42_5_K10',
    bore_in: 1.25,
    hub_style: 'Bearing slug',
    bearing_type: 'ER style',
    lagging_type: 'none',
    lagging_thickness_in: null,
    lagging_durometer_shore_a: null,
    finished_od_in: null, // Uses family shell_od_in
    runout_max_in: 0.03,
    paint_spec: 'SW Enamel RAL7024',
    version: 1,
    source: 'PCL-Q173498 item 2 + 173498-2.ASSEMBLY',
    notes: 'Quoted part F04ZW42HF020T300KZZ.',
    is_active: true,
  },
];

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('Seeding pulley families and variants...\n');

  const supabase = getSupabaseClient();

  // Seed families
  console.log(`Inserting ${PULLEY_FAMILIES.length} pulley families...`);
  for (const family of PULLEY_FAMILIES) {
    const { error } = await supabase
      .from('pulley_families')
      .upsert(family, { onConflict: 'pulley_family_key' });

    if (error) {
      console.error(`Error inserting family ${family.pulley_family_key}:`, error.message);
    } else {
      console.log(`  - ${family.pulley_family_key}: ${family.manufacturer} ${family.shell_od_in}" ${family.style}`);
    }
  }

  // Seed variants
  console.log(`\nInserting ${PULLEY_VARIANTS.length} pulley variants...`);
  for (const variant of PULLEY_VARIANTS) {
    const { error } = await supabase
      .from('pulley_variants')
      .upsert(variant, { onConflict: 'pulley_variant_key' });

    if (error) {
      console.error(`Error inserting variant ${variant.pulley_variant_key}:`, error.message);
    } else {
      const finishedOd = variant.finished_od_in ?? 'shell';
      console.log(`  - ${variant.pulley_variant_key}: ${finishedOd}" OD, ${variant.bearing_type}`);
    }
  }

  console.log('\nSeed complete!');
  console.log('NOTE: Family 3 (Crowned) requires crowned pulley PDFs for data extraction.');
}

main().catch((err) => {
  console.error('Seed script failed:', err);
  process.exit(1);
});
