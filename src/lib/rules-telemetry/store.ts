/**
 * RULES TELEMETRY - SESSION STORE
 *
 * Simple singleton store for captured rule events.
 * Session-scoped, max 200 entries, with clear functionality.
 *
 * This is OBSERVATION ONLY - no behavior changes.
 */

import { RuleEvent, RuleTelemetryState, RuleTelemetryConfig } from './types';

// Configuration
const DEFAULT_CONFIG: RuleTelemetryConfig = {
  maxEvents: 200,
  consoleLog: false,
};

// Generate a session ID
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// Module-level state (singleton pattern for browser session)
let state: RuleTelemetryState = {
  events: [],
  enabled: false,
  session_id: typeof window !== 'undefined' ? generateSessionId() : 'server',
};

let config: RuleTelemetryConfig = { ...DEFAULT_CONFIG };

// Listeners for state changes (used by React hooks)
type Listener = () => void;
const listeners: Set<Listener> = new Set();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

/**
 * Check if telemetry is enabled via environment variable.
 * Feature flag: NEXT_PUBLIC_RULES_DEBUG=true
 */
export function isTelemetryEnabled(): boolean {
  if (typeof window === 'undefined') {
    // Server-side: check process.env
    return process.env.NEXT_PUBLIC_RULES_DEBUG === 'true';
  }
  // Client-side: check window env or localStorage override
  const envEnabled = process.env.NEXT_PUBLIC_RULES_DEBUG === 'true';
  const localOverride = typeof localStorage !== 'undefined'
    && localStorage.getItem('RULES_DEBUG') === 'true';
  return envEnabled || localOverride;
}

/**
 * Initialize or reinitialize the telemetry store.
 */
export function initTelemetry(customConfig?: Partial<RuleTelemetryConfig>): void {
  config = { ...DEFAULT_CONFIG, ...customConfig };
  state = {
    events: [],
    enabled: isTelemetryEnabled(),
    session_id: typeof window !== 'undefined' ? generateSessionId() : 'server',
  };
  notifyListeners();
}

/**
 * Get current state (for React hook).
 */
export function getState(): RuleTelemetryState {
  return state;
}

/**
 * Get current events.
 */
export function getEvents(): RuleEvent[] {
  return state.events;
}

/**
 * Add an event to the store.
 * Maintains max 200 events, newest first.
 */
export function addEvent(event: RuleEvent): void {
  if (!state.enabled && !isTelemetryEnabled()) {
    return;
  }

  // Enable if not already (lazy enable on first event if flag is set)
  if (!state.enabled && isTelemetryEnabled()) {
    state.enabled = true;
  }

  // Add to front (newest first)
  state.events = [event, ...state.events];

  // Trim to max events
  if (state.events.length > config.maxEvents) {
    state.events = state.events.slice(0, config.maxEvents);
  }

  // Console log in development if configured
  if (config.consoleLog && typeof console !== 'undefined') {
    console.log('[RuleTelemetry]', event.severity.toUpperCase(), event.rule_id, event.message);
  }

  notifyListeners();
}

/**
 * Clear all events from the store.
 */
export function clearEvents(): void {
  state.events = [];
  state.session_id = typeof window !== 'undefined' ? generateSessionId() : 'server';
  notifyListeners();
}

/**
 * Subscribe to state changes (for React hooks).
 */
export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Get the current session ID.
 */
export function getSessionId(): string {
  return state.session_id;
}

/**
 * Enable or disable telemetry at runtime.
 * Useful for toggling in debug panel.
 */
export function setEnabled(enabled: boolean): void {
  state.enabled = enabled;
  if (typeof localStorage !== 'undefined') {
    if (enabled) {
      localStorage.setItem('RULES_DEBUG', 'true');
    } else {
      localStorage.removeItem('RULES_DEBUG');
    }
  }
  notifyListeners();
}

/**
 * Check if telemetry is currently enabled.
 */
export function isEnabled(): boolean {
  return state.enabled || isTelemetryEnabled();
}
