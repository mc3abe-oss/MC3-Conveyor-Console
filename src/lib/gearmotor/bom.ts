/**
 * BOM (Bill of Materials) Resolver for NORD FLEXBLOC Gearmotors
 *
 * Parses model_type strings and resolves component part numbers from the
 * vendor component catalog.
 *
 * Model type format: "SK [stages]SI[size] - [adapter_code] - [motor_frame]"
 * Examples:
 *   - "SK 1SI31 - 56C - 63S/4"
 *   - "SK 2SI50 - 140TC - 182T/4"
 */

import { supabase, isSupabaseConfigured } from '../supabase/client';

// ============================================================================
// MOUNTING VARIANT CONFIGURATION
// ============================================================================

/**
 * Default mounting variant for gear unit PN lookup.
 *
 * US market standard is inch hollow shaft (6039**2**xxx pattern).
 * This is used when no explicit shaft system selection has been made.
 *
 * Future: When user shaft selection is implemented, derive this from
 * the selected output shaft kit or a region/units setting.
 */
export const DEFAULT_MOUNTING_VARIANT = 'inch_hollow';

// ============================================================================
// OUTPUT SHAFT KIT REQUIREMENT LOGIC
// ============================================================================

/**
 * Gearmotor mounting style values (matches GearmotorMountingStyle enum).
 * Re-declared here to avoid circular dependency with schema.
 */
export const GEARMOTOR_MOUNTING_STYLE = {
  ShaftMounted: 'shaft_mounted',
  BottomMount: 'bottom_mount',
} as const;

/**
 * Determine if an Output Shaft Kit is required based on Drive Arrangement.
 *
 * Rule:
 * - Shaft mount (direct coupling): Output Shaft Kit NOT required
 * - Bottom mount (chain drive): Output Shaft Kit IS required
 *
 * The bottom_mount option implies chain drive coupling, which requires
 * an output shaft kit to connect the gearmotor to the drive shaft via chain.
 *
 * @param gearmotorMountingStyle - The mounting style from Drive Arrangement
 * @returns true if output shaft kit is required, false otherwise
 */
export function needsOutputShaftKit(
  gearmotorMountingStyle: string | null | undefined
): boolean {
  // Only bottom mount (chain drive) requires an output shaft kit
  return gearmotorMountingStyle === GEARMOTOR_MOUNTING_STYLE.BottomMount;
}

// ============================================================================
// TYPES
// ============================================================================

export interface ParsedModelType {
  worm_stages: number;
  gear_unit_size: string; // e.g., "SI31"
  size_code: string; // e.g., "31"
  adapter_code: string; // e.g., "56C"
  motor_frame: string; // e.g., "63S/4"
}

export interface BomComponent {
  component_type: 'gear_unit' | 'motor' | 'adapter' | 'output_shaft_kit';
  part_number: string | null;
  description: string | null;
  found: boolean;
}

export interface BomResolution {
  model_type: string;
  parsed: ParsedModelType | null;
  components: BomComponent[];
  complete: boolean; // All components resolved
}

// ============================================================================
// PART NUMBER VALIDATION
// ============================================================================

/**
 * Check if a part number is a real NORD orderable part number.
 *
 * Real NORD part numbers are numeric (e.g., 60691130, 31610012, 60395510).
 * Synthetic internal keys like "SI63-0.25HP" are NOT orderable part numbers.
 *
 * @param partNumber - The part number to check
 * @returns true if it's a real NORD orderable part number
 */
export function isRealNordPartNumber(partNumber: string | null | undefined): boolean {
  if (!partNumber) return false;
  // Real NORD part numbers are 8-digit numbers starting with 3 or 6
  return /^[36]\d{7}$/.test(partNumber);
}

// ============================================================================
// MODEL TYPE PARSER
// ============================================================================

/**
 * Parse model_type string to extract component identifiers.
 *
 * @param modelType - Full model string like "SK 1SI31 - 56C - 63S/4"
 * @returns Parsed components or null if parsing fails
 */
export function parseModelType(modelType: string | null | undefined): ParsedModelType | null {
  if (!modelType) return null;

  // Normalize: remove extra spaces, handle variations
  const normalized = modelType.replace(/\s+/g, ' ').trim();

  // Pattern: SK [stages]SI[size] - [adapter] - [motor_frame]
  // Examples:
  //   "SK 1SI31 - 56C - 63S/4"
  //   "SK 2SI50 - 140TC - 182T/4"
  //   "SK SI63 - 56C - 80S/4" (no stage number = 1)
  const match = normalized.match(/SK\s*(\d)?SI(\d+)\s*-\s*(\w+)\s*-\s*(\S+)/i);

  if (match) {
    return {
      worm_stages: parseInt(match[1] || '1', 10),
      gear_unit_size: `SI${match[2]}`,
      size_code: match[2],
      adapter_code: match[3],
      motor_frame: match[4],
    };
  }

  // Try alternative pattern without SK prefix
  const altMatch = normalized.match(/(\d)?SI(\d+).*?-\s*(\w+)\s*-\s*(\S+)/i);
  if (altMatch) {
    return {
      worm_stages: parseInt(altMatch[1] || '1', 10),
      gear_unit_size: `SI${altMatch[2]}`,
      size_code: altMatch[2],
      adapter_code: altMatch[3],
      motor_frame: altMatch[4],
    };
  }

  return null;
}

// ============================================================================
// BOM RESOLVER
// ============================================================================

/**
 * Options for BOM resolution with gear unit lookup.
 */
export interface ResolveBomOptions {
  /**
   * Gear ratio for gear unit PN lookup.
   *
   * IMPORTANT: This should be the WORM gear ratio (5, 7.5, 10, 12.5, 15, 20, 25, 30, 40, 50, 60, 80, 100),
   * NOT the total ratio (which includes helical stage).
   *
   * The gear_unit_part_numbers CSV stores worm ratios in the "total_ratio" column,
   * which is how gear unit PNs are keyed: (gear_unit_size, worm_ratio, mounting_variant).
   *
   * When calling from UI, use metadata_json.worm_ratio from the performance point.
   */
  totalRatio?: number;
  /** Mounting variant for gear unit PN lookup (defaults to inch_hollow for US market) */
  mountingVariant?: 'inch_hollow' | 'metric_hollow';
  /**
   * Gearmotor mounting style from Drive Arrangement.
   * Determines if output shaft kit is required:
   * - 'shaft_mounted': NOT required (direct coupling)
   * - 'bottom_mount': REQUIRED (chain drive)
   */
  gearmotorMountingStyle?: string;
  /**
   * Output shaft option selected in Drive Arrangement.
   * Only relevant when gearmotor_mounting_style = 'bottom_mount'.
   * Values: 'inch_keyed', 'metric_keyed', 'inch_hollow', 'metric_hollow'
   * If null/undefined and required, status = MISSING.
   * If set and required, attempt DB lookup for real NORD PN.
   */
  outputShaftOption?: string | null;
  /**
   * Gear unit size from selected gearmotor (e.g., 'SI31', 'SI40', 'SI63').
   * Required for output shaft kit PN lookup.
   */
  gearUnitSize?: string | null;
  /**
   * Output shaft bore size in inches for hollow shaft options.
   * Used for future bushing selection.
   */
  outputShaftBoreIn?: number | null;
  /**
   * Sprocket shaft diameter in inches for solid shaft (keyed) options.
   *
   * This is the diameter of the solid output shaft (journal) where the
   * drive sprocket mounts. This is the USER-SELECTABLE dimension.
   *
   * v2: When provided, resolver uses diameter-specific mapping.
   * If diameter selected but no mapping found -> Configured + PN pending (no fallback to v1).
   * If diameter NOT selected -> v1 fallback (size-only mapping).
   *
   * @deprecated Use plugInShaftStyle instead for style-based selection
   */
  sprocketShaftDiameterIn?: number | null;
  /**
   * Plug-in shaft style for solid shaft (keyed) options.
   *
   * For NORD FLEXBLOC, the plug-in shaft OD is FIXED by gear unit size.
   * What varies is the STYLE of the shaft kit:
   * - 'single': Standard single shaft
   * - 'double': Double shaft (output on both sides)
   * - 'flange_b5': Shaft for output flange B5
   *
   * When provided, resolver uses style-based mapping (preferred over diameter-based).
   */
  plugInShaftStyle?: string | null;
}

/**
 * Output shaft option labels for display.
 */
export const OUTPUT_SHAFT_OPTION_LABELS: Record<string, string> = {
  inch_keyed: 'Inch keyed bore',
  metric_keyed: 'Metric keyed bore',
  inch_hollow: 'Inch hollow',
  metric_hollow: 'Metric hollow',
};

// =============================================================================
// Output Shaft Kit PN Lookup (v1: size-only, v2: diameter-specific)
// =============================================================================

/**
 * Look up output shaft kit PN using v2 sprocket shaft diameter-specific mapping.
 *
 * v2 key: (vendor=NORD, component_type=OUTPUT_KIT, gear_unit_size, output_shaft_option_key, sprocket_shaft_diameter_in)
 *
 * @param gearUnitSize - e.g., 'SI31', 'SI40', 'SI63'
 * @param outputShaftOptionKey - e.g., 'inch_keyed', 'metric_keyed'
 * @param sprocketShaftDiameterIn - Sprocket shaft diameter in inches (e.g., 1.125)
 * @returns Part number and description if found, null otherwise
 */
async function lookupOutputShaftKitPNv2(
  gearUnitSize: string,
  outputShaftOptionKey: string,
  sprocketShaftDiameterIn: number
): Promise<{ vendor_part_number: string; description: string } | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    // v2 lookup: gear_unit_size + output_shaft_option_key + sprocket_shaft_diameter_in
    const { data, error } = await supabase
      .from('vendor_components')
      .select('vendor_part_number, description, metadata_json')
      .eq('vendor', 'NORD')
      .eq('component_type', 'OUTPUT_KIT')
      .filter('metadata_json->>gear_unit_size', 'eq', gearUnitSize)
      .filter('metadata_json->>output_shaft_option_key', 'eq', outputShaftOptionKey);

    if (error) {
      console.error('Output shaft kit v2 lookup error:', error.message);
      return null;
    }

    // Find matching sprocket shaft diameter with tolerance
    if (data && data.length > 0) {
      for (const row of data) {
        const meta = row.metadata_json as Record<string, unknown> | null;
        if (!meta) continue;

        const dbDiameter = meta.sprocket_shaft_diameter_in as number | null;
        if (dbDiameter === null || dbDiameter === undefined) continue;

        // Compare with tolerance (0.01 inches)
        if (Math.abs(dbDiameter - sprocketShaftDiameterIn) < 0.01) {
          if (isRealNordPartNumber(row.vendor_part_number)) {
            return {
              vendor_part_number: row.vendor_part_number,
              description: row.description,
            };
          }
        }
      }
    }

    return null;
  } catch (err) {
    console.error('Output shaft kit v2 lookup failed:', err);
    return null;
  }
}

/**
 * Look up output shaft kit PN using v1 size-only mapping.
 *
 * v1 key: (vendor=NORD, component_type=OUTPUT_KIT, gear_unit_size, output_shaft_option_key)
 * No sprocket_shaft_diameter_in in v1 rows (or sprocket_shaft_diameter_in is null).
 *
 * @param gearUnitSize - e.g., 'SI31', 'SI40', 'SI63'
 * @param outputShaftOptionKey - e.g., 'inch_keyed', 'metric_keyed'
 * @returns Part number and description if found, null otherwise
 */
async function lookupOutputShaftKitPNv1(
  gearUnitSize: string,
  outputShaftOptionKey: string
): Promise<{ vendor_part_number: string; description: string } | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    // v1 lookup: gear_unit_size + output_shaft_option_key, no sprocket_shaft_diameter_in
    const { data, error } = await supabase
      .from('vendor_components')
      .select('vendor_part_number, description, metadata_json')
      .eq('vendor', 'NORD')
      .eq('component_type', 'OUTPUT_KIT')
      .filter('metadata_json->>gear_unit_size', 'eq', gearUnitSize)
      .filter('metadata_json->>output_shaft_option_key', 'eq', outputShaftOptionKey);

    if (error) {
      console.error('Output shaft kit v1 lookup error:', error.message);
      return null;
    }

    // Find v1 row (no sprocket_shaft_diameter_in or null)
    if (data && data.length > 0) {
      for (const row of data) {
        const meta = row.metadata_json as Record<string, unknown> | null;
        // v1 rows have no sprocket_shaft_diameter_in or it's null
        if (meta?.sprocket_shaft_diameter_in === undefined || meta?.sprocket_shaft_diameter_in === null) {
          if (isRealNordPartNumber(row.vendor_part_number)) {
            return {
              vendor_part_number: row.vendor_part_number,
              description: row.description,
            };
          }
        }
      }
    }

    return null;
  } catch (err) {
    console.error('Output shaft kit v1 lookup failed:', err);
    return null;
  }
}

/**
 * Get available plug-in shaft styles for a given gear unit size and output shaft option.
 *
 * Used by UI to populate style dropdown. Returns distinct plug_in_shaft_style
 * values that have real NORD PNs in the database.
 *
 * Style values: 'single', 'double', 'flange_b5'
 *
 * @param gearUnitSize - e.g., 'SI31', 'SI40', 'SI63'
 * @param outputShaftOptionKey - e.g., 'inch_keyed'
 * @returns Array of available styles with their associated OD (fixed per gear unit)
 */
export async function getAvailableShaftStyles(
  gearUnitSize: string,
  outputShaftOptionKey: string
): Promise<Array<{ style: string; od_in: number | null }>> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('vendor_components')
      .select('vendor_part_number, metadata_json')
      .eq('vendor', 'NORD')
      .eq('component_type', 'OUTPUT_KIT')
      .filter('metadata_json->>gear_unit_size', 'eq', gearUnitSize)
      .filter('metadata_json->>output_shaft_option_key', 'eq', outputShaftOptionKey);

    if (error) {
      console.error('Available shaft styles lookup error:', error.message);
      return [];
    }

    // Extract distinct plug_in_shaft_style values that have real PNs
    const stylesMap = new Map<string, number | null>();
    if (data) {
      for (const row of data) {
        const meta = row.metadata_json as Record<string, unknown> | null;
        const style = meta?.plug_in_shaft_style as string | null;
        const od = meta?.plug_in_shaft_od_in as number | null;

        if (style && isRealNordPartNumber(row.vendor_part_number)) {
          // Store style with its OD (OD is fixed per gear unit size)
          if (!stylesMap.has(style)) {
            stylesMap.set(style, od);
          }
        }
      }
    }

    // Return as array of objects
    return Array.from(stylesMap.entries())
      .map(([style, od_in]) => ({ style, od_in }))
      .sort((a, b) => {
        // Sort order: single, double, flange_b5
        const order = ['single', 'double', 'flange_b5'];
        return order.indexOf(a.style) - order.indexOf(b.style);
      });
  } catch (err) {
    console.error('Available shaft styles lookup failed:', err);
    return [];
  }
}

/**
 * Look up output shaft kit PN using style-based mapping.
 *
 * Key: (vendor=NORD, component_type=OUTPUT_KIT, gear_unit_size, output_shaft_option_key, plug_in_shaft_style)
 *
 * @param gearUnitSize - e.g., 'SI31', 'SI40', 'SI63'
 * @param outputShaftOptionKey - e.g., 'inch_keyed', 'metric_keyed'
 * @param plugInShaftStyle - Style: 'single', 'double', 'flange_b5'
 * @returns Part number, description, and OD if found, null otherwise
 */
export async function lookupOutputShaftKitByStyle(
  gearUnitSize: string,
  outputShaftOptionKey: string,
  plugInShaftStyle: string
): Promise<{ vendor_part_number: string; description: string; plug_in_shaft_od_in: number | null } | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('vendor_components')
      .select('vendor_part_number, description, metadata_json')
      .eq('vendor', 'NORD')
      .eq('component_type', 'OUTPUT_KIT')
      .filter('metadata_json->>gear_unit_size', 'eq', gearUnitSize)
      .filter('metadata_json->>output_shaft_option_key', 'eq', outputShaftOptionKey)
      .filter('metadata_json->>plug_in_shaft_style', 'eq', plugInShaftStyle);

    if (error) {
      console.error('Output shaft kit style lookup error:', error.message);
      return null;
    }

    // Find matching row with real PN
    if (data && data.length > 0) {
      for (const row of data) {
        if (isRealNordPartNumber(row.vendor_part_number)) {
          const meta = row.metadata_json as Record<string, unknown> | null;
          return {
            vendor_part_number: row.vendor_part_number,
            description: row.description,
            plug_in_shaft_od_in: (meta?.plug_in_shaft_od_in as number) ?? null,
          };
        }
      }
    }

    return null;
  } catch (err) {
    console.error('Output shaft kit style lookup failed:', err);
    return null;
  }
}

/**
 * Get available sprocket shaft diameters for a given gear unit size and output shaft option.
 *
 * Used by UI to populate diameter dropdown. Returns distinct sprocket shaft diameter
 * values that have real NORD PNs in the database.
 *
 * @deprecated Use getAvailableShaftStyles instead for style-based selection
 * @param gearUnitSize - e.g., 'SI31', 'SI40', 'SI63'
 * @param outputShaftOptionKey - e.g., 'inch_keyed'
 * @returns Array of available sprocket shaft diameter values in inches
 */
export async function getAvailableShaftDiameters(
  gearUnitSize: string,
  outputShaftOptionKey: string
): Promise<number[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('vendor_components')
      .select('vendor_part_number, metadata_json')
      .eq('vendor', 'NORD')
      .eq('component_type', 'OUTPUT_KIT')
      .filter('metadata_json->>gear_unit_size', 'eq', gearUnitSize)
      .filter('metadata_json->>output_shaft_option_key', 'eq', outputShaftOptionKey);

    if (error) {
      console.error('Available sprocket shaft diameters lookup error:', error.message);
      return [];
    }

    // Extract distinct sprocket_shaft_diameter_in values that have real PNs
    const diameters = new Set<number>();
    if (data) {
      for (const row of data) {
        const meta = row.metadata_json as Record<string, unknown> | null;
        const diameter = meta?.sprocket_shaft_diameter_in as number | null;
        if (diameter !== null && diameter !== undefined && isRealNordPartNumber(row.vendor_part_number)) {
          diameters.add(diameter);
        }
      }
    }

    return Array.from(diameters).sort((a, b) => a - b);
  } catch (err) {
    console.error('Available sprocket shaft diameters lookup failed:', err);
    return [];
  }
}

/**
 * Resolve BOM components for a given model type and motor HP.
 *
 * @param modelType - Model type string (e.g., "SK 1SI31 - 56C - 63S/4")
 * @param motorHp - Motor horsepower rating
 * @param options - Optional parameters for gear unit PN lookup
 * @returns BOM resolution with component part numbers
 */
export async function resolveBom(
  modelType: string | null | undefined,
  motorHp: number,
  options?: ResolveBomOptions
): Promise<BomResolution> {
  const result: BomResolution = {
    model_type: modelType || '',
    parsed: null,
    components: [],
    complete: false,
  };

  // Parse model type
  const parsed = parseModelType(modelType);
  result.parsed = parsed;

  if (!parsed) {
    // Return empty BOM if parsing fails
    result.components = [
      { component_type: 'gear_unit', part_number: null, description: 'Unable to parse model', found: false },
      { component_type: 'motor', part_number: null, description: null, found: false },
      { component_type: 'adapter', part_number: null, description: null, found: false },
    ];
    return result;
  }

  if (!isSupabaseConfigured()) {
    result.components = [
      { component_type: 'gear_unit', part_number: null, description: 'Database not configured', found: false },
      { component_type: 'motor', part_number: null, description: null, found: false },
      { component_type: 'adapter', part_number: null, description: null, found: false },
    ];
    return result;
  }

  // Query components from database
  const components: BomComponent[] = [];

  // 1. Gear Unit - look up by (gear_unit_size, total_ratio, mounting_variant)
  // Real NORD gear unit PNs are keyed by these three fields in metadata_json.
  // If totalRatio is not provided, gear unit cannot be resolved.
  let gearUnitPn: string | null = null;
  let gearUnitDescription: string | null = null;
  let gearUnitFound = false;

  if (options?.totalRatio !== undefined) {
    // Query gear units by metadata fields
    const mountingVariant = options.mountingVariant || DEFAULT_MOUNTING_VARIANT;
    // Normalize total_ratio for comparison:
    // - Catalog ratios can be integers (5, 10, 80, 100) or decimals (7.5, 12.5)
    // - Round to 1 decimal place to handle floating point precision issues
    // IMPORTANT: totalRatio comes from catalog CSV (metadata_json.total_ratio), NOT SF-adjusted
    const normalizedRatio = Math.round(options.totalRatio * 10) / 10;

    const { data: gearUnits } = await supabase
      .from('vendor_components')
      .select('vendor_part_number, description, metadata_json')
      .eq('vendor', 'NORD')
      .eq('component_type', 'GEAR_UNIT');

    // Find matching gear unit by metadata
    // Key: (gear_unit_size, total_ratio, mounting_variant)
    if (gearUnits) {
      for (const gu of gearUnits) {
        const meta = gu.metadata_json as Record<string, unknown> | null;
        if (!meta) continue;

        const sizeMatch = meta.gear_unit_size === parsed.gear_unit_size;
        // Compare ratios with tolerance for floating point precision
        const dbRatio = Math.round((meta.total_ratio as number) * 10) / 10;
        const ratioMatch = dbRatio === normalizedRatio;
        const variantMatch = meta.mounting_variant === mountingVariant;

        if (sizeMatch && ratioMatch && variantMatch) {
          const pn = gu.vendor_part_number;
          if (isRealNordPartNumber(pn)) {
            gearUnitPn = pn;
            gearUnitDescription = gu.description;
            gearUnitFound = true;
            break;
          }
        }
      }
    }
  }

  // Build gear unit component entry
  components.push({
    component_type: 'gear_unit',
    part_number: gearUnitFound ? gearUnitPn : null,
    description: gearUnitDescription || `NORD FLEXBLOC ${parsed.gear_unit_size} ${motorHp}HP`,
    found: gearUnitFound,
  });

  // 2. Motor - look up by adapter code, motor frame, and HP
  // Motor part numbers in metadata_json have adapter_code, motor_frame, motor_hp
  const { data: motors } = await supabase
    .from('vendor_components')
    .select('vendor_part_number, description, metadata_json')
    .eq('vendor', 'NORD')
    .eq('component_type', 'MOTOR');

  // Find matching motor by metadata
  let motorMatch = null;
  if (motors) {
    for (const m of motors) {
      const meta = m.metadata_json as Record<string, unknown> | null;
      if (!meta) continue;

      const adapterMatch = meta.adapter_code === parsed.adapter_code;
      const frameMatch = meta.motor_frame === parsed.motor_frame;
      const hpMatch = Math.abs((meta.motor_hp as number) - motorHp) < 0.01;

      if (adapterMatch && frameMatch && hpMatch) {
        motorMatch = m;
        break;
      }
    }
  }

  components.push({
    component_type: 'motor',
    part_number: motorMatch?.vendor_part_number || null,
    description: motorMatch?.description || `${parsed.motor_frame} Motor ${motorHp}HP`,
    found: !!motorMatch,
  });

  // 3. Adapter - look up by adapter code
  const { data: adapters } = await supabase
    .from('vendor_components')
    .select('vendor_part_number, description, metadata_json')
    .eq('vendor', 'NORD')
    .eq('component_type', 'INPUT_ADAPTER');

  let adapterMatch = null;
  if (adapters) {
    for (const a of adapters) {
      const meta = a.metadata_json as Record<string, unknown> | null;
      if (!meta) continue;

      if (meta.adapter_code === parsed.adapter_code) {
        adapterMatch = a;
        break;
      }
    }
  }

  components.push({
    component_type: 'adapter',
    part_number: adapterMatch?.vendor_part_number || null,
    description: adapterMatch?.description || `NEMA ${parsed.adapter_code} Adapter`,
    found: !!adapterMatch,
  });

  // 4. Output Shaft Kit - conditional based on mounting style and user selection
  // States:
  // - NOT_REQUIRED: shaft_mounted (found=true, description="Not required...")
  // - MISSING: bottom_mount + no outputShaftOption (found=false, description="Required...")
  // - RESOLVED: bottom_mount + option selected + PN found
  // - CONFIGURED: bottom_mount + option selected but no PN found (PN pending)
  //
  // Lookup Precedence:
  // 1) If plug_in_shaft_style is selected -> use style-based lookup (preferred)
  // 2) If sprocket_shaft_diameter is selected -> use diameter-based lookup (v2, deprecated)
  // 3) If neither selected -> use size-only lookup (v1, fallback)
  const shaftKitRequired = needsOutputShaftKit(options?.gearmotorMountingStyle);
  const outputShaftOption = options?.outputShaftOption;
  const gearUnitSize = parsed?.gear_unit_size || options?.gearUnitSize;
  const plugInShaftStyle = options?.plugInShaftStyle;
  const sprocketShaftDiameterIn = options?.sprocketShaftDiameterIn;

  if (!shaftKitRequired) {
    // Shaft mount or other: Output shaft kit NOT required
    components.push({
      component_type: 'output_shaft_kit',
      part_number: null,
      description: 'Not required for shaft mount',
      found: true, // Mark as "found" so it doesn't show as Missing
    });
  } else if (!outputShaftOption) {
    // Bottom mount + chain drive: Required but not yet selected
    components.push({
      component_type: 'output_shaft_kit',
      part_number: null,
      description: 'Required for chain drive configuration',
      found: false,
    });
  } else {
    // Bottom mount + option selected: resolve PN
    const optionLabel = OUTPUT_SHAFT_OPTION_LABELS[outputShaftOption] || outputShaftOption;
    let shaftKitMatch: { vendor_part_number: string; description: string; plug_in_shaft_od_in?: number | null } | null = null;

    if (gearUnitSize) {
      // Style-based lookup (preferred) - takes precedence over diameter-based
      if (plugInShaftStyle) {
        shaftKitMatch = await lookupOutputShaftKitByStyle(gearUnitSize, outputShaftOption, plugInShaftStyle);
      } else if (sprocketShaftDiameterIn !== null && sprocketShaftDiameterIn !== undefined) {
        // v2 (deprecated): Sprocket shaft diameter selected -> use diameter-specific lookup
        shaftKitMatch = await lookupOutputShaftKitPNv2(gearUnitSize, outputShaftOption, sprocketShaftDiameterIn);
      } else {
        // v1: No style or diameter selected -> use size-only lookup
        shaftKitMatch = await lookupOutputShaftKitPNv1(gearUnitSize, outputShaftOption);
      }
    }

    if (shaftKitMatch) {
      // RESOLVED: Real PN found
      components.push({
        component_type: 'output_shaft_kit',
        part_number: shaftKitMatch.vendor_part_number,
        description: shaftKitMatch.description,
        found: true,
      });
    } else {
      // CONFIGURED: Option selected but no PN mapping found (PN pending)
      const styleNote = plugInShaftStyle
        ? ` ${plugInShaftStyle}`
        : sprocketShaftDiameterIn !== null && sprocketShaftDiameterIn !== undefined
          ? ` ${sprocketShaftDiameterIn}"`
          : '';
      components.push({
        component_type: 'output_shaft_kit',
        part_number: null,
        description: `Configured: ${optionLabel}${styleNote} (PN pending)`,
        found: true, // Mark as configured (not Missing)
      });
    }
  }

  result.components = components;
  // Complete = all required components found (output shaft kit is "found" if not required)
  result.complete = components.every(c => c.found);

  return result;
}

/**
 * Synchronous BOM resolution using pre-fetched metadata.
 * Use this when performance point metadata already contains parsed model info.
 *
 * @param metadata - Performance point metadata_json
 * @param motorHp - Motor horsepower
 * @returns Basic BOM info without database lookup
 */
export function resolveBomFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
  motorHp: number
): BomResolution {
  const modelType = (metadata?.model_type as string) || '';
  const parsed = (metadata?.parsed_model as ParsedModelType) || parseModelType(modelType);

  const result: BomResolution = {
    model_type: modelType,
    parsed,
    components: [],
    complete: false,
  };

  if (!parsed) {
    result.components = [
      { component_type: 'gear_unit', part_number: null, description: 'Unable to parse', found: false },
    ];
    return result;
  }

  // Build components from parsed info (without DB lookup)
  // NOTE: Synthetic keys like "SI63-0.25HP" are NOT real NORD orderable part numbers.
  // Gear units are marked as NOT found until real PNs are added to component map.
  result.components = [
    {
      component_type: 'gear_unit',
      part_number: null, // Synthetic key is not an orderable PN
      description: `NORD FLEXBLOC ${parsed.gear_unit_size} ${motorHp}HP`,
      found: false, // No real NORD PN available
    },
    {
      component_type: 'motor',
      part_number: null, // Would need DB lookup
      description: `${parsed.motor_frame} Motor ${motorHp}HP`,
      found: false,
    },
    {
      component_type: 'adapter',
      part_number: null, // Would need DB lookup
      description: `NEMA ${parsed.adapter_code} Adapter`,
      found: false,
    },
  ];

  return result;
}

// ============================================================================
// BOM COPY TEXT BUILDER
// ============================================================================

/**
 * Context for building BOM copy text
 */
export interface BomCopyContext {
  appliedSf: number;
  catalogSf: number;
  catalogPage?: string | null;
  motorHp?: number;
  hadMultipleMatches?: boolean; // Set if resolver had to pick deterministically from multiple
}

/**
 * Build a clean, order-friendly BOM text block for clipboard copy.
 *
 * Format:
 * NORD FLEXBLOC Gearmotor BOM
 * Selected Model: <model_type>
 * Catalog Page: <catalog_page if known>
 *
 * 1) Gear Unit: <part_number or —>  | <description>
 * 2) Motor (STD or BRK): <part_number or —> | <description>
 * 3) Adapter: <part_number or —> | <description>
 * 4) Output Shaft Kit: <part_number or —> | <description>
 *
 * Notes:
 * - Applied SF: <value>
 * - Catalog SF: <value>
 * - Any missing mappings listed
 *
 * @param bom - BOM resolution result
 * @param context - Additional context (SF values, catalog page)
 * @returns Formatted text string ready for clipboard
 */
export function buildBomCopyText(bom: BomResolution, context: BomCopyContext): string {
  const lines: string[] = [];

  // Header
  lines.push('NORD FLEXBLOC Gearmotor BOM');
  lines.push(`Selected Model: ${bom.model_type || '—'}`);
  if (context.catalogPage) {
    lines.push(`Catalog Page: ${context.catalogPage}`);
  }
  lines.push('');

  // Component labels in order
  const componentOrder: Array<{ type: BomComponent['component_type']; label: string }> = [
    { type: 'gear_unit', label: 'Gear Unit' },
    { type: 'motor', label: 'Motor (STD or BRK)' },
    { type: 'adapter', label: 'Adapter' },
    { type: 'output_shaft_kit', label: 'Output Shaft Kit' },
  ];

  // Track missing components
  const missingComponents: Array<{ label: string; reason: string }> = [];

  componentOrder.forEach((item, index) => {
    const component = bom.components.find(c => c.component_type === item.type);

    // Special handling for output shaft kit states
    if (item.type === 'output_shaft_kit') {
      const desc = component?.description || '';
      const partNumber = component?.part_number;

      // State 1: Not required (shaft mount) - description starts with "Not required"
      if (desc.startsWith('Not required')) {
        lines.push(`${index + 1}) ${item.label}: — (not required)  | ${desc}`);
        // Don't add to missingComponents - it's intentionally not required
        return;
      }

      // State 2: Resolved (bottom mount + option selected + PN found) - has real part_number
      if (partNumber && isRealNordPartNumber(partNumber)) {
        lines.push(`${index + 1}) ${item.label}: ${partNumber}  | ${desc}`);
        // Don't add to missingComponents - fully resolved
        return;
      }

      // State 3: Configured (bottom mount + option selected + no PN) - description starts with "Configured:"
      // v1: Do NOT include in Copy BOM when PN is pending - only include when resolved
      if (desc.startsWith('Configured:')) {
        lines.push(`${index + 1}) ${item.label}: — (PN pending, not included in order)  | ${desc}`);
        missingComponents.push({ label: `${item.label} PN`, reason: 'Catalog mapping pending. Do not order until resolved.' });
        return;
      }

      // State 4: Missing (bottom mount + no option) - found=false
      lines.push(`${index + 1}) ${item.label}: — (select in Drive Arrangement)  | ${desc}`);
      missingComponents.push({ label: `${item.label} PN`, reason: 'Select an output shaft option in Drive Arrangement.' });
      return;
    }

    // Normal handling for other components
    const partNumber = component?.part_number || '—';
    const description = component?.description || '—';

    lines.push(`${index + 1}) ${item.label}: ${partNumber}  | ${description}`);

    // Track missing for notes section
    if (!component?.part_number || !component?.found) {
      let reason = 'No matching component found in component map.';
      if (item.type === 'gear_unit' && component?.part_number) {
        // Has synthetic PN but not found in DB
        reason = 'Gear unit PN mapping not keyed for this model yet.';
      }
      missingComponents.push({ label: `${item.label} PN`, reason });
    }
  });

  lines.push('');

  // Notes section
  lines.push('Notes:');
  lines.push(`- Applied SF: ${context.appliedSf}`);
  lines.push(`- Catalog SF: ${context.catalogSf}`);

  // Multiple matches note (if applicable)
  if (context.hadMultipleMatches) {
    lines.push('- NOTE: Multiple matches existed; selected first deterministic match.');
  }

  // Missing mappings
  if (missingComponents.length > 0) {
    missingComponents.forEach(m => {
      lines.push(`- MISSING: ${m.label} (${m.reason})`);
    });
  }

  return lines.join('\n');
}

/**
 * Get a human-readable hint for why a component is missing.
 *
 * @param componentType - The type of BOM component
 * @param isRequired - For output_shaft_kit, whether it's actually required (based on mounting style)
 * @returns Human-readable hint string
 */
export function getMissingHint(
  componentType: BomComponent['component_type'],
  isRequired: boolean = true
): string {
  switch (componentType) {
    case 'output_shaft_kit':
      // If not required, no hint needed (but caller should check found status first)
      if (!isRequired) {
        return 'Not required for shaft mount configuration.';
      }
      return 'Select an output shaft option to resolve this.';
    case 'gear_unit':
      return 'Gear unit PN mapping not keyed for this model yet.';
    case 'motor':
    case 'adapter':
    default:
      return 'No matching component found in component map.';
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default resolveBom;
