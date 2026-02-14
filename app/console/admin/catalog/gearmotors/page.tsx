/**
 * NORD Catalog Admin Page (v1)
 *
 * Admin interface for viewing NORD catalog data from vendor_components table.
 * This is a READ-ONLY view - parts are managed via seed scripts from CSV catalogs.
 *
 * Tabs:
 * - Catalog: View NORD parts/kits/accessories from vendor_components
 * - Mappings: (Coming soon) Manage versioned mapping rules for PN resolution
 * - Coverage: View resolution coverage and identify gaps
 */

'use client';

import { useState, useEffect } from 'react';
import { useCurrentUserRole } from '../../../../hooks/useCurrentUserRole';

// Types - matches transformed output from /api/admin/nord/parts
interface NordPart {
  id: string;
  pn: string;
  name: string;
  component_type: string;
  family: string;
  series: string;
  size_key: string | null;
  part_type: string;
  mounting_style: string | null;
  output_type: string | null;
  bore_in: number | null;
  ratio: number | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  is_active: boolean;
  source: string;
  created_at: string;
  updated_at: string;
}

// Coverage types
interface CoverageSummary {
  total: number;
  resolved: number;
  ambiguous: number;
  unresolved: number;
  invalid: number;
  generated_at: string | null;
}

interface CoverageInputs {
  series: string;
  gear_unit_size: string;
  gearmotor_mounting_style: string;
  output_shaft_option: string | null;
  plug_in_shaft_style: string | null;
  total_ratio: number | null;
  motor_hp: number | null;
}

interface CoverageCase {
  id: string;
  case_key: string;
  inputs_json: CoverageInputs;
  status: 'resolved' | 'ambiguous' | 'unresolved' | 'invalid';
  resolved_pns: string[];
  message: string | null;
  components_json: Record<string, {
    found: boolean;
    part_number: string | null;
    description: string | null;
  }>;
  last_checked_at: string;
}

type TabId = 'catalog' | 'mappings' | 'coverage';

export default function NordCatalogAdminPage() {
  const { isLoading: isLoadingRole } = useCurrentUserRole();

  const [activeTab, setActiveTab] = useState<TabId>('catalog');

  if (isLoadingRole) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-4">NORD Catalog Admin</h1>
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold mb-2">NORD Catalog Admin</h1>
      <p className="text-gray-600 mb-4">
        View NORD vendor components catalog data. Parts are managed via seed scripts from CSV catalogs.
      </p>

      {/* Read-only notice */}
      <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
        This is a read-only view. NORD parts are seeded from authoritative CSV catalogs via{' '}
        <code className="bg-blue-100 px-1 rounded">scripts/seed-nord-flexbloc-v2.mjs</code>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <TabButton
            active={activeTab === 'catalog'}
            onClick={() => setActiveTab('catalog')}
          >
            Catalog
          </TabButton>
          <TabButton
            active={activeTab === 'mappings'}
            onClick={() => setActiveTab('mappings')}
            disabled
          >
            Mappings
          </TabButton>
          <TabButton
            active={activeTab === 'coverage'}
            onClick={() => setActiveTab('coverage')}
          >
            Coverage
          </TabButton>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'catalog' && <CatalogTab />}
      {activeTab === 'mappings' && <ComingSoonTab feature="Mapping Rules" />}
      {activeTab === 'coverage' && <CoverageTab />}
    </main>
  );
}

function ComingSoonTab({ feature }: { feature: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-8 text-center">
      <h2 className="text-xl font-semibold text-gray-700 mb-2">{feature}</h2>
      <p className="text-gray-500">
        This feature is coming soon. It will allow managing mapping rules for
        NORD part number resolution based on application parameters.
      </p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`py-4 px-1 border-b-2 font-medium text-sm ${
        disabled
          ? 'border-transparent text-gray-300 cursor-not-allowed'
          : active
          ? 'border-blue-500 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      {children}
      {disabled && <span className="ml-1 text-xs">(soon)</span>}
    </button>
  );
}

// =============================================================================
// COVERAGE TAB
// =============================================================================

function CoverageTab() {
  const [summary, setSummary] = useState<CoverageSummary | null>(null);
  const [cases, setCases] = useState<CoverageCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedCase, setSelectedCase] = useState<CoverageCase | null>(null);

  useEffect(() => {
    void loadCoverage();
  }, [statusFilter]);

  async function loadCoverage() {
    setIsLoading(true);
    setError(null);
    try {
      const url = statusFilter
        ? `/api/admin/nord/coverage?status=${statusFilter}`
        : '/api/admin/nord/coverage';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch coverage');
      const data = await response.json();
      setSummary(data.summary);
      setCases(data.cases || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load coverage');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/nord/coverage/refresh', {
        method: 'POST',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to refresh coverage');
      }
      await loadCoverage();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh');
    } finally {
      setIsRefreshing(false);
    }
  }

  if (isLoading && !summary) {
    return <p className="text-gray-500">Loading coverage data...</p>;
  }

  if (error && !summary) {
    return (
      <div>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={loadCoverage}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  const isEmpty = !summary || summary.total === 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <SummaryCard
          label="Total"
          value={summary?.total || 0}
          color="gray"
        />
        <SummaryCard
          label="Resolved"
          value={summary?.resolved || 0}
          color="green"
          onClick={() => setStatusFilter(statusFilter === 'resolved' ? '' : 'resolved')}
          active={statusFilter === 'resolved'}
        />
        <SummaryCard
          label="Ambiguous"
          value={summary?.ambiguous || 0}
          color="yellow"
          onClick={() => setStatusFilter(statusFilter === 'ambiguous' ? '' : 'ambiguous')}
          active={statusFilter === 'ambiguous'}
        />
        <SummaryCard
          label="Unresolved"
          value={summary?.unresolved || 0}
          color="red"
          onClick={() => setStatusFilter(statusFilter === 'unresolved' ? '' : 'unresolved')}
          active={statusFilter === 'unresolved'}
        />
        <SummaryCard
          label="Invalid"
          value={summary?.invalid || 0}
          color="gray"
          onClick={() => setStatusFilter(statusFilter === 'invalid' ? '' : 'invalid')}
          active={statusFilter === 'invalid'}
        />
      </div>

      {/* Refresh button and status */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {summary?.generated_at ? (
            <>Last updated: {new Date(summary.generated_at).toLocaleString()}</>
          ) : (
            <>No coverage data generated yet</>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-wait"
        >
          {isRefreshing ? 'Regenerating...' : 'Recalculate Coverage'}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      {isEmpty ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <h3 className="text-lg font-medium text-gray-700 mb-2">No Coverage Data</h3>
          <p className="text-gray-500 mb-4">
            Click &quot;Recalculate Coverage&quot; to generate coverage analysis.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cases List */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-medium">
                Coverage Cases ({cases.length})
                {statusFilter && <span className="ml-2 text-sm text-gray-500">- {statusFilter}</span>}
              </h3>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {cases.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCase(c)}
                  className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 ${
                    selectedCase?.id === c.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-sm">
                      {c.inputs_json.gear_unit_size}
                    </span>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="text-sm text-gray-600">
                    {c.inputs_json.gearmotor_mounting_style === 'shaft_mounted'
                      ? 'Shaft Mounted'
                      : 'Bottom Mount'}
                    {c.inputs_json.output_shaft_option && (
                      <> / {c.inputs_json.output_shaft_option}</>
                    )}
                    {c.inputs_json.plug_in_shaft_style && (
                      <> / {c.inputs_json.plug_in_shaft_style}</>
                    )}
                  </div>
                  {c.message && (
                    <div className="text-xs text-gray-500 mt-1 truncate">
                      {c.message}
                    </div>
                  )}
                </button>
              ))}
              {cases.length === 0 && (
                <div className="p-4 text-center text-gray-500">
                  No cases match the filter
                </div>
              )}
            </div>
          </div>

          {/* Case Detail */}
          <div className="bg-white rounded-lg shadow p-6">
            {selectedCase ? (
              <CaseDetailView caseData={selectedCase} />
            ) : (
              <div className="text-center py-8 text-gray-500">
                Select a case to view details
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color,
  onClick,
  active,
}: {
  label: string;
  value: number;
  color: 'gray' | 'green' | 'yellow' | 'red';
  onClick?: () => void;
  active?: boolean;
}) {
  const colorClasses = {
    gray: 'bg-gray-100 text-gray-800',
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
  };

  const baseClasses = `rounded-lg p-4 ${colorClasses[color]}`;
  const interactiveClasses = onClick
    ? 'cursor-pointer hover:ring-2 hover:ring-offset-2 hover:ring-blue-500'
    : '';
  const activeClasses = active ? 'ring-2 ring-blue-500' : '';

  return (
    <div
      onClick={onClick}
      className={`${baseClasses} ${interactiveClasses} ${activeClasses}`}
    >
      <div className="text-sm font-medium">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: CoverageCase['status'] }) {
  const config = {
    resolved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Resolved' },
    ambiguous: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Ambiguous' },
    unresolved: { bg: 'bg-red-100', text: 'text-red-800', label: 'Unresolved' },
    invalid: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Invalid' },
  };
  const c = config[status];

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

function CaseDetailView({ caseData }: { caseData: CoverageCase }) {
  const { inputs_json: inputs, components_json: components } = caseData;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Case Details</h3>
        <StatusBadge status={caseData.status} />
      </div>

      {/* Inputs */}
      <div>
        <h4 className="text-sm font-medium text-gray-500 mb-2">Inputs</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-500">Series:</span>{' '}
            <span className="font-medium">{inputs.series}</span>
          </div>
          <div>
            <span className="text-gray-500">Size:</span>{' '}
            <span className="font-medium">{inputs.gear_unit_size}</span>
          </div>
          <div>
            <span className="text-gray-500">Mounting:</span>{' '}
            <span className="font-medium">{inputs.gearmotor_mounting_style}</span>
          </div>
          <div>
            <span className="text-gray-500">Output:</span>{' '}
            <span className="font-medium">{inputs.output_shaft_option || '-'}</span>
          </div>
          <div>
            <span className="text-gray-500">Shaft Style:</span>{' '}
            <span className="font-medium">{inputs.plug_in_shaft_style || '-'}</span>
          </div>
          <div>
            <span className="text-gray-500">Ratio:</span>{' '}
            <span className="font-medium">{inputs.total_ratio || '-'}</span>
          </div>
        </div>
      </div>

      {/* Message */}
      {caseData.message && (
        <div className="p-3 bg-gray-50 rounded text-sm">
          <span className="font-medium">Result:</span> {caseData.message}
        </div>
      )}

      {/* Components */}
      {Object.keys(components).length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-2">Components</h4>
          <div className="space-y-2">
            {Object.entries(components).map(([type, comp]) => (
              <div
                key={type}
                className={`p-2 rounded border text-sm ${
                  comp.found
                    ? 'border-green-200 bg-green-50'
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{type}</span>
                  {comp.found ? (
                    <span className="text-green-700 font-mono">{comp.part_number}</span>
                  ) : (
                    <span className="text-red-700">Not Found</span>
                  )}
                </div>
                {comp.description && (
                  <div className="text-xs text-gray-600 mt-1">{comp.description}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resolved PNs */}
      {caseData.resolved_pns.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-2">Resolved Part Numbers</h4>
          <div className="flex flex-wrap gap-2">
            {caseData.resolved_pns.map((pn) => (
              <span
                key={pn}
                className="px-2 py-1 bg-gray-100 rounded font-mono text-sm"
              >
                {pn}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Timestamp */}
      <div className="text-xs text-gray-500 pt-2 border-t">
        Last checked: {new Date(caseData.last_checked_at).toLocaleString()}
      </div>
    </div>
  );
}

// =============================================================================
// CATALOG TAB
// =============================================================================

function CatalogTab() {
  const [parts, setParts] = useState<NordPart[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPart, setSelectedPart] = useState<NordPart | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPartType, setFilterPartType] = useState('');
  const [filterSeries, setFilterSeries] = useState('');

  useEffect(() => {
    void loadParts();
  }, []);

  async function loadParts() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/nord/parts');
      if (!response.ok) throw new Error('Failed to fetch parts');
      const data = await response.json();
      setParts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load parts');
    } finally {
      setIsLoading(false);
    }
  }

  const filteredParts = parts.filter((part) => {
    const matchesSearch =
      !searchQuery ||
      part.pn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      part.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPartType = !filterPartType || part.component_type === filterPartType;
    const matchesSeries = !filterSeries || part.series === filterSeries;
    return matchesSearch && matchesPartType && matchesSeries;
  });

  const uniquePartTypes = [...new Set(parts.map((p) => p.component_type))].sort();
  const uniqueSeries = [...new Set(parts.map((p) => p.series))].sort();

  if (isLoading) {
    return <p className="text-gray-500">Loading catalog...</p>;
  }

  if (error) {
    return (
      <div>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={loadParts}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Parts List */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Parts ({filteredParts.length})</h2>
          </div>

          {/* Search and Filters */}
          <div className="space-y-2 mb-4">
            <input
              type="text"
              placeholder="Search PN or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={filterPartType}
                onChange={(e) => setFilterPartType(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="">All Types</option>
                {uniquePartTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <select
                value={filterSeries}
                onChange={(e) => setFilterSeries(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="">All Series</option>
                {uniqueSeries.map((series) => (
                  <option key={series} value={series}>
                    {series}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Parts List */}
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {filteredParts.map((part) => (
              <button
                key={part.id}
                onClick={() => setSelectedPart(part)}
                className={`w-full text-left p-3 rounded border ${
                  selectedPart?.id === part.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-medium">{part.pn}</span>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                    {part.component_type}
                  </span>
                </div>
                <div className="text-sm text-gray-700 truncate">{part.name}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {part.series} {part.size_key && `/ ${part.size_key}`}
                </div>
              </button>
            ))}
            {filteredParts.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                No parts found
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Part Detail View */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-lg shadow p-6">
          {selectedPart ? (
            <PartDetailView part={selectedPart} />
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>Select a part from the list to view details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Part Detail View Component (Read-only)
function PartDetailView({ part }: { part: NordPart }) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Part Details: {part.pn}</h2>

      <div className="space-y-4">
        {/* Row 1: Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-500">Part Number</label>
            <p className="font-mono text-lg">{part.pn}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Component Type</label>
            <p className="text-lg">{part.component_type}</p>
          </div>
        </div>

        {/* Row 2: Name and Description */}
        <div>
          <label className="block text-sm font-medium text-gray-500">Name</label>
          <p className="text-lg">{part.name}</p>
        </div>
        {part.description && (
          <div>
            <label className="block text-sm font-medium text-gray-500">Description</label>
            <p className="text-gray-700">{part.description}</p>
          </div>
        )}

        {/* Row 3: Series and Size */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-500">Series</label>
            <p>{part.series || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Size Key</label>
            <p>{part.size_key || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Ratio</label>
            <p>{part.ratio ?? '-'}</p>
          </div>
        </div>

        {/* Row 4: Mounting and Output */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-500">Mounting Style</label>
            <p>{part.mounting_style || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Output Type</label>
            <p>{part.output_type || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Bore (in)</label>
            <p>{part.bore_in ?? '-'}</p>
          </div>
        </div>

        {/* Row 5: Metadata JSON */}
        {part.metadata && Object.keys(part.metadata).length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">Metadata</label>
            <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto border border-gray-200">
              {JSON.stringify(part.metadata, null, 2)}
            </pre>
          </div>
        )}

        {/* Row 6: Timestamps */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t text-sm text-gray-500">
          <div>
            <label className="block text-xs font-medium">Created</label>
            <p>{new Date(part.created_at).toLocaleString()}</p>
          </div>
          <div>
            <label className="block text-xs font-medium">Updated</label>
            <p>{new Date(part.updated_at).toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
