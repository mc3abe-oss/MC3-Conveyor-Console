/**
 * RULES TELEMETRY - TYPE DEFINITIONS
 *
 * This module defines types for the rules observability system.
 * This is OBSERVATION ONLY - no behavior changes.
 *
 * Created: 2026-01-25
 * Purpose: Enable visibility into validation rules for future migration planning
 */

/**
 * Severity levels for rule events.
 * Matches existing validation severity levels.
 */
export type RuleSeverity = 'error' | 'warning' | 'info';

/**
 * A captured rule event representing a validation/warning/error that fired.
 */
export interface RuleEvent {
  /** Stable identifier for the rule (derived from code location or message hash) */
  rule_id: string;

  /** Severity level as currently emitted */
  severity: RuleSeverity;

  /** The message text shown to users */
  message: string;

  /** Product/conveyor type context when the rule fired */
  product_key: string;

  /** When this event was captured */
  timestamp: number;

  /** List of input keys that were available when the rule fired */
  inputs_present: string[];

  /** Source reference (file:line or module/function name) */
  source_ref: string;

  /** Optional field name associated with the rule */
  field?: string;

  /** Unique event ID for deduplication within a session */
  event_id: string;
}

/**
 * Registry entry for an observed rule.
 * Used to build the rule inventory without changing execution.
 */
export interface RuleRegistryEntry {
  /** Stable identifier for the rule */
  rule_id: string;

  /** Source location where the rule is defined */
  current_source_ref: string;

  /** Default severity level */
  default_severity: RuleSeverity;

  /** Product scope - initially "unknown", to be determined */
  product_scope: 'belt' | 'magnetic' | 'all' | 'unknown';

  /** Whether the rule is enabled (always true in observability phase) */
  enabled: boolean;

  /** Optional notes about the rule */
  notes?: string;

  /** The message pattern or template */
  message_pattern?: string;
}

/**
 * Context passed to the emit function for capturing rule events.
 */
export interface RuleEmitContext {
  /** Source file and line or function name */
  source_ref: string;

  /** Current product key context */
  product_key?: string;

  /** Available input keys at time of rule evaluation */
  inputs_present?: string[];
}

/**
 * Store state for rule events.
 */
export interface RuleTelemetryState {
  /** Captured events (max 200, newest first) */
  events: RuleEvent[];

  /** Whether telemetry capture is enabled */
  enabled: boolean;

  /** Session ID for grouping events */
  session_id: string;
}

/**
 * Configuration for the telemetry system.
 */
export interface RuleTelemetryConfig {
  /** Maximum number of events to retain */
  maxEvents: number;

  /** Whether to log events to console in development */
  consoleLog: boolean;
}
