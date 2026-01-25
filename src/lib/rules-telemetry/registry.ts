/**
 * RULES TELEMETRY - RULE REGISTRY
 *
 * Read-only registry of observed rules.
 * Initially populated with rules discovered through instrumentation.
 *
 * This is OBSERVATION ONLY - no behavior changes.
 */

import { RuleRegistryEntry, RuleSeverity } from './types';

/**
 * Registry of known rules.
 * This will be populated as rules are discovered through instrumentation.
 * For now, we define the structure and some known rules from code analysis.
 */
export const ruleRegistry: Map<string, RuleRegistryEntry> = new Map();

/**
 * Register a rule in the registry.
 * Called during instrumentation to build the inventory.
 */
export function registerRule(entry: RuleRegistryEntry): void {
  if (!ruleRegistry.has(entry.rule_id)) {
    ruleRegistry.set(entry.rule_id, entry);
  }
}

/**
 * Get a rule from the registry.
 */
export function getRule(ruleId: string): RuleRegistryEntry | undefined {
  return ruleRegistry.get(ruleId);
}

/**
 * Get all rules from the registry.
 */
export function getAllRules(): RuleRegistryEntry[] {
  return Array.from(ruleRegistry.values());
}

/**
 * Generate a stable rule ID from source location and message.
 * This creates a consistent ID that can be used across sessions.
 */
export function generateRuleId(sourceRef: string, message: string): string {
  // Create a hash-like ID from source + first 50 chars of message
  const messagePrefix = message.slice(0, 50).replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const sourceClean = sourceRef.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  return `${sourceClean}__${messagePrefix}`.slice(0, 80);
}

/**
 * Helper to create a registry entry with defaults.
 */
export function createRegistryEntry(
  ruleId: string,
  sourceRef: string,
  severity: RuleSeverity,
  options?: Partial<RuleRegistryEntry>
): RuleRegistryEntry {
  return {
    rule_id: ruleId,
    current_source_ref: sourceRef,
    default_severity: severity,
    product_scope: 'unknown',
    enabled: true,
    ...options,
  };
}

// ============================================================================
// PRE-REGISTERED RULES FROM CODE ANALYSIS
// These are rules identified during initial codebase exploration.
// They will be confirmed/updated as instrumentation captures actual events.
// ============================================================================

// Sliderbed validation rules (from rules.ts)
const SLIDERBED_RULES: RuleRegistryEntry[] = [
  {
    rule_id: 'sliderbed_conveyor_length_zero',
    current_source_ref: 'src/models/sliderbed_v1/rules.ts:144',
    default_severity: 'error',
    product_scope: 'belt',
    enabled: true,
    message_pattern: 'Conveyor Length (C-C) must be greater than 0',
  },
  {
    rule_id: 'sliderbed_belt_width_zero',
    current_source_ref: 'src/models/sliderbed_v1/rules.ts:152',
    default_severity: 'error',
    product_scope: 'belt',
    enabled: true,
    message_pattern: 'Belt Width must be greater than 0',
  },
  {
    rule_id: 'sliderbed_incline_negative',
    current_source_ref: 'src/models/sliderbed_v1/rules.ts:160',
    default_severity: 'error',
    product_scope: 'belt',
    enabled: true,
    message_pattern: 'Incline Angle must be >= 0',
  },
  {
    rule_id: 'sliderbed_material_form_required',
    current_source_ref: 'src/models/sliderbed_v1/rules.ts:355',
    default_severity: 'error',
    product_scope: 'belt',
    enabled: true,
    message_pattern: 'Material Form selection is required',
  },
  {
    rule_id: 'sliderbed_belt_selection_required',
    current_source_ref: 'src/models/sliderbed_v1/rules.ts:668',
    default_severity: 'error',
    product_scope: 'belt',
    enabled: true,
    message_pattern: 'Belt selection required',
  },
  {
    rule_id: 'sliderbed_incline_high_warning',
    current_source_ref: 'src/models/sliderbed_v1/rules.ts:1200',
    default_severity: 'warning',
    product_scope: 'belt',
    enabled: true,
    message_pattern: 'Incline angle exceeds typical limits',
  },
  {
    rule_id: 'sliderbed_speed_high_warning',
    current_source_ref: 'src/models/sliderbed_v1/rules.ts:1300',
    default_severity: 'warning',
    product_scope: 'belt',
    enabled: true,
    message_pattern: 'Belt speed exceeds 300 FPM',
  },
];

// Magnetic conveyor validation rules (from validation.ts)
const MAGNETIC_RULES: RuleRegistryEntry[] = [
  {
    rule_id: 'magnetic_invalid_material_aluminum',
    current_source_ref: 'src/models/magnetic_conveyor_v1/validation.ts:130',
    default_severity: 'error',
    product_scope: 'magnetic',
    enabled: true,
    message_pattern: 'Aluminum frame material is not compatible with magnetic conveyors',
  },
  {
    rule_id: 'magnetic_invalid_material_stainless',
    current_source_ref: 'src/models/magnetic_conveyor_v1/validation.ts:140',
    default_severity: 'error',
    product_scope: 'magnetic',
    enabled: true,
    message_pattern: 'Stainless Steel frame material is not compatible with magnetic conveyors',
  },
  {
    rule_id: 'magnetic_style_c_zero_height',
    current_source_ref: 'src/models/magnetic_conveyor_v1/validation.ts:150',
    default_severity: 'error',
    product_scope: 'magnetic',
    enabled: true,
    message_pattern: 'Style C requires zero infeed height',
  },
  {
    rule_id: 'magnetic_throughput_undersized',
    current_source_ref: 'src/models/magnetic_conveyor_v1/validation.ts:320',
    default_severity: 'warning',
    product_scope: 'magnetic',
    enabled: true,
    message_pattern: 'Conveyor may be undersized for throughput requirements',
  },
];

// Belt compatibility rules (from beltCompatibility.ts)
const BELT_COMPAT_RULES: RuleRegistryEntry[] = [
  {
    rule_id: 'belt_temp_exceeded',
    current_source_ref: 'src/lib/validation/beltCompatibility.ts:160',
    default_severity: 'error',
    product_scope: 'belt',
    enabled: true,
    message_pattern: 'Operating temperature exceeds belt rating',
  },
  {
    rule_id: 'belt_temp_near_max',
    current_source_ref: 'src/lib/validation/beltCompatibility.ts:170',
    default_severity: 'warning',
    product_scope: 'belt',
    enabled: true,
    message_pattern: 'Operating temperature is within 10°F of belt maximum',
  },
  {
    rule_id: 'belt_oil_incompatible',
    current_source_ref: 'src/lib/validation/beltCompatibility.ts:200',
    default_severity: 'error',
    product_scope: 'belt',
    enabled: true,
    message_pattern: 'Belt is not compatible with oil/fluid environment',
  },
];

// Output validation rules (from warnings.ts)
const OUTPUT_RULES: RuleRegistryEntry[] = [
  {
    rule_id: 'output_belt_min_pulley_violation',
    current_source_ref: 'src/models/sliderbed_v1/outputs_v2/warnings.ts:67',
    default_severity: 'warning',
    product_scope: 'belt',
    enabled: true,
    message_pattern: 'Pulley diameter is below belt minimum requirement',
  },
  {
    rule_id: 'output_drive_undersized',
    current_source_ref: 'src/models/sliderbed_v1/outputs_v2/warnings.ts:217',
    default_severity: 'warning',
    product_scope: 'belt',
    enabled: true,
    message_pattern: 'Drive may be undersized for application',
  },
  {
    rule_id: 'output_shaft_deflection_high',
    current_source_ref: 'src/models/sliderbed_v1/outputs_v2/warnings.ts:189',
    default_severity: 'warning',
    product_scope: 'belt',
    enabled: true,
    message_pattern: 'Shaft deflection exceeds recommended threshold',
  },
];

// Initialize registry with known rules
function initializeRegistry(): void {
  const allRules = [
    ...SLIDERBED_RULES,
    ...MAGNETIC_RULES,
    ...BELT_COMPAT_RULES,
    ...OUTPUT_RULES,
  ];

  for (const rule of allRules) {
    registerRule(rule);
  }
}

// Initialize on module load
initializeRegistry();

/**
 * Get rules filtered by product scope.
 */
export function getRulesByProduct(productScope: 'belt' | 'magnetic' | 'all' | 'unknown'): RuleRegistryEntry[] {
  return getAllRules().filter(rule =>
    rule.product_scope === productScope || rule.product_scope === 'all'
  );
}

/**
 * Get rules filtered by severity.
 */
export function getRulesBySeverity(severity: RuleSeverity): RuleRegistryEntry[] {
  return getAllRules().filter(rule => rule.default_severity === severity);
}

/**
 * Export registry as JSON for documentation.
 */
export function exportRegistryAsJson(): string {
  return JSON.stringify(getAllRules(), null, 2);
}
