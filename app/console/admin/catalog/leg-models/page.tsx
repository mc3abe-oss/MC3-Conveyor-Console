/**
 * Admin Leg Models Page
 *
 * Allows admin users to manage leg model catalog entries.
 * Features:
 * - Add new leg models (item_key, label, description, sort_order)
 * - Deactivate/reactivate models (toggle is_active)
 * - NO hard delete (data safety)
 */

'use client';

import { useState, useEffect } from 'react';

interface LegModel {
  id: string;
  catalog_key: string;
  item_key: string;
  label: string;
  description: string | null;
  sort_order: number | null;
  is_active: boolean;
  created_at: string;
}

interface ModelFormData {
  item_key: string;
  label: string;
  description: string;
  sort_order: string;
  is_active: boolean;
}

const emptyForm: ModelFormData = {
  item_key: '',
  label: '',
  description: '',
  sort_order: '',
  is_active: true,
};

const CATALOG_KEY = 'leg_model';

export default function AdminLegModelsPage() {
  const [models, setModels] = useState<LegModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<LegModel | null>(null);
  const [formData, setFormData] = useState<ModelFormData>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Load models on mount
  useEffect(() => {
    void loadModels();
  }, []);

  async function loadModels() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/catalog-items?catalog_key=${CATALOG_KEY}`);
      if (!response.ok) throw new Error('Failed to fetch leg models');
      const data = await response.json();
      setModels(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leg models');
    } finally {
      setIsLoading(false);
    }
  }

  function selectModel(model: LegModel) {
    setSelectedModel(model);
    setIsCreating(false);
    setFormData({
      item_key: model.item_key,
      label: model.label,
      description: model.description || '',
      sort_order: model.sort_order?.toString() || '',
      is_active: model.is_active,
    });
    setSaveMessage(null);
  }

  function createNewModel() {
    setSelectedModel(null);
    setIsCreating(true);
    setFormData(emptyForm);
    setSaveMessage(null);
  }

  function updateField(field: keyof ModelFormData, value: string | boolean) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.item_key.trim() || !formData.label.trim()) {
      setSaveMessage({ type: 'error', text: 'Model key and name are required' });
      return;
    }

    // Validate item_key format (alphanumeric, underscores, hyphens)
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(formData.item_key)) {
      setSaveMessage({
        type: 'error',
        text: 'Model key must start with a letter and contain only letters, numbers, underscores, or hyphens',
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
        throw new Error(err.error || 'Failed to save leg model');
      }

      await loadModels();
      setSaveMessage({ type: 'success', text: isCreating ? 'Model created!' : 'Model updated!' });

      if (isCreating) {
        setIsCreating(false);
        // Select the newly created model
        const newModels = await (await fetch(`/api/admin/catalog-items?catalog_key=${CATALOG_KEY}`)).json();
        const newModel = newModels.find((m: LegModel) => m.item_key === formData.item_key);
        if (newModel) {
          selectModel(newModel);
        }
      }
    } catch (err) {
      setSaveMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save' });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleActive() {
    if (!selectedModel) return;

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const response = await fetch('/api/admin/catalog-items', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalog_key: CATALOG_KEY,
          item_key: selectedModel.item_key,
          label: selectedModel.label,
          description: selectedModel.description,
          sort_order: selectedModel.sort_order,
          is_active: !selectedModel.is_active,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to update status');
      }

      await loadModels();
      // Update selected model
      setSelectedModel((prev) => (prev ? { ...prev, is_active: !prev.is_active } : null));
      setFormData((prev) => ({ ...prev, is_active: !prev.is_active }));
      setSaveMessage({
        type: 'success',
        text: selectedModel.is_active ? 'Model deactivated' : 'Model reactivated',
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
        <h1 className="text-2xl font-bold mb-4">Leg Models Admin</h1>
        <p>Loading...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-4">Leg Models Admin</h1>
        <p className="text-red-600">{error}</p>
        <button onClick={loadModels} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">
          Retry
        </button>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold mb-6">Leg Models Admin</h1>
      <p className="text-gray-600 mb-6">
        Manage floor-mounted leg models available for conveyor support configurations.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Model List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Models ({models.length})</h2>
              <button
                onClick={createNewModel}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
              >
                + New
              </button>
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {models.map((model) => (
                <button
                  key={model.id}
                  onClick={() => selectModel(model)}
                  className={`w-full text-left p-3 rounded border ${
                    selectedModel?.id === model.id
                      ? 'border-blue-500 bg-blue-50'
                      : model.is_active
                      ? 'border-gray-200 hover:bg-gray-50'
                      : 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{model.label}</span>
                    {!model.is_active && (
                      <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">{model.item_key}</div>
                </button>
              ))}
              {models.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No leg models found. Click &quot;+ New&quot; to add one.
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
                ? 'New Leg Model'
                : selectedModel
                ? `Edit: ${selectedModel.label}`
                : 'Select a model to edit'}
            </h2>

            {(selectedModel || isCreating) && (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Model Key *
                    </label>
                    <input
                      type="text"
                      value={formData.item_key}
                      onChange={(e) => updateField('item_key', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      required
                      disabled={!isCreating}
                      placeholder="e.g., LEG-STD-24"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Unique identifier (immutable after creation)
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Model Name *
                    </label>
                    <input
                      type="text"
                      value={formData.label}
                      onChange={(e) => updateField('label', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      required
                      placeholder="e.g., Standard Leg 24&quot;"
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
                    placeholder="e.g., Welded steel legs with adjustable feet, 24&quot; - 30&quot; range"
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
                    {isSaving ? 'Saving...' : isCreating ? 'Create Model' : 'Save Changes'}
                  </button>

                  {selectedModel && !isCreating && (
                    <button
                      type="button"
                      onClick={handleToggleActive}
                      disabled={isSaving}
                      className={`px-4 py-2 rounded ${
                        selectedModel.is_active
                          ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border border-yellow-300'
                          : 'bg-green-100 text-green-800 hover:bg-green-200 border border-green-300'
                      } disabled:opacity-50`}
                    >
                      {selectedModel.is_active ? 'Deactivate' : 'Reactivate'}
                    </button>
                  )}
                </div>

                {/* No Delete Notice */}
                <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded text-sm text-gray-600">
                  <strong>Note:</strong> Leg models cannot be deleted to preserve data integrity in
                  saved configurations. Use &quot;Deactivate&quot; to hide models from new
                  selections while keeping them visible in existing configurations.
                </div>
              </form>
            )}

            {!selectedModel && !isCreating && (
              <div className="text-center py-8 text-gray-500">
                <p>Select a model from the list to edit, or click &quot;+ New&quot; to create one.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
