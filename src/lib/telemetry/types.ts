/**
 * Telemetry Types
 * Type definitions for the internal telemetry system
 */

export type TelemetrySeverity = 'error' | 'warning' | 'info';

export interface TelemetryEvent {
  // Core fields
  event_type: string;
  severity: TelemetrySeverity;
  fingerprint?: string;

  // Environment
  app?: string;
  env?: string;
  release?: string;
  deployed_at?: string;

  // User context
  user_id?: string;
  tenant_id?: string;
  session_id?: string;
  trace_id?: string;

  // Request context
  route?: string;
  url?: string;
  user_agent?: string;
  viewport?: string;

  // Event data
  message?: string;
  stack?: string;
  data?: Record<string, unknown>;

  // Conveyor Console domain fields
  application_id?: string;
  product_key?: string;
  model_key?: string;
  rule_id?: string;
  calc_key?: string;
  config_fingerprint?: string;
  quote_id?: string;
  sales_order_id?: string;

  // Timestamp (set by server if not provided)
  created_at?: string;
}

export interface TelemetryIngestPayload {
  events: TelemetryEvent[];
}

export interface TelemetryQueryParams {
  q?: string;
  severity?: TelemetrySeverity;
  event_type?: string;
  release?: string;
  product_key?: string;
  application_id?: string;
  rule_id?: string;
  limit?: number;
  offset?: number;
}

export interface TelemetryEventRow extends TelemetryEvent {
  id: string;
  created_at: string;
}

export interface TopIssue {
  fingerprint: string;
  count: number;
  last_seen: string;
  sample_message: string;
  sample_event_type: string;
  severity: TelemetrySeverity;
  affected_sessions: number;
}
