/**
 * Product Families Admin Page
 *
 * SUPER_ADMIN only page for managing product families.
 *
 * Features:
 * - List product families with sort order
 * - Create/Edit form: name, slug (auto-generate from name), is_active
 * - Deactivate/Reactivate (no hard delete)
 */

'use client';

import { useState, useEffect } from 'react';
import { useCurrentUserRole } from '../../../../hooks/useCurrentUserRole';

interface ProductFamily {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface FormData {
  name: string;
  slug: string;
  is_active: boolean;
  sort_order: string;
}

const emptyForm: FormData = {
  name: '',
  slug: '',
  is_active: true,
  sort_order: '0',
};

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function ProductFamiliesAdminPage() {
  const { isSuperAdmin, isLoading: isLoadingRole } = useCurrentUserRole();

  const [families, setFamilies] = useState<ProductFamily[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFamily, setSelectedFamily] = useState<ProductFamily | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!isLoadingRole && isSuperAdmin) {
      void loadFamilies();
    }
  }, [isLoadingRole, isSuperAdmin]);

  async function loadFamilies() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/product-families');
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied. Super Admin permissions required.');
        }
        throw new Error('Failed to fetch product families');
      }
      const data = await response.json();
      setFamilies(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load product families');
    } finally {
      setIsLoading(false);
    }
  }

  function selectFamily(family: ProductFamily) {
    setSelectedFamily(family);
    setIsCreating(false);
    setFormData({
      name: family.name,
      slug: family.slug,
      is_active: family.is_active,
      sort_order: family.sort_order.toString(),
    });
    setSaveMessage(null);
  }

  function createNewFamily() {
    setSelectedFamily(null);
    setIsCreating(true);
    setFormData(emptyForm);
    setSaveMessage(null);
  }

  function updateField(field: keyof FormData, value: string | boolean) {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };
      // Auto-generate slug from name when creating
      if (field === 'name' && isCreating) {
        newData.slug = generateSlug(value as string);
      }
      return newData;
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.name.trim()) {
      setSaveMessage({ type: 'error', text: 'Name is required' });
      return;
    }

    if (!formData.slug.trim()) {
      setSaveMessage({ type: 'error', text: 'Slug is required' });
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const payload = {
        ...(selectedFamily ? { id: selectedFamily.id } : {}),
        name: formData.name.trim(),
        slug: formData.slug.trim().toLowerCase(),
        is_active: formData.is_active,
        sort_order: parseInt(formData.sort_order) || 0,
      };

      const response = await fetch('/api/admin/product-families', {
        method: isCreating ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to save product family');
      }

      await loadFamilies();
      setSaveMessage({ type: 'success', text: isCreating ? 'Product family created!' : 'Product family updated!' });

      if (isCreating) {
        setIsCreating(false);
        // Select the newly created family
        const newFamilies = await (await fetch('/api/admin/product-families')).json();
        const newFamily = newFamilies.find((f: ProductFamily) => f.slug === formData.slug.trim().toLowerCase());
        if (newFamily) {
          selectFamily(newFamily);
        }
      }
    } catch (err) {
      setSaveMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save' });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleActive() {
    if (!selectedFamily) return;

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const response = await fetch('/api/admin/product-families', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedFamily.id,
          is_active: !selectedFamily.is_active,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to update status');
      }

      await loadFamilies();
      setSelectedFamily((prev) => (prev ? { ...prev, is_active: !prev.is_active } : null));
      setFormData((prev) => ({ ...prev, is_active: !prev.is_active }));
      setSaveMessage({
        type: 'success',
        text: selectedFamily.is_active ? 'Product family deactivated' : 'Product family reactivated',
      });
    } catch (err) {
      setSaveMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update' });
    } finally {
      setIsSaving(false);
    }
  }

  // Access denied for non-super admins
  if (!isLoadingRole && !isSuperAdmin) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-4">Product Families</h1>
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                <strong>Access Denied:</strong> This page is only accessible to Super Admins.
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (isLoading || isLoadingRole) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-4">Product Families</h1>
        <p>Loading...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-4">Product Families</h1>
        <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">
          <p>{error}</p>
          <button
            onClick={loadFamilies}
            className="mt-2 px-4 py-2 bg-red-100 text-red-800 rounded hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold mb-2">Product Families</h1>
      <p className="text-gray-600 mb-6">
        Manage product families for multi-product architecture. Admin pages can be tagged with product families.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Family List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Families ({families.length})</h2>
              <button
                onClick={createNewFamily}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
              >
                + New
              </button>
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {families.map((family) => (
                <button
                  key={family.id}
                  onClick={() => selectFamily(family)}
                  className={`w-full text-left p-3 rounded border ${
                    selectedFamily?.id === family.id
                      ? 'border-blue-500 bg-blue-50'
                      : family.is_active
                      ? 'border-gray-200 hover:bg-gray-50'
                      : 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{family.name}</span>
                    {!family.is_active && (
                      <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {family.slug} | Order: {family.sort_order}
                  </div>
                </button>
              ))}
              {families.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No product families found. Create one to get started.
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
                ? 'New Product Family'
                : selectedFamily
                ? `Edit: ${selectedFamily.name}`
                : 'Select a product family to edit'}
            </h2>

            {(selectedFamily || isCreating) && (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      required
                      placeholder="e.g., Belt Conveyor"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Slug * {!isCreating && <span className="text-gray-400">(immutable)</span>}
                    </label>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) => updateField('slug', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded disabled:bg-gray-100"
                      required
                      disabled={!isCreating}
                      placeholder="e.g., belt-conveyor"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {isCreating ? 'URL-safe identifier (auto-generated from name)' : 'Slug cannot be changed after creation'}
                    </p>
                  </div>
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
                    {isSaving ? 'Saving...' : isCreating ? 'Create Product Family' : 'Save Changes'}
                  </button>

                  {selectedFamily && !isCreating && (
                    <button
                      type="button"
                      onClick={handleToggleActive}
                      disabled={isSaving}
                      className={`px-4 py-2 rounded ${
                        selectedFamily.is_active
                          ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border border-yellow-300'
                          : 'bg-green-100 text-green-800 hover:bg-green-200 border border-green-300'
                      } disabled:opacity-50`}
                    >
                      {selectedFamily.is_active ? 'Deactivate' : 'Reactivate'}
                    </button>
                  )}
                </div>

                <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded text-sm text-gray-600">
                  <strong>Note:</strong> Product families cannot be deleted to preserve data integrity
                  in page configurations. Use &quot;Deactivate&quot; to hide product families from the filter dropdown.
                </div>
              </form>
            )}

            {!selectedFamily && !isCreating && (
              <div className="text-center py-8 text-gray-500">
                <p>Select a product family from the list to edit, or click &quot;+ New&quot; to create one.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
