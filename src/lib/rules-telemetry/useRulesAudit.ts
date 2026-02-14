/**
 * RULES AUDIT — React Hook
 *
 * Provides the audit report to React components via useSyncExternalStore.
 * Rebuilds the report when the audit snapshot changes.
 */

'use client';

import { useSyncExternalStore, useMemo } from 'react';
import {
  subscribeAudit,
  getAuditReport,
  getAuditSnapshot,
  clearAuditSnapshot,
  type AuditReport,
  type AuditSnapshot,
  type CategoryGroup,
  type AuditStatus,
} from './audit';
import { isEnabled } from './store';

/** Stable empty report for server-side rendering */
const EMPTY_SNAPSHOT: AuditSnapshot | null = null;

/**
 * Hook that returns the current rules audit report.
 *
 * Rebuilds automatically when validation runs (via snapshot capture).
 * Returns null when telemetry is disabled.
 */
export function useRulesAudit(): {
  report: AuditReport | null;
  snapshot: AuditSnapshot | null;
  clear: () => void;
  enabled: boolean;
} {
  const snapshot = useSyncExternalStore(
    subscribeAudit,
    getAuditSnapshot,
    () => EMPTY_SNAPSHOT
  );

  const enabled = useSyncExternalStore(
    subscribeAudit,
    () => isEnabled(),
    () => false
  );

  const report = useMemo(() => {
    if (!enabled) return null;
    return getAuditReport();
  }, [snapshot, enabled]);

  return {
    report,
    snapshot,
    clear: clearAuditSnapshot,
    enabled,
  };
}

export type { AuditReport, AuditSnapshot, CategoryGroup, AuditStatus };
