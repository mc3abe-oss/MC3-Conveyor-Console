/**
 * Tests for audit.ts — audit report builder and matching logic.
 */

import {
  buildAuditReport,
  captureValidationSnapshot,
  getAuditSnapshot,
  getAuditReport,
  clearAuditSnapshot,
  type AuditSnapshot,
} from '../audit';
import { RULE_DEFINITIONS, TOTAL_RULE_COUNT } from '../rule-definitions';

// Mock isEnabled to always return true for tests
jest.mock('../store', () => ({
  isEnabled: jest.fn(() => true),
}));

describe('buildAuditReport', () => {
  afterEach(() => {
    clearAuditSnapshot();
  });

  it('returns all rules as not_evaluated when snapshot is null', () => {
    const report = buildAuditReport(null);

    expect(report.summary.total_rules).toBe(TOTAL_RULE_COUNT);
    expect(report.summary.not_evaluated).toBe(TOTAL_RULE_COUNT);
    expect(report.summary.fired).toBe(0);
    expect(report.summary.passed).toBe(0);
  });

  it('marks all rules as passed when validation produces no errors/warnings', () => {
    const snapshot: AuditSnapshot = {
      errors: [],
      warnings: [],
      product_key: 'belt_conveyor_v1',
      captured_at: Date.now(),
    };

    const report = buildAuditReport(snapshot);

    expect(report.summary.fired).toBe(0);
    expect(report.summary.passed).toBe(TOTAL_RULE_COUNT);
    expect(report.summary.not_evaluated).toBe(0);
  });

  it('matches a fired error to the correct definition by field + severity', () => {
    const snapshot: AuditSnapshot = {
      errors: [
        {
          field: 'conveyor_length_cc_in',
          message: 'Conveyor Length (C-C) must be greater than 0',
          severity: 'error',
        },
      ],
      warnings: [],
      product_key: 'belt_conveyor_v1',
      captured_at: Date.now(),
    };

    const report = buildAuditReport(snapshot);

    expect(report.summary.fired).toBeGreaterThanOrEqual(1);
    expect(report.summary.errors).toBeGreaterThanOrEqual(1);

    // Find the specific rule
    const entry = report.entries.find(
      (e) => e.definition.rule_id === 'vi_conveyor_length_zero'
    );
    expect(entry).toBeDefined();
    expect(entry!.status).toBe('fired');
    expect(entry!.fired_message).toBe('Conveyor Length (C-C) must be greater than 0');
  });

  it('matches fired warnings correctly', () => {
    const snapshot: AuditSnapshot = {
      errors: [],
      warnings: [
        {
          field: 'drop_height_in',
          message: 'Drop height is high. Consider impact or wear protection.',
          severity: 'warning',
        },
      ],
      product_key: 'belt_conveyor_v1',
      captured_at: Date.now(),
    };

    const report = buildAuditReport(snapshot);

    expect(report.summary.fired).toBeGreaterThanOrEqual(1);
    expect(report.summary.warnings).toBeGreaterThanOrEqual(1);
  });

  it('groups entries by category', () => {
    const snapshot: AuditSnapshot = {
      errors: [],
      warnings: [],
      captured_at: Date.now(),
    };

    const report = buildAuditReport(snapshot);

    expect(report.by_category.length).toBeGreaterThan(0);

    // Each category group should have entries
    for (const group of report.by_category) {
      expect(group.entries.length).toBeGreaterThan(0);
      expect(group.label).toBeTruthy();
      expect(group.total).toBe(group.entries.length);
    }

    // Total entries across all categories should match total rules
    const totalEntries = report.by_category.reduce(
      (sum, g) => sum + g.entries.length,
      0
    );
    expect(totalEntries).toBe(TOTAL_RULE_COUNT);
  });

  it('handles multiple fired rules from different categories', () => {
    const snapshot: AuditSnapshot = {
      errors: [
        {
          field: 'conveyor_length_cc_in',
          message: 'Conveyor Length (C-C) must be greater than 0',
          severity: 'error',
        },
        {
          field: 'belt_width_in',
          message: 'Belt Width must be greater than 0',
          severity: 'error',
        },
      ],
      warnings: [
        {
          field: 'belt_speed_fpm',
          message: 'Belt speed (150 FPM) exceeds 300 FPM.',
          severity: 'warning',
        },
      ],
      product_key: 'belt_conveyor_v1',
      captured_at: Date.now(),
    };

    const report = buildAuditReport(snapshot);

    expect(report.summary.fired).toBeGreaterThanOrEqual(2);
    expect(report.summary.passed).toBeGreaterThan(0);
    expect(report.summary.fired + report.summary.passed).toBe(TOTAL_RULE_COUNT);
  });

  it('includes product_key in the report', () => {
    const snapshot: AuditSnapshot = {
      errors: [],
      warnings: [],
      product_key: 'magnetic_conveyor_v1',
      captured_at: Date.now(),
    };

    const report = buildAuditReport(snapshot);
    expect(report.product_key).toBe('magnetic_conveyor_v1');
  });

  it('sets built_at timestamp', () => {
    const before = Date.now();
    const report = buildAuditReport(null);
    const after = Date.now();

    expect(report.built_at).toBeGreaterThanOrEqual(before);
    expect(report.built_at).toBeLessThanOrEqual(after);
  });
});

describe('captureValidationSnapshot', () => {
  afterEach(() => {
    clearAuditSnapshot();
  });

  it('captures errors and warnings into the snapshot store', () => {
    captureValidationSnapshot(
      [{ field: 'test', message: 'test error', severity: 'error' as const }],
      [{ field: 'test', message: 'test warning', severity: 'warning' as const }],
      'belt_conveyor_v1'
    );

    const snapshot = getAuditSnapshot();
    expect(snapshot).not.toBeNull();
    expect(snapshot!.errors).toHaveLength(1);
    expect(snapshot!.warnings).toHaveLength(1);
    expect(snapshot!.product_key).toBe('belt_conveyor_v1');
  });

  it('clearAuditSnapshot resets the store', () => {
    captureValidationSnapshot(
      [{ field: 'test', message: 'test', severity: 'error' as const }],
      [],
    );
    expect(getAuditSnapshot()).not.toBeNull();

    clearAuditSnapshot();
    expect(getAuditSnapshot()).toBeNull();
  });
});

describe('getAuditReport', () => {
  afterEach(() => {
    clearAuditSnapshot();
  });

  it('returns report when enabled', () => {
    const report = getAuditReport();
    expect(report).not.toBeNull();
    expect(report!.summary.total_rules).toBe(TOTAL_RULE_COUNT);
  });

  it('returns cached report on subsequent calls', () => {
    const report1 = getAuditReport();
    const report2 = getAuditReport();
    // Same reference (cached)
    expect(report1).toBe(report2);
  });

  it('invalidates cache after new snapshot', () => {
    const report1 = getAuditReport();

    captureValidationSnapshot(
      [{ field: 'test', message: 'test', severity: 'error' as const }],
      [],
    );

    const report2 = getAuditReport();
    expect(report2).not.toBe(report1);
  });
});
