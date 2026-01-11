/**
 * NORD Catalog Admin Page (v1)
 *
 * Admin interface for viewing NORD catalog data from vendor_components table.
 * This is a READ-ONLY view - parts are managed via seed scripts from CSV catalogs.
 *
 * Tabs:
 * - Catalog: View NORD parts/kits/accessories from vendor_components
 * - Mappings: (Coming soon) Manage versioned mapping rules for PN resolution
 * - Coverage: (Coming soon) View resolution coverage and identify gaps
 */

'use client';

import { useState, useEffect } from 'react';
import { useCurrentUserRole } from '../../../hooks/useCurrentUserRole';

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
            disabled
          >
            Coverage
          </TabButton>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'catalog' && <CatalogTab />}
      {activeTab === 'mappings' && <ComingSoonTab feature="Mapping Rules" />}
      {activeTab === 'coverage' && <ComingSoonTab feature="Coverage Analysis" />}
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
    loadParts();
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
