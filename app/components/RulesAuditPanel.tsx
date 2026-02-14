'use client';

/**
 * Rules Audit Panel — Phase 3.2
 *
 * Shows the full validation rule inventory (158 rules) with fired/passed
 * status from the most recent validation run. Engineers can scan quickly
 * to see what fired, what didn't, and why.
 *
 * Gated behind NEXT_PUBLIC_RULES_DEBUG=true feature flag.
 * OBSERVABILITY ONLY. Does not change behavior.
 */

import { useState, useMemo } from 'react';
import { useRulesDebugEnabled } from '../../src/lib/rules-telemetry';
import {
  useRulesAudit,
  type AuditReport,
  type CategoryGroup,
} from '../../src/lib/rules-telemetry/useRulesAudit';
import type { AuditEntry, AuditStatus } from '../../src/lib/rules-telemetry/audit';

// ============================================================================
// Constants
// ============================================================================

const STATUS_STYLES: Record<AuditStatus, { bg: string; text: string; icon: string; label: string }> = {
  fired: { bg: 'bg-red-50', text: 'text-red-700', icon: '✕', label: 'Fired' },
  passed: { bg: 'bg-green-50', text: 'text-green-700', icon: '✓', label: 'Passed' },
  not_evaluated: { bg: 'bg-gray-50', text: 'text-gray-500', icon: '—', label: 'Awaiting' },
};

const SEVERITY_DOT: Record<string, string> = {
  error: 'bg-red-500',
  warning: 'bg-yellow-500',
  info: 'bg-blue-500',
};

type FilterMode = 'all' | 'fired' | 'passed';

// ============================================================================
// Sub-components
// ============================================================================

function SummaryBar({ summary }: { summary: AuditReport['summary'] }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs">
      <span className="font-medium text-gray-700">
        {summary.total_rules} rules
      </span>
      <span className="text-gray-300">|</span>
      <span className="text-red-700 font-medium">
        {summary.fired} fired
      </span>
      {summary.errors > 0 && (
        <span className="text-red-500">({summary.errors}E</span>
      )}
      {summary.warnings > 0 && (
        <span className="text-yellow-600">{summary.errors > 0 ? ' ' : '('}{summary.warnings}W</span>
      )}
      {summary.info > 0 && (
        <span className="text-blue-500"> {summary.info}I</span>
      )}
      {(summary.errors > 0 || summary.warnings > 0 || summary.info > 0) && (
        <span className="text-gray-500">)</span>
      )}
      <span className="text-gray-300">|</span>
      <span className="text-green-700 font-medium">
        {summary.passed} passed
      </span>
      {summary.not_evaluated > 0 && (
        <>
          <span className="text-gray-300">|</span>
          <span className="text-gray-500">
            {summary.not_evaluated} awaiting
          </span>
        </>
      )}
    </div>
  );
}

function RuleRow({ entry }: { entry: AuditEntry }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const style = STATUS_STYLES[entry.status];
  const severityDot = SEVERITY_DOT[entry.definition.default_severity];

  return (
    <div className={`border-b border-gray-100 last:border-b-0 ${entry.status === 'fired' ? 'bg-red-50/30' : ''}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left px-3 py-1.5 hover:bg-gray-50/50 flex items-start gap-2"
      >
        {/* Status icon */}
        <span className={`mt-0.5 inline-flex items-center justify-center w-4 h-4 rounded text-[10px] font-bold ${style.bg} ${style.text}`}>
          {style.icon}
        </span>

        {/* Severity dot */}
        <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${severityDot}`} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="text-sm text-gray-900 leading-tight">
            {entry.definition.human_name}
          </div>
          {entry.status === 'fired' && entry.fired_message && (
            <div className="text-xs text-red-600 mt-0.5 truncate">
              {entry.fired_message}
            </div>
          )}
          {entry.status === 'passed' && (
            <div className="text-xs text-gray-500 mt-0.5 truncate">
              {entry.definition.check_description}
            </div>
          )}
        </div>

        {/* Expand arrow */}
        <span className="text-gray-400 text-[10px] mt-1">{isExpanded ? '▼' : '▶'}</span>
      </button>

      {isExpanded && (
        <div className="px-3 py-2 bg-gray-50 text-xs space-y-1 ml-8">
          <div>
            <span className="text-gray-500">Rule ID:</span>{' '}
            <span className="font-mono text-gray-700">{entry.definition.rule_id}</span>
          </div>
          <div>
            <span className="text-gray-500">Check:</span>{' '}
            <span className="text-gray-700">{entry.definition.check_description}</span>
          </div>
          <div>
            <span className="text-gray-500">Field:</span>{' '}
            <span className="font-mono text-gray-700">{entry.definition.field}</span>
          </div>
          <div>
            <span className="text-gray-500">Source:</span>{' '}
            <span className="font-mono text-gray-700">
              {entry.definition.source_function}:{entry.definition.source_line}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Severity:</span>{' '}
            <span className="text-gray-700">{entry.definition.default_severity}</span>
          </div>
          {entry.fired_message && (
            <div>
              <span className="text-gray-500">Fired Message:</span>{' '}
              <span className="text-red-700">{entry.fired_message}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CategorySection({ group, filter }: { group: CategoryGroup; filter: FilterMode }) {
  const [isOpen, setIsOpen] = useState(group.fired_count > 0);

  const filteredEntries = useMemo(() => {
    if (filter === 'all') return group.entries;
    if (filter === 'fired') return group.entries.filter((e) => e.status === 'fired');
    return group.entries.filter((e) => e.status === 'passed');
  }, [group.entries, filter]);

  if (filteredEntries.length === 0) return null;

  const hasFired = group.fired_count > 0;

  return (
    <div className="border-b border-gray-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-gray-50 ${
          hasFired ? 'bg-red-50/30' : 'bg-white'
        }`}
      >
        <span className="text-gray-400 text-xs">{isOpen ? '▼' : '▶'}</span>
        <span className="text-sm font-medium text-gray-800">{group.label}</span>
        <span className="flex-1" />
        {group.fired_count > 0 && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium">
            {group.fired_count} fired
          </span>
        )}
        <span className="text-xs text-gray-500">
          {group.passed_count}/{group.total} passed
        </span>
      </button>

      {isOpen && (
        <div>
          {filteredEntries.map((entry) => (
            <RuleRow key={entry.definition.rule_id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Panel
// ============================================================================

export function RulesAuditPanel() {
  const isDebugEnabled = useRulesDebugEnabled();
  const { report, clear, enabled } = useRulesAudit();
  const [isMinimized, setIsMinimized] = useState(false);
  const [filter, setFilter] = useState<FilterMode>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Don't render if not enabled
  if (!isDebugEnabled || !enabled) {
    return null;
  }

  if (!report) {
    return null;
  }

  // Filter categories by search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return report.by_category;

    const q = searchQuery.toLowerCase();
    return report.by_category
      .map((group) => ({
        ...group,
        entries: group.entries.filter(
          (e) =>
            e.definition.human_name.toLowerCase().includes(q) ||
            e.definition.check_description.toLowerCase().includes(q) ||
            e.definition.field.toLowerCase().includes(q) ||
            e.definition.rule_id.toLowerCase().includes(q) ||
            (e.fired_message && e.fired_message.toLowerCase().includes(q))
        ),
      }))
      .filter((g) => g.entries.length > 0);
  }, [report.by_category, searchQuery]);

  return (
    <div className="fixed bottom-4 left-4 z-50 w-[520px] max-h-[70vh] flex flex-col bg-white rounded-lg shadow-xl border border-gray-300 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800 text-white">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">Rules Audit</span>
          <span className="text-xs text-gray-400">
            ({report.summary.total_rules} rules)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clear}
            className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            title="Clear audit snapshot"
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
        Observability only — shows rule inventory with fired/passed status.
      </div>

      {!isMinimized && (
        <>
          {/* Summary */}
          <SummaryBar summary={report.summary} />

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
              All ({report.summary.total_rules})
            </button>
            <button
              onClick={() => setFilter('fired')}
              className={`flex-1 px-3 py-1.5 ${
                filter === 'fired'
                  ? 'bg-red-50 border-b-2 border-red-500 font-medium text-red-700'
                  : 'hover:bg-gray-50'
              }`}
            >
              Fired ({report.summary.fired})
            </button>
            <button
              onClick={() => setFilter('passed')}
              className={`flex-1 px-3 py-1.5 ${
                filter === 'passed'
                  ? 'bg-green-50 border-b-2 border-green-500 font-medium text-green-700'
                  : 'hover:bg-gray-50'
              }`}
            >
              Passed ({report.summary.passed})
            </button>
          </div>

          {/* Search */}
          <div className="px-3 py-1.5 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search rules by name, field, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs px-2 py-1 border border-gray-200 rounded focus:outline-none focus:border-gray-400"
            />
          </div>

          {/* Category list */}
          <div className="flex-1 overflow-y-auto">
            {report.summary.not_evaluated === report.summary.total_rules ? (
              <div className="p-4 text-center text-sm text-gray-500">
                No validation run captured yet.
                <br />
                <span className="text-xs">
                  Change an input to trigger validation.
                </span>
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                No rules match the current filter.
              </div>
            ) : (
              filteredCategories.map((group) => (
                <CategorySection
                  key={group.category}
                  group={group}
                  filter={filter}
                />
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex justify-between">
            <span>
              {report.product_key
                ? `Product: ${report.product_key}`
                : 'No product context'}
            </span>
            <span>
              {report.summary.not_evaluated === 0
                ? 'Validation captured'
                : 'Awaiting validation'}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export default RulesAuditPanel;
