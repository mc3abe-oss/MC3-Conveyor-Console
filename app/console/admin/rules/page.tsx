'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import {
  MANAGER_RULES,
  MANAGER_RULE_COUNT,
  SECTIONS,
  type RuleSection,
  type ManagerRule,
} from '../../../../src/lib/rules-telemetry/rules-manager-data';
import { useRuleTelemetry } from '../../../../src/lib/rules-telemetry/useRuleTelemetry';

// ============================================================================
// Types
// ============================================================================

type ReviewStatus = 'unreviewed' | 'confirmed' | 'flagged';
type SeverityFilter = 'all' | 'error' | 'warning' | 'info';

interface RuleWithStatus extends ManagerRule {
  status: ReviewStatus;
  fired: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const SEVERITY_LABELS: Record<string, string> = {
  error: 'ERROR',
  warning: 'WARN',
  info: 'INFO',
};

const STATUS_LABELS: Record<ReviewStatus, string> = {
  unreviewed: 'Unreviewed',
  confirmed: 'Confirmed',
  flagged: 'Flagged',
};

const STATUS_ICONS: Record<ReviewStatus, string> = {
  unreviewed: '\u25CB',
  confirmed: '\u2713',
  flagged: '\u2691',
};

const STATUS_CYCLE: ReviewStatus[] = ['unreviewed', 'confirmed', 'flagged'];

const STORAGE_KEY = 'mc3-rules-review-status:v1';

const SECTION_TABS: ('All' | RuleSection)[] = ['All', ...SECTIONS];

// ============================================================================
// Persistence
// ============================================================================

function loadReviewStatuses(): Record<string, ReviewStatus> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveReviewStatuses(statuses: Record<string, ReviewStatus>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(statuses));
  } catch {
    // localStorage may be full or unavailable
  }
}

// ============================================================================
// Sub-components
// ============================================================================

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    error: 'bg-red-900/40 text-red-300 border-red-800/60',
    warning: 'bg-amber-900/30 text-amber-300 border-amber-800/50',
    info: 'bg-sky-900/30 text-sky-300 border-sky-800/50',
  };
  return (
    <span
      className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded border ${colors[severity] ?? ''}`}
    >
      {SEVERITY_LABELS[severity] ?? severity}
    </span>
  );
}

function StatusBadge({
  status,
  onClick,
}: {
  status: ReviewStatus;
  onClick: (e: React.MouseEvent) => void;
}) {
  const colors: Record<ReviewStatus, string> = {
    unreviewed: 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500',
    confirmed: 'bg-emerald-900/30 text-emerald-400 border-emerald-800/50',
    flagged: 'bg-orange-900/30 text-orange-400 border-orange-800/50',
  };
  return (
    <button
      onClick={onClick}
      className={`text-[10px] font-medium tracking-wide px-2.5 py-1 rounded border transition-colors ${colors[status]}`}
    >
      {STATUS_ICONS[status]} {STATUS_LABELS[status]}
    </button>
  );
}

function FiredIndicator({ fired }: { fired: boolean }) {
  if (!fired) return null;
  return (
    <span className="flex items-center gap-1 text-[10px] font-medium text-amber-400">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
      ACTIVE
    </span>
  );
}

function RuleCard({
  rule,
  onStatusChange,
}: {
  rule: RuleWithStatus;
  onStatusChange: (id: string, status: ReviewStatus) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const borderColor = rule.fired
    ? rule.severity === 'error'
      ? 'border-l-red-500'
      : 'border-l-amber-500'
    : 'border-l-zinc-700';

  return (
    <div
      className={`bg-zinc-900/80 border border-zinc-800 ${borderColor} border-l-2 rounded-lg overflow-hidden transition-all ${
        rule.fired ? 'ring-1 ring-amber-900/30' : ''
      }`}
    >
      {/* Collapsed header */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded(!expanded);
          }
        }}
        className="w-full px-4 py-3 flex items-start gap-3 text-left hover:bg-zinc-800/40 transition-colors cursor-pointer"
      >
        <span className="text-zinc-600 mt-0.5 text-sm shrink-0">
          {expanded ? '\u25BE' : '\u25B8'}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-zinc-200">{rule.name}</span>
            <SeverityBadge severity={rule.severity} />
            <FiredIndicator fired={rule.fired} />
            {rule.hasTodo && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-900/40 text-violet-300 border border-violet-800/50">
                REVIEW
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{rule.message}</p>
        </div>
        <StatusBadge
          status={rule.status}
          onClick={(e) => {
            e.stopPropagation();
            const nextIdx = (STATUS_CYCLE.indexOf(rule.status) + 1) % STATUS_CYCLE.length;
            onStatusChange(rule.id, STATUS_CYCLE[nextIdx]);
          }}
        />
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-zinc-800/60">
          <div className="grid grid-cols-1 gap-3 mt-2">
            {/* IF / THEN */}
            <div className="bg-zinc-950/60 rounded-lg p-3 space-y-2">
              <div className="flex gap-2">
                <span className="text-[10px] font-bold text-sky-400 bg-sky-900/30 px-1.5 py-0.5 rounded shrink-0 mt-px">
                  IF
                </span>
                <span className="text-sm text-zinc-300">{rule.condition}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-900/30 px-1.5 py-0.5 rounded shrink-0 mt-px">
                  THEN
                </span>
                <span className="text-sm text-zinc-300">{rule.action}</span>
              </div>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
              <div>
                <span className="text-zinc-600">Threshold</span>
                <p className="text-zinc-400 font-mono text-[11px] mt-0.5">{rule.threshold}</p>
              </div>
              <div>
                <span className="text-zinc-600">Rule ID</span>
                <p className="text-zinc-400 font-mono text-[11px] mt-0.5">{rule.id}</p>
              </div>
              <div>
                <span className="text-zinc-600">Fields affected</span>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {rule.fields.map((f) => (
                    <span
                      key={f}
                      className="text-[10px] font-mono bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-zinc-600">Category</span>
                <p className="text-zinc-400 mt-0.5">{rule.category}</p>
              </div>
            </div>

            {/* TODO note */}
            {rule.hasTodo && rule.todoNote && (
              <div className="bg-violet-950/30 border border-violet-800/40 rounded-lg p-3 mt-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-violet-400 text-xs font-bold">
                    {'\u2691'} Engineering Review Needed
                  </span>
                </div>
                <p className="text-xs text-violet-300/80 leading-relaxed">{rule.todoNote}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionSummary({ rules }: { rules: RuleWithStatus[] }) {
  const errors = rules.filter((r) => r.severity === 'error').length;
  const warnings = rules.filter((r) => r.severity === 'warning').length;
  const fired = rules.filter((r) => r.fired).length;
  const reviewed = rules.filter((r) => r.status === 'confirmed').length;
  const flagged = rules.filter((r) => r.status === 'flagged').length;
  const todos = rules.filter((r) => r.hasTodo).length;

  return (
    <div className="flex items-center gap-3 text-xs text-zinc-500">
      <span>
        {rules.length} rule{rules.length !== 1 ? 's' : ''}
      </span>
      <span className="text-zinc-700">|</span>
      {errors > 0 && <span className="text-red-400">{errors} blocking</span>}
      {warnings > 0 && <span className="text-amber-400">{warnings} warnings</span>}
      {fired > 0 && (
        <span className="text-amber-300 font-medium">{fired} active</span>
      )}
      {reviewed > 0 && <span className="text-emerald-400">{reviewed} confirmed</span>}
      {flagged > 0 && <span className="text-orange-400">{flagged} flagged</span>}
      {todos > 0 && <span className="text-violet-400">{todos} needs review</span>}
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function RulesManagerPage() {
  const [activeSection, setActiveSection] = useState<'All' | RuleSection>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<SeverityFilter>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | ReviewStatus>('all');
  const [showFiredOnly, setShowFiredOnly] = useState(false);
  const [reviewStatuses, setReviewStatuses] = useState<Record<string, ReviewStatus>>({});

  // Load persisted review statuses on mount
  useEffect(() => {
    setReviewStatuses(loadReviewStatuses());
  }, []);

  // Telemetry — which rules are currently firing
  const { events } = useRuleTelemetry();
  const firedRuleIds = useMemo(() => {
    const ids = new Set<string>();
    for (const event of events) {
      ids.add(event.rule_id);
    }
    return ids;
  }, [events]);

  // Build enriched rule list with status and fired state
  const rules: RuleWithStatus[] = useMemo(() => {
    return MANAGER_RULES.map((r) => ({
      ...r,
      status: reviewStatuses[r.id] ?? 'unreviewed',
      fired: firedRuleIds.has(r.id),
    }));
  }, [reviewStatuses, firedRuleIds]);

  // Status change handler
  const handleStatusChange = useCallback(
    (id: string, newStatus: ReviewStatus) => {
      setReviewStatuses((prev) => {
        const next = { ...prev, [id]: newStatus };
        // Remove unreviewed entries to keep storage clean
        if (newStatus === 'unreviewed') {
          delete next[id];
        }
        saveReviewStatuses(next);
        return next;
      });
    },
    []
  );

  // Filtering
  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      if (activeSection !== 'All' && r.section !== activeSection) return false;
      if (filterSeverity !== 'all' && r.severity !== filterSeverity) return false;
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      if (showFiredOnly && !r.fired) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          r.name.toLowerCase().includes(q) ||
          r.message.toLowerCase().includes(q) ||
          r.condition.toLowerCase().includes(q) ||
          r.fields.some((f) => f.toLowerCase().includes(q)) ||
          r.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [rules, activeSection, searchQuery, filterSeverity, filterStatus, showFiredOnly]);

  // Group by category
  const groupedRules = useMemo(() => {
    const groups: Record<string, RuleWithStatus[]> = {};
    for (const r of filteredRules) {
      if (!groups[r.category]) groups[r.category] = [];
      groups[r.category].push(r);
    }
    return groups;
  }, [filteredRules]);

  // Global stats
  const totalFired = rules.filter((r) => r.fired).length;
  const totalErrors = rules.filter((r) => r.fired && r.severity === 'error').length;
  const totalWarnings = rules.filter((r) => r.fired && r.severity === 'warning').length;
  const totalReviewed = rules.filter((r) => r.status === 'confirmed').length;
  const totalFlagged = rules.filter((r) => r.status === 'flagged').length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-950/90 sticky top-0 z-20 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4">
          {/* Breadcrumb */}
          <div className="mb-3">
            <Link
              href="/console/admin"
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {'\u2190'} Admin
            </Link>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-semibold text-zinc-100">Rules Manager</h1>
                <span className="text-xs text-zinc-600 font-mono bg-zinc-900 px-2 py-0.5 rounded">
                  Belt Conveyor
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                {MANAGER_RULE_COUNT} rules across {SECTIONS.length} sections
              </p>
            </div>

            {/* Global stats */}
            <div className="flex items-center gap-4">
              {totalFired > 0 && (
                <div className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2">
                  <span className="text-xs text-zinc-400">Active on current config:</span>
                  {totalErrors > 0 && (
                    <span className="flex items-center gap-1 text-xs text-red-400 font-medium">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      {totalErrors} error{totalErrors !== 1 ? 's' : ''}
                    </span>
                  )}
                  {totalWarnings > 0 && (
                    <span className="flex items-center gap-1 text-xs text-amber-400 font-medium">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      {totalWarnings} warning{totalWarnings !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              )}
              <div className="text-xs text-zinc-500">
                <span className="text-emerald-400 font-medium">{totalReviewed}</span> confirmed
                {totalFlagged > 0 && (
                  <>
                    {' \u00B7 '}
                    <span className="text-orange-400 font-medium">{totalFlagged}</span> flagged
                  </>
                )}
                {' \u00B7 '}
                <span className="text-zinc-400">
                  {rules.length - totalReviewed - totalFlagged}
                </span>{' '}
                unreviewed
              </div>
            </div>
          </div>

          {/* Section tabs */}
          <div className="flex items-center gap-1 mt-4">
            {SECTION_TABS.map((section) => {
              const count =
                section === 'All'
                  ? rules.length
                  : rules.filter((r) => r.section === section).length;
              const firedCount =
                section === 'All'
                  ? rules.filter((r) => r.fired).length
                  : rules.filter((r) => r.section === section && r.fired).length;
              return (
                <button
                  key={section}
                  onClick={() => setActiveSection(section)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-2 ${
                    activeSection === section
                      ? 'bg-zinc-800 text-zinc-100'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
                  }`}
                >
                  {section}
                  <span className="text-[10px] text-zinc-600">{count}</span>
                  {firedCount > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="border-b border-zinc-800/50 bg-zinc-950/50">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rules by name, field, condition, or message..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 text-xs"
              >
                {'\u2715'}
              </button>
            )}
          </div>

          {/* Severity filter */}
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value as SeverityFilter)}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-300 focus:outline-none"
          >
            <option value="all">All severities</option>
            <option value="error">Errors only</option>
            <option value="warning">Warnings only</option>
            <option value="info">Info only</option>
          </select>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'all' | ReviewStatus)}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-300 focus:outline-none"
          >
            <option value="all">All statuses</option>
            <option value="unreviewed">Unreviewed</option>
            <option value="confirmed">Confirmed</option>
            <option value="flagged">Flagged</option>
          </select>

          {/* Show active only toggle */}
          <button
            onClick={() => setShowFiredOnly(!showFiredOnly)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
              showFiredOnly
                ? 'bg-amber-900/20 border-amber-800/50 text-amber-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${showFiredOnly ? 'bg-amber-400 animate-pulse' : 'bg-zinc-600'}`}
            />
            {showFiredOnly ? 'Showing active only' : 'Show active only'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Section summary */}
        {activeSection !== 'All' && (
          <div className="mb-4">
            <SectionSummary rules={rules.filter((r) => r.section === activeSection)} />
          </div>
        )}

        {/* Results count */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-zinc-600">
            {filteredRules.length} rule{filteredRules.length !== 1 ? 's' : ''}
            {searchQuery && ` matching "${searchQuery}"`}
            {showFiredOnly && ' (active only)'}
          </span>
        </div>

        {/* Grouped rules */}
        {Object.keys(groupedRules).length === 0 ? (
          <div className="text-center py-12 text-zinc-600 text-sm">
            No rules match the current filters.
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedRules).map(([category, catRules]) => (
              <div key={category}>
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    {category}
                  </h3>
                  <div className="flex-1 border-t border-zinc-800/50" />
                  <span className="text-[10px] text-zinc-600">{catRules.length}</span>
                </div>
                <div className="space-y-2">
                  {catRules.map((rule) => (
                    <RuleCard
                      key={rule.id}
                      rule={rule}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-800 bg-zinc-950/90 sticky bottom-0">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="text-[10px] text-zinc-600 font-mono">
            Rules source: sliderbed_v1/rules.ts (post Phase 2 dedup) · Product: belt_conveyor_v1
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-600">
              Progress: {totalReviewed}/{rules.length} reviewed
            </span>
            <div className="w-32 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all"
                style={{ width: `${rules.length > 0 ? (totalReviewed / rules.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
