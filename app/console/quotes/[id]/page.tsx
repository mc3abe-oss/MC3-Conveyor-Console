'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  QuoteWithRelations,
  QuoteStatus,
  Spec,
  Note,
  Attachment,
  ScopeLine,
  ScopeCategory,
} from '../../../../src/lib/database/quote-types';
import { formatRef } from '../../../../src/lib/quote-identifiers';

const STATUS_BADGE_COLORS: Record<QuoteStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  won: 'bg-green-100 text-green-800',
  lost: 'bg-red-100 text-red-800',
  converted: 'bg-purple-100 text-purple-800',
};

const SCOPE_CATEGORIES: ScopeCategory[] = [
  'mechanical', 'electrical', 'controls', 'installation',
  'documentation', 'training', 'warranty', 'exclusion', 'other'
];

export default function ConsoleQuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const quoteId = params.id as string;

  const [quote, setQuote] = useState<QuoteWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const [activeTab, setActiveTab] = useState<'specs' | 'notes' | 'attachments' | 'scope'>('specs');

  // Form states
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [newSpec, setNewSpec] = useState({ key: '', value: '', units: '', confidence: 'estimated' as 'estimated' | 'confirmed' });
  const [addingSpec, setAddingSpec] = useState(false);
  const [newScopeLine, setNewScopeLine] = useState({ category: 'mechanical' as ScopeCategory, text: '', inclusion: 'included' as 'included' | 'excluded' });
  const [addingScopeLine, setAddingScopeLine] = useState(false);

  const fetchQuote = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${quoteId}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch quote');
      }
      const data = await res.json();
      setQuote(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [quoteId]);

  useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);

  const handleConvert = async () => {
    if (!quote || quote.quote_status !== 'won') return;
    if (!confirm('Convert this quote to a Sales Order? This action cannot be undone.')) return;

    setConverting(true);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/convert`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to convert quote');
      }
      const data = await res.json();
      router.push(`/console/sales-orders/${data.sales_order_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to convert');
      setConverting(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || quote?.is_read_only) return;
    setAddingNote(true);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote }),
      });
      if (!res.ok) throw new Error('Failed to add note');
      setNewNote('');
      fetchQuote();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  const handleAddSpec = async () => {
    if (!newSpec.key.trim() || !newSpec.value.trim() || quote?.is_read_only) return;
    setAddingSpec(true);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/specs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSpec),
      });
      if (!res.ok) throw new Error('Failed to add spec');
      setNewSpec({ key: '', value: '', units: '', confidence: 'estimated' });
      fetchQuote();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add spec');
    } finally {
      setAddingSpec(false);
    }
  };

  const handleAddScopeLine = async () => {
    if (!newScopeLine.text.trim() || quote?.is_read_only) return;
    setAddingScopeLine(true);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/scope-lines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newScopeLine),
      });
      if (!res.ok) throw new Error('Failed to add scope line');
      setNewScopeLine({ category: 'mechanical', text: '', inclusion: 'included' });
      fetchQuote();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add scope line');
    } finally {
      setAddingScopeLine(false);
    }
  };

  const handleStatusChange = async (newStatus: QuoteStatus) => {
    if (quote?.is_read_only) return;
    try {
      const res = await fetch(`/api/quotes/${quoteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quote_status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      fetchQuote();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center py-12 text-gray-500">Loading quote...</div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-red-800 font-medium">Error</h3>
          <p className="text-red-700 text-sm mt-1">{error || 'Quote not found'}</p>
          <Link href="/console/quotes" className="mt-3 inline-block text-red-700 hover:text-red-800">
            Back to Quotes
          </Link>
        </div>
      </div>
    );
  }

  const currentSpecs = quote.specs.filter((s: Spec) => s.is_current);
  const previousSpecs = quote.specs.filter((s: Spec) => !s.is_current);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* DEV MARKER */}
      <div className="mb-4 p-3 bg-yellow-200 text-black font-bold text-center rounded">
        DEV_MARKER_VAULT_IN_CONSOLE_PHASE1
      </div>

      {/* Header with status and actions */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-2">
          <Link href="/console/quotes" className="text-gray-500 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{formatRef('quote', quote.base_number)}</h1>
          <span className={`px-3 py-1 text-sm font-medium rounded ${STATUS_BADGE_COLORS[quote.quote_status]}`}>
            {quote.quote_status.charAt(0).toUpperCase() + quote.quote_status.slice(1)}
          </span>
          {quote.is_read_only && (
            <span className="px-2 py-1 text-xs font-medium bg-gray-200 text-gray-600 rounded">
              Read-Only
            </span>
          )}
        </div>

        {/* Converted banner */}
        {quote.quote_status === 'converted' && quote.sales_order && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
            <p className="text-purple-800">
              Converted to Sales Order:{' '}
              <Link href={`/console/sales-orders/${quote.sales_order.id}`} className="font-medium underline">
                {formatRef('sales_order', quote.sales_order.base_number)}
              </Link>
            </p>
          </div>
        )}

        {/* Customer info */}
        <div className="text-gray-600">
          {quote.customer_name && <span className="mr-4">{quote.customer_name}</span>}
          {quote.customer_email && <span className="text-gray-400">{quote.customer_email}</span>}
        </div>

        {/* Actions */}
        <div className="mt-4 flex gap-3 items-center">
          {!quote.is_read_only && (
            <select
              value={quote.quote_status}
              onChange={(e) => handleStatusChange(e.target.value as QuoteStatus)}
              className="rounded-md border-gray-300 text-sm"
            >
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
            </select>
          )}

          {/* Always show Convert button with contextual state */}
          {quote.quote_status === 'converted' ? (
            <span className="px-4 py-2 text-sm font-medium text-purple-700 bg-purple-100 rounded-md">
              Already converted to {quote.sales_order ? formatRef('sales_order', quote.sales_order.base_number) : '...'}
            </span>
          ) : quote.quote_status === 'won' ? (
            <button
              onClick={handleConvert}
              disabled={converting}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 rounded-md"
            >
              {converting ? 'Converting...' : 'Convert to Sales Order'}
            </button>
          ) : (
            <span className="px-4 py-2 text-sm text-gray-500 bg-gray-100 rounded-md">
              Convert enabled when Quote is marked WON
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex gap-6">
          {(['specs', 'notes', 'attachments', 'scope'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              <span className="ml-1 text-gray-400">
                ({tab === 'specs' ? currentSpecs.length :
                  tab === 'notes' ? quote.notes.length :
                  tab === 'attachments' ? quote.attachments.length :
                  quote.scope_lines.length})
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {/* SPECS TAB */}
        {activeTab === 'specs' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">Specifications</h2>
              <p className="text-sm text-gray-500">
                Specs are the <strong>only source of truth</strong> for calculations.
              </p>
            </div>

            {/* Add spec form */}
            {!quote.is_read_only && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-5 gap-3">
                  <input
                    type="text"
                    placeholder="Key (e.g., belt_speed_fpm)"
                    value={newSpec.key}
                    onChange={(e) => setNewSpec({ ...newSpec, key: e.target.value })}
                    className="col-span-2 rounded-md border-gray-300 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Value"
                    value={newSpec.value}
                    onChange={(e) => setNewSpec({ ...newSpec, value: e.target.value })}
                    className="rounded-md border-gray-300 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Units"
                    value={newSpec.units}
                    onChange={(e) => setNewSpec({ ...newSpec, units: e.target.value })}
                    className="rounded-md border-gray-300 text-sm"
                  />
                  <div className="flex gap-2">
                    <select
                      value={newSpec.confidence}
                      onChange={(e) => setNewSpec({ ...newSpec, confidence: e.target.value as 'estimated' | 'confirmed' })}
                      className="flex-1 rounded-md border-gray-300 text-sm"
                    >
                      <option value="estimated">Estimated</option>
                      <option value="confirmed">Confirmed</option>
                    </select>
                    <button
                      onClick={handleAddSpec}
                      disabled={addingSpec || !newSpec.key.trim() || !newSpec.value.trim()}
                      className="px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 rounded-md"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Current specs table */}
            {currentSpecs.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Key</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Units</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Confidence</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentSpecs.map((spec: Spec) => (
                    <tr key={spec.id}>
                      <td className="px-4 py-3 text-sm font-mono">{spec.key}</td>
                      <td className="px-4 py-3 text-sm font-medium">{spec.value}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{spec.units || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs rounded ${
                          spec.confidence === 'confirmed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {spec.confidence}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(spec.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-500 text-center py-8">No specs yet. Add your first spec above.</p>
            )}

            {/* Previous specs (history) */}
            {previousSpecs.length > 0 && (
              <details className="mt-6">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  Show {previousSpecs.length} previous spec version(s)
                </summary>
                <div className="mt-3 pl-4 border-l-2 border-gray-200">
                  {previousSpecs.map((spec: Spec) => (
                    <div key={spec.id} className="py-2 text-sm text-gray-500">
                      <span className="font-mono">{spec.key}</span>: {spec.value} {spec.units} ({spec.confidence})
                      <span className="ml-2 text-gray-400">{new Date(spec.created_at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}

        {/* NOTES TAB */}
        {activeTab === 'notes' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">Notes</h2>
              <p className="text-sm text-gray-500">Notes explain <em>why</em>, not what.</p>
            </div>

            {/* Add note form */}
            {!quote.is_read_only && (
              <div className="mb-6">
                <textarea
                  placeholder="Add a note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border-gray-300 text-sm"
                />
                <button
                  onClick={handleAddNote}
                  disabled={addingNote || !newNote.trim()}
                  className="mt-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 rounded-md"
                >
                  {addingNote ? 'Adding...' : 'Add Note'}
                </button>
              </div>
            )}

            {/* Notes list */}
            {quote.notes.length > 0 ? (
              <div className="space-y-4">
                {quote.notes.map((note: Note) => (
                  <div key={note.id} className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-800 whitespace-pre-wrap">{note.content}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(note.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No notes yet.</p>
            )}
          </div>
        )}

        {/* ATTACHMENTS TAB */}
        {activeTab === 'attachments' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">Attachments</h2>
              <p className="text-sm text-gray-500">Attachments are evidence, not instructions.</p>
            </div>

            {quote.attachments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quote.attachments.map((attachment: Attachment) => (
                  <div key={attachment.id} className="border border-gray-200 rounded-lg p-4 flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{attachment.file_name}</p>
                      <p className="text-sm text-gray-500">
                        <span className="px-1.5 py-0.5 text-xs bg-gray-100 rounded">{attachment.tag}</span>
                        {attachment.file_size && (
                          <span className="ml-2">{(attachment.file_size / 1024).toFixed(1)} KB</span>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No attachments yet.</p>
            )}
          </div>
        )}

        {/* SCOPE TAB */}
        {activeTab === 'scope' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">Scope of Work</h2>
            </div>

            {/* Add scope line form */}
            {!quote.is_read_only && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-4 gap-3">
                  <select
                    value={newScopeLine.category}
                    onChange={(e) => setNewScopeLine({ ...newScopeLine, category: e.target.value as ScopeCategory })}
                    className="rounded-md border-gray-300 text-sm"
                  >
                    {SCOPE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Scope line text"
                    value={newScopeLine.text}
                    onChange={(e) => setNewScopeLine({ ...newScopeLine, text: e.target.value })}
                    className="col-span-2 rounded-md border-gray-300 text-sm"
                  />
                  <div className="flex gap-2">
                    <select
                      value={newScopeLine.inclusion}
                      onChange={(e) => setNewScopeLine({ ...newScopeLine, inclusion: e.target.value as 'included' | 'excluded' })}
                      className="flex-1 rounded-md border-gray-300 text-sm"
                    >
                      <option value="included">Included</option>
                      <option value="excluded">Excluded</option>
                    </select>
                    <button
                      onClick={handleAddScopeLine}
                      disabled={addingScopeLine || !newScopeLine.text.trim()}
                      className="px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 rounded-md"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Scope lines list */}
            {quote.scope_lines.length > 0 ? (
              <div className="space-y-2">
                {quote.scope_lines.map((line: ScopeLine) => (
                  <div
                    key={line.id}
                    className={`flex items-start gap-3 p-3 rounded-lg ${
                      line.inclusion === 'excluded' ? 'bg-red-50' : 'bg-green-50'
                    }`}
                  >
                    <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                      line.inclusion === 'excluded' ? 'bg-red-200 text-red-700' : 'bg-green-200 text-green-700'
                    }`}>
                      {line.inclusion === 'excluded' ? '−' : '+'}
                    </span>
                    <div className="flex-1">
                      <span className="text-xs text-gray-500 uppercase">{line.category}</span>
                      <p className={line.inclusion === 'excluded' ? 'text-red-800' : 'text-green-800'}>
                        {line.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No scope lines yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
