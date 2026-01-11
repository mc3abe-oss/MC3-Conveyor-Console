/**
 * NORD Coverage Generator
 *
 * Enumerates valid application combinations and runs them through the BOM resolver
 * to determine coverage status: resolved, ambiguous, unresolved, or invalid.
 *
 * This is a read-only analysis tool. It does NOT modify resolver logic.
 */

import {
  resolveBom,
  needsOutputShaftKit,
  isRealNordPartNumber,
  GEARMOTOR_MOUNTING_STYLE,
  DEFAULT_MOUNTING_VARIANT,
  type ResolveBomOptions,
  type BomResolution,
} from '../gearmotor/bom';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClientAny = any;

// ============================================================================
// TYPES
// ============================================================================

export type CoverageStatus = 'resolved' | 'ambiguous' | 'unresolved' | 'invalid';

export interface CoverageInputs {
  series: string;
  gear_unit_size: string;
  gearmotor_mounting_style: string;
  output_shaft_option: string | null;
  plug_in_shaft_style: string | null;
  total_ratio: number | null;
  motor_hp: number | null;
}

export interface CoverageResult {
  case_key: string;
  inputs: CoverageInputs;
  status: CoverageStatus;
  resolved_pns: string[];
  message: string | null;
  components: Record<string, {
    found: boolean;
    part_number: string | null;
    description: string | null;
  }>;
}

export interface CoverageSummary {
  total: number;
  resolved: number;
  ambiguous: number;
  unresolved: number;
  invalid: number;
  generated_at: string;
}

export interface CoverageGenerationResult {
  summary: CoverageSummary;
  errors: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Maximum coverage cases to generate (guardrail)
const MAX_COVERAGE_CASES = 1000;

// Valid mounting styles
const MOUNTING_STYLES = [
  GEARMOTOR_MOUNTING_STYLE.ShaftMounted,
  GEARMOTOR_MOUNTING_STYLE.BottomMount,
];

// Valid output shaft options (only relevant for bottom_mount)
const OUTPUT_SHAFT_OPTIONS = [
  'inch_keyed',
  'metric_keyed',
  'inch_hollow',
  'metric_hollow',
];

// Valid plug-in shaft styles (only for keyed options)
const PLUG_IN_SHAFT_STYLES = ['single', 'double', 'flange_b5'];

// ============================================================================
// HELPER: Generate case key from inputs
// ============================================================================

export function generateCaseKey(inputs: CoverageInputs): string {
  const parts = [
    inputs.series,
    inputs.gear_unit_size,
    inputs.gearmotor_mounting_style,
    inputs.output_shaft_option || 'none',
    inputs.plug_in_shaft_style || 'none',
    inputs.total_ratio?.toString() || 'any',
    inputs.motor_hp?.toString() || 'any',
  ];
  return parts.join('|');
}

// ============================================================================
// ENUMERATE INPUT SPACE
// ============================================================================

interface EnumerationContext {
  gearUnitSizes: string[];
  ratios: number[];
  motorHps: number[];
}

/**
 * Get distinct values from vendor_components for enumeration.
 */
async function getEnumerationContext(
  supabase: SupabaseClientAny
): Promise<EnumerationContext> {
  // Get distinct gear unit sizes from vendor_components
  const { data: gearUnitData } = await supabase
    .from('vendor_components')
    .select('metadata_json')
    .eq('vendor', 'NORD')
    .eq('component_type', 'GEAR_UNIT');

  const gearUnitSizes = new Set<string>();
  if (gearUnitData) {
    for (const row of gearUnitData) {
      const meta = row.metadata_json as Record<string, unknown> | null;
      const size = meta?.gear_unit_size as string | null;
      if (size) {
        gearUnitSizes.add(size);
      }
    }
  }

  // Get distinct ratios from performance points
  const { data: perfData } = await supabase
    .from('vendor_performance_points')
    .select('metadata_json, motor_hp')
    .eq('vendor', 'NORD')
    .eq('series', 'FLEXBLOC');

  const ratios = new Set<number>();
  const motorHps = new Set<number>();
  if (perfData) {
    for (const row of perfData) {
      const meta = row.metadata_json as Record<string, unknown> | null;
      const ratio = meta?.worm_ratio as number | null;
      if (ratio) {
        ratios.add(ratio);
      }
      if (row.motor_hp) {
        motorHps.add(parseFloat(row.motor_hp));
      }
    }
  }

  return {
    gearUnitSizes: Array.from(gearUnitSizes).sort(),
    ratios: Array.from(ratios).sort((a, b) => a - b),
    motorHps: Array.from(motorHps).sort((a, b) => a - b),
  };
}

/**
 * Generate coverage input combinations from vendor_components data.
 *
 * Bounded by MAX_COVERAGE_CASES to prevent runaway enumeration.
 */
export async function enumerateCoverageInputs(
  supabase: SupabaseClientAny
): Promise<CoverageInputs[]> {
  const ctx = await getEnumerationContext(supabase);
  const inputs: CoverageInputs[] = [];

  // For each gear unit size...
  for (const gearUnitSize of ctx.gearUnitSizes) {
    // For each mounting style...
    for (const mountingStyle of MOUNTING_STYLES) {
      const needsOsk = needsOutputShaftKit(mountingStyle);

      if (!needsOsk) {
        // Shaft mounted: no output shaft kit needed
        // Just test gear unit + motor + adapter resolution
        // Use first motor HP for testing (we just need one representative)
        const motorHp = ctx.motorHps[0] || 0.5;
        const ratio = ctx.ratios[0] || 10;

        inputs.push({
          series: 'FLEXBLOC',
          gear_unit_size: gearUnitSize,
          gearmotor_mounting_style: mountingStyle,
          output_shaft_option: null,
          plug_in_shaft_style: null,
          total_ratio: ratio,
          motor_hp: motorHp,
        });
      } else {
        // Bottom mount: output shaft kit required
        // Test each output shaft option
        for (const osk of OUTPUT_SHAFT_OPTIONS) {
          const isKeyed = osk === 'inch_keyed' || osk === 'metric_keyed';

          if (isKeyed) {
            // For keyed options, test each plug-in shaft style
            for (const style of PLUG_IN_SHAFT_STYLES) {
              inputs.push({
                series: 'FLEXBLOC',
                gear_unit_size: gearUnitSize,
                gearmotor_mounting_style: mountingStyle,
                output_shaft_option: osk,
                plug_in_shaft_style: style,
                total_ratio: ctx.ratios[0] || 10,
                motor_hp: ctx.motorHps[0] || 0.5,
              });
            }
          } else {
            // For hollow options, just test without shaft style
            inputs.push({
              series: 'FLEXBLOC',
              gear_unit_size: gearUnitSize,
              gearmotor_mounting_style: mountingStyle,
              output_shaft_option: osk,
              plug_in_shaft_style: null,
              total_ratio: ctx.ratios[0] || 10,
              motor_hp: ctx.motorHps[0] || 0.5,
            });
          }
        }
      }

      // Guardrail: stop if we exceed max
      if (inputs.length >= MAX_COVERAGE_CASES) {
        console.warn(`Coverage enumeration capped at ${MAX_COVERAGE_CASES} cases`);
        return inputs;
      }
    }
  }

  return inputs;
}

// ============================================================================
// RUN RESOLVER AND CLASSIFY
// ============================================================================

/**
 * Run a single coverage test case through the BOM resolver.
 */
export async function runCoverageCase(
  inputs: CoverageInputs
): Promise<CoverageResult> {
  const caseKey = generateCaseKey(inputs);

  // Build a synthetic model_type for the resolver
  // Format: "SK [stages]SI[size] - [adapter] - [motor_frame]"
  // We use a representative model type since we're testing component resolution
  const modelType = `SK 1${inputs.gear_unit_size} - 56C - 63S/4`;

  const options: ResolveBomOptions = {
    totalRatio: inputs.total_ratio || undefined,
    mountingVariant: DEFAULT_MOUNTING_VARIANT as 'inch_hollow' | 'metric_hollow',
    gearmotorMountingStyle: inputs.gearmotor_mounting_style,
    outputShaftOption: inputs.output_shaft_option,
    gearUnitSize: inputs.gear_unit_size,
    plugInShaftStyle: inputs.plug_in_shaft_style,
  };

  let bom: BomResolution;
  try {
    bom = await resolveBom(modelType, inputs.motor_hp || 0.5, options);
  } catch (err) {
    // Resolver error = invalid combination
    return {
      case_key: caseKey,
      inputs,
      status: 'invalid',
      resolved_pns: [],
      message: `Resolver error: ${err instanceof Error ? err.message : 'unknown'}`,
      components: {},
    };
  }

  // Extract component results
  const components: Record<string, { found: boolean; part_number: string | null; description: string | null }> = {};
  const resolvedPns: string[] = [];
  let unresolvedCount = 0;
  let ambiguousCount = 0;

  for (const comp of bom.components) {
    components[comp.component_type] = {
      found: comp.found,
      part_number: comp.part_number,
      description: comp.description,
    };

    if (comp.found && comp.part_number && isRealNordPartNumber(comp.part_number)) {
      resolvedPns.push(comp.part_number);
    } else if (!comp.found) {
      unresolvedCount++;
    }
  }

  // Determine status
  let status: CoverageStatus;
  let message: string | null = null;

  if (bom.complete && unresolvedCount === 0) {
    status = 'resolved';
    message = `All ${bom.components.length} components resolved`;
  } else if (ambiguousCount > 0) {
    status = 'ambiguous';
    message = `${ambiguousCount} component(s) have multiple matches`;
  } else if (unresolvedCount > 0) {
    status = 'unresolved';
    const missing = bom.components
      .filter((c: { found: boolean }) => !c.found)
      .map((c: { component_type: string }) => c.component_type)
      .join(', ');
    message = `Missing: ${missing}`;
  } else {
    status = 'invalid';
    message = 'Unknown resolution state';
  }

  return {
    case_key: caseKey,
    inputs,
    status,
    resolved_pns: resolvedPns,
    message,
    components,
  };
}

// ============================================================================
// FULL COVERAGE GENERATION
// ============================================================================

/**
 * Generate full coverage analysis.
 *
 * 1. Enumerate all valid input combinations
 * 2. Run each through the resolver
 * 3. Store results in nord_coverage_cases table
 */
export async function generateCoverage(
  supabase: SupabaseClientAny
): Promise<CoverageGenerationResult> {
  console.log('[Coverage] Starting coverage generation...');
  const errors: string[] = [];

  // Step 1: Enumerate inputs
  const inputs = await enumerateCoverageInputs(supabase);
  console.log(`[Coverage] Enumerated ${inputs.length} test cases`);

  // Step 2: Clear existing coverage data
  const { error: deleteError } = await supabase
    .from('nord_coverage_cases')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (deleteError) {
    console.error('[Coverage] Failed to clear existing data:', deleteError.message);
    throw new Error(`Failed to clear coverage data: ${deleteError.message}`);
  }

  // Step 3: Run each case and collect results
  const results: CoverageResult[] = [];
  const summary: CoverageSummary = {
    total: inputs.length,
    resolved: 0,
    ambiguous: 0,
    unresolved: 0,
    invalid: 0,
    generated_at: new Date().toISOString(),
  };

  for (const input of inputs) {
    const result = await runCoverageCase(input);
    results.push(result);

    // Update summary counts
    switch (result.status) {
      case 'resolved':
        summary.resolved++;
        break;
      case 'ambiguous':
        summary.ambiguous++;
        break;
      case 'unresolved':
        summary.unresolved++;
        break;
      case 'invalid':
        summary.invalid++;
        break;
    }
  }

  // Step 4: Insert results in batches
  const batchSize = 100;
  for (let i = 0; i < results.length; i += batchSize) {
    const batch = results.slice(i, i + batchSize);
    const rows = batch.map(r => ({
      case_key: r.case_key,
      inputs_json: r.inputs,
      status: r.status,
      resolved_pns: r.resolved_pns,
      message: r.message,
      components_json: r.components,
      last_checked_at: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase
      .from('nord_coverage_cases')
      .insert(rows);

    if (insertError) {
      console.error(`[Coverage] Batch insert error at ${i}:`, insertError.message);
      errors.push(insertError.message);
      // Continue with other batches
    }
  }

  console.log('[Coverage] Generation complete:', summary);
  return { summary, errors };
}

// ============================================================================
// QUERY COVERAGE
// ============================================================================

export interface CoverageCase {
  id: string;
  case_key: string;
  inputs_json: CoverageInputs;
  status: CoverageStatus;
  resolved_pns: string[];
  message: string | null;
  components_json: Record<string, { found: boolean; part_number: string | null; description: string | null }>;
  last_checked_at: string;
}

/**
 * Get coverage summary counts.
 */
export async function getCoverageSummary(
  supabase: SupabaseClientAny
): Promise<CoverageSummary | null> {
  const { data, error } = await supabase
    .from('nord_coverage_cases')
    .select('status, last_checked_at');

  if (error || !data) {
    return null;
  }

  const summary: CoverageSummary = {
    total: data.length,
    resolved: 0,
    ambiguous: 0,
    unresolved: 0,
    invalid: 0,
    generated_at: data[0]?.last_checked_at || new Date().toISOString(),
  };

  for (const row of data) {
    switch (row.status) {
      case 'resolved':
        summary.resolved++;
        break;
      case 'ambiguous':
        summary.ambiguous++;
        break;
      case 'unresolved':
        summary.unresolved++;
        break;
      case 'invalid':
        summary.invalid++;
        break;
    }
  }

  return summary;
}

/**
 * Get coverage cases with optional status filter.
 */
export async function getCoverageCases(
  supabase: SupabaseClientAny,
  statusFilter?: CoverageStatus
): Promise<CoverageCase[]> {
  let query = supabase
    .from('nord_coverage_cases')
    .select('*')
    .order('status', { ascending: true })
    .order('case_key', { ascending: true });

  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[Coverage] Query error:', error.message);
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((row: any) => ({
    id: row.id,
    case_key: row.case_key,
    inputs_json: row.inputs_json as CoverageInputs,
    status: row.status as CoverageStatus,
    resolved_pns: (row.resolved_pns as string[]) || [],
    message: row.message,
    components_json: row.components_json as Record<string, { found: boolean; part_number: string | null; description: string | null }>,
    last_checked_at: row.last_checked_at,
  }));
}
