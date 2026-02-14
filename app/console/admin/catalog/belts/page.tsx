/**
 * Admin Belt Editor Page
 *
 * Allows admin/engineer users to view, edit, and manage belt catalog entries.
 * Changes are versioned for rollback capability.
 *
 * v1.23: Added safe delete/deactivate with usage checks.
 *        - Delete only allowed when belt has no references (usageCount == 0)
 *        - Deactivate allowed for belts in use
 *        - Inactive belts shown with badge, still editable
 * v1.18: Simplified - removed Material Profile panel and V-guided min pulley field.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { BeltCatalogItem } from '../../../../api/belts/route';
import { clearBeltCatalogCache } from '../../../../hooks/useBeltCatalog';


interface BeltFormData {
  catalog_key: string;
  display_name: string;
  manufacturer: string;
  material: string;
  belt_family: 'PVC' | 'PU' | 'FLEECE';
  surface: string;
  food_grade: boolean;
  cut_resistant: boolean;
  oil_resistant: boolean;
  abrasion_resistant: boolean;
  antistatic: boolean;
  thickness_in: string;
  piw: string;
  pil: string;
  min_pulley_dia_in: string;
  notes: string;
  tags: string;
  is_active: boolean;
  // v1.38: Temperature limits
  temp_min_f: string;
  temp_max_f: string;
}

interface BeltUsage {
  usageCount: number;
  breakdown: {
    applications: number;
    configurations: number;
  };
}

const emptyForm: BeltFormData = {
  catalog_key: '',
  display_name: '',
  manufacturer: '',
  material: '',
  belt_family: 'PVC',
  surface: '',
  food_grade: false,
  cut_resistant: false,
  oil_resistant: false,
  abrasion_resistant: false,
  antistatic: false,
  thickness_in: '',
  piw: '',
  pil: '',
  min_pulley_dia_in: '',
  notes: '',
  tags: '',
  is_active: true,
  // v1.38: Temperature limits
  temp_min_f: '',
  temp_max_f: '',
};

export default function AdminBeltsPage() {
  const [belts, setBelts] = useState<BeltCatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBelt, setSelectedBelt] = useState<BeltCatalogItem | null>(null);
  const [formData, setFormData] = useState<BeltFormData>(emptyForm);
  const [changeReason, setChangeReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Usage tracking
  const [beltUsage, setBeltUsage] = useState<BeltUsage | null>(null);
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);

  // Confirmation modals
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

  // Load belts on mount (include inactive for admin)
  useEffect(() => {
    void loadBelts();
  }, []);

  async function loadBelts() {
    setIsLoading(true);
    setError(null);
    try {
      // Admin page loads all belts including inactive
      const response = await fetch('/api/belts?includeInactive=true');
      if (!response.ok) throw new Error('Failed to fetch belts');
      const data = await response.json();
      setBelts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load belts');
    } finally {
      setIsLoading(false);
    }
  }

  // Fetch usage when belt is selected
  const fetchUsage = useCallback(async (beltId: string) => {
    setIsLoadingUsage(true);
    setBeltUsage(null);
    try {
      const response = await fetch(`/api/belts/${beltId}/usage`);
      if (response.ok) {
        const data = await response.json();
        setBeltUsage(data);
      }
    } catch (err) {
      console.error('Failed to fetch belt usage:', err);
    } finally {
      setIsLoadingUsage(false);
    }
  }, []);

  function selectBelt(belt: BeltCatalogItem) {
    setSelectedBelt(belt);
    setFormData({
      catalog_key: belt.catalog_key,
      display_name: belt.display_name,
      manufacturer: belt.manufacturer || '',
      material: belt.material,
      belt_family: belt.belt_family || 'PVC',
      surface: belt.surface || '',
      food_grade: belt.food_grade,
      cut_resistant: belt.cut_resistant,
      oil_resistant: belt.oil_resistant,
      abrasion_resistant: belt.abrasion_resistant,
      antistatic: belt.antistatic,
      thickness_in: belt.thickness_in?.toString() || '',
      piw: belt.piw.toString(),
      pil: belt.pil.toString(),
      min_pulley_dia_in: belt.min_pulley_dia_no_vguide_in.toString(),
      notes: belt.notes || '',
      tags: belt.tags?.join(', ') || '',
      is_active: belt.is_active,
      // v1.38: Temperature limits
      temp_min_f: belt.temp_min_f?.toString() || '',
      temp_max_f: belt.temp_max_f?.toString() || '',
    });
    setChangeReason('');
    setSaveMessage(null);
    setShowDeleteConfirm(false);
    setShowDeactivateConfirm(false);

    // Fetch usage for this belt
    void fetchUsage(belt.id);
  }

  function createNewBelt() {
    setSelectedBelt(null);
    setFormData(emptyForm);
    setChangeReason('');
    setSaveMessage(null);
    setBeltUsage(null);
    setShowDeleteConfirm(false);
    setShowDeactivateConfirm(false);
  }

  function updateField(field: keyof BeltFormData, value: string | boolean) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (!changeReason.trim()) {
      setSaveMessage({ type: 'error', text: 'Please provide a change reason' });
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const minPulleyDia = parseFloat(formData.min_pulley_dia_in);

      // v1.38: Parse temperature values with validation
      const tempMinF = formData.temp_min_f ? parseFloat(formData.temp_min_f) : null;
      const tempMaxF = formData.temp_max_f ? parseFloat(formData.temp_max_f) : null;

      // Validate temp range
      if (tempMinF !== null && tempMaxF !== null && tempMinF >= tempMaxF) {
        setSaveMessage({ type: 'error', text: 'Min temperature must be less than max temperature' });
        setIsSaving(false);
        return;
      }

      const belt = {
        catalog_key: formData.catalog_key,
        display_name: formData.display_name,
        manufacturer: formData.manufacturer || null,
        material: formData.material,
        belt_family: formData.belt_family,
        surface: formData.surface || null,
        food_grade: formData.food_grade,
        cut_resistant: formData.cut_resistant,
        oil_resistant: formData.oil_resistant,
        abrasion_resistant: formData.abrasion_resistant,
        antistatic: formData.antistatic,
        thickness_in: formData.thickness_in ? parseFloat(formData.thickness_in) : null,
        piw: parseFloat(formData.piw),
        pil: parseFloat(formData.pil),
        min_pulley_dia_no_vguide_in: minPulleyDia,
        min_pulley_dia_with_vguide_in: minPulleyDia,
        notes: formData.notes || null,
        tags: formData.tags
          ? formData.tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
          : null,
        is_active: formData.is_active,
        // v1.38: Temperature limits
        temp_min_f: tempMinF,
        temp_max_f: tempMaxF,
      };

      const response = await fetch('/api/belts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ belt, change_reason: changeReason }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to save belt');
      }

      clearBeltCatalogCache();
      await loadBelts();

      setSaveMessage({ type: 'success', text: 'Belt saved successfully!' });
      setChangeReason('');
    } catch (err) {
      setSaveMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save' });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedBelt) return;

    setIsDeleting(true);
    setSaveMessage(null);

    try {
      const response = await fetch(`/api/belts/${selectedBelt.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.status === 409) {
        // Belt is in use
        setSaveMessage({
          type: 'error',
          text: data.error || 'Belt is in use and cannot be deleted.',
        });
        setShowDeleteConfirm(false);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete belt');
      }

      clearBeltCatalogCache();
      await loadBelts();
      createNewBelt();
      setSaveMessage({ type: 'success', text: data.message || 'Belt deleted successfully!' });
    } catch (err) {
      setSaveMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to delete' });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  async function handleDeactivate() {
    if (!selectedBelt) return;

    setIsDeactivating(true);
    setSaveMessage(null);

    try {
      const response = await fetch(`/api/belts/${selectedBelt.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_active: false,
          change_reason: 'Deactivated via admin',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to deactivate belt');
      }

      clearBeltCatalogCache();
      await loadBelts();

      // Update form state
      setFormData((prev) => ({ ...prev, is_active: false }));
      if (selectedBelt) {
        setSelectedBelt({ ...selectedBelt, is_active: false });
      }

      setSaveMessage({ type: 'success', text: data.message || 'Belt deactivated!' });
    } catch (err) {
      setSaveMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to deactivate' });
    } finally {
      setIsDeactivating(false);
      setShowDeactivateConfirm(false);
    }
  }

  async function handleActivate() {
    if (!selectedBelt) return;

    setIsDeactivating(true);
    setSaveMessage(null);

    try {
      const response = await fetch(`/api/belts/${selectedBelt.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_active: true,
          change_reason: 'Activated via admin',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to activate belt');
      }

      clearBeltCatalogCache();
      await loadBelts();

      // Update form state
      setFormData((prev) => ({ ...prev, is_active: true }));
      if (selectedBelt) {
        setSelectedBelt({ ...selectedBelt, is_active: true });
      }

      setSaveMessage({ type: 'success', text: data.message || 'Belt activated!' });
    } catch (err) {
      setSaveMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to activate' });
    } finally {
      setIsDeactivating(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Belt Catalog Admin</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Belt Catalog Admin</h1>
        <p className="text-red-600">{error}</p>
        <button onClick={loadBelts} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">
          Retry
        </button>
      </div>
    );
  }

  const canDelete = beltUsage && beltUsage.usageCount === 0;
  const canDeactivate = selectedBelt && formData.is_active;
  const canActivate = selectedBelt && !formData.is_active;

  return (
    <>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-6">Belt Catalog Admin</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Belt List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Belts</h2>
                <button
                  onClick={createNewBelt}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                >
                  + New
                </button>
              </div>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {belts.map((belt) => (
                  <button
                    key={belt.id}
                    onClick={() => selectBelt(belt)}
                    className={`w-full text-left p-3 rounded border ${
                      selectedBelt?.id === belt.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    } ${!belt.is_active ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{belt.display_name}</span>
                      {!belt.is_active && (
                        <span className="px-1.5 py-0.5 text-xs bg-gray-200 text-gray-600 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {belt.material} | PIW: {belt.piw} | Min Pulley: {belt.min_pulley_dia_no_vguide_in}&quot;
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Edit Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-lg font-semibold">
                    {selectedBelt ? `Edit: ${selectedBelt.display_name}` : 'New Belt'}
                  </h2>
                  {selectedBelt && !formData.is_active && (
                    <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded">
                      This belt is inactive and hidden from selection lists
                    </span>
                  )}
                </div>

                {/* Usage info */}
                {selectedBelt && (
                  <div className="text-right text-sm">
                    {isLoadingUsage ? (
                      <span className="text-gray-400">Loading usage...</span>
                    ) : beltUsage ? (
                      <div className="text-gray-600">
                        <span className="font-medium">Usage:</span>{' '}
                        {beltUsage.usageCount === 0 ? (
                          <span className="text-green-600">Not in use</span>
                        ) : (
                          <span className="text-amber-600">
                            {beltUsage.usageCount} reference{beltUsage.usageCount !== 1 ? 's' : ''}
                          </span>
                        )}
                        {beltUsage.usageCount > 0 && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            ({beltUsage.breakdown.applications} apps, {beltUsage.breakdown.configurations} configs)
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Catalog Key *
                    </label>
                    <input
                      type="text"
                      value={formData.catalog_key}
                      onChange={(e) => updateField('catalog_key', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      required
                      disabled={!!selectedBelt}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Display Name *
                    </label>
                    <input
                      type="text"
                      value={formData.display_name}
                      onChange={(e) => updateField('display_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
                    <input
                      type="text"
                      value={formData.manufacturer}
                      onChange={(e) => updateField('manufacturer', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Material *</label>
                    <input
                      type="text"
                      value={formData.material}
                      onChange={(e) => updateField('material', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Belt Family *</label>
                    <select
                      value={formData.belt_family}
                      onChange={(e) => updateField('belt_family', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      required
                    >
                      <option value="PVC">PVC</option>
                      <option value="PU">PU</option>
                      <option value="FLEECE">FLEECE</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Determines V-guide min pulley values (FLEECE: no V-guide rules)
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Surface</label>
                    <input
                      type="text"
                      value={formData.surface}
                      onChange={(e) => updateField('surface', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">PIW (lb/in) *</label>
                    <input
                      type="number"
                      step="0.001"
                      value={formData.piw}
                      onChange={(e) => updateField('piw', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">PIL (lb/in) *</label>
                    <input
                      type="number"
                      step="0.001"
                      value={formData.pil}
                      onChange={(e) => updateField('pil', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Thickness (in)</label>
                    <input
                      type="number"
                      step="0.001"
                      value={formData.thickness_in}
                      onChange={(e) => updateField('thickness_in', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <div className="mt-2">
                      {formData.is_active ? (
                        <span className="px-2 py-1 text-sm bg-green-100 text-green-800 rounded">Active</span>
                      ) : (
                        <span className="px-2 py-1 text-sm bg-gray-100 text-gray-600 rounded">Inactive</span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Pulley Diameter (in) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.min_pulley_dia_in}
                    onChange={(e) => updateField('min_pulley_dia_in', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded max-w-xs"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    V-guide min pulley requirements are handled via the V-Guide dropdown.
                  </p>
                </div>

                {/* v1.38: Temperature Limits */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Min Temp (°F)
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={formData.temp_min_f}
                      onChange={(e) => updateField('temp_min_f', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      placeholder="e.g., 14"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Temp (°F)
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={formData.temp_max_f}
                      onChange={(e) => updateField('temp_max_f', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      placeholder="e.g., 160"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 -mt-2">
                  Operating temperature limits. Leave blank if unknown. Used for compatibility validation.
                </p>

                {/* Flags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Properties</label>
                  <div className="flex flex-wrap gap-4">
                    {(
                      [
                        ['food_grade', 'Food Grade'],
                        ['cut_resistant', 'Cut Resistant'],
                        ['oil_resistant', 'Oil Resistant'],
                        ['abrasion_resistant', 'Abrasion Resistant'],
                        ['antistatic', 'Antistatic'],
                      ] as const
                    ).map(([key, label]) => (
                      <label key={key} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData[key]}
                          onChange={(e) => updateField(key, e.target.checked)}
                          className="mr-2"
                        />
                        <span className="text-sm">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => updateField('tags', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    placeholder="standard, pvc, heavy-duty"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => updateField('notes', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    rows={2}
                  />
                </div>

                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Change Reason *
                  </label>
                  <input
                    type="text"
                    value={changeReason}
                    onChange={(e) => setChangeReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    placeholder="Describe why you're making this change..."
                    required
                  />
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

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {isSaving ? 'Saving...' : 'Save Belt'}
                  </button>

                  {/* Activate/Deactivate button */}
                  {selectedBelt && canDeactivate && (
                    <button
                      type="button"
                      onClick={() => setShowDeactivateConfirm(true)}
                      disabled={isDeactivating}
                      className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:bg-gray-400"
                    >
                      Deactivate
                    </button>
                  )}
                  {selectedBelt && canActivate && (
                    <button
                      type="button"
                      onClick={handleActivate}
                      disabled={isDeactivating}
                      className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
                    >
                      {isDeactivating ? 'Activating...' : 'Activate'}
                    </button>
                  )}

                  {/* Delete button - only shown when usage == 0 */}
                  {selectedBelt && canDelete && (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={isDeleting}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
                    >
                      Delete Belt
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && selectedBelt && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-red-600 mb-4">Delete Belt?</h3>
              <p className="text-gray-600 mb-6">
                Delete belt &ldquo;{selectedBelt.display_name}&rdquo;? This cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Deactivate Confirmation Modal */}
        {showDeactivateConfirm && selectedBelt && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-yellow-600 mb-4">Deactivate Belt?</h3>
              <p className="text-gray-600 mb-6">
                Deactivate belt &ldquo;{selectedBelt.display_name}&rdquo;? It will be hidden for new selections but old configurations will still work.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeactivateConfirm(false)}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeactivate}
                  disabled={isDeactivating}
                  className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:bg-gray-400"
                >
                  {isDeactivating ? 'Deactivating...' : 'Deactivate'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
