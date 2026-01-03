'use client';

import { useState, useEffect, useCallback } from 'react';
import { Quote, SalesOrder } from '../../src/lib/database/quote-types';
import { formatRef, parseBaseLine, isParseError } from '../../src/lib/quote-identifiers';

export type SaveTarget = {
  type: 'quote' | 'sales_order';
  id: string;
  base: number;
  line: number | null; // Suffix line from dotted input (e.g., .2 in "62633.2")
  jobLine: number; // Epicor job line
  quantity: number;
  customer_name?: string | null;
};

/**
 * Get display string for a save target
 */
export function formatSaveTarget(target: SaveTarget): string {
  return formatRef(target.type, target.base, target.line);
}

interface SaveTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (target: SaveTarget) => void;
  defaultQuantity?: number;
}

export default function SaveTargetModal({
  isOpen,
  onClose,
  onSelect,
  defaultQuantity = 1,
}: SaveTargetModalProps) {
  const [activeTab, setActiveTab] = useState<'quote' | 'sales_order'>('quote');
  const [mode, setMode] = useState<'create' | 'existing'>('create');

  // Create New form state
  const [numberInput, setNumberInput] = useState('');
  const [numberError, setNumberError] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [jobLine, setJobLine] = useState(1);
  const [quantity, setQuantity] = useState(defaultQuantity);

  // Existing records state
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExisting, setSelectedExisting] = useState<Quote | SalesOrder | null>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExisting, setShowExisting] = useState(false);

  // Reset form when modal opens/closes or tab changes
  useEffect(() => {
    if (isOpen) {
      setNumberInput('');
      setNumberError(null);
      setCustomerName('');
      setJobLine(1);
      setQuantity(defaultQuantity);
      setSearchQuery('');
      setSelectedExisting(null);
      setMode('create');
      setShowExisting(false);
      setError(null);
    }
  }, [isOpen, activeTab, defaultQuantity]);

  const fetchQuotes = useCallback(async () => {
    try {
      const res = await fetch('/api/quotes');
      if (res.ok) {
        const json = await res.json();
        // API returns { data: Quote[], total, page, pageSize } - extract data array defensively
        const arr = Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : []);
        setQuotes(arr);
      }
    } catch (err) {
      console.error('Failed to fetch quotes:', err);
    }
  }, []);

  const fetchSalesOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/sales-orders');
      if (res.ok) {
        const json = await res.json();
        // API returns { data: SalesOrder[], total, page, pageSize } - extract data array defensively
        const arr = Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : []);
        setSalesOrders(arr);
      }
    } catch (err) {
      console.error('Failed to fetch sales orders:', err);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      Promise.all([fetchQuotes(), fetchSalesOrders()]).finally(() => setLoading(false));
    }
  }, [isOpen, fetchQuotes, fetchSalesOrders]);

  // Validate number input on change
  const handleNumberChange = (value: string) => {
    setNumberInput(value);
    if (value.trim()) {
      const parsed = parseBaseLine(value);
      if (isParseError(parsed)) {
        setNumberError(parsed.error);
      } else {
        setNumberError(null);
      }
    } else {
      setNumberError(null);
    }
  };

  // Get parsed number for preview/save
  const getParsedNumber = () => {
    if (!numberInput.trim()) return null;
    const parsed = parseBaseLine(numberInput);
    if (isParseError(parsed)) return null;
    return parsed;
  };

  // Preview display
  const getPreview = () => {
    const parsed = getParsedNumber();
    if (!parsed) return null;
    return formatRef(activeTab, parsed.base, parsed.line);
  };

  // Filter existing records by search
  const filteredQuotes = quotes.filter(q => {
    if (!searchQuery.trim()) return true;
    const searchLower = searchQuery.toLowerCase();
    const numStr = String(q.base_number);
    const customer = (q.customer_name || '').toLowerCase();
    return numStr.includes(searchLower) || customer.includes(searchLower);
  });

  const filteredSalesOrders = salesOrders.filter(so => {
    if (!searchQuery.trim()) return true;
    const searchLower = searchQuery.toLowerCase();
    const numStr = String(so.base_number);
    const customer = (so.customer_name || '').toLowerCase();
    return numStr.includes(searchLower) || customer.includes(searchLower);
  });

  // Handle create new (works for both quotes and sales orders)
  const handleCreateNew = async () => {
    const parsed = getParsedNumber();
    if (!parsed) {
      setNumberError('Number is required');
      return;
    }

    if (jobLine < 1) {
      setError('Line must be at least 1');
      return;
    }

    if (quantity < 1) {
      setError('Quantity must be at least 1');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const apiEndpoint = activeTab === 'quote' ? '/api/quotes' : '/api/sales-orders';
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_number: parsed.base,
          suffix_line: parsed.line,
          customer_name: customerName.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Failed to create ${activeTab === 'quote' ? 'quote' : 'sales order'}`);
      }

      const newRecord = await res.json();
      onSelect({
        type: activeTab,
        id: newRecord.id,
        base: newRecord.base_number,
        line: newRecord.suffix_line ?? parsed.line ?? null,
        jobLine: jobLine,
        quantity: quantity,
        customer_name: newRecord.customer_name,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Handle save to existing
  const handleSaveToExisting = async () => {
    if (!selectedExisting) {
      setError('Please select a record');
      return;
    }

    if (jobLine < 1) {
      setError('Line must be at least 1');
      return;
    }

    if (quantity < 1) {
      setError('Quantity must be at least 1');
      return;
    }

    onSelect({
      type: activeTab as 'quote' | 'sales_order',
      id: selectedExisting.id,
      base: selectedExisting.base_number,
      line: null, // Existing records don't have suffix line from selection
      jobLine: jobLine,
      quantity: quantity,
      customer_name: selectedExisting.customer_name,
    });
  };

  if (!isOpen) return null;

  const preview = getPreview();
  const canCreate = !!getParsedNumber() && !numberError && jobLine >= 1 && quantity >= 1;
  const canSaveExisting = !!selectedExisting && jobLine >= 1 && quantity >= 1;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" onClick={onClose}>
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop - visual only */}
        <div className="fixed inset-0 bg-black/50 -z-10" />

        {/* Modal - stop propagation so clicks inside don't close */}
        <div
          className="relative bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Save Application</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-6 pt-4 border-b border-gray-200">
            <nav className="-mb-px flex gap-6">
              <button
                onClick={() => { setActiveTab('quote'); setMode('create'); setSelectedExisting(null); }}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'quote'
                    ? 'border-amber-500 text-amber-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Quote
              </button>
              <button
                onClick={() => { setActiveTab('sales_order'); setMode('create'); setSelectedExisting(null); }}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'sales_order'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Sales Order
              </button>
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {error}
              </div>
            )}

            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : activeTab === 'sales_order' && mode === 'create' ? (
              /* CREATE NEW SALES ORDER FORM - mirrors Quote tab */
              <div className="space-y-4">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  Create New Sales Order
                </div>

                {/* SO Number Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sales Order Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={numberInput}
                    onChange={(e) => handleNumberChange(e.target.value)}
                    placeholder="62633 or 62633.2"
                    className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 ${
                      numberError
                        ? 'border-red-300 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  />
                  {numberError && (
                    <p className="mt-1 text-xs text-red-600">{numberError}</p>
                  )}
                  {preview && !numberError && (
                    <p className="mt-1 text-xs text-green-600">
                      Will save as: <span className="font-medium">{formatRef('sales_order', getParsedNumber()?.base || 0, getParsedNumber()?.line)}</span>
                    </p>
                  )}
                </div>

                {/* Customer Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer <span className="text-gray-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Customer name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Line and Quantity - side by side */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Line <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={jobLine}
                      onChange={(e) => setJobLine(Math.max(1, parseInt(e.target.value) || 1))}
                      min={1}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      min={1}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Collapsible "Or save to existing" section */}
                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setShowExisting(!showExisting)}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                  >
                    <svg
                      className={`w-4 h-4 transition-transform ${showExisting ? 'rotate-90' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    Or save to existing sales order...
                  </button>

                  {showExisting && (
                    <div className="mt-3 space-y-3">
                      {/* Search */}
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by number or customer..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />

                      {/* List */}
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {filteredSalesOrders.length > 0 ? (
                          filteredSalesOrders.map((so) => (
                            <button
                              key={so.id}
                              onClick={() => { setSelectedExisting(so); setMode('existing'); }}
                              className={`w-full p-3 border rounded-lg text-left transition-colors ${
                                selectedExisting?.id === so.id
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {formatRef('sales_order', so.base_number)}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    {so.customer_name || 'No customer'}
                                  </p>
                                </div>
                                <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                                  SO
                                </span>
                              </div>
                            </button>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500 text-center py-4">
                            No sales orders found
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : activeTab === 'sales_order' && mode === 'existing' ? (
              /* SAVE TO EXISTING SO - Shows selected record with editable fields */
              <div className="space-y-4">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  Save to Existing Sales Order
                </div>

                {/* Selected record display */}
                {selectedExisting && (
                  <div className="p-4 border-2 rounded-lg border-blue-500 bg-blue-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {formatRef('sales_order', selectedExisting.base_number)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {selectedExisting.customer_name || 'No customer'}
                        </p>
                      </div>
                      <button
                        onClick={() => { setSelectedExisting(null); setMode('create'); }}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                )}

                {/* Line and Quantity */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Line <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={jobLine}
                      onChange={(e) => setJobLine(Math.max(1, parseInt(e.target.value) || 1))}
                      min={1}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      min={1}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            ) : mode === 'create' ? (
              /* CREATE NEW QUOTE FORM */
              <div className="space-y-4">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  Create New Quote
                </div>

                {/* Number Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {activeTab === 'quote' ? 'Quote' : 'Sales Order'} Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={numberInput}
                    onChange={(e) => handleNumberChange(e.target.value)}
                    placeholder="62633 or 62633.2"
                    className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 ${
                      numberError
                        ? 'border-red-300 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  />
                  {numberError && (
                    <p className="mt-1 text-xs text-red-600">{numberError}</p>
                  )}
                  {preview && !numberError && (
                    <p className="mt-1 text-xs text-green-600">
                      Will save as: <span className="font-medium">{preview}</span>
                    </p>
                  )}
                </div>

                {/* Customer Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer <span className="text-gray-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Customer name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Line and Quantity - side by side */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Line <span className="text-red-500">*</span>
                      <span
                        className="ml-1 text-gray-400 cursor-help"
                        title="Line within this quote or sales order"
                      >
                        <svg className="inline w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </span>
                    </label>
                    <input
                      type="number"
                      value={jobLine}
                      onChange={(e) => setJobLine(Math.max(1, parseInt(e.target.value) || 1))}
                      min={1}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      min={1}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Collapsible "Or save to existing" section */}
                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setShowExisting(!showExisting)}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                  >
                    <svg
                      className={`w-4 h-4 transition-transform ${showExisting ? 'rotate-90' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    Or save to existing {activeTab === 'quote' ? 'quote' : 'sales order'}...
                  </button>

                  {showExisting && (
                    <div className="mt-3 space-y-3">
                      {/* Search */}
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by number or customer..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />

                      {/* List */}
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {activeTab === 'quote' ? (
                          filteredQuotes.length > 0 ? (
                            filteredQuotes.map((quote) => (
                              <button
                                key={quote.id}
                                onClick={() => { setSelectedExisting(quote); setMode('existing'); }}
                                className={`w-full p-3 border rounded-lg text-left transition-colors ${
                                  selectedExisting?.id === quote.id
                                    ? 'border-amber-500 bg-amber-50'
                                    : 'border-gray-200 hover:border-amber-300 hover:bg-amber-50'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium text-gray-900">
                                      {formatRef('quote', quote.base_number)}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                      {quote.customer_name || 'No customer'}
                                    </p>
                                  </div>
                                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                                    quote.quote_status === 'draft' ? 'bg-gray-100 text-gray-600' :
                                    quote.quote_status === 'won' ? 'bg-green-100 text-green-700' :
                                    'bg-gray-100 text-gray-600'
                                  }`}>
                                    {quote.quote_status}
                                  </span>
                                </div>
                              </button>
                            ))
                          ) : (
                            <p className="text-sm text-gray-500 text-center py-4">
                              No quotes found
                            </p>
                          )
                        ) : (
                          filteredSalesOrders.length > 0 ? (
                            filteredSalesOrders.map((so) => (
                              <button
                                key={so.id}
                                onClick={() => { setSelectedExisting(so); setMode('existing'); }}
                                className={`w-full p-3 border rounded-lg text-left transition-colors ${
                                  selectedExisting?.id === so.id
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium text-gray-900">
                                      {formatRef('sales_order', so.base_number)}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                      {so.customer_name || 'No customer'}
                                    </p>
                                  </div>
                                  <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                                    SO
                                  </span>
                                </div>
                              </button>
                            ))
                          ) : (
                            <p className="text-sm text-gray-500 text-center py-4">
                              No sales orders found
                            </p>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* SAVE TO EXISTING - Shows selected record with editable fields */
              <div className="space-y-4">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  Save to Existing {activeTab === 'quote' ? 'Quote' : 'Sales Order'}
                </div>

                {/* Selected record display */}
                {selectedExisting && (
                  <div className={`p-4 border-2 rounded-lg ${
                    activeTab === 'quote' ? 'border-amber-500 bg-amber-50' : 'border-blue-500 bg-blue-50'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {formatRef(activeTab, selectedExisting.base_number)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {selectedExisting.customer_name || 'No customer'}
                        </p>
                      </div>
                      <button
                        onClick={() => { setSelectedExisting(null); setMode('create'); }}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                )}

                {/* Line and Quantity */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Line <span className="text-red-500">*</span>
                      <span
                        className="ml-1 text-gray-400 cursor-help"
                        title="Line within this quote or sales order"
                      >
                        <svg className="inline w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </span>
                    </label>
                    <input
                      type="number"
                      value={jobLine}
                      onChange={(e) => setJobLine(Math.max(1, parseInt(e.target.value) || 1))}
                      min={1}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      min={1}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Cancel
            </button>

            {activeTab === 'sales_order' && mode === 'create' ? (
              /* Sales Order tab - create new */
              <button
                onClick={handleCreateNew}
                disabled={!canCreate || saving}
                className="px-4 py-2 text-sm font-medium text-white rounded-md transition-colors bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300"
              >
                {saving ? 'Saving...' : 'Save SO + Link'}
              </button>
            ) : activeTab === 'sales_order' && mode === 'existing' ? (
              /* Sales Order tab - save to existing */
              <button
                onClick={handleSaveToExisting}
                disabled={!canSaveExisting || saving}
                className="px-4 py-2 text-sm font-medium text-white rounded-md transition-colors bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300"
              >
                {saving ? 'Saving...' : 'Save + Link'}
              </button>
            ) : mode === 'create' ? (
              /* Quote tab - create new */
              <button
                onClick={handleCreateNew}
                disabled={!canCreate || saving}
                className="px-4 py-2 text-sm font-medium text-white rounded-md transition-colors bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300"
              >
                {saving ? 'Saving...' : 'Save Quote + Link'}
              </button>
            ) : (
              /* Quote tab - save to existing */
              <button
                onClick={handleSaveToExisting}
                disabled={!canSaveExisting || saving}
                className="px-4 py-2 text-sm font-medium text-white rounded-md transition-colors bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300"
              >
                {saving ? 'Saving...' : 'Save + Link'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
