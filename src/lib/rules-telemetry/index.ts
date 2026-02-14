/**
 * RULES TELEMETRY - PUBLIC API
 *
 * This module provides observability into validation rules.
 * OBSERVATION ONLY - no behavior changes.
 *
 * Usage:
 *   import { emitRuleEvent, useRuleTelemetry } from '@/lib/rules-telemetry';
 *
 * Feature flag: NEXT_PUBLIC_RULES_DEBUG=true
 */

// Types
export type {
  RuleEvent,
  RuleSeverity,
  RuleRegistryEntry,
  RuleEmitContext,
  RuleTelemetryState,
} from './types';

// Store functions
export {
  getEvents,
  clearEvents,
  isEnabled,
  setEnabled,
  getSessionId,
  subscribe,
  getState,
  isTelemetryEnabled,
} from './store';

// Emit functions
export {
  emitRuleEvent,
  wrapValidationErrors,
  wrapValidationWarnings,
  wrapValidationResult,
  getInputsPresent,
  createContext,
} from './emit';

// Registry functions
export {
  ruleRegistry,
  registerRule,
  getRule,
  getAllRules,
  generateRuleId,
  getRulesByProduct,
  getRulesBySeverity,
  exportRegistryAsJson,
} from './registry';

// React hooks (client-side only)
export { useRuleTelemetry, useRulesDebugEnabled } from './useRuleTelemetry';
export { useRulesAudit } from './useRulesAudit';

// Audit system (Phase 3.1)
export {
  buildAuditReport,
  getAuditReport,
  getAuditSnapshot,
  captureValidationSnapshot,
  clearAuditSnapshot,
  subscribeAudit,
  RULE_DEFINITIONS,
  RULE_DEFINITIONS_MAP,
  TOTAL_RULE_COUNT,
  CATEGORY_LABELS,
} from './audit';

export type {
  AuditEntry,
  AuditReport,
  AuditSnapshot,
  AuditStatus,
  CategoryGroup,
  CapturedMessage,
  RuleDefinition,
  RuleCategory,
} from './audit';
