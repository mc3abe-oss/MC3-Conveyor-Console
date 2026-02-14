/**
 * Admin V-Guides Page (v1.26)
 *
 * Allows admin users to manage V-Guide catalog entries.
 *
 * Schema (v1.26):
 * - key: K-code (K10, K13, etc.) - canonical identifier
 * - na_letter: Optional NA letter alias (O, A, B, C)
 * - label: Display label, computed as "O (K10)" or "K10"
 * - PVC min pulley: min_pulley_dia_solid_in, min_pulley_dia_notched_in (required)
 * - PU min pulley: min_pulley_dia_solid_pu_in, min_pulley_dia_notched_pu_in (optional)
 *
 * Features:
 * - Add new v-guides with K-code as key
 * - Edit existing v-guides (key is immutable)
 * - Deactivate/reactivate v-guides (toggle is_active)
 * - NO hard delete (data safety)
 */

'use client';

import { useState, useEffect } from 'react';
import { useCurrentUserRole } from '../../../../hooks/useCurrentUserRole';
import { AdminReadOnlyBanner } from '../../../../components/AdminReadOnlyBanner';

interface VGuide {
  id: string;
  key: string;           // K-code (K10, K13, etc.)
  na_letter: string | null; // Optional NA letter (O, A, B, C)
  label: string;
  // PVC min pulley values (default)
  min_pulley_dia_solid_in: number;
  min_pulley_dia_notched_in: number;
  // PU min pulley values (v1.26)
  min_pulley_dia_solid_pu_in: number | null;
  min_pulley_dia_notched_pu_in: number | null;
  notes: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

interface VGuideFormData {
  key: string;              // K-code
  na_letter: string;        // Optional NA letter
  // PVC (default)
  min_pulley_dia_solid_in: string;
  min_pulley_dia_notched_in: string;
  // PU (v1.26)
  min_pulley_dia_solid_pu_in: string;
  min_pulley_dia_notched_pu_in: string;
  notes: string;
  sort_order: string;
  is_active: boolean;
}

const emptyForm: VGuideFormData = {
  key: '',
  na_letter: '',
  min_pulley_dia_solid_in: '',
  min_pulley_dia_notched_in: '',
  min_pulley_dia_solid_pu_in: '',
  min_pulley_dia_notched_pu_in: '',
  notes: '',
  sort_order: '',
  is_active: true,
};

export default function AdminVGuidesPage() {
  const { canBeltAdmin, email, isLoading: isLoadingRole } = useCurrentUserRole();
  const isReadOnly = !canBeltAdmin;

  const [vguides, setVguides] = useState<VGuide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVGuide, setSelectedVGuide] = useState<VGuide | null>(null);
  const [formData, setFormData] = useState<VGuideFormData>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Load v-guides on mount
  useEffect(() => {
    void loadVGuides();
  }, []);

  async function loadVGuides() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/v-guides');
      if (!response.ok) throw new Error('Failed to fetch v-guides');
      const data = await response.json();
      setVguides(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load v-guides');
    } finally {
      setIsLoading(false);
    }
  }

  function selectVGuide(vguide: VGuide) {
    setSelectedVGuide(vguide);
    setIsCreating(false);
    setFormData({
      key: vguide.key,
      na_letter: vguide.na_letter || '',
      min_pulley_dia_solid_in: vguide.min_pulley_dia_solid_in.toString(),
      min_pulley_dia_notched_in: vguide.min_pulley_dia_notched_in.toString(),
      min_pulley_dia_solid_pu_in: vguide.min_pulley_dia_solid_pu_in?.toString() || '',
      min_pulley_dia_notched_pu_in: vguide.min_pulley_dia_notched_pu_in?.toString() || '',
      notes: vguide.notes || '',
      sort_order: vguide.sort_order?.toString() || '',
      is_active: vguide.is_active,
    });
    setSaveMessage(null);
  }

  function createNewVGuide() {
    setSelectedVGuide(null);
    setIsCreating(true);
    setFormData(emptyForm);
    setSaveMessage(null);
  }

  function updateField(field: keyof VGuideFormData, value: string | boolean) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    // Validate key (K-code required)
    if (!formData.key.trim()) {
      setSaveMessage({ type: 'error', text: 'K-Code is required' });
      return;
    }

    // Validate key format (K followed by digits)
    if (!/^K\d+/.test(formData.key)) {
      setSaveMessage({ type: 'error', text: 'K-Code must start with K followed by numbers (e.g., K10, K13)' });
      return;
    }

    // Validate NA letter if provided (single uppercase letter)
    if (formData.na_letter && !/^[A-Z]$/.test(formData.na_letter)) {
      setSaveMessage({ type: 'error', text: 'NA Letter must be a single uppercase letter (e.g., O, A, B, C)' });
      return;
    }

    // Validate min pulley diameters
    const solidDia = parseFloat(formData.min_pulley_dia_solid_in);
    const notchedDia = parseFloat(formData.min_pulley_dia_notched_in);

    if (isNaN(solidDia) || solidDia <= 0) {
      setSaveMessage({ type: 'error', text: 'Min Pulley Dia (Solid) must be a positive number' });
      return;
    }

    if (isNaN(notchedDia) || notchedDia <= 0) {
      setSaveMessage({ type: 'error', text: 'Min Pulley Dia (Notched) must be a positive number' });
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      // Parse PU values (optional)
      const solidPuDia = formData.min_pulley_dia_solid_pu_in ? parseFloat(formData.min_pulley_dia_solid_pu_in) : null;
      const notchedPuDia = formData.min_pulley_dia_notched_pu_in ? parseFloat(formData.min_pulley_dia_notched_pu_in) : null;

      const payload = {
        key: formData.key.toUpperCase(),
        na_letter: formData.na_letter ? formData.na_letter.toUpperCase() : null,
        min_pulley_dia_solid_in: solidDia,
        min_pulley_dia_notched_in: notchedDia,
        min_pulley_dia_solid_pu_in: solidPuDia,
        min_pulley_dia_notched_pu_in: notchedPuDia,
        notes: formData.notes || null,
        sort_order: formData.sort_order ? parseInt(formData.sort_order, 10) : 0,
        is_active: formData.is_active,
      };

      const response = await fetch('/api/admin/v-guides', {
        method: isCreating ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to save v-guide');
      }

      await loadVGuides();
      setSaveMessage({ type: 'success', text: isCreating ? 'V-Guide created!' : 'V-Guide updated!' });

      if (isCreating) {
        setIsCreating(false);
        // Select the newly created v-guide
        const newVguides = await (await fetch('/api/admin/v-guides')).json();
        const newVguide = newVguides.find((v: VGuide) => v.key === formData.key.toUpperCase());
        if (newVguide) {
          selectVGuide(newVguide);
        }
      }
    } catch (err) {
      setSaveMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save' });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleActive() {
    if (!selectedVGuide) return;

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const response = await fetch('/api/admin/v-guides', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: selectedVGuide.key,
          na_letter: selectedVGuide.na_letter,
          min_pulley_dia_solid_in: selectedVGuide.min_pulley_dia_solid_in,
          min_pulley_dia_notched_in: selectedVGuide.min_pulley_dia_notched_in,
          min_pulley_dia_solid_pu_in: selectedVGuide.min_pulley_dia_solid_pu_in,
          min_pulley_dia_notched_pu_in: selectedVGuide.min_pulley_dia_notched_pu_in,
          notes: selectedVGuide.notes,
          sort_order: selectedVGuide.sort_order,
          is_active: !selectedVGuide.is_active,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to update status');
      }

      await loadVGuides();
      setSelectedVGuide((prev) => (prev ? { ...prev, is_active: !prev.is_active } : null));
      setFormData((prev) => ({ ...prev, is_active: !prev.is_active }));
      setSaveMessage({
        type: 'success',
        text: selectedVGuide.is_active ? 'V-Guide deactivated' : 'V-Guide reactivated',
      });
    } catch (err) {
      setSaveMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update' });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading || isLoadingRole) {
    return (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-bold mb-4">V-Guides Admin</h1>
          <p>Loading...</p>
        </main>
    );
  }

  if (error) {
    return (

        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-bold mb-4">V-Guides Admin</h1>
          <p className="text-red-600">{error}</p>
          <button onClick={loadVGuides} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">
            Retry
          </button>
        </main>

    );
  }

  return (
    <>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-6">V-Guides Admin</h1>

        {isReadOnly && <AdminReadOnlyBanner email={email} />}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* V-Guide List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">V-Guides</h2>
                {!isReadOnly && (
                  <button
                    onClick={createNewVGuide}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                  >
                    + New
                  </button>
                )}
              </div>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {vguides.map((vguide) => (
                  <button
                    key={vguide.id}
                    onClick={() => selectVGuide(vguide)}
                    className={`w-full text-left p-3 rounded border ${
                      selectedVGuide?.id === vguide.id
                        ? 'border-blue-500 bg-blue-50'
                        : vguide.is_active
                        ? 'border-gray-200 hover:bg-gray-50'
                        : 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{vguide.label}</span>
                      {!vguide.is_active && (
                        <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Solid: {vguide.min_pulley_dia_solid_in}" | Notched: {vguide.min_pulley_dia_notched_in}"
                    </div>
                  </button>
                ))}
                {vguides.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No v-guides found
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
                  ? 'New V-Guide'
                  : selectedVGuide
                  ? `Edit: ${selectedVGuide.label}`
                  : 'Select a v-guide to edit'}
              </h2>

              {(selectedVGuide || isCreating) && (
                <form onSubmit={handleSave} className="space-y-4">
                  {/* Row 1: K-Code and NA Letter */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        K-Code (Key) *
                      </label>
                      <input
                        type="text"
                        value={formData.key}
                        onChange={(e) => updateField('key', e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 border border-gray-300 rounded disabled:bg-gray-100"
                        required
                        disabled={isReadOnly || !isCreating}
                        placeholder="e.g., K10, K13, K17"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {isCreating ? 'Canonical identifier (K + number)' : 'Key is immutable after creation'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        NA Letter <span className="text-gray-400">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={formData.na_letter}
                        onChange={(e) => updateField('na_letter', e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 border border-gray-300 rounded disabled:bg-gray-100"
                        placeholder="e.g., O, A, B, C"
                        maxLength={1}
                        disabled={isReadOnly}
                      />
                      <p className="text-xs text-gray-500 mt-1">Single letter alias (shown first in dropdown)</p>
                    </div>
                  </div>

                  {/* Row 2: PVC Min Pulley Diameters */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Min Pulley Dia - PVC Solid (in) *
                      </label>
                      <input
                        type="number"
                        value={formData.min_pulley_dia_solid_in}
                        onChange={(e) => updateField('min_pulley_dia_solid_in', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded disabled:bg-gray-100"
                        required
                        step="0.1"
                        min="0.1"
                        placeholder="e.g., 2.5"
                        disabled={isReadOnly}
                      />
                      <p className="text-xs text-gray-500 mt-1">Required for PVC solid belt</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Min Pulley Dia - PVC Notched (in) *
                      </label>
                      <input
                        type="number"
                        value={formData.min_pulley_dia_notched_in}
                        onChange={(e) => updateField('min_pulley_dia_notched_in', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded disabled:bg-gray-100"
                        required
                        step="0.1"
                        min="0.1"
                        placeholder="e.g., 2.0"
                        disabled={isReadOnly}
                      />
                      <p className="text-xs text-gray-500 mt-1">Required for PVC notched belt</p>
                    </div>
                  </div>

                  {/* Row 3: PU Min Pulley Diameters (optional) */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Min Pulley Dia - PU Solid (in)
                        <span className="text-gray-400 font-normal ml-1">(optional)</span>
                      </label>
                      <input
                        type="number"
                        value={formData.min_pulley_dia_solid_pu_in}
                        onChange={(e) => updateField('min_pulley_dia_solid_pu_in', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded disabled:bg-gray-100"
                        step="0.1"
                        min="0.1"
                        placeholder="e.g., 4.0"
                        disabled={isReadOnly}
                      />
                      <p className="text-xs text-gray-500 mt-1">For PU solid belt (leave empty if N/A)</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Min Pulley Dia - PU Notched (in)
                        <span className="text-gray-400 font-normal ml-1">(optional)</span>
                      </label>
                      <input
                        type="number"
                        value={formData.min_pulley_dia_notched_pu_in}
                        onChange={(e) => updateField('min_pulley_dia_notched_pu_in', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded disabled:bg-gray-100"
                        step="0.1"
                        min="0.1"
                        placeholder="e.g., 3.0"
                        disabled={isReadOnly}
                      />
                      <p className="text-xs text-gray-500 mt-1">For PU notched belt (leave empty if N/A)</p>
                    </div>
                  </div>

                  {/* Row 4: Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => updateField('notes', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded disabled:bg-gray-100"
                      rows={2}
                      placeholder="Optional notes"
                      disabled={isReadOnly}
                    />
                  </div>

                  {/* Row 5: Sort Order and Active */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sort Order
                      </label>
                      <input
                        type="number"
                        value={formData.sort_order}
                        onChange={(e) => updateField('sort_order', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded disabled:bg-gray-100"
                        placeholder="e.g., 10"
                        disabled={isReadOnly}
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
                          disabled={isReadOnly}
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

                  {!isReadOnly && (
                    <div className="flex gap-4 pt-4 border-t">
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                      >
                        {isSaving ? 'Saving...' : isCreating ? 'Create V-Guide' : 'Save Changes'}
                      </button>

                      {selectedVGuide && !isCreating && (
                        <button
                          type="button"
                          onClick={handleToggleActive}
                          disabled={isSaving}
                          className={`px-4 py-2 rounded ${
                            selectedVGuide.is_active
                              ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border border-yellow-300'
                              : 'bg-green-100 text-green-800 hover:bg-green-200 border border-green-300'
                          } disabled:opacity-50`}
                        >
                          {selectedVGuide.is_active ? 'Deactivate' : 'Reactivate'}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Info Box */}
                  <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded text-sm text-gray-600">
                    <strong>Note:</strong> V-Guides cannot be deleted to preserve data integrity
                    in saved configurations. Use &quot;Deactivate&quot; to hide v-guides from new
                    selections while keeping them visible in existing configurations.
                  </div>
                </form>
              )}

              {!selectedVGuide && !isCreating && (
                <div className="text-center py-8 text-gray-500">
                  <p>Select a v-guide from the list to edit, or click &quot;+ New&quot; to create one.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
