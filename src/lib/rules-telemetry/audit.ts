/**
 * RULES AUDIT — Phase 3.1
 *
 * Builds audit reports by diffing fired validation messages against the
 * full rule registry (RULE_DEFINITIONS). Shows which rules fired, which
 * passed (evaluated but didn't fire), and groups results by category.
 *
 * Architecture:
 * 1. captureValidationSnapshot() is called from wrapValidationResult()
 *    after each validation run to store the raw errors/warnings.
 * 2. buildAuditReport() diffs the snapshot against RULE_DEFINITIONS.
 * 3. useRulesAudit() hook exposes the report to React components.
 *
 * Matching strategy:
 * - Primary: field + severity (unique for ~85% of rules)
 * - Fallback: keyword overlap between check_description and fired message
 * - Override: explicit message_match on the definition (for edge cases)
 */

import {
  RULE_DEFINITIONS,
  RULE_DEFINITIONS_MAP,
  TOTAL_RULE_COUNT,
  type RuleDefinition,
  type RuleCategory,
  CATEGORY_LABELS,
} from './rule-definitions';
import { isEnabled } from './store';

// ============================================================================
// Types
// ============================================================================

export type AuditStatus = 'fired' | 'passed' | 'not_evaluated';

export interface AuditEntry {
  /** The rule definition this entry corresponds to */
  definition: RuleDefinition;
  /** Whether the rule fired, passed, or was not evaluated */
  status: AuditStatus;
  /** The actual validation message if the rule fired */
  fired_message?: string;
  /** The fired severity (may differ from default for some rules) */
  fired_severity?: 'error' | 'warning' | 'info';
}

export interface CategoryGroup {
  category: RuleCategory;
  label: string;
  entries: AuditEntry[];
  fired_count: number;
  passed_count: number;
  total: number;
}

export interface AuditReport {
  /** All audit entries, one per rule definition */
  entries: AuditEntry[];
  /** Entries grouped by category */
  by_category: CategoryGroup[];
  /** Summary counts */
  summary: {
    total_rules: number;
    fired: number;
    passed: number;
    not_evaluated: number;
    errors: number;
    warnings: number;
    info: number;
  };
  /** Timestamp when the audit was built */
  built_at: number;
  /** Product key from the validation run */
  product_key?: string;
}

/** Raw validation message captured from a validation run */
export interface CapturedMessage {
  field?: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

/** Snapshot of a validation run for audit diffing */
export interface AuditSnapshot {
  errors: CapturedMessage[];
  warnings: CapturedMessage[];
  product_key?: string;
  captured_at: number;
}

// ============================================================================
// Snapshot Store (singleton, like the telemetry store)
// ============================================================================

let currentSnapshot: AuditSnapshot | null = null;
let cachedReport: AuditReport | null = null;

type Listener = () => void;
const auditListeners: Set<Listener> = new Set();

function notifyAuditListeners() {
  auditListeners.forEach((l) => l());
}

/**
 * Capture a validation result as an audit snapshot.
 * Called from wrapValidationResult() after each validation run.
 */
export function captureValidationSnapshot(
  errors: Array<{ field?: string; message: string; severity: 'error' }>,
  warnings: Array<{ field?: string; message: string; severity: 'warning' | 'info' }>,
  productKey?: string
): void {
  if (!isEnabled()) return;

  currentSnapshot = {
    errors: errors.map((e) => ({ field: e.field, message: e.message, severity: e.severity })),
    warnings: warnings.map((w) => ({ field: w.field, message: w.message, severity: w.severity })),
    product_key: productKey,
    captured_at: Date.now(),
  };

  // Invalidate cached report
  cachedReport = null;
  notifyAuditListeners();
}

/**
 * Get the current audit snapshot.
 */
export function getAuditSnapshot(): AuditSnapshot | null {
  return currentSnapshot;
}

/**
 * Clear the audit snapshot.
 */
export function clearAuditSnapshot(): void {
  currentSnapshot = null;
  cachedReport = null;
  notifyAuditListeners();
}

/**
 * Subscribe to audit state changes.
 */
export function subscribeAudit(listener: Listener): () => void {
  auditListeners.add(listener);
  return () => auditListeners.delete(listener);
}

// ============================================================================
// Matching
// ============================================================================

/**
 * Score how well a fired message matches a rule definition.
 * Higher score = better match.
 *
 * Returns 0 if field or severity don't match.
 * Returns 1000 if message_match is present and found in the message.
 * Otherwise returns keyword overlap score.
 */
function matchScore(def: RuleDefinition, msg: CapturedMessage): number {
  // Field must match
  if (msg.field !== def.field) return 0;

  // Severity must match
  if (msg.severity !== def.default_severity) return 0;

  // If definition has explicit message_match, use it
  if (def.message_match && msg.message.includes(def.message_match)) {
    return 1000;
  }

  // Keyword overlap between check_description and fired message
  const descWords = def.check_description.toLowerCase().split(/\s+/);
  const msgWords = msg.message.toLowerCase().split(/\s+/);
  const overlap = descWords.filter((w) => w.length > 2 && msgWords.includes(w)).length;

  // Base score of 1 (field + severity matched) plus keyword overlap
  return 1 + overlap;
}

// ============================================================================
// Audit Report Builder
// ============================================================================

/**
 * Build an audit report by diffing fired validation messages against
 * the full rule definitions registry.
 */
export function buildAuditReport(snapshot: AuditSnapshot | null): AuditReport {
  if (!snapshot) {
    // No validation has run yet — show all rules as not_evaluated
    const entries: AuditEntry[] = RULE_DEFINITIONS.map((def) => ({
      definition: def,
      status: 'not_evaluated' as const,
    }));

    return buildReportFromEntries(entries, undefined);
  }

  const allMessages: CapturedMessage[] = [...snapshot.errors, ...snapshot.warnings];

  // Track which messages have been claimed by a definition
  const claimedMessages = new Set<number>();

  // For each definition, find the best matching message
  const entries: AuditEntry[] = RULE_DEFINITIONS.map((def) => {
    let bestIdx = -1;
    let bestScore = 0;

    for (let i = 0; i < allMessages.length; i++) {
      if (claimedMessages.has(i)) continue;
      const score = matchScore(def, allMessages[i]);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    if (bestIdx >= 0 && bestScore > 0) {
      claimedMessages.add(bestIdx);
      const msg = allMessages[bestIdx];
      return {
        definition: def,
        status: 'fired' as const,
        fired_message: msg.message,
        fired_severity: msg.severity,
      };
    }

    return {
      definition: def,
      status: 'passed' as const,
    };
  });

  return buildReportFromEntries(entries, snapshot.product_key);
}

/**
 * Build the report structure from a list of audit entries.
 */
function buildReportFromEntries(entries: AuditEntry[], productKey?: string): AuditReport {
  // Group by category
  const categoryMap = new Map<RuleCategory, AuditEntry[]>();

  for (const entry of entries) {
    const cat = entry.definition.category;
    if (!categoryMap.has(cat)) {
      categoryMap.set(cat, []);
    }
    categoryMap.get(cat)!.push(entry);
  }

  const by_category: CategoryGroup[] = [];
  for (const [category, catEntries] of categoryMap) {
    by_category.push({
      category,
      label: CATEGORY_LABELS[category],
      entries: catEntries,
      fired_count: catEntries.filter((e) => e.status === 'fired').length,
      passed_count: catEntries.filter((e) => e.status === 'passed').length,
      total: catEntries.length,
    });
  }

  // Sort categories by their position in the CATEGORY_LABELS keys
  const categoryOrder = Object.keys(CATEGORY_LABELS) as RuleCategory[];
  by_category.sort((a, b) => categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category));

  // Summary
  const fired = entries.filter((e) => e.status === 'fired');
  const summary = {
    total_rules: TOTAL_RULE_COUNT,
    fired: fired.length,
    passed: entries.filter((e) => e.status === 'passed').length,
    not_evaluated: entries.filter((e) => e.status === 'not_evaluated').length,
    errors: fired.filter((e) => e.fired_severity === 'error').length,
    warnings: fired.filter((e) => e.fired_severity === 'warning').length,
    info: fired.filter((e) => e.fired_severity === 'info').length,
  };

  return {
    entries,
    by_category,
    summary,
    built_at: Date.now(),
    product_key: productKey,
  };
}

/**
 * Get the current audit report (cached).
 * Returns null if telemetry is not enabled.
 */
export function getAuditReport(): AuditReport | null {
  if (!isEnabled()) return null;

  if (!cachedReport) {
    cachedReport = buildAuditReport(currentSnapshot);
  }

  return cachedReport;
}

// Re-export for convenience
export { RULE_DEFINITIONS, RULE_DEFINITIONS_MAP, TOTAL_RULE_COUNT, CATEGORY_LABELS };
export type { RuleDefinition, RuleCategory };
