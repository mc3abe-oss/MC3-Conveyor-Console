#!/usr/bin/env node
/**
 * Seed NORD FLEXBLOC Gearmotor Performance Data (Catalog-Faithful)
 *
 * Reads the AUTHORITATIVE catalog CSV and populates:
 *   - vendor_components (gear units by series + HP)
 *   - vendor_performance_points (operating points exactly as published)
 *
 * CATALOG-FAITHFUL:
 *   - All values come directly from vendor catalog CSV
 *   - No interpolation, no inference, no invented data
 *   - catalog_service_factor is vendor-published fᵦ (NOT app safety factor)
 *
 * IDEMPOTENT:
 *   - Deletes existing NORD FLEXBLOC data before inserting
 *   - Safe to run multiple times
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

// AUTHORITATIVE source - the ONLY source of NORD FLEXBLOC data
const CSV_PATH = path.resolve(__dirname, '../Reference/Vendor/nord_flexbloc_0p25_to_1hp_catalog_extract_v1.csv');
const VENDOR = 'NORD';
const SERIES = 'FLEXBLOC';

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

/**
 * Parse CSV content into rows.
 * Expected columns: motor_hp, series_code, output_rpm, output_torque_lb_in, catalog_service_factor
 */
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

/**
 * Generate a unique part number for a gear unit based on series and HP.
 * Format: {series_code}-{motor_hp}HP (e.g., "SI50-0.25HP")
 */
function generatePartNumber(seriesCode, motorHp) {
  return `${seriesCode}-${motorHp}HP`;
}

/**
 * Extract size code from series code (e.g., "SI50" -> "50")
 */
function extractSizeCode(seriesCode) {
  const match = seriesCode.match(/SI(\d+)/);
  return match ? match[1] : seriesCode;
}

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

async function seedNordFlexbloc() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose');

  console.log('='.repeat(60));
  console.log('NORD FLEXBLOC Gearmotor Seed Script (Catalog-Faithful)');
  console.log('='.repeat(60));
  if (dryRun) console.log('DRY RUN MODE - no changes will be made');
  console.log(`Authoritative CSV: ${CSV_PATH}`);
  console.log();

  // Read and parse CSV
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`Error: CSV file not found at ${CSV_PATH}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const rows = parseCSV(csvContent);
  console.log(`Parsed ${rows.length} catalog performance rows from CSV`);
  console.log();

  // Validate CSV columns
  const requiredColumns = ['motor_hp', 'series_code', 'output_rpm', 'output_torque_lb_in', 'catalog_service_factor'];
  const firstRow = rows[0];
  for (const col of requiredColumns) {
    if (!(col in firstRow)) {
      console.error(`Error: Missing required column '${col}' in CSV`);
      process.exit(1);
    }
  }

  // ==========================================================================
  // STEP 0: Delete existing NORD FLEXBLOC data (for clean reseed)
  // ==========================================================================
  console.log('Step 0: Removing existing NORD FLEXBLOC data...');

  if (!dryRun) {
    // Delete performance points first (foreign key constraint)
    const { error: perfDeleteError, count: perfDeleteCount } = await supabase
      .from('vendor_performance_points')
      .delete({ count: 'exact' })
      .eq('vendor', VENDOR)
      .eq('series', SERIES);

    if (perfDeleteError) {
      console.error('  Error deleting performance points:', perfDeleteError.message);
    } else {
      console.log(`  Deleted ${perfDeleteCount ?? 0} existing performance points`);
    }

    // Delete gear unit components
    const { error: compDeleteError, count: compDeleteCount } = await supabase
      .from('vendor_components')
      .delete({ count: 'exact' })
      .eq('vendor', VENDOR)
      .eq('component_type', 'GEAR_UNIT')
      .like('vendor_part_number', 'SI%');

    if (compDeleteError) {
      console.error('  Error deleting components:', compDeleteError.message);
    } else {
      console.log(`  Deleted ${compDeleteCount ?? 0} existing gear unit components`);
    }
  } else {
    console.log('  [DRY RUN] Would delete existing NORD FLEXBLOC data');
  }
  console.log();

  // ==========================================================================
  // STEP 1: Extract and create unique gear unit components
  // ==========================================================================
  console.log('Step 1: Creating gear unit components...');

  // Extract unique series_code + motor_hp combinations
  const gearUnitsMap = new Map();
  for (const row of rows) {
    const partNumber = generatePartNumber(row.series_code, row.motor_hp);
    if (!gearUnitsMap.has(partNumber)) {
      gearUnitsMap.set(partNumber, {
        series_code: row.series_code,
        motor_hp: parseFloat(row.motor_hp),
        size_code: extractSizeCode(row.series_code),
      });
    }
  }

  const gearUnits = Array.from(gearUnitsMap.entries());
  console.log(`  Found ${gearUnits.length} unique gear unit configurations`);

  // Stats
  let componentsInserted = 0;
  let performancePointsInserted = 0;
  let errors = 0;

  // Map from part_number to component UUID
  const partNumberToId = new Map();

  for (const [partNumber, gu] of gearUnits) {
    const componentRow = {
      vendor: VENDOR,
      component_type: 'GEAR_UNIT',
      vendor_part_number: partNumber,
      description: `NORD ${SERIES} ${gu.series_code} ${gu.motor_hp}HP Gear Unit`,
      metadata_json: {
        series: SERIES,
        series_code: gu.series_code,
        size_code: gu.size_code,
        motor_hp: gu.motor_hp,
      },
    };

    if (verbose) {
      console.log(`  [COMPONENT] ${partNumber} - ${componentRow.description}`);
    }

    if (!dryRun) {
      const { data, error } = await supabase
        .from('vendor_components')
        .insert(componentRow)
        .select('id')
        .single();

      if (error) {
        console.error(`  Error inserting ${partNumber}:`, error.message);
        errors++;
        continue;
      }

      partNumberToId.set(partNumber, data.id);
      componentsInserted++;
    } else {
      partNumberToId.set(partNumber, 'DRY_RUN_PLACEHOLDER');
      componentsInserted++;
    }
  }

  console.log(`  ${componentsInserted} gear unit(s) created`);
  console.log();

  // ==========================================================================
  // STEP 2: Insert performance points (exactly as published in catalog)
  // ==========================================================================
  console.log('Step 2: Inserting catalog performance points...');

  for (const row of rows) {
    const partNumber = generatePartNumber(row.series_code, row.motor_hp);
    const gearUnitId = partNumberToId.get(partNumber);

    if (!gearUnitId) {
      console.error(`  Missing gear unit ID for ${partNumber}`);
      errors++;
      continue;
    }

    // Parse catalog values EXACTLY as published
    const motorHp = parseFloat(row.motor_hp);
    const outputRpm = parseInt(row.output_rpm, 10); // Integer, exact
    const outputTorque = parseFloat(row.output_torque_lb_in); // Exact value
    const catalogSf = parseFloat(row.catalog_service_factor); // Vendor fᵦ

    const perfRow = {
      vendor: VENDOR,
      series: SERIES,
      size_code: extractSizeCode(row.series_code),
      gear_unit_component_id: gearUnitId === 'DRY_RUN_PLACEHOLDER' ? null : gearUnitId,
      motor_hp: motorHp,
      output_rpm: outputRpm,
      output_torque_lb_in: outputTorque,
      service_factor_catalog: catalogSf,
      source_ref: `Catalog-${row.series_code}-${motorHp}HP`,
    };

    if (verbose) {
      console.log(
        `  [PERF] ${row.series_code} ${motorHp}HP: ` +
        `${outputRpm} RPM, ${outputTorque} lb-in, SF=${catalogSf}`
      );
    }

    if (!dryRun && gearUnitId !== 'DRY_RUN_PLACEHOLDER') {
      const { error } = await supabase
        .from('vendor_performance_points')
        .insert(perfRow);

      if (error) {
        console.error(`  Error inserting performance point:`, error.message);
        errors++;
        continue;
      }
    }

    performancePointsInserted++;
  }

  console.log(`  ${performancePointsInserted} performance point(s) inserted`);
  console.log();

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  console.log('='.repeat(60));
  console.log('Summary:');
  console.log(`  Gear Units Created: ${componentsInserted}`);
  console.log(`  Performance Points Inserted: ${performancePointsInserted}`);
  console.log(`  Errors: ${errors}`);
  console.log('='.repeat(60));

  if (dryRun) {
    console.log();
    console.log('This was a dry run. Run without --dry-run to apply changes.');
  }

  // Verification (not in dry run)
  if (!dryRun && errors === 0) {
    console.log();
    console.log('Verification:');

    const { count: componentCount } = await supabase
      .from('vendor_components')
      .select('*', { count: 'exact', head: true })
      .eq('vendor', VENDOR)
      .eq('component_type', 'GEAR_UNIT')
      .like('vendor_part_number', 'SI%');

    const { count: perfCount } = await supabase
      .from('vendor_performance_points')
      .select('*', { count: 'exact', head: true })
      .eq('vendor', VENDOR)
      .eq('series', SERIES);

    console.log(`  NORD FLEXBLOC Gear Units in DB: ${componentCount}`);
    console.log(`  FLEXBLOC Performance Points in DB: ${perfCount}`);

    // Sample verification
    const { data: sample } = await supabase
      .from('vendor_performance_points')
      .select('motor_hp, output_rpm, output_torque_lb_in, service_factor_catalog')
      .eq('vendor', VENDOR)
      .eq('series', SERIES)
      .limit(3);

    if (sample && sample.length > 0) {
      console.log();
      console.log('Sample data (first 3 rows):');
      for (const s of sample) {
        console.log(`  ${s.motor_hp}HP: ${s.output_rpm} RPM, ${s.output_torque_lb_in} lb-in, SF=${s.service_factor_catalog}`);
      }
    }
  }
}

// ============================================================================
// RUN
// ============================================================================

seedNordFlexbloc().catch((err) => {
  console.error('Seed script failed:', err);
  process.exit(1);
});
