'use client';

/**
 * Rules Debug Panel
 *
 * Debug-only UI panel showing "Rules Fired" for the current session.
 * Gated behind NEXT_PUBLIC_RULES_DEBUG=true feature flag.
 *
 * OBSERVABILITY ONLY. Does not change behavior.
 */

import { useState, useCallback } from 'react';
import {
  useRuleTelemetry,
  useRulesDebugEnabled,
  type RuleEvent,
} from '../../src/lib/rules-telemetry';

// Severity badge colors
const SEVERITY_COLORS: Record<string, string> = {
  error: 'bg-red-100 text-red-800 border-red-200',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  info: 'bg-blue-100 text-blue-800 border-blue-200',
};

const SEVERITY_ICONS: Record<string, string> = {
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

interface EventRowProps {
  event: RuleEvent;
  isExpanded: boolean;
  onToggle: () => void;
}

function EventRow({ event, isExpanded, onToggle }: EventRowProps) {
  const severityClass = SEVERITY_COLORS[event.severity] || SEVERITY_COLORS.info;
  const severityIcon = SEVERITY_ICONS[event.severity] || SEVERITY_ICONS.info;
  const timestamp = new Date(event.timestamp).toLocaleTimeString();

  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-start gap-2"
      >
        <span
          className={`inline-flex items-center justify-center w-5 h-5 rounded text-xs font-medium border ${severityClass}`}
        >
          {severityIcon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="font-mono">{event.rule_id.slice(0, 40)}</span>
            <span className="text-gray-300">|</span>
            <span>{event.product_key}</span>
            <span className="text-gray-300">|</span>
            <span>{timestamp}</span>
          </div>
          <div className="text-sm text-gray-900 truncate">{event.message}</div>
        </div>
        <span className="text-gray-400 text-xs">{isExpanded ? '▼' : '▶'}</span>
      </button>

      {isExpanded && (
        <div className="px-3 py-2 bg-gray-50 text-xs space-y-1">
          <div>
            <span className="text-gray-500">Source:</span>{' '}
            <span className="font-mono text-gray-700">{event.source_ref}</span>
          </div>
          {event.field && (
            <div>
              <span className="text-gray-500">Field:</span>{' '}
              <span className="font-mono text-gray-700">{event.field}</span>
            </div>
          )}
          <div>
            <span className="text-gray-500">Inputs Present ({event.inputs_present.length}):</span>
            {event.inputs_present.length > 0 ? (
              <div className="mt-1 flex flex-wrap gap-1">
                {event.inputs_present.slice(0, 20).map((key) => (
                  <span
                    key={key}
                    className="inline-block px-1.5 py-0.5 bg-white border border-gray-200 rounded text-gray-600 font-mono"
                  >
                    {key}
                  </span>
                ))}
                {event.inputs_present.length > 20 && (
                  <span className="text-gray-400">
                    +{event.inputs_present.length - 20} more
                  </span>
                )}
              </div>
            ) : (
              <span className="text-gray-400 ml-1">none</span>
            )}
          </div>
          <div>
            <span className="text-gray-500">Event ID:</span>{' '}
            <span className="font-mono text-gray-400">{event.event_id}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function RulesDebugPanel() {
  const isDebugEnabled = useRulesDebugEnabled();
  const { events, clear, eventCount, sessionId } = useRuleTelemetry();
  const [isMinimized, setIsMinimized] = useState(false);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'error' | 'warning' | 'info'>('all');

  const toggleExpanded = useCallback((eventId: string) => {
    setExpandedEventId((prev) => (prev === eventId ? null : eventId));
  }, []);

  // Don't render if not enabled
  if (!isDebugEnabled) {
    return null;
  }

  const filteredEvents =
    filter === 'all' ? events : events.filter((e) => e.severity === filter);

  const errorCount = events.filter((e) => e.severity === 'error').length;
  const warningCount = events.filter((e) => e.severity === 'warning').length;
  const infoCount = events.filter((e) => e.severity === 'info').length;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[480px] max-h-[60vh] flex flex-col bg-white rounded-lg shadow-xl border border-gray-300 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800 text-white">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">Rules Fired</span>
          <span className="text-xs text-gray-400">({eventCount}/200)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clear}
            className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            title="Clear all events"
          >
            Clear
          </button>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          >
            {isMinimized ? 'Expand' : 'Minimize'}
          </button>
        </div>
      </div>

      {/* Observability notice */}
      <div className="px-3 py-1.5 bg-blue-50 border-b border-blue-200 text-xs text-blue-700">
        Observability only. Does not change behavior.
      </div>

      {!isMinimized && (
        <>
          {/* Filter tabs */}
          <div className="flex border-b border-gray-200 text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 px-3 py-1.5 ${
                filter === 'all'
                  ? 'bg-gray-100 border-b-2 border-gray-800 font-medium'
                  : 'hover:bg-gray-50'
              }`}
            >
              All ({eventCount})
            </button>
            <button
              onClick={() => setFilter('error')}
              className={`flex-1 px-3 py-1.5 ${
                filter === 'error'
                  ? 'bg-red-50 border-b-2 border-red-500 font-medium text-red-700'
                  : 'hover:bg-gray-50'
              }`}
            >
              Errors ({errorCount})
            </button>
            <button
              onClick={() => setFilter('warning')}
              className={`flex-1 px-3 py-1.5 ${
                filter === 'warning'
                  ? 'bg-yellow-50 border-b-2 border-yellow-500 font-medium text-yellow-700'
                  : 'hover:bg-gray-50'
              }`}
            >
              Warnings ({warningCount})
            </button>
            <button
              onClick={() => setFilter('info')}
              className={`flex-1 px-3 py-1.5 ${
                filter === 'info'
                  ? 'bg-blue-50 border-b-2 border-blue-500 font-medium text-blue-700'
                  : 'hover:bg-gray-50'
              }`}
            >
              Info ({infoCount})
            </button>
          </div>

          {/* Events list */}
          <div className="flex-1 overflow-y-auto">
            {filteredEvents.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                No events captured yet.
                <br />
                <span className="text-xs">
                  Trigger validations to see rules fire.
                </span>
              </div>
            ) : (
              filteredEvents.map((event) => (
                <EventRow
                  key={event.event_id}
                  event={event}
                  isExpanded={expandedEventId === event.event_id}
                  onToggle={() => toggleExpanded(event.event_id)}
                />
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex justify-between">
            <span>Session: {sessionId.slice(0, 20)}...</span>
            <span>Max 200 entries</span>
          </div>
        </>
      )}
    </div>
  );
}

export default RulesDebugPanel;
