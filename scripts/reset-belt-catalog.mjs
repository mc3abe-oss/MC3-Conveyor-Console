/**
 * Reset Belt Catalog Script
 * Hard deletes all belt catalog records and seeds with verified Beltservice belts.
 *
 * EXECUTED: 2025-12-30
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================================================
// BELT SEED DATA (AUTHORITATIVE)
// ============================================================================

const BELT_1 = {
  catalog_key: 'BS_PVC_120_BLK_C_BRUSHED_91',
  display_name: 'PVC 120 Blk C x Brushed (Beltservice #91)',
  manufacturer: 'Beltservice Canada',
  material: 'PVC',
  surface: 'Black PVC Smooth / Woven Poly Brushed',
  food_grade: false,  // fda_approved: false
  cut_resistant: false,
  oil_resistant: true,
  abrasion_resistant: false,
  antistatic: false,  // static_conductive: false
  thickness_in: 0.140,
  // piw = unit_weight_lb_per_in_width (belt weight for calculation)
  piw: 0.0700,
  pil: 0.0700,  // Assume same as piw if not specified
  min_pulley_dia_no_vguide_in: 2.50,
  min_pulley_dia_with_vguide_in: 3.50,  // Typically 1" more for V-guide
  notes: `Beltservice Canada Catalog #91
Material: PVC
Color: Black
Plies: 1
Belt Strength: 120 PIW
Top Cover: Black PVC, Smooth
Bottom Cover: Woven Poly, Brushed
Carcass: Interwoven Polyester
Temperature Range: 0°F to 180°F
Oil Resistant: Yes
Fire Resistant: No
Static Conductive: No
FDA Approved: No
Splice: Finger allowed
Source: Beltservice Canada – Belting Specification Sheet Catalog #91
Note: Base belt minimum pulley diameter. V-guide and cleat modifiers handled separately.`,
  tags: ['beltservice', 'pvc', 'catalog-91', 'finger-splice'],
  is_active: true,
  material_profile: {
    material_family: 'PVC',
    construction: '1-ply Interwoven Polyester',
    min_dia_no_vguide_in: 2.50,
    min_dia_with_vguide_in: 3.50,
    notes: 'Oil resistant. Temperature range 0-180°F.',
    source_ref: 'Beltservice Canada Catalog #91',
    cleat_method: 'hot_welded',
  },
  material_profile_version: 1,
};

const BELT_2 = {
  catalog_key: 'BS_IWP_140_RED_URETHANE_X_FS_2B15',
  display_name: 'IWP 140 3/32in Red Urethane X FS (Beltservice #2B15)',
  manufacturer: 'Beltservice Corporation',
  material: 'Urethane (PU)',
  surface: 'Gloss Top / Friction Surface Bottom',
  food_grade: false,  // fda_approved: false
  cut_resistant: true,  // "Cut and gouge resistant" per notes
  oil_resistant: false,
  abrasion_resistant: true,  // Implied by PU and "cut and gouge resistant"
  antistatic: false,  // anti_static: false
  thickness_in: 0.1969,
  // piw = unit_weight_lb_per_in_width
  piw: 0.0916,
  pil: 0.0916,  // Assume same as piw
  min_pulley_dia_no_vguide_in: 3.937,  // Normal flex
  min_pulley_dia_with_vguide_in: 5.0,  // Typically larger for V-guide
  notes: `Beltservice Corporation Catalog #2B15
Item Number: 41885
International Designation: EM24/M UO/U24 Red
Material: Urethane (PU)
Color: Red
Plies: 1
Overall Thickness: 0.1969"
Top Cover Thickness: 0.0945"
Top Cover Finish: Gloss
Top Cover Shore A: 92
Bottom Cover Finish: Friction Surface
Carcass Material: PU
Belt Strength: 140 lbs/in (1% elongation)
Min Pulley Diameter (Normal Flex): 3.937"
Min Pulley Diameter (Back Flex): 7.874"
Temperature Range: 5°F to 176°F
Anti-Static: No
Oil Resistant: No
Fire Resistant: No
Cross Rigid: No
FDA Approved: No
Splice Type: Finger
Foil Splice Supported: Yes
Splice Press Temp: 320°F
Splice Pressure: 25 PSI
Maximum Width: 118"
Source: Beltservice Corporation – Light Weight Belting Specification Sheet Catalog 2B15
Note: 92 Shore A PU cover. Cut and gouge resistant. Normal-flex vs back-flex pulley limits enforced at application layer.`,
  tags: ['beltservice', 'urethane', 'pu', 'catalog-2b15', 'finger-splice', 'foil-splice'],
  is_active: true,
  material_profile: {
    material_family: 'Urethane (PU)',
    construction: '1-ply PU Carcass, 92 Shore A',
    min_dia_no_vguide_in: 3.937,
    min_dia_with_vguide_in: 5.0,
    notes: 'Cut and gouge resistant. Temperature range 5-176°F. Back-flex min pulley: 7.874".',
    source_ref: 'Beltservice Corporation Catalog #2B15',
    cleat_method: 'molded',  // PU typically uses molded cleats
  },
  material_profile_version: 1,
};

async function resetBeltCatalog() {
  console.log('=== Belt Catalog Reset ===\n');

  // Get count before deletion
  const { count: beforeCount } = await supabase
    .from('belt_catalog')
    .select('*', { count: 'exact', head: true });

  console.log(`BEFORE: ${beforeCount || 0} belt(s) in catalog\n`);

  // Step 1: Hard delete all belt catalog records
  console.log('Step 1: Deleting all belt catalog records...');
  const { error: deleteError } = await supabase
    .from('belt_catalog')
    .delete()
    .gte('id', '00000000-0000-0000-0000-000000000000');

  if (deleteError) {
    console.error('  Delete error:', deleteError.message);
    process.exit(1);
  }
  console.log('  Done\n');

  // Verify deletion
  const { count: afterDeleteCount } = await supabase
    .from('belt_catalog')
    .select('*', { count: 'exact', head: true });

  console.log(`After deletion: ${afterDeleteCount || 0} belt(s)\n`);

  // Step 2: Insert Belt 1 (Beltservice #91)
  console.log('Step 2: Inserting Beltservice #91...');
  const { data: belt1, error: belt1Error } = await supabase
    .from('belt_catalog')
    .insert(BELT_1)
    .select()
    .single();

  if (belt1Error) {
    console.error('  Insert error:', belt1Error.message);
    process.exit(1);
  }
  console.log(`  Inserted: ${belt1.catalog_key}`);
  console.log(`  ID: ${belt1.id}\n`);

  // Step 3: Insert Belt 2 (Beltservice #2B15)
  console.log('Step 3: Inserting Beltservice #2B15...');
  const { data: belt2, error: belt2Error } = await supabase
    .from('belt_catalog')
    .insert(BELT_2)
    .select()
    .single();

  if (belt2Error) {
    console.error('  Insert error:', belt2Error.message);
    process.exit(1);
  }
  console.log(`  Inserted: ${belt2.catalog_key}`);
  console.log(`  ID: ${belt2.id}\n`);

  // Final verification
  const { data: finalBelts, count: finalCount } = await supabase
    .from('belt_catalog')
    .select('catalog_key, display_name, manufacturer, material, is_active', { count: 'exact' });

  console.log('=== Final State ===');
  console.log(`Total belts: ${finalCount}\n`);

  if (finalBelts) {
    for (const belt of finalBelts) {
      console.log(`  [${belt.is_active ? 'ACTIVE' : 'INACTIVE'}] ${belt.catalog_key}`);
      console.log(`    ${belt.display_name}`);
      console.log(`    ${belt.manufacturer} - ${belt.material}\n`);
    }
  }

  console.log('=== Belt Catalog Reset Complete ===');
}

resetBeltCatalog().catch(console.error);
