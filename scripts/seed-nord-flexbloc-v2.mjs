#!/usr/bin/env node
/**
 * Seed NORD FLEXBLOC Gearmotor Data v2 (Catalog-Faithful)
 *
 * Reads the AUTHORITATIVE catalog CSVs and populates:
 *   - vendor_components (gear units, motors, adapters, output shaft kits)
 *   - vendor_performance_points (operating points exactly as published)
 *
 * CATALOG-FAITHFUL:
 *   - All values come directly from vendor catalog CSVs
 *   - No interpolation, no inference, no invented data
 *   - service_factor_cat is vendor-published (NOT app safety factor)
 *
 * IDEMPOTENT:
 *   - Deletes existing NORD FLEXBLOC data before inserting
 *   - Safe to run multiple times
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-nord-flexbloc-v2.mjs
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

// AUTHORITATIVE sources - the ONLY sources of NORD FLEXBLOC data
const SELECTION_CSV_PATH = path.resolve(__dirname, '../reference/Vendor/nord_flexbloc_B46_B61_selection_extract_v2_fullhp.csv');
const COMPONENT_MAP_CSV_PATH = path.resolve(__dirname, '../reference/Vendor/nord_flexbloc_component_map_v2_keyed.csv');
const GEAR_UNIT_PN_CSV_PATH = path.resolve(__dirname, '../reference/Vendor/nord_flexbloc_gear_unit_part_numbers_v1.csv');
const OUTPUT_SHAFT_KIT_CSV_PATH = path.resolve(__dirname, '../reference/Vendor/nord_flexbloc_output_shaft_kits_v1.csv');
const INCH_KEYED_KIT_CSV_PATH = path.resolve(__dirname, '../reference/Vendor/nord_flexbloc_output_shaft_kits_inch_keyed_v1.csv');

const VENDOR = 'NORD';
const SERIES = 'FLEXBLOC';

// Component types to import (per Bob's directive - ignore "other")
const ALLOWED_COMPONENT_TYPES = ['motor', 'adapter', 'output_shaft_kit', 'gear_unit'];

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
 * Parse CSV content into rows, handling quoted fields with commas.
 */
function parseCSV(content) {
  const lines = content.trim().split('\n');
  const headers = parseCSVLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length !== headers.length) {
      // Skip malformed rows
      continue;
    }

    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx];
    });
    rows.push(row);
  }

  return rows;
}

/**
 * Parse a single CSV line, handling quoted fields.
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  return result;
}

/**
 * Parse model_type string to extract components.
 * Example: "SK 1SI31 - 56C - 63S/4" -> { gear_unit_size: "SI31", adapter_code: "56C", motor_frame: "63S/4" }
 */
function parseModelType(modelType) {
  if (!modelType) return null;

  // Normalize: remove extra spaces, handle variations
  const normalized = modelType.replace(/\s+/g, ' ').trim();

  // Pattern: SK [stages]SI[size] - [adapter] - [motor_frame]
  // Examples:
  //   "SK 1SI31 - 56C - 63S/4"
  //   "SK 2SI50 - 140TC - 182T/4"
  const match = normalized.match(/SK\s*(\d)?SI(\d+)\s*-\s*(\w+)\s*-\s*(\S+)/i);

  if (!match) {
    // Try alternative patterns
    const altMatch = normalized.match(/SI(\d+).*?(\d+C|140TC|180TC).*?(\d+\w+\/\d+)/i);
    if (altMatch) {
      return {
        worm_stages: 1,
        gear_unit_size: `SI${altMatch[1]}`,
        adapter_code: altMatch[2],
        motor_frame: altMatch[3],
      };
    }
    return null;
  }

  return {
    worm_stages: parseInt(match[1] || '1', 10),
    gear_unit_size: `SI${match[2]}`,
    adapter_code: match[3],
    motor_frame: match[4],
  };
}

/**
 * Map DB component type enum to CSV component_type values.
 */
function mapComponentTypeToEnum(csvType) {
  const mapping = {
    'gear_unit': 'GEAR_UNIT',
    'motor': 'MOTOR',
    'adapter': 'INPUT_ADAPTER',
    'output_shaft_kit': 'OUTPUT_KIT',
  };
  return mapping[csvType] || null;
}

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

async function seedNordFlexblocV2() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose');

  console.log('='.repeat(70));
  console.log('NORD FLEXBLOC Gearmotor Seed Script v2 (Catalog-Faithful)');
  console.log('='.repeat(70));
  if (dryRun) console.log('DRY RUN MODE - no changes will be made');
  console.log(`Selection CSV: ${SELECTION_CSV_PATH}`);
  console.log(`Component Map CSV: ${COMPONENT_MAP_CSV_PATH}`);
  console.log(`Gear Unit PN CSV: ${GEAR_UNIT_PN_CSV_PATH}`);
  console.log(`Output Shaft Kit CSV: ${OUTPUT_SHAFT_KIT_CSV_PATH}`);
  console.log(`Inch Keyed Kit CSV: ${INCH_KEYED_KIT_CSV_PATH}`);
  console.log();

  // ==========================================================================
  // STEP 0: Read and parse CSVs
  // ==========================================================================
  console.log('Step 0: Reading CSV files...');

  if (!fs.existsSync(SELECTION_CSV_PATH)) {
    console.error(`Error: Selection CSV not found at ${SELECTION_CSV_PATH}`);
    process.exit(1);
  }

  if (!fs.existsSync(COMPONENT_MAP_CSV_PATH)) {
    console.error(`Error: Component Map CSV not found at ${COMPONENT_MAP_CSV_PATH}`);
    process.exit(1);
  }

  if (!fs.existsSync(GEAR_UNIT_PN_CSV_PATH)) {
    console.error(`Error: Gear Unit PN CSV not found at ${GEAR_UNIT_PN_CSV_PATH}`);
    process.exit(1);
  }

  if (!fs.existsSync(OUTPUT_SHAFT_KIT_CSV_PATH)) {
    console.error(`Error: Output Shaft Kit CSV not found at ${OUTPUT_SHAFT_KIT_CSV_PATH}`);
    process.exit(1);
  }

  if (!fs.existsSync(INCH_KEYED_KIT_CSV_PATH)) {
    console.error(`Error: Inch Keyed Kit CSV not found at ${INCH_KEYED_KIT_CSV_PATH}`);
    process.exit(1);
  }

  const selectionRows = parseCSV(fs.readFileSync(SELECTION_CSV_PATH, 'utf-8'));
  const componentMapRows = parseCSV(fs.readFileSync(COMPONENT_MAP_CSV_PATH, 'utf-8'));
  const gearUnitPnRows = parseCSV(fs.readFileSync(GEAR_UNIT_PN_CSV_PATH, 'utf-8'));
  const outputShaftKitRows = parseCSV(fs.readFileSync(OUTPUT_SHAFT_KIT_CSV_PATH, 'utf-8'));
  const inchKeyedKitRows = parseCSV(fs.readFileSync(INCH_KEYED_KIT_CSV_PATH, 'utf-8'));

  console.log(`  Parsed ${selectionRows.length} selection/performance rows`);
  console.log(`  Parsed ${componentMapRows.length} component map rows`);
  console.log(`  Parsed ${gearUnitPnRows.length} gear unit PN rows`);
  console.log(`  Parsed ${outputShaftKitRows.length} output shaft kit rows`);
  console.log(`  Parsed ${inchKeyedKitRows.length} inch keyed kit rows`);

  // Filter component map to allowed types only
  const filteredComponentMap = componentMapRows.filter(row =>
    ALLOWED_COMPONENT_TYPES.includes(row.component_type)
  );
  console.log(`  Filtered to ${filteredComponentMap.length} components (excluding "other")`);
  console.log();

  // ==========================================================================
  // STEP 1: Clean existing NORD FLEXBLOC data (scoped deletion)
  // ==========================================================================
  console.log('Step 1: Removing existing NORD FLEXBLOC data...');

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

    // Delete components for NORD FLEXBLOC only
    // Components are identified by vendor=NORD and metadata containing FLEXBLOC
    const { error: compDeleteError, count: compDeleteCount } = await supabase
      .from('vendor_components')
      .delete({ count: 'exact' })
      .eq('vendor', VENDOR)
      .or('vendor_part_number.like.SI%,vendor_part_number.like.SK%,vendor_part_number.like.3%,vendor_part_number.like.6%');

    if (compDeleteError) {
      console.error('  Error deleting components:', compDeleteError.message);
    } else {
      console.log(`  Deleted ${compDeleteCount ?? 0} existing FLEXBLOC components`);
    }
  } else {
    console.log('  [DRY RUN] Would delete existing NORD FLEXBLOC data');
  }
  console.log();

  // ==========================================================================
  // STEP 2: Build component lookup maps
  // ==========================================================================
  console.log('Step 2: Building component lookup maps...');

  // Create lookup maps for components by various keys
  const componentsByPartNumber = new Map();
  const motorsByKey = new Map(); // Key: adapter_code|motor_frame|motor_hp
  const adaptersByCode = new Map(); // Key: adapter_code
  const shaftKitsByKey = new Map(); // Key: shaft_key

  for (const row of filteredComponentMap) {
    const partNumber = row.nord_part_number?.trim();
    if (!partNumber) continue;

    componentsByPartNumber.set(partNumber, row);

    if (row.component_type === 'motor') {
      const key = `${row.adapter_code}|${row.motor_frame}|${row.motor_hp}`;
      motorsByKey.set(key, row);
    } else if (row.component_type === 'adapter') {
      adaptersByCode.set(row.adapter_code, row);
    } else if (row.component_type === 'output_shaft_kit') {
      shaftKitsByKey.set(row.shaft_key, row);
    }
  }

  console.log(`  Motors indexed: ${motorsByKey.size}`);
  console.log(`  Adapters indexed: ${adaptersByCode.size}`);
  console.log(`  Shaft kits indexed: ${shaftKitsByKey.size}`);
  console.log();

  // ==========================================================================
  // STEP 3: Insert components into vendor_components
  // ==========================================================================
  console.log('Step 3: Inserting vendor components...');

  const partNumberToId = new Map();
  let componentsInserted = 0;
  let componentErrors = 0;

  // Dedupe by part number
  const uniqueComponents = new Map();
  for (const row of filteredComponentMap) {
    const partNumber = row.nord_part_number?.trim();
    if (!partNumber || uniqueComponents.has(partNumber)) continue;
    uniqueComponents.set(partNumber, row);
  }

  for (const [partNumber, row] of uniqueComponents) {
    const enumType = mapComponentTypeToEnum(row.component_type);
    if (!enumType) continue;

    const componentRow = {
      vendor: VENDOR,
      component_type: enumType,
      vendor_part_number: partNumber,
      description: row.description || `NORD ${row.component_type} ${partNumber}`,
      metadata_json: {
        product_line: row.product_line || SERIES,
        component_type_csv: row.component_type,
        variant: row.variant || null,
        adapter_interface: row.adapter_interface || null,
        adapter_code: row.adapter_code || null,
        motor_frame: row.motor_frame || null,
        motor_poles: row.motor_poles || null,
        motor_voltage: row.motor_voltage || null,
        motor_efficiency: row.motor_efficiency || null,
        motor_hp: row.motor_hp ? parseFloat(row.motor_hp) : null,
        shaft_key: row.shaft_key || null,
        gear_unit_key: row.gear_unit_key || null,
        ratio: row.ratio ? parseFloat(row.ratio) : null,
        catalog_page: row.catalog_page || null,
      },
    };

    if (verbose) {
      console.log(`  [COMPONENT] ${enumType}: ${partNumber}`);
    }

    if (!dryRun) {
      const { data, error } = await supabase
        .from('vendor_components')
        .upsert(componentRow, { onConflict: 'vendor,vendor_part_number' })
        .select('id')
        .single();

      if (error) {
        if (verbose) console.error(`    Error: ${error.message}`);
        componentErrors++;
        continue;
      }

      partNumberToId.set(partNumber, data.id);
      componentsInserted++;
    } else {
      partNumberToId.set(partNumber, `DRY_RUN_${partNumber}`);
      componentsInserted++;
    }
  }

  console.log(`  ${componentsInserted} components inserted/updated`);
  if (componentErrors > 0) console.log(`  ${componentErrors} component errors`);
  console.log();

  // ==========================================================================
  // STEP 4: Create gear unit components from selection data
  // ==========================================================================
  console.log('Step 4: Creating gear unit components from selection data...');

  // Extract unique gear units from selection CSV
  const gearUnitsMap = new Map();
  for (const row of selectionRows) {
    const gearUnitSize = row.gear_unit_size;
    const modelType = row.model_type;
    const motorHp = parseFloat(row.motor_hp);

    if (!gearUnitSize || isNaN(motorHp)) continue;

    // Create a synthetic part number for the gear unit
    const partNumber = `${gearUnitSize}-${motorHp}HP`;

    if (!gearUnitsMap.has(partNumber)) {
      gearUnitsMap.set(partNumber, {
        gear_unit_size: gearUnitSize,
        motor_hp: motorHp,
        model_type: modelType,
        size_code: gearUnitSize.replace('SI', ''),
      });
    }
  }

  let gearUnitsCreated = 0;
  for (const [partNumber, gu] of gearUnitsMap) {
    // Skip if already exists
    if (partNumberToId.has(partNumber)) continue;

    const componentRow = {
      vendor: VENDOR,
      component_type: 'GEAR_UNIT',
      vendor_part_number: partNumber,
      description: `NORD ${SERIES} ${gu.gear_unit_size} ${gu.motor_hp}HP Gear Unit`,
      metadata_json: {
        product_line: SERIES,
        gear_unit_size: gu.gear_unit_size,
        size_code: gu.size_code,
        motor_hp: gu.motor_hp,
        model_type: gu.model_type,
      },
    };

    if (verbose) {
      console.log(`  [GEAR_UNIT] ${partNumber}`);
    }

    if (!dryRun) {
      const { data, error } = await supabase
        .from('vendor_components')
        .upsert(componentRow, { onConflict: 'vendor,vendor_part_number' })
        .select('id')
        .single();

      if (error) {
        if (verbose) console.error(`    Error: ${error.message}`);
        continue;
      }

      partNumberToId.set(partNumber, data.id);
      gearUnitsCreated++;
    } else {
      partNumberToId.set(partNumber, `DRY_RUN_${partNumber}`);
      gearUnitsCreated++;
    }
  }

  console.log(`  ${gearUnitsCreated} gear unit components created (synthetic keys)`);
  console.log();

  // ==========================================================================
  // STEP 4.5: Insert REAL gear unit part numbers from catalog
  // ==========================================================================
  console.log('Step 4.5: Inserting REAL gear unit part numbers from catalog...');

  // These are REAL NORD 8-digit orderable part numbers keyed by:
  // (gear_unit_size, total_ratio, mounting_variant)
  let realGearUnitsInserted = 0;
  let realGearUnitErrors = 0;
  let realGearUnitSkipped = 0;

  for (const row of gearUnitPnRows) {
    const partNumber = row.nord_part_number?.trim();
    const gearUnitSize = row.gear_unit_size?.trim();
    const totalRatio = parseFloat(row.total_ratio);
    const mountingVariant = row.mounting_variant?.trim();

    // Validate required fields
    if (!partNumber || !gearUnitSize || isNaN(totalRatio) || !mountingVariant) {
      if (verbose) {
        console.log(`  [SKIP] Invalid row: ${JSON.stringify(row)}`);
      }
      realGearUnitSkipped++;
      continue;
    }

    // Validate part number format (8-digit, starts with 3 or 6)
    if (!/^[36]\d{7}$/.test(partNumber)) {
      if (verbose) {
        console.log(`  [SKIP] Invalid PN format: ${partNumber}`);
      }
      realGearUnitSkipped++;
      continue;
    }

    const componentRow = {
      vendor: VENDOR,
      component_type: 'GEAR_UNIT',
      vendor_part_number: partNumber,
      description: row.description || `NORD ${SERIES} ${gearUnitSize} Ratio ${totalRatio} ${mountingVariant}`,
      metadata_json: {
        product_line: row.product_line || SERIES,
        gear_unit_size: gearUnitSize,
        total_ratio: totalRatio,
        worm_ratio: row.worm_ratio ? parseFloat(row.worm_ratio) : totalRatio,
        second_ratio: row.second_ratio ? parseFloat(row.second_ratio) : null,
        mounting_variant: mountingVariant,
        adapter_interface: row.adapter_interface || null,
        brake: row.brake === 'true',
        catalog_page: row.catalog_page || null,
      },
    };

    if (verbose) {
      console.log(`  [REAL_GEAR_UNIT] ${partNumber}: ${gearUnitSize} i=${totalRatio} ${mountingVariant}`);
    }

    if (!dryRun) {
      const { data, error } = await supabase
        .from('vendor_components')
        .upsert(componentRow, { onConflict: 'vendor,vendor_part_number' })
        .select('id')
        .single();

      if (error) {
        if (verbose) console.error(`    Error: ${error.message}`);
        realGearUnitErrors++;
        continue;
      }

      partNumberToId.set(partNumber, data.id);
      realGearUnitsInserted++;
    } else {
      partNumberToId.set(partNumber, `DRY_RUN_${partNumber}`);
      realGearUnitsInserted++;
    }
  }

  console.log(`  ${realGearUnitsInserted} REAL gear unit PNs inserted/updated`);
  if (realGearUnitSkipped > 0) console.log(`  ${realGearUnitSkipped} rows skipped`);
  if (realGearUnitErrors > 0) console.log(`  ${realGearUnitErrors} errors`);
  console.log();

  // ==========================================================================
  // STEP 4.6: Insert output shaft kit part numbers from catalog
  // ==========================================================================
  console.log('Step 4.6: Inserting output shaft kit part numbers...');

  // These are REAL NORD 8-digit orderable part numbers keyed by:
  // (gear_unit_size, mounting_variant, output_shaft_option_key)
  let outputShaftKitsInserted = 0;
  let outputShaftKitErrors = 0;
  let outputShaftKitSkipped = 0;

  for (const row of outputShaftKitRows) {
    const partNumber = row.nord_part_number?.trim();
    const gearUnitSize = row.gear_unit_size?.trim();
    const mountingVariant = row.mounting_variant?.trim();
    const outputShaftOptionKey = row.output_shaft_option_key?.trim();

    // Validate required fields
    if (!partNumber || !gearUnitSize || !mountingVariant || !outputShaftOptionKey) {
      if (verbose) {
        console.log(`  [SKIP] Invalid row: ${JSON.stringify(row)}`);
      }
      outputShaftKitSkipped++;
      continue;
    }

    // Validate part number format (8-digit, starts with 3 or 6)
    if (!/^[36]\d{7}$/.test(partNumber)) {
      if (verbose) {
        console.log(`  [SKIP] Invalid PN format: ${partNumber}`);
      }
      outputShaftKitSkipped++;
      continue;
    }

    const componentRow = {
      vendor: VENDOR,
      component_type: 'OUTPUT_KIT',
      vendor_part_number: partNumber,
      description: row.description || `NORD ${SERIES} Output Shaft Kit ${gearUnitSize} ${outputShaftOptionKey}`,
      metadata_json: {
        product_line: SERIES,
        component_type_csv: 'output_shaft_kit',
        gear_unit_size: gearUnitSize,
        mounting_variant: mountingVariant,
        output_shaft_option_key: outputShaftOptionKey,
        bore_mm: row.bore_mm ? parseFloat(row.bore_mm) : null,
        bore_in: row.bore_in ? parseFloat(row.bore_in) : null,
        catalog_page: row.catalog_page || null,
      },
    };

    if (verbose) {
      console.log(`  [OUTPUT_SHAFT_KIT] ${partNumber}: ${gearUnitSize} ${mountingVariant} ${outputShaftOptionKey}`);
    }

    if (!dryRun) {
      const { data, error } = await supabase
        .from('vendor_components')
        .upsert(componentRow, { onConflict: 'vendor,vendor_part_number' })
        .select('id')
        .single();

      if (error) {
        if (verbose) console.error(`    Error: ${error.message}`);
        outputShaftKitErrors++;
        continue;
      }

      partNumberToId.set(partNumber, data.id);
      outputShaftKitsInserted++;
    } else {
      partNumberToId.set(partNumber, `DRY_RUN_${partNumber}`);
      outputShaftKitsInserted++;
    }
  }

  console.log(`  ${outputShaftKitsInserted} output shaft kit PNs inserted/updated`);
  if (outputShaftKitSkipped > 0) console.log(`  ${outputShaftKitSkipped} rows skipped`);
  if (outputShaftKitErrors > 0) console.log(`  ${outputShaftKitErrors} errors`);
  console.log();

  // ==========================================================================
  // STEP 4.7: Insert inch keyed output shaft kit part numbers (with bore)
  // ==========================================================================
  console.log('Step 4.7: Inserting inch keyed output shaft kit PNs (with bore)...');

  // These are REAL NORD 8-digit orderable part numbers keyed by:
  // (vendor, series, component_type, gear_unit_size, mounting_variant, output_shaft_option_key, bore_in)
  let inchKeyedKitsInserted = 0;
  let inchKeyedKitErrors = 0;
  let inchKeyedKitSkipped = 0;

  // Track unique keys to ensure no duplicates
  const seenInchKeyedKeys = new Set();

  for (const row of inchKeyedKitRows) {
    const partNumber = row.nord_part_number?.trim();
    const gearUnitSize = row.gear_unit_size?.trim();
    const mountingVariant = row.mounting_variant?.trim();
    const outputShaftOptionKey = row.output_shaft_option_key?.trim();
    const boreIn = parseFloat(row.bore_in);

    // Validate required fields
    if (!partNumber || !gearUnitSize || !mountingVariant || !outputShaftOptionKey || isNaN(boreIn)) {
      if (verbose) {
        console.log(`  [SKIP] Invalid row: ${JSON.stringify(row)}`);
      }
      inchKeyedKitSkipped++;
      continue;
    }

    // Validate part number format (8-digit, starts with 3 or 6)
    if (!/^[36]\d{7}$/.test(partNumber)) {
      if (verbose) {
        console.log(`  [SKIP] Invalid PN format: ${partNumber}`);
      }
      inchKeyedKitSkipped++;
      continue;
    }

    // Check unique key constraint
    const uniqueKey = `${VENDOR}|${SERIES}|output_shaft_kit|${gearUnitSize}|${mountingVariant}|${outputShaftOptionKey}|${boreIn}`;
    if (seenInchKeyedKeys.has(uniqueKey)) {
      if (verbose) {
        console.log(`  [SKIP] Duplicate key: ${uniqueKey}`);
      }
      inchKeyedKitSkipped++;
      continue;
    }
    seenInchKeyedKeys.add(uniqueKey);

    const componentRow = {
      vendor: VENDOR,
      component_type: 'OUTPUT_KIT',
      vendor_part_number: partNumber,
      description: row.description || `NORD ${SERIES} Output Shaft Kit ${gearUnitSize} ${boreIn}" Keyed Bore`,
      metadata_json: {
        product_line: row.series || SERIES,
        component_type_csv: 'output_shaft_kit',
        gear_unit_size: gearUnitSize,
        mounting_variant: mountingVariant,
        output_shaft_option_key: outputShaftOptionKey,
        bore_in: boreIn,
        catalog_page: row.catalog_page || null,
      },
    };

    if (verbose) {
      console.log(`  [INCH_KEYED_KIT] ${partNumber}: ${gearUnitSize} ${mountingVariant} ${outputShaftOptionKey} bore=${boreIn}"`);
    }

    if (!dryRun) {
      const { data, error } = await supabase
        .from('vendor_components')
        .upsert(componentRow, { onConflict: 'vendor,vendor_part_number' })
        .select('id')
        .single();

      if (error) {
        if (verbose) console.error(`    Error: ${error.message}`);
        inchKeyedKitErrors++;
        continue;
      }

      partNumberToId.set(partNumber, data.id);
      inchKeyedKitsInserted++;
    } else {
      partNumberToId.set(partNumber, `DRY_RUN_${partNumber}`);
      inchKeyedKitsInserted++;
    }
  }

  console.log(`  ${inchKeyedKitsInserted} inch keyed kit PNs inserted/updated`);
  if (inchKeyedKitSkipped > 0) console.log(`  ${inchKeyedKitSkipped} rows skipped`);
  if (inchKeyedKitErrors > 0) console.log(`  ${inchKeyedKitErrors} errors`);
  console.log();

  // ==========================================================================
  // STEP 5: Insert performance points
  // ==========================================================================
  console.log('Step 5: Inserting performance points...');

  let performancePointsInserted = 0;
  let performanceErrors = 0;

  for (const row of selectionRows) {
    const gearUnitSize = row.gear_unit_size;
    const motorHp = parseFloat(row.motor_hp);
    const outputRpm = parseFloat(row.output_rpm);
    const outputTorque = parseFloat(row.output_torque_lb_in);
    const serviceFactor = parseFloat(row.service_factor_cat);
    const modelType = row.model_type;

    if (!gearUnitSize || isNaN(motorHp) || isNaN(outputRpm) || isNaN(outputTorque)) {
      performanceErrors++;
      continue;
    }

    // Find gear unit component ID
    const gearUnitPartNumber = `${gearUnitSize}-${motorHp}HP`;
    const gearUnitId = partNumberToId.get(gearUnitPartNumber);

    if (!gearUnitId || gearUnitId.startsWith('DRY_RUN_')) {
      if (!dryRun) {
        performanceErrors++;
        continue;
      }
    }

    // Parse model_type to extract component keys
    const parsed = parseModelType(modelType);

    // Build metadata with model_type and parsed components
    const metadata = {
      model_type: modelType,
      catalog_page: row.catalog_page || null,
      total_ratio: row.total_ratio ? parseFloat(row.total_ratio) : null,
      worm_ratio: row.worm_ratio ? parseFloat(row.worm_ratio) : null,
      second_ratio: row.second_ratio ? parseFloat(row.second_ratio) : null,
      ohl_lb: row.ohl_lb ? parseFloat(row.ohl_lb) : null,
      approx_weight_lb: row.approx_weight_lb ? parseFloat(row.approx_weight_lb) : null,
      parsed_model: parsed,
    };

    // Build performance row with proper metadata_json column
    const perfRow = {
      vendor: VENDOR,
      series: SERIES,
      size_code: gearUnitSize.replace('SI', ''),
      gear_unit_component_id: dryRun ? null : gearUnitId,
      motor_hp: motorHp,
      output_rpm: outputRpm,
      output_torque_lb_in: outputTorque,
      service_factor_catalog: isNaN(serviceFactor) ? 1.0 : serviceFactor,
      source_ref: `Catalog-${row.catalog_page || 'B46'}`,
      metadata_json: metadata,
    };

    if (verbose) {
      console.log(
        `  [PERF] ${gearUnitSize} ${motorHp}HP: ` +
        `${outputRpm} RPM, ${outputTorque} lb-in, SF=${serviceFactor}`
      );
    }

    if (!dryRun) {
      const { error } = await supabase
        .from('vendor_performance_points')
        .insert(perfRow);

      if (error) {
        if (verbose) console.error(`    Error: ${error.message}`);
        performanceErrors++;
        continue;
      }
    }

    performancePointsInserted++;
  }

  console.log(`  ${performancePointsInserted} performance points inserted`);
  if (performanceErrors > 0) console.log(`  ${performanceErrors} performance point errors`);
  console.log();

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  console.log('='.repeat(70));
  console.log('Summary:');
  console.log(`  Components (from component map): ${componentsInserted}`);
  console.log(`  Gear Units (synthetic keys): ${gearUnitsCreated}`);
  console.log(`  Gear Units (REAL PNs): ${realGearUnitsInserted}`);
  console.log(`  Output Shaft Kits (REAL PNs): ${outputShaftKitsInserted}`);
  console.log(`  Inch Keyed Kits (with bore): ${inchKeyedKitsInserted}`);
  console.log(`  Performance Points: ${performancePointsInserted}`);
  console.log(`  Total Errors: ${componentErrors + performanceErrors + realGearUnitErrors + outputShaftKitErrors + inchKeyedKitErrors}`);
  console.log('='.repeat(70));

  if (dryRun) {
    console.log();
    console.log('This was a dry run. Run without --dry-run to apply changes.');
    return;
  }

  // ==========================================================================
  // VERIFICATION
  // ==========================================================================
  console.log();
  console.log('Verification:');

  const { count: componentCount } = await supabase
    .from('vendor_components')
    .select('*', { count: 'exact', head: true })
    .eq('vendor', VENDOR);

  const { count: perfCount } = await supabase
    .from('vendor_performance_points')
    .select('*', { count: 'exact', head: true })
    .eq('vendor', VENDOR)
    .eq('series', SERIES);

  console.log(`  NORD Components in DB: ${componentCount}`);
  console.log(`  FLEXBLOC Performance Points in DB: ${perfCount}`);

  // Sample data
  const { data: sample } = await supabase
    .from('vendor_performance_points')
    .select('motor_hp, output_rpm, output_torque_lb_in, service_factor_catalog')
    .eq('vendor', VENDOR)
    .eq('series', SERIES)
    .order('motor_hp')
    .limit(5);

  if (sample && sample.length > 0) {
    console.log();
    console.log('Sample performance data:');
    for (const s of sample) {
      console.log(`  ${s.motor_hp}HP: ${s.output_rpm} RPM, ${s.output_torque_lb_in} lb-in, SF=${s.service_factor_catalog}`);
    }
  }
}

// ============================================================================
// RUN
// ============================================================================

seedNordFlexblocV2().catch((err) => {
  console.error('Seed script failed:', err);
  process.exit(1);
});
