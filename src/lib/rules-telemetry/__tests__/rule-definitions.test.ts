/**
 * Tests for rule-definitions.ts — validates the comprehensive rule registry.
 */

import {
  RULE_DEFINITIONS,
  RULE_DEFINITIONS_MAP,
  TOTAL_RULE_COUNT,
  CATEGORY_LABELS,
  type RuleDefinition,
  type RuleCategory,
} from '../rule-definitions';

describe('RULE_DEFINITIONS', () => {
  it('contains at least 150 rule definitions', () => {
    expect(RULE_DEFINITIONS.length).toBeGreaterThanOrEqual(150);
  });

  it('TOTAL_RULE_COUNT matches array length', () => {
    expect(TOTAL_RULE_COUNT).toBe(RULE_DEFINITIONS.length);
  });

  it('has no duplicate rule_ids', () => {
    const ids = RULE_DEFINITIONS.map((r) => r.rule_id);
    const uniqueIds = new Set(ids);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dupes).toEqual([]);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('RULE_DEFINITIONS_MAP has same count as array', () => {
    expect(RULE_DEFINITIONS_MAP.size).toBe(RULE_DEFINITIONS.length);
  });

  it('every definition has required fields', () => {
    for (const def of RULE_DEFINITIONS) {
      expect(def.rule_id).toBeTruthy();
      expect(def.human_name).toBeTruthy();
      expect(def.check_description).toBeTruthy();
      expect(def.category).toBeTruthy();
      expect(def.field).toBeTruthy();
      expect(['error', 'warning', 'info']).toContain(def.default_severity);
      expect(def.source_function).toBeTruthy();
      expect(def.source_line).toBeGreaterThan(0);
    }
  });

  it('every category has a label', () => {
    const categories = new Set(RULE_DEFINITIONS.map((r) => r.category));
    for (const cat of categories) {
      expect(CATEGORY_LABELS[cat]).toBeTruthy();
    }
  });

  it('categories cover all expected groupings', () => {
    const categories = new Set(RULE_DEFINITIONS.map((r) => r.category));
    // At minimum these categories should exist
    expect(categories.has('geometry')).toBe(true);
    expect(categories.has('pulley')).toBe(true);
    expect(categories.has('speed')).toBe(true);
    expect(categories.has('material')).toBe(true);
    expect(categories.has('belt')).toBe(true);
    expect(categories.has('safety')).toBe(true);
    expect(categories.has('application')).toBe(true);
    expect(categories.has('parameter')).toBe(true);
  });

  it('rule_ids follow naming convention (lowercase, underscores)', () => {
    for (const def of RULE_DEFINITIONS) {
      expect(def.rule_id).toMatch(/^[a-z0-9_]+$/);
    }
  });

  it('source_functions are valid function names', () => {
    const validFunctions = new Set([
      'validateInputs',
      'validateParameters',
      'applyApplicationRules',
      'applyHeightWarnings',
      'validateTob',
      'applyPciOutputRules',
      'applyHubConnectionRules',
    ]);
    for (const def of RULE_DEFINITIONS) {
      expect(validFunctions.has(def.source_function)).toBe(true);
    }
  });

  it('has definitions from all major source functions', () => {
    const sourceFns = new Set(RULE_DEFINITIONS.map((r) => r.source_function));
    expect(sourceFns.has('validateInputs')).toBe(true);
    expect(sourceFns.has('validateParameters')).toBe(true);
    expect(sourceFns.has('applyApplicationRules')).toBe(true);
    expect(sourceFns.has('applyHeightWarnings')).toBe(true);
  });

  it('RULE_DEFINITIONS_MAP allows lookup by rule_id', () => {
    const first = RULE_DEFINITIONS[0];
    const found = RULE_DEFINITIONS_MAP.get(first.rule_id);
    expect(found).toBe(first);
  });

  // Distribution checks
  it('has a reasonable distribution across severities', () => {
    const errors = RULE_DEFINITIONS.filter((r) => r.default_severity === 'error');
    const warnings = RULE_DEFINITIONS.filter((r) => r.default_severity === 'warning');
    const infos = RULE_DEFINITIONS.filter((r) => r.default_severity === 'info');

    // Most rules should be errors (input validation)
    expect(errors.length).toBeGreaterThan(50);
    // Significant number of warnings
    expect(warnings.length).toBeGreaterThan(30);
    // Some info rules
    expect(infos.length).toBeGreaterThanOrEqual(0);
    // All accounted for
    expect(errors.length + warnings.length + infos.length).toBe(RULE_DEFINITIONS.length);
  });
});
