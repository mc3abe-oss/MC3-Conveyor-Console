#!/usr/bin/env node
/**
 * Seed NORD FLEXBLOC Gearmotor Performance Data
 *
 * Reads the authoritative CSV file and populates:
 *   - vendor_components (gear units)
 *   - vendor_performance_points (operating points)
 *
 * IDEMPOTENT: Safe to run multiple times. Uses upsert via unique constraints.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-nord-flexbloc.mjs
 *
 * Options:
 *   --dry-run    Show what would be inserted without making changes
 *   --verbose    Show detailed output for each row
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// CONFIGURATION
// ============================================================================

const CSV_PATH = path.resolve(__dirname, '../Reference/Vendor/nord_flexbloc_performance_v1.csv');
const VENDOR = 'NORD';

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================================================
// CSV PARSING
// ============================================================================

function parseCSV(content) {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length !== headers.length) continue;

    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx];
    });
    rows.push(row);
  }

  return rows;
}

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

async function seedNordFlexbloc() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose');

  console.log('='.repeat(60));
  console.log('NORD FLEXBLOC Gearmotor Seed Script');
  console.log('='.repeat(60));
  if (dryRun) console.log('DRY RUN MODE - no changes will be made');
  console.log(`CSV Source: ${CSV_PATH}`);
  console.log();

  // Read and parse CSV
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`Error: CSV file not found at ${CSV_PATH}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const rows = parseCSV(csvContent);
  console.log(`Parsed ${rows.length} performance data rows from CSV`);
  console.log();

  // Extract unique gear units
  const gearUnitsMap = new Map();
  for (const row of rows) {
    const partNumber = row.gear_unit_part_number;
    if (!gearUnitsMap.has(partNumber)) {
      gearUnitsMap.set(partNumber, {
        vendor: row.vendor || VENDOR,
        series: row.series,
        size_code: row.size_code,
        part_number: partNumber,
      });
    }
  }

  const gearUnits = Array.from(gearUnitsMap.values());
  console.log(`Found ${gearUnits.length} unique gear unit part numbers`);
  console.log();

  // Stats
  let componentsUpserted = 0;
  let performancePointsUpserted = 0;
  let errors = 0;

  // Map from part_number to component UUID (needed for FK in performance points)
  const partNumberToId = new Map();

  // ==========================================================================
  // STEP 1: Upsert vendor_components (gear units)
  // ==========================================================================
  console.log('Step 1: Upserting vendor_components (gear units)...');

  for (const gu of gearUnits) {
    const componentRow = {
      vendor: gu.vendor,
      component_type: 'GEAR_UNIT',
      vendor_part_number: gu.part_number,
      description: `NORD ${gu.series} Gear Unit Size ${gu.size_code}`,
      metadata_json: { series: gu.series, size_code: gu.size_code },
    };

    if (verbose) {
      console.log(`  [COMPONENT] ${gu.part_number} - ${componentRow.description}`);
    }

    if (!dryRun) {
      // Upsert: insert or update on conflict
      const { data, error } = await supabase
        .from('vendor_components')
        .upsert(componentRow, {
          onConflict: 'vendor,vendor_part_number',
          ignoreDuplicates: false,
        })
        .select('id')
        .single();

      if (error) {
        console.error(`  Error upserting ${gu.part_number}:`, error.message);
        errors++;
        continue;
      }

      partNumberToId.set(gu.part_number, data.id);
      componentsUpserted++;
    } else {
      // Dry run - need to look up existing ID if any
      const { data: existing } = await supabase
        .from('vendor_components')
        .select('id')
        .eq('vendor', gu.vendor)
        .eq('vendor_part_number', gu.part_number)
        .single();

      if (existing) {
        partNumberToId.set(gu.part_number, existing.id);
      } else {
        partNumberToId.set(gu.part_number, 'DRY_RUN_PLACEHOLDER');
      }
      componentsUpserted++;
    }
  }

  console.log(`  ${componentsUpserted} gear unit(s) processed`);
  console.log();

  // ==========================================================================
  // STEP 2: Upsert vendor_performance_points
  // ==========================================================================
  console.log('Step 2: Upserting vendor_performance_points...');

  for (const row of rows) {
    const gearUnitId = partNumberToId.get(row.gear_unit_part_number);

    if (!gearUnitId || gearUnitId === 'DRY_RUN_PLACEHOLDER') {
      if (!dryRun) {
        console.error(`  Missing gear unit ID for ${row.gear_unit_part_number}`);
        errors++;
        continue;
      }
    }

    const perfRow = {
      vendor: row.vendor || VENDOR,
      series: row.series,
      size_code: row.size_code,
      gear_unit_component_id: gearUnitId,
      motor_hp: parseFloat(row.motor_hp),
      output_rpm: parseFloat(row.output_rpm),
      output_torque_lb_in: parseFloat(row.output_torque_lb_in),
      service_factor_catalog: parseFloat(row.service_factor_catalog),
      source_ref: row.source_ref || null,
    };

    if (verbose) {
      console.log(
        `  [PERF] ${row.series} ${row.size_code} @ ${row.motor_hp}HP: ` +
        `${row.output_rpm} RPM, ${row.output_torque_lb_in} lb-in`
      );
    }

    if (!dryRun && gearUnitId !== 'DRY_RUN_PLACEHOLDER') {
      // Upsert performance point
      const { error } = await supabase
        .from('vendor_performance_points')
        .upsert(perfRow, {
          onConflict: 'vendor,series,size_code,gear_unit_component_id,motor_hp,output_rpm,output_torque_lb_in,service_factor_catalog',
          ignoreDuplicates: false,
        });

      if (error) {
        console.error(`  Error upserting performance point:`, error.message);
        errors++;
        continue;
      }
    }

    performancePointsUpserted++;
  }

  console.log(`  ${performancePointsUpserted} performance point(s) processed`);
  console.log();

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  console.log('='.repeat(60));
  console.log('Summary:');
  console.log(`  Gear Units Processed: ${componentsUpserted}`);
  console.log(`  Performance Points Processed: ${performancePointsUpserted}`);
  console.log(`  Errors: ${errors}`);
  console.log('='.repeat(60));

  if (dryRun) {
    console.log();
    console.log('This was a dry run. Run without --dry-run to apply changes.');
  }

  // Verification (not in dry run)
  if (!dryRun) {
    console.log();
    console.log('Verification:');

    const { count: componentCount } = await supabase
      .from('vendor_components')
      .select('*', { count: 'exact', head: true })
      .eq('vendor', VENDOR)
      .eq('component_type', 'GEAR_UNIT');

    const { count: perfCount } = await supabase
      .from('vendor_performance_points')
      .select('*', { count: 'exact', head: true })
      .eq('vendor', VENDOR)
      .eq('series', 'FLEXBLOC');

    console.log(`  NORD Gear Units in DB: ${componentCount}`);
    console.log(`  FLEXBLOC Performance Points in DB: ${perfCount}`);
  }
}

// ============================================================================
// RUN
// ============================================================================

seedNordFlexbloc().catch((err) => {
  console.error('Seed script failed:', err);
  process.exit(1);
});
