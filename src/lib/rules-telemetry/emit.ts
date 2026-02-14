/**
 * RULES TELEMETRY - EMIT FUNCTION
 *
 * Functions to emit rule events without changing control flow.
 * Wraps existing validation results to capture telemetry.
 *
 * This is OBSERVATION ONLY - no behavior changes.
 */

import { RuleEvent, RuleEmitContext, RuleSeverity } from './types';
import { addEvent, isEnabled } from './store';
import { generateRuleId, registerRule, createRegistryEntry } from './registry';
import { captureValidationSnapshot } from './audit';

// Lazy import for telemetry client to avoid circular dependencies
let telemetryClient: { trackRuleFired: (rule_id: string, severity: RuleSeverity, message: string, context?: Record<string, string | undefined>) => void } | null = null;

function getTelemetryClient() {
  if (telemetryClient === null && typeof window !== 'undefined') {
    try {
      // Dynamic import to bridge to main telemetry
      const mod = require('../telemetry/client');
      telemetryClient = mod.telemetry;
    } catch {
      // Telemetry module not available, that's okay
      telemetryClient = { trackRuleFired: () => {} };
    }
  }
  return telemetryClient;
}

/**
 * Generate a unique event ID.
 */
function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Emit a single rule event.
 * This is the core function used by all instrumentation.
 */
export function emitRuleEvent(
  severity: RuleSeverity,
  message: string,
  context: RuleEmitContext,
  field?: string
): void {
  if (!isEnabled()) {
    return;
  }

  const ruleId = generateRuleId(context.source_ref, message);

  const event: RuleEvent = {
    rule_id: ruleId,
    severity,
    message,
    product_key: context.product_key || 'unknown',
    timestamp: Date.now(),
    inputs_present: context.inputs_present || [],
    source_ref: context.source_ref,
    field,
    event_id: generateEventId(),
  };

  // Auto-register the rule if not already known
  registerRule(createRegistryEntry(ruleId, context.source_ref, severity, {
    message_pattern: message,
  }));

  addEvent(event);

  // Bridge to main telemetry system
  const client = getTelemetryClient();
  if (client) {
    client.trackRuleFired(ruleId, severity, message, {
      product_key: context.product_key,
    });
  }
}

/**
 * Wrap a ValidationError array to emit telemetry for each error.
 * Returns the original array unchanged.
 */
export function wrapValidationErrors<T extends { field?: string; message: string; severity: 'error' }>(
  errors: T[],
  context: RuleEmitContext
): T[] {
  if (!isEnabled()) {
    return errors;
  }

  for (const error of errors) {
    emitRuleEvent('error', error.message, context, error.field);
  }

  return errors;
}

/**
 * Wrap a ValidationWarning array to emit telemetry for each warning.
 * Returns the original array unchanged.
 */
export function wrapValidationWarnings<T extends { field?: string; message: string; severity: 'warning' | 'info' }>(
  warnings: T[],
  context: RuleEmitContext
): T[] {
  if (!isEnabled()) {
    return warnings;
  }

  for (const warning of warnings) {
    emitRuleEvent(warning.severity, warning.message, context, warning.field);
  }

  return warnings;
}

/**
 * Wrap a combined validation result (errors + warnings).
 * Returns the original result unchanged.
 */
export function wrapValidationResult<T extends {
  errors: Array<{ field?: string; message: string; severity: 'error' }>;
  warnings: Array<{ field?: string; message: string; severity: 'warning' | 'info' }>;
}>(
  result: T,
  context: RuleEmitContext
): T {
  if (!isEnabled()) {
    return result;
  }

  wrapValidationErrors(result.errors, context);
  wrapValidationWarnings(result.warnings, context);

  // Capture snapshot for audit diffing (Phase 3.1)
  captureValidationSnapshot(result.errors, result.warnings, context.product_key);

  return result;
}

/**
 * Get list of input keys present in an inputs object.
 * Filters out undefined/null values.
 */
export function getInputsPresent(inputs: Record<string, unknown>): string[] {
  return Object.entries(inputs)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key]) => key);
}

/**
 * Create a context object from common parameters.
 */
export function createContext(
  sourceRef: string,
  productKey?: string,
  inputs?: Record<string, unknown>
): RuleEmitContext {
  return {
    source_ref: sourceRef,
    product_key: productKey,
    inputs_present: inputs ? getInputsPresent(inputs) : undefined,
  };
}
