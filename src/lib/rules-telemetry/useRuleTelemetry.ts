/**
 * RULES TELEMETRY - REACT HOOK
 *
 * React hook for accessing rule telemetry state in components.
 * Used by the debug panel UI.
 */

'use client';

import { useSyncExternalStore, useCallback } from 'react';
import {
  subscribe,
  getState,
  clearEvents,
  isEnabled,
  setEnabled,
} from './store';
import type { RuleEvent, RuleTelemetryState } from './types';

// Stable server snapshot (must be cached to avoid infinite loop)
const SERVER_SNAPSHOT: RuleTelemetryState = {
  events: [],
  enabled: false,
  session_id: 'server',
};

/**
 * Hook to access rule telemetry state with React re-rendering.
 */
export function useRuleTelemetry(): {
  events: RuleEvent[];
  enabled: boolean;
  sessionId: string;
  clear: () => void;
  setEnabled: (enabled: boolean) => void;
  eventCount: number;
} {
  // Use React 18's useSyncExternalStore for proper subscription
  const state = useSyncExternalStore(
    subscribe,
    getState,
    // Server snapshot - must return stable reference
    () => SERVER_SNAPSHOT
  );

  const clear = useCallback(() => {
    clearEvents();
  }, []);

  const toggleEnabled = useCallback((enabled: boolean) => {
    setEnabled(enabled);
  }, []);

  return {
    events: state.events,
    enabled: state.enabled,
    sessionId: state.session_id,
    clear,
    setEnabled: toggleEnabled,
    eventCount: state.events.length,
  };
}

/**
 * Hook to check if telemetry debug UI should be shown.
 */
export function useRulesDebugEnabled(): boolean {
  const state = useSyncExternalStore(
    subscribe,
    () => isEnabled(),
    () => false
  );
  return state;
}
