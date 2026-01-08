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
 * Resolve BOM components for a given model type and motor HP.
 *
 * @param modelType - Model type string (e.g., "SK 1SI31 - 56C - 63S/4")
 * @param motorHp - Motor horsepower rating
 * @returns BOM resolution with component part numbers
 */
export async function resolveBom(
  modelType: string | null | undefined,
  motorHp: number
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

  // 1. Gear Unit - look up by size and HP
  // NOTE: Synthetic keys like "SI63-0.25HP" may exist in DB but are NOT real
  // NORD orderable part numbers. Only mark as "found" if we have a real PN.
  const gearUnitSyntheticKey = `${parsed.gear_unit_size}-${motorHp}HP`;
  const { data: gearUnit } = await supabase
    .from('vendor_components')
    .select('vendor_part_number, description')
    .eq('vendor', 'NORD')
    .eq('component_type', 'GEAR_UNIT')
    .eq('vendor_part_number', gearUnitSyntheticKey)
    .single();

  // A gear unit is only "found" if it has a real NORD orderable part number
  const gearUnitPn = gearUnit?.vendor_part_number || null;
  const hasRealGearUnitPn = isRealNordPartNumber(gearUnitPn);

  components.push({
    component_type: 'gear_unit',
    // Show synthetic key for reference, but it's not an orderable PN
    part_number: hasRealGearUnitPn ? gearUnitPn : null,
    description: gearUnit?.description || `NORD FLEXBLOC ${parsed.gear_unit_size} ${motorHp}HP`,
    found: hasRealGearUnitPn,
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

  result.components = components;
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
    const partNumber = component?.part_number || '—';
    const description = component?.description || '—';

    lines.push(`${index + 1}) ${item.label}: ${partNumber}  | ${description}`);

    // Track missing for notes section
    if (!component?.part_number || !component?.found) {
      let reason = 'No matching component found in component map.';
      if (item.type === 'output_shaft_kit') {
        reason = 'Select an output shaft option to resolve this.';
      } else if (item.type === 'gear_unit' && component?.part_number) {
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
 */
export function getMissingHint(componentType: BomComponent['component_type']): string {
  switch (componentType) {
    case 'output_shaft_kit':
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
