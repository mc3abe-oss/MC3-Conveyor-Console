/**
 * Admin Powder Colors Page
 *
 * Manage powder coat color options for conveyor and guarding.
 * Features:
 * - CRUD operations
 * - Default conveyor/guarding toggles with uniqueness enforcement
 * - Stock/non-stock designation
 * - Sort order management
 * - Single-line preview: "NAME — DESCRIPTION"
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

interface PowderColor {
  id: string;
  scope: 'conveyor' | 'guarding' | 'both';
  code: string;
  name: string;
  description: string;
  is_stock: boolean;
  is_default_conveyor: boolean;
  is_default_guarding: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface FormData {
  scope: 'conveyor' | 'guarding' | 'both';
  code: string;
  name: string;
  description: string;
  is_stock: boolean;
  is_default_conveyor: boolean;
  is_default_guarding: boolean;
  sort_order: string;
  is_active: boolean;
}

const emptyForm: FormData = {
  scope: 'both',
  code: '',
  name: '',
  description: '',
  is_stock: false,
  is_default_conveyor: false,
  is_default_guarding: false,
  sort_order: '100',
  is_active: true,
};

export default function AdminPowderColorsPage() {
  const [items, setItems] = useState<PowderColor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<PowderColor | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Load items on mount
  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/powder-colors');
      if (!response.ok) throw new Error('Failed to fetch powder colors');
      const data = await response.json();
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load powder colors');
    } finally {
      setIsLoading(false);
    }
  }, []);

  function selectItem(item: PowderColor) {
    setSelectedItem(item);
    setIsCreating(false);
    setFormData({
      scope: item.scope,
      code: item.code,
      name: item.name,
      description: item.description,
      is_stock: item.is_stock,
      is_default_conveyor: item.is_default_conveyor,
      is_default_guarding: item.is_default_guarding,
      sort_order: item.sort_order?.toString() || '100',
      is_active: item.is_active,
    });
    setSaveMessage(null);
  }

  function createNewItem() {
    setSelectedItem(null);
    setIsCreating(true);
    const maxOrder = items.reduce((max, item) => Math.max(max, item.sort_order ?? 0), 0);
    setFormData({
      ...emptyForm,
      sort_order: (maxOrder + 10).toString(),
    });
    setSaveMessage(null);
  }

  function updateField(field: keyof FormData, value: string | boolean) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.code.trim() || !formData.name.trim() || !formData.description.trim()) {
      setSaveMessage({ type: 'error', text: 'Code, name, and description are required' });
      return;
    }

    // Validate code format
    if (!/^[A-Z0-9_]+$/.test(formData.code)) {
      setSaveMessage({
        type: 'error',
        text: 'Code must be uppercase letters, numbers, and underscores only',
      });
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const payload = {
        id: selectedItem?.id,
        scope: formData.scope,
        code: formData.code,
        name: formData.name,
        description: formData.description,
        is_stock: formData.is_stock,
        is_default_conveyor: formData.is_default_conveyor,
        is_default_guarding: formData.is_default_guarding,
        sort_order: formData.sort_order ? parseInt(formData.sort_order, 10) : 100,
        is_active: formData.is_active,
      };

      const response = await fetch('/api/admin/powder-colors', {
        method: isCreating ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to save powder color');
      }

      await loadItems();
      setSaveMessage({ type: 'success', text: isCreating ? 'Powder color created!' : 'Powder color updated!' });

      if (isCreating) {
        setIsCreating(false);
        const newData = await (await fetch('/api/admin/powder-colors')).json();
        const newItem = newData.find((t: PowderColor) => t.code === formData.code);
        if (newItem) {
          selectItem(newItem);
        }
      } else if (selectedItem) {
        // Refresh selected item data
        const refreshedData = await (await fetch('/api/admin/powder-colors')).json();
        const refreshedItem = refreshedData.find((t: PowderColor) => t.id === selectedItem.id);
        if (refreshedItem) {
          setSelectedItem(refreshedItem);
        }
      }
    } catch (err) {
      setSaveMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save' });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleActive() {
    if (!selectedItem) return;

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const response = await fetch('/api/admin/powder-colors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedItem.id,
          is_active: !selectedItem.is_active,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to update status');
      }

      await loadItems();
      setSelectedItem((prev) => (prev ? { ...prev, is_active: !prev.is_active } : null));
      setFormData((prev) => ({ ...prev, is_active: !prev.is_active }));
      setSaveMessage({
        type: 'success',
        text: selectedItem.is_active ? 'Powder color deactivated' : 'Powder color reactivated',
      });
    } catch (err) {
      setSaveMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update' });
    } finally {
      setIsSaving(false);
    }
  }

  // Format display preview
  function formatDisplay(name: string, description: string) {
    return `${name} — ${description}`;
  }

  if (isLoading) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-4">Powder Colors</h1>
        <p>Loading...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-4">Powder Colors</h1>
        <p className="text-red-600">{error}</p>
        <button onClick={loadItems} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">
          Retry
        </button>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold mb-2">Powder Colors</h1>
      <p className="text-gray-600 mb-6">
        Manage powder coat color options for conveyor and guarding finish selections.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Item List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Colors</h2>
              <button
                onClick={createNewItem}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
              >
                + New
              </button>
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => selectItem(item)}
                  className={`w-full text-left p-3 rounded border ${
                    selectedItem?.id === item.id
                      ? 'border-blue-500 bg-blue-50'
                      : item.is_active
                      ? 'border-gray-200 hover:bg-gray-50'
                      : 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate">
                      {formatDisplay(item.name, item.description)}
                    </span>
                    <div className="flex gap-1 flex-shrink-0">
                      {item.is_stock && (
                        <span className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded">
                          Stock
                        </span>
                      )}
                      {!item.is_active && (
                        <span className="text-xs bg-yellow-200 text-yellow-800 px-1.5 py-0.5 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">{item.code}</span>
                    {item.is_default_conveyor && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                        Conv Default
                      </span>
                    )}
                    {item.is_default_guarding && (
                      <span className="text-xs bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">
                        Guard Default
                      </span>
                    )}
                  </div>
                </button>
              ))}
              {items.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No powder colors found</p>
              )}
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">
              {isCreating
                ? 'New Powder Color'
                : selectedItem
                ? `Edit: ${formatDisplay(selectedItem.name, selectedItem.description)}`
                : 'Select a powder color to edit'}
            </h2>

            {(selectedItem || isCreating) && (
              <form onSubmit={handleSave} className="space-y-4">
                {/* Preview */}
                <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                  <span className="text-xs text-gray-500 block mb-1">Dropdown Preview:</span>
                  <span className="text-sm font-medium">
                    {formatDisplay(formData.name || 'Name', formData.description || 'Description')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => updateField('code', e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      required
                      disabled={!isCreating}
                      placeholder="e.g., RAL5015"
                    />
                    <p className="text-xs text-gray-500 mt-1">Uppercase letters, numbers, underscores</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Scope *</label>
                    <select
                      value={formData.scope}
                      onChange={(e) => updateField('scope', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      required
                    >
                      <option value="both">Both (Conveyor & Guarding)</option>
                      <option value="conveyor">Conveyor Only</option>
                      <option value="guarding">Guarding Only</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      required
                      placeholder="e.g., RAL 5015"
                    />
                    <p className="text-xs text-gray-500 mt-1">Short label (e.g., RAL 5015)</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                    <input
                      type="text"
                      value={formData.description}
                      onChange={(e) => updateField('description', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      required
                      placeholder="e.g., Sky Blue (Stock)"
                    />
                    <p className="text-xs text-gray-500 mt-1">Helper text (e.g., Sky Blue (Stock))</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                    <input
                      type="number"
                      value={formData.sort_order}
                      onChange={(e) => updateField('sort_order', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      placeholder="100"
                    />
                  </div>
                  <div className="flex items-center pt-6">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.is_stock}
                        onChange={(e) => updateField('is_stock', e.target.checked)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Stock Color</span>
                    </label>
                  </div>
                  <div className="flex items-center pt-6">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => updateField('is_active', e.target.checked)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Active</span>
                    </label>
                  </div>
                </div>

                {/* Default Toggles */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                  <h3 className="text-sm font-medium text-blue-800 mb-3">Default Settings</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.is_default_conveyor}
                        onChange={(e) => updateField('is_default_conveyor', e.target.checked)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                        disabled={formData.scope === 'guarding'}
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Default for Conveyor
                        {formData.scope === 'guarding' && (
                          <span className="text-gray-400 ml-1">(N/A)</span>
                        )}
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.is_default_guarding}
                        onChange={(e) => updateField('is_default_guarding', e.target.checked)}
                        className="h-4 w-4 text-purple-600 border-gray-300 rounded"
                        disabled={formData.scope === 'conveyor'}
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Default for Guarding
                        {formData.scope === 'conveyor' && (
                          <span className="text-gray-400 ml-1">(N/A)</span>
                        )}
                      </span>
                    </label>
                  </div>
                  <p className="text-xs text-blue-600 mt-2">
                    Only one default per category. Setting a new default will unset the previous one.
                  </p>
                </div>

                {saveMessage && (
                  <div
                    className={`p-3 rounded ${
                      saveMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {saveMessage.text}
                  </div>
                )}

                <div className="flex gap-4 pt-4 border-t">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {isSaving ? 'Saving...' : isCreating ? 'Create Powder Color' : 'Save Changes'}
                  </button>

                  {selectedItem && !isCreating && (
                    <button
                      type="button"
                      onClick={handleToggleActive}
                      disabled={isSaving}
                      className={`px-4 py-2 rounded ${
                        selectedItem.is_active
                          ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border border-yellow-300'
                          : 'bg-green-100 text-green-800 hover:bg-green-200 border border-green-300'
                      } disabled:opacity-50`}
                    >
                      {selectedItem.is_active ? 'Deactivate' : 'Reactivate'}
                    </button>
                  )}
                </div>

                <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded text-sm text-gray-600">
                  <strong>Note:</strong> Powder colors cannot be deleted to preserve data integrity in saved
                  configurations. Use &quot;Deactivate&quot; to hide options from new selections.
                </div>
              </form>
            )}

            {!selectedItem && !isCreating && (
              <div className="text-center py-8 text-gray-500">
                <p>Select a powder color from the list to edit, or click &quot;+ New&quot; to create one.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
