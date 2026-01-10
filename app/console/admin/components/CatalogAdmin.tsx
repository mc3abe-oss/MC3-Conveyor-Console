/**
 * Reusable Catalog Admin Component
 *
 * Generic admin UI for managing catalog entries with:
 * - List view with drag-to-reorder (sort_order management)
 * - Create/Edit form (item_key, label, description, sort_order, is_active)
 * - Deactivate/Reactivate (soft delete)
 * - No hard delete (data safety)
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

interface CatalogItem {
  id: string;
  catalog_key: string;
  item_key: string;
  label: string;
  description: string | null;
  sort_order: number | null;
  is_active: boolean;
  created_at: string;
}

interface ItemFormData {
  item_key: string;
  label: string;
  description: string;
  sort_order: string;
  is_active: boolean;
}

const emptyForm: ItemFormData = {
  item_key: '',
  label: '',
  description: '',
  sort_order: '',
  is_active: true,
};

interface CatalogAdminProps {
  catalogKey: string;
  title: string;
  itemLabel?: string; // e.g., "Power Feed Option", "Sensor Option"
  description?: string;
}

export default function CatalogAdmin({
  catalogKey,
  title,
  itemLabel = 'Item',
  description,
}: CatalogAdminProps) {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [formData, setFormData] = useState<ItemFormData>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Load items on mount
  useEffect(() => {
    loadItems();
  }, [catalogKey]);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/catalog-items?catalog_key=${catalogKey}`);
      if (!response.ok) throw new Error(`Failed to fetch ${title.toLowerCase()}`);
      const data = await response.json();
      // Sort by sort_order, then label
      const sorted = data.sort((a: CatalogItem, b: CatalogItem) => {
        const aOrder = a.sort_order ?? 9999;
        const bOrder = b.sort_order ?? 9999;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return a.label.localeCompare(b.label);
      });
      setItems(sorted);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to load ${title.toLowerCase()}`);
    } finally {
      setIsLoading(false);
    }
  }, [catalogKey, title]);

  function selectItem(item: CatalogItem) {
    setSelectedItem(item);
    setIsCreating(false);
    setFormData({
      item_key: item.item_key,
      label: item.label,
      description: item.description || '',
      sort_order: item.sort_order?.toString() || '',
      is_active: item.is_active,
    });
    setSaveMessage(null);
  }

  function createNewItem() {
    setSelectedItem(null);
    setIsCreating(true);
    // Auto-increment sort_order
    const maxOrder = items.reduce((max, item) => Math.max(max, item.sort_order ?? 0), 0);
    setFormData({
      ...emptyForm,
      sort_order: (maxOrder + 10).toString(),
    });
    setSaveMessage(null);
  }

  function updateField(field: keyof ItemFormData, value: string | boolean) {
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
        catalog_key: catalogKey,
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
        throw new Error(err.error || `Failed to save ${itemLabel.toLowerCase()}`);
      }

      await loadItems();
      setSaveMessage({ type: 'success', text: isCreating ? `${itemLabel} created!` : `${itemLabel} updated!` });

      if (isCreating) {
        setIsCreating(false);
        // Select the newly created item
        const newItems = await (await fetch(`/api/admin/catalog-items?catalog_key=${catalogKey}`)).json();
        const newItem = newItems.find((t: CatalogItem) => t.item_key === formData.item_key);
        if (newItem) {
          selectItem(newItem);
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
      const response = await fetch('/api/admin/catalog-items', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalog_key: catalogKey,
          item_key: selectedItem.item_key,
          label: selectedItem.label,
          description: selectedItem.description,
          sort_order: selectedItem.sort_order,
          is_active: !selectedItem.is_active,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to update status');
      }

      await loadItems();
      // Update selected item
      setSelectedItem((prev) => (prev ? { ...prev, is_active: !prev.is_active } : null));
      setFormData((prev) => ({ ...prev, is_active: !prev.is_active }));
      setSaveMessage({
        type: 'success',
        text: selectedItem.is_active ? `${itemLabel} deactivated` : `${itemLabel} reactivated`,
      });
    } catch (err) {
      setSaveMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update' });
    } finally {
      setIsSaving(false);
    }
  }

  // Drag and drop reordering
  function handleDragStart(index: number) {
    setDraggedIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newItems = [...items];
    const draggedItem = newItems[draggedIndex];
    newItems.splice(draggedIndex, 1);
    newItems.splice(index, 0, draggedItem);

    // Update sort_order for affected items
    newItems.forEach((item, i) => {
      item.sort_order = (i + 1) * 10;
    });

    setItems(newItems);
    setDraggedIndex(index);
  }

  async function handleDragEnd() {
    if (draggedIndex === null) return;
    setDraggedIndex(null);

    // Save new sort orders
    try {
      for (const item of items) {
        await fetch('/api/admin/catalog-items', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            catalog_key: catalogKey,
            item_key: item.item_key,
            label: item.label,
            description: item.description,
            sort_order: item.sort_order,
            is_active: item.is_active,
          }),
        });
      }
      setSaveMessage({ type: 'success', text: 'Order saved!' });
      setTimeout(() => setSaveMessage(null), 2000);
    } catch (err) {
      setSaveMessage({ type: 'error', text: 'Failed to save order' });
      loadItems(); // Reload to reset
    }
  }

  // Move item up/down buttons for accessibility
  async function moveItem(index: number, direction: 'up' | 'down') {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= items.length) return;

    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[newIndex];
    newItems[newIndex] = temp;

    // Update sort_order
    newItems.forEach((item, i) => {
      item.sort_order = (i + 1) * 10;
    });

    setItems(newItems);

    // Save changes
    try {
      for (const item of [newItems[index], newItems[newIndex]]) {
        await fetch('/api/admin/catalog-items', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            catalog_key: catalogKey,
            item_key: item.item_key,
            label: item.label,
            description: item.description,
            sort_order: item.sort_order,
            is_active: item.is_active,
          }),
        });
      }
    } catch (err) {
      loadItems(); // Reload on error
    }
  }

  if (isLoading) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-4">{title}</h1>
        <p>Loading...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-4">{title}</h1>
        <p className="text-red-600">{error}</p>
        <button onClick={loadItems} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">
          Retry
        </button>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold mb-2">{title}</h1>
      {description && <p className="text-gray-600 mb-6">{description}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Item List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">{title}</h2>
              <button
                onClick={createNewItem}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
              >
                + New
              </button>
            </div>

            {saveMessage && !selectedItem && !isCreating && (
              <div
                className={`mb-3 p-2 rounded text-sm ${
                  saveMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}
              >
                {saveMessage.text}
              </div>
            )}

            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`relative group ${draggedIndex === index ? 'opacity-50' : ''}`}
                >
                  <button
                    onClick={() => selectItem(item)}
                    className={`w-full text-left p-3 rounded border ${
                      selectedItem?.id === item.id
                        ? 'border-blue-500 bg-blue-50'
                        : item.is_active
                        ? 'border-gray-200 hover:bg-gray-50'
                        : 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="cursor-grab text-gray-400 hover:text-gray-600">&#9776;</span>
                        <span className="font-medium">{item.label}</span>
                      </div>
                      {!item.is_active && (
                        <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 ml-6">{item.item_key}</div>
                  </button>
                  {/* Move buttons */}
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveItem(index, 'up');
                      }}
                      disabled={index === 0}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      title="Move up"
                    >
                      &#9650;
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveItem(index, 'down');
                      }}
                      disabled={index === items.length - 1}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      title="Move down"
                    >
                      &#9660;
                    </button>
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No {title.toLowerCase()} found</p>
              )}
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">
              {isCreating
                ? `New ${itemLabel}`
                : selectedItem
                ? `Edit: ${selectedItem.label}`
                : `Select ${itemLabel.toLowerCase()} to edit`}
            </h2>

            {(selectedItem || isCreating) && (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Item Key *</label>
                    <input
                      type="text"
                      value={formData.item_key}
                      onChange={(e) => updateField('item_key', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      required
                      disabled={!isCreating}
                      placeholder="e.g., V480_3PH"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Unique identifier (letters, numbers, underscores)
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Label *</label>
                    <input
                      type="text"
                      value={formData.label}
                      onChange={(e) => updateField('label', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      required
                      placeholder="e.g., 480V 3-Phase"
                    />
                    <p className="text-xs text-gray-500 mt-1">Display name shown to users</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                    <input
                      type="number"
                      value={formData.sort_order}
                      onChange={(e) => updateField('sort_order', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      placeholder="e.g., 10"
                    />
                    <p className="text-xs text-gray-500 mt-1">Lower numbers appear first</p>
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
                    {isSaving ? 'Saving...' : isCreating ? `Create ${itemLabel}` : 'Save Changes'}
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

                {/* No Delete Notice */}
                <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded text-sm text-gray-600">
                  <strong>Note:</strong> {title} cannot be deleted to preserve data integrity in saved
                  configurations. Use &quot;Deactivate&quot; to hide options from new selections while keeping
                  them visible in existing configurations.
                </div>
              </form>
            )}

            {!selectedItem && !isCreating && (
              <div className="text-center py-8 text-gray-500">
                <p>Select {itemLabel.toLowerCase()} from the list to edit, or click &quot;+ New&quot; to create one.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
