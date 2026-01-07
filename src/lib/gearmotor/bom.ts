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
  const gearUnitPartNumber = `${parsed.gear_unit_size}-${motorHp}HP`;
  const { data: gearUnit } = await supabase
    .from('vendor_components')
    .select('vendor_part_number, description')
    .eq('vendor', 'NORD')
    .eq('component_type', 'GEAR_UNIT')
    .eq('vendor_part_number', gearUnitPartNumber)
    .single();

  components.push({
    component_type: 'gear_unit',
    part_number: gearUnit?.vendor_part_number || gearUnitPartNumber,
    description: gearUnit?.description || `NORD FLEXBLOC ${parsed.gear_unit_size} ${motorHp}HP`,
    found: !!gearUnit,
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
  result.components = [
    {
      component_type: 'gear_unit',
      part_number: `${parsed.gear_unit_size}-${motorHp}HP`,
      description: `NORD FLEXBLOC ${parsed.gear_unit_size} ${motorHp}HP`,
      found: true, // Synthetic, always "found"
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
// EXPORTS
// ============================================================================

export default resolveBom;
