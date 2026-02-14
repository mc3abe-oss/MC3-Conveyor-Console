/**
 * Tests for rules-manager-data.ts — validates enriched rule data for the Rules Manager admin page.
 */

import {
  MANAGER_RULES,
  MANAGER_RULES_MAP,
  MANAGER_RULE_COUNT,
  SECTIONS,
  SECTION_MAP,
  type RuleSection,
  type ManagerRule,
} from '../rules-manager-data';
import {
  RULE_DEFINITIONS,
  TOTAL_RULE_COUNT,
  CATEGORY_LABELS,
  type RuleCategory,
} from '../rule-definitions';

describe('MANAGER_RULES', () => {
  it('has same count as RULE_DEFINITIONS', () => {
    expect(MANAGER_RULES.length).toBe(RULE_DEFINITIONS.length);
    expect(MANAGER_RULE_COUNT).toBe(TOTAL_RULE_COUNT);
  });

  it('MANAGER_RULES_MAP has same count as array', () => {
    expect(MANAGER_RULES_MAP.size).toBe(MANAGER_RULES.length);
  });

  it('every rule has an id matching a rule definition', () => {
    for (const rule of MANAGER_RULES) {
      const def = RULE_DEFINITIONS.find((d) => d.rule_id === rule.id);
      expect(def).toBeDefined();
    }
  });

  it('every rule has a valid section', () => {
    const validSections: RuleSection[] = ['Application', 'Physical', 'Drive & Controls', 'Build Options'];
    for (const rule of MANAGER_RULES) {
      expect(validSections).toContain(rule.section);
    }
  });

  it('every rule has a non-empty category label', () => {
    for (const rule of MANAGER_RULES) {
      expect(rule.category).toBeTruthy();
      expect(typeof rule.category).toBe('string');
    }
  });

  it('every rule has non-empty condition, action, and threshold', () => {
    for (const rule of MANAGER_RULES) {
      expect(rule.condition).toBeTruthy();
      expect(rule.action).toBeTruthy();
      expect(rule.threshold).toBeTruthy();
    }
  });

  it('every rule has a valid severity', () => {
    for (const rule of MANAGER_RULES) {
      expect(['error', 'warning', 'info']).toContain(rule.severity);
    }
  });

  it('every rule has at least one field', () => {
    for (const rule of MANAGER_RULES) {
      expect(rule.fields.length).toBeGreaterThanOrEqual(1);
      expect(rule.fields[0]).toBeTruthy();
    }
  });

  it('no rules fell through to the fallback enrichment', () => {
    const fallbackRules = MANAGER_RULES.filter(
      (r) => r.hasTodo && r.todoNote?.startsWith('Missing enrichment data')
    );
    expect(fallbackRules).toEqual([]);
  });

  it('has exactly 7 rules with hasTodo=true', () => {
    const todoRules = MANAGER_RULES.filter((r) => r.hasTodo);
    expect(todoRules.length).toBe(7);
  });

  it('every hasTodo rule has a non-empty todoNote', () => {
    const todoRules = MANAGER_RULES.filter((r) => r.hasTodo);
    for (const rule of todoRules) {
      expect(rule.todoNote).toBeTruthy();
      expect(typeof rule.todoNote).toBe('string');
    }
  });

  it('hasTodo rules are the expected engineering review items', () => {
    const todoIds = MANAGER_RULES.filter((r) => r.hasTodo).map((r) => r.id).sort();
    expect(todoIds).toEqual([
      'ar_belt_catalog_drive_pulley_min',
      'ar_belt_catalog_tail_pulley_min',
      'vi_belt_speed_zero',
      'vi_drive_rpm_zero',
      'vi_part_length_required',
      'vi_part_weight_required',
      'vi_part_width_required',
    ]);
  });
});

describe('SECTIONS', () => {
  it('has 4 sections in tab order', () => {
    expect(SECTIONS).toEqual(['Application', 'Physical', 'Drive & Controls', 'Build Options']);
  });
});

describe('SECTION_MAP', () => {
  it('maps all 18 categories to sections', () => {
    const allCategories: RuleCategory[] = [
      'application', 'material', 'safety', 'height',
      'geometry', 'pulley', 'belt', 'shaft', 'frame', 'pci',
      'speed', 'drive', 'sprocket', 'parameter',
      'cleat', 'support', 'return_support', 'premium',
    ];
    for (const cat of allCategories) {
      expect(SECTION_MAP[cat]).toBeTruthy();
    }
  });

  it('every category used in RULE_DEFINITIONS has a section mapping', () => {
    const usedCategories = new Set(RULE_DEFINITIONS.map((r) => r.category));
    for (const cat of usedCategories) {
      expect(SECTION_MAP[cat]).toBeTruthy();
    }
  });

  it('maps categories to valid sections', () => {
    const validSections = new Set(SECTIONS);
    for (const section of Object.values(SECTION_MAP)) {
      expect(validSections.has(section)).toBe(true);
    }
  });
});

describe('Section distribution', () => {
  it('every section has at least one rule', () => {
    for (const section of SECTIONS) {
      const rulesInSection = MANAGER_RULES.filter((r) => r.section === section);
      expect(rulesInSection.length).toBeGreaterThan(0);
    }
  });

  it('all rules are assigned to a section', () => {
    const sectionSet = new Set(SECTIONS);
    for (const rule of MANAGER_RULES) {
      expect(sectionSet.has(rule.section)).toBe(true);
    }
  });
});

describe('Data consistency', () => {
  it('rule names match human_name from definitions', () => {
    for (const rule of MANAGER_RULES) {
      const def = RULE_DEFINITIONS.find((d) => d.rule_id === rule.id);
      expect(rule.name).toBe(def!.human_name);
    }
  });

  it('rule severities match default_severity from definitions', () => {
    for (const rule of MANAGER_RULES) {
      const def = RULE_DEFINITIONS.find((d) => d.rule_id === rule.id);
      expect(rule.severity).toBe(def!.default_severity);
    }
  });

  it('MANAGER_RULES_MAP allows lookup by id', () => {
    const first = MANAGER_RULES[0];
    const found = MANAGER_RULES_MAP.get(first.id);
    expect(found).toBe(first);
  });
});
