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
