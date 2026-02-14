'use client';

import { useState, useEffect, useCallback } from 'react';
import type { TelemetryEventRow, TopIssue, TelemetrySeverity } from '../../../../../src/lib/telemetry/types';

interface TelemetryResponse {
  events: TelemetryEventRow[];
  topIssues: TopIssue[];
  filters: {
    eventTypes: string[];
    productKeys: string[];
  };
  pagination: {
    offset: number;
    limit: number;
    hasMore: boolean;
  };
}

function SeverityBadge({ severity }: { severity: TelemetrySeverity }) {
  const colors = {
    error: 'bg-red-100 text-red-800',
    warning: 'bg-yellow-100 text-yellow-800',
    info: 'bg-blue-100 text-blue-800',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[severity]}`}>
      {severity}
    </span>
  );
}

function TopIssuesPanel({ issues }: { issues: TopIssue[] }) {
  const [expandedFp, setExpandedFp] = useState<string | null>(null);

  if (issues.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Top Issues</h3>
        <p className="text-gray-500 text-sm">No issues found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="font-semibold text-gray-900 mb-3">Top Issues</h3>
      <div className="space-y-2">
        {issues.map((issue) => (
          <div
            key={issue.fingerprint}
            className="border rounded p-2 hover:bg-gray-50"
          >
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setExpandedFp(expandedFp === issue.fingerprint ? null : issue.fingerprint)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <SeverityBadge severity={issue.severity} />
                <span className="text-sm font-mono text-gray-600 truncate">
                  {issue.sample_event_type}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span className="font-semibold">{issue.count}x</span>
                <span>{issue.affected_sessions} sessions</span>
              </div>
            </div>
            {expandedFp === issue.fingerprint && (
              <div className="mt-2 pt-2 border-t text-sm">
                <p className="text-gray-700 break-words">{issue.sample_message || '(no message)'}</p>
                <p className="text-gray-500 text-xs mt-1">
                  Last seen: {new Date(issue.last_seen).toLocaleString()}
                </p>
                <p className="text-gray-400 text-xs font-mono">
                  Fingerprint: {issue.fingerprint}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function EventRow({ event, isExpanded, onToggle }: {
  event: TelemetryEventRow;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className="hover:bg-gray-50 cursor-pointer"
        onClick={onToggle}
      >
        <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">
          {new Date(event.created_at).toLocaleString()}
        </td>
        <td className="px-3 py-2 text-xs font-mono">
          {event.event_type}
        </td>
        <td className="px-3 py-2">
          <SeverityBadge severity={event.severity} />
        </td>
        <td className="px-3 py-2 text-sm text-gray-700 max-w-xs truncate">
          {event.message || '-'}
        </td>
        <td className="px-3 py-2 text-xs text-gray-500">
          {event.product_key || '-'}
        </td>
        <td className="px-3 py-2 text-xs text-gray-500 max-w-[100px] truncate">
          {event.route || '-'}
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-gray-50">
          <td colSpan={6} className="px-4 py-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Context</h4>
                <dl className="space-y-1 text-xs">
                  <div className="flex gap-2">
                    <dt className="text-gray-500 w-24">Session ID:</dt>
                    <dd className="font-mono text-gray-700">{event.session_id || '-'}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-gray-500 w-24">Trace ID:</dt>
                    <dd className="font-mono text-gray-700">{event.trace_id || '-'}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-gray-500 w-24">User ID:</dt>
                    <dd className="font-mono text-gray-700">{event.user_id || '-'}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-gray-500 w-24">App ID:</dt>
                    <dd className="font-mono text-gray-700">{event.application_id || '-'}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-gray-500 w-24">Rule ID:</dt>
                    <dd className="font-mono text-gray-700">{event.rule_id || '-'}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-gray-500 w-24">Calc Key:</dt>
                    <dd className="font-mono text-gray-700">{event.calc_key || '-'}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-gray-500 w-24">Release:</dt>
                    <dd className="font-mono text-gray-700">{event.release || '-'}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-gray-500 w-24">Viewport:</dt>
                    <dd className="font-mono text-gray-700">{event.viewport || '-'}</dd>
                  </div>
                </dl>
              </div>
              <div>
                {event.stack && (
                  <div className="mb-3">
                    <h4 className="font-semibold text-gray-700 mb-1">Stack Trace</h4>
                    <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40 font-mono">
                      {event.stack}
                    </pre>
                  </div>
                )}
                {event.data && Object.keys(event.data).length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-1">Data</h4>
                    <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40 font-mono">
                      {JSON.stringify(event.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function TelemetryAdminPage() {
  const [data, setData] = useState<TelemetryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters
  const [severity, setSeverity] = useState<string>('');
  const [eventType, setEventType] = useState<string>('');
  const [productKey, setProductKey] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (severity) params.set('severity', severity);
    if (eventType) params.set('event_type', eventType);
    if (productKey) params.set('product_key', productKey);
    if (search) params.set('q', search);

    try {
      const response = await fetch(`/api/admin/telemetry?${params.toString()}`);
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied. Super admin required.');
        }
        throw new Error('Failed to fetch telemetry data');
      }
      const json = await response.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [severity, eventType, productKey, search]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Telemetry</h1>
          <p className="text-gray-500 text-sm mt-1">
            Monitor errors, events, and system health
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Severity</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="border rounded px-3 py-1.5 text-sm"
            >
              <option value="">All</option>
              <option value="error">Error</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Event Type</label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="border rounded px-3 py-1.5 text-sm"
            >
              <option value="">All</option>
              {data?.filters.eventTypes.map((et) => (
                <option key={et} value={et}>{et}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Product</label>
            <select
              value={productKey}
              onChange={(e) => setProductKey(e.target.value)}
              className="border rounded px-3 py-1.5 text-sm"
            >
              <option value="">All</option>
              {data?.filters.productKeys.map((pk) => (
                <option key={pk} value={pk}>{pk}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search messages..."
              className="border rounded px-3 py-1.5 text-sm w-full"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6">
          {error}
        </div>
      )}

      {/* Top Issues */}
      {data && (
        <div className="mb-6">
          <TopIssuesPanel issues={data.topIssues} />
        </div>
      )}

      {/* Events Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-900">Recent Events</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Message</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Route</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading && !data && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              )}
              {data?.events.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No events found
                  </td>
                </tr>
              )}
              {data?.events.map((event) => (
                <EventRow
                  key={event.id}
                  event={event}
                  isExpanded={expandedId === event.id}
                  onToggle={() => setExpandedId(expandedId === event.id ? null : event.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
        {data?.pagination.hasMore && (
          <div className="px-4 py-3 border-t bg-gray-50 text-center">
            <span className="text-sm text-gray-500">
              Showing {data.events.length} events. More results available.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
