/**
 * Admin Process Types Page
 *
 * Allows admin users to manage process type catalog entries.
 * Features:
 * - Add new process types (item_key, label, description, sort_order)
 * - Deactivate/reactivate types (toggle is_active)
 * - NO hard delete (data safety)
 */

'use client';

import { useState, useEffect } from 'react';


interface ProcessType {
  id: string;
  catalog_key: string;
  item_key: string;
  label: string;
  description: string | null;
  sort_order: number | null;
  is_active: boolean;
  created_at: string;
}

interface TypeFormData {
  item_key: string;
  label: string;
  description: string;
  sort_order: string;
  is_active: boolean;
}

const emptyForm: TypeFormData = {
  item_key: '',
  label: '',
  description: '',
  sort_order: '',
  is_active: true,
};

const CATALOG_KEY = 'process_type';

export default function AdminProcessTypesPage() {
  const [types, setTypes] = useState<ProcessType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<ProcessType | null>(null);
  const [formData, setFormData] = useState<TypeFormData>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Load types on mount
  useEffect(() => {
    loadTypes();
  }, []);

  async function loadTypes() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/catalog-items?catalog_key=${CATALOG_KEY}`);
      if (!response.ok) throw new Error('Failed to fetch process types');
      const data = await response.json();
      setTypes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load process types');
    } finally {
      setIsLoading(false);
    }
  }

  function selectType(type: ProcessType) {
    setSelectedType(type);
    setIsCreating(false);
    setFormData({
      item_key: type.item_key,
      label: type.label,
      description: type.description || '',
      sort_order: type.sort_order?.toString() || '',
      is_active: type.is_active,
    });
    setSaveMessage(null);
  }

  function createNewType() {
    setSelectedType(null);
    setIsCreating(true);
    setFormData(emptyForm);
    setSaveMessage(null);
  }

  function updateField(field: keyof TypeFormData, value: string | boolean) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.item_key.trim() || !formData.label.trim()) {
      setSaveMessage({ type: 'error', text: 'Item key and label are required' });
      return;
    }

    // Validate item_key format (alphanumeric, underscores, no spaces)
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(formData.item_key)) {
      setSaveMessage({
        type: 'error',
        text: 'Item key must start with a letter and contain only letters, numbers, and underscores',
      });
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const payload = {
        catalog_key: CATALOG_KEY,
        item_key: formData.item_key,
        label: formData.label,
        description: formData.description || null,
        sort_order: formData.sort_order ? parseInt(formData.sort_order, 10) : null,
        is_active: formData.is_active,
      };

      const response = await fetch('/api/admin/catalog-items', {
        method: isCreating ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to save process type');
      }

      await loadTypes();
      setSaveMessage({ type: 'success', text: isCreating ? 'Process type created!' : 'Process type updated!' });

      if (isCreating) {
        setIsCreating(false);
        // Select the newly created type
        const newTypes = await (await fetch(`/api/admin/catalog-items?catalog_key=${CATALOG_KEY}`)).json();
        const newType = newTypes.find((t: ProcessType) => t.item_key === formData.item_key);
        if (newType) {
          selectType(newType);
        }
      }
    } catch (err) {
      setSaveMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save' });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleActive() {
    if (!selectedType) return;

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const response = await fetch('/api/admin/catalog-items', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalog_key: CATALOG_KEY,
          item_key: selectedType.item_key,
          label: selectedType.label,
          description: selectedType.description,
          sort_order: selectedType.sort_order,
          is_active: !selectedType.is_active,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to update status');
      }

      await loadTypes();
      // Update selected type
      setSelectedType((prev) => (prev ? { ...prev, is_active: !prev.is_active } : null));
      setFormData((prev) => ({ ...prev, is_active: !prev.is_active }));
      setSaveMessage({
        type: 'success',
        text: selectedType.is_active ? 'Process type deactivated' : 'Process type reactivated',
      });
    } catch (err) {
      setSaveMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update' });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (

        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-bold mb-4">Process Types Admin</h1>
          <p>Loading...</p>
        </main>

    );
  }

  if (error) {
    return (

        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-bold mb-4">Process Types Admin</h1>
          <p className="text-red-600">{error}</p>
          <button onClick={loadTypes} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">
            Retry
          </button>
        </main>

    );
  }

  return (
    <>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-6">Process Types Admin</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Type List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Process Types</h2>
                <button
                  onClick={createNewType}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                >
                  + New
                </button>
              </div>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {types.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => selectType(type)}
                    className={`w-full text-left p-3 rounded border ${
                      selectedType?.id === type.id
                        ? 'border-blue-500 bg-blue-50'
                        : type.is_active
                        ? 'border-gray-200 hover:bg-gray-50'
                        : 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{type.label}</span>
                      {!type.is_active && (
                        <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">{type.item_key}</div>
                  </button>
                ))}
                {types.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No process types found
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Edit Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">
                {isCreating
                  ? 'New Process Type'
                  : selectedType
                  ? `Edit: ${selectedType.label}`
                  : 'Select a process type to edit'}
              </h2>

              {(selectedType || isCreating) && (
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Item Key *
                      </label>
                      <input
                        type="text"
                        value={formData.item_key}
                        onChange={(e) => updateField('item_key', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                        required
                        disabled={!isCreating}
                        placeholder="e.g., MOLDING"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Unique identifier (letters, numbers, underscores)
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Label *
                      </label>
                      <input
                        type="text"
                        value={formData.label}
                        onChange={(e) => updateField('label', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                        required
                        placeholder="e.g., Molding / Injection"
                      />
                      <p className="text-xs text-gray-500 mt-1">Display name shown to users</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => updateField('description', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      rows={2}
                      placeholder="Optional description or help text"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sort Order
                      </label>
                      <input
                        type="number"
                        value={formData.sort_order}
                        onChange={(e) => updateField('sort_order', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                        placeholder="e.g., 10"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Lower numbers appear first (optional)
                      </p>
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

                  {saveMessage && (
                    <div
                      className={`p-3 rounded ${
                        saveMessage.type === 'success'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
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
                      {isSaving ? 'Saving...' : isCreating ? 'Create Process Type' : 'Save Changes'}
                    </button>

                    {selectedType && !isCreating && (
                      <button
                        type="button"
                        onClick={handleToggleActive}
                        disabled={isSaving}
                        className={`px-4 py-2 rounded ${
                          selectedType.is_active
                            ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border border-yellow-300'
                            : 'bg-green-100 text-green-800 hover:bg-green-200 border border-green-300'
                        } disabled:opacity-50`}
                      >
                        {selectedType.is_active ? 'Deactivate' : 'Reactivate'}
                      </button>
                    )}
                  </div>

                  {/* No Delete Notice */}
                  <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded text-sm text-gray-600">
                    <strong>Note:</strong> Process types cannot be deleted to preserve data
                    integrity in saved configurations. Use &quot;Deactivate&quot; to hide types from new
                    selections while keeping them visible in existing configurations.
                  </div>
                </form>
              )}

              {!selectedType && !isCreating && (
                <div className="text-center py-8 text-gray-500">
                  <p>Select a process type from the list to edit, or click &quot;+ New&quot; to create one.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
