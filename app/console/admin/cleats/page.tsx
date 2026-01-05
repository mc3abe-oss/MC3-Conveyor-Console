/**
 * Admin Cleats Page (v1.23)
 *
 * Allows admin users to manage cleat catalog entries and center factors.
 *
 * Features:
 * - View/edit cleat catalog (profile, size, pattern, min pulley diameters)
 * - View/edit center factors (spacing multipliers)
 * - Preview tool to test lookups
 * - Soft delete only (is_active toggle)
 */

'use client';

import { useState, useEffect } from 'react';
import { useCurrentUserRole } from '../../../hooks/useCurrentUserRole';
import { AdminReadOnlyBanner } from '../../../components/AdminReadOnlyBanner';

import {
  CleatCatalogItem,
  CleatCenterFactor,
  CleatPattern,
  CleatStyle,
  CleatCenters,
  CLEAT_PATTERNS,
  CLEAT_PATTERN_LABELS,
  CLEAT_STYLE_LABELS,
  CLEAT_CENTERS_OPTIONS,
  lookupCleatsMinPulleyDia,
  getUniqueCleatProfiles,
  getCleatSizesForProfile,
  getCleatPatternsForProfileSize,
  isDrillSipedSupported,
} from '../../../../src/lib/cleat-catalog';

interface CleatFormData {
  id: string;
  material_family: string;
  cleat_profile: string;
  cleat_size: string;
  cleat_pattern: CleatPattern | '';
  min_pulley_dia_12in_solid_in: string;
  min_pulley_dia_12in_drill_siped_in: string;
  notes: string;
  source_doc: string;
  sort_order: string;
  is_active: boolean;
}

const emptyCleatForm: CleatFormData = {
  id: '',
  material_family: 'PVC_HOT_WELDED',
  cleat_profile: '',
  cleat_size: '',
  cleat_pattern: '',
  min_pulley_dia_12in_solid_in: '',
  min_pulley_dia_12in_drill_siped_in: '',
  notes: '',
  source_doc: 'PVC Hot Welded Guide',
  sort_order: '',
  is_active: true,
};

export default function AdminCleatsPage() {
  const { canBeltAdmin, email, isLoading: isLoadingRole } = useCurrentUserRole();
  const isReadOnly = !canBeltAdmin;

  // Catalog state
  const [catalog, setCatalog] = useState<CleatCatalogItem[]>([]);
  const [centerFactors, setCenterFactors] = useState<CleatCenterFactor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [selectedItem, setSelectedItem] = useState<CleatCatalogItem | null>(null);
  const [formData, setFormData] = useState<CleatFormData>(emptyCleatForm);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Preview state
  const [previewProfile, setPreviewProfile] = useState<string>('');
  const [previewSize, setPreviewSize] = useState<string>('');
  const [previewPattern, setPreviewPattern] = useState<CleatPattern | ''>('');
  const [previewStyle, setPreviewStyle] = useState<CleatStyle>('SOLID');
  const [previewCenters, setPreviewCenters] = useState<CleatCenters>(12);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    setError(null);
    try {
      const [catalogRes, factorsRes] = await Promise.all([
        fetch('/api/admin/cleats'),
        fetch('/api/admin/cleats/factors'),
      ]);

      if (!catalogRes.ok) throw new Error('Failed to fetch cleat catalog');
      if (!factorsRes.ok) throw new Error('Failed to fetch center factors');

      const catalogData = await catalogRes.json();
      const factorsData = await factorsRes.json();

      setCatalog(catalogData);
      setCenterFactors(factorsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }

  function selectItem(item: CleatCatalogItem) {
    setSelectedItem(item);
    setIsCreating(false);
    setFormData({
      id: item.id,
      material_family: item.material_family,
      cleat_profile: item.cleat_profile,
      cleat_size: item.cleat_size,
      cleat_pattern: item.cleat_pattern,
      min_pulley_dia_12in_solid_in: item.min_pulley_dia_12in_solid_in.toString(),
      min_pulley_dia_12in_drill_siped_in: item.min_pulley_dia_12in_drill_siped_in?.toString() || '',
      notes: item.notes || '',
      source_doc: item.source_doc || '',
      sort_order: item.sort_order?.toString() || '',
      is_active: item.is_active,
    });
    setSaveMessage(null);
  }

  function createNew() {
    setSelectedItem(null);
    setIsCreating(true);
    setFormData(emptyCleatForm);
    setSaveMessage(null);
  }

  function updateField(field: keyof CleatFormData, value: string | boolean) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    // Validate
    if (!formData.cleat_profile.trim()) {
      setSaveMessage({ type: 'error', text: 'Cleat profile is required' });
      return;
    }
    if (!formData.cleat_size.trim()) {
      setSaveMessage({ type: 'error', text: 'Cleat size is required' });
      return;
    }
    if (!formData.cleat_pattern) {
      setSaveMessage({ type: 'error', text: 'Cleat pattern is required' });
      return;
    }

    const solidDia = parseFloat(formData.min_pulley_dia_12in_solid_in);
    if (isNaN(solidDia) || solidDia <= 0) {
      setSaveMessage({ type: 'error', text: 'Min Pulley Dia (Solid) must be a positive number' });
      return;
    }

    const drillSipedDia = formData.min_pulley_dia_12in_drill_siped_in.trim()
      ? parseFloat(formData.min_pulley_dia_12in_drill_siped_in)
      : null;
    if (drillSipedDia !== null && (isNaN(drillSipedDia) || drillSipedDia <= 0)) {
      setSaveMessage({ type: 'error', text: 'Min Pulley Dia (Drill & Siped) must be a positive number or empty' });
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const payload = {
        id: isCreating ? undefined : formData.id,
        material_family: formData.material_family,
        cleat_profile: formData.cleat_profile.trim(),
        cleat_size: formData.cleat_size.trim(),
        cleat_pattern: formData.cleat_pattern,
        min_pulley_dia_12in_solid_in: solidDia,
        min_pulley_dia_12in_drill_siped_in: drillSipedDia,
        notes: formData.notes.trim() || null,
        source_doc: formData.source_doc.trim() || null,
        sort_order: formData.sort_order ? parseInt(formData.sort_order, 10) : 0,
        is_active: formData.is_active,
      };

      const response = await fetch('/api/admin/cleats', {
        method: isCreating ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to save');
      }

      await loadData();
      setSaveMessage({ type: 'success', text: isCreating ? 'Cleat entry created!' : 'Cleat entry updated!' });

      if (isCreating) {
        setIsCreating(false);
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
      const response = await fetch('/api/admin/cleats', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedItem.id,
          is_active: !selectedItem.is_active,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to toggle');
      }

      await loadData();
      setSaveMessage({
        type: 'success',
        text: selectedItem.is_active ? 'Cleat entry deactivated' : 'Cleat entry reactivated',
      });

      // Update local state
      setFormData((prev) => ({ ...prev, is_active: !selectedItem.is_active }));
      setSelectedItem((prev) => (prev ? { ...prev, is_active: !prev.is_active } : null));
    } catch (err) {
      setSaveMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to toggle' });
    } finally {
      setIsSaving(false);
    }
  }

  // Preview calculation
  const previewResult = previewProfile && previewSize && previewPattern
    ? lookupCleatsMinPulleyDia(
        catalog.filter((c) => c.is_active),
        centerFactors.filter((f) => f.is_active),
        'PVC_HOT_WELDED',
        previewProfile,
        previewSize,
        previewPattern,
        previewStyle,
        previewCenters
      )
    : null;

  // Get cascading dropdown options for preview
  const previewProfiles = getUniqueCleatProfiles(catalog);
  const previewSizes = previewProfile ? getCleatSizesForProfile(catalog, previewProfile) : [];
  const previewPatterns = previewProfile && previewSize
    ? getCleatPatternsForProfileSize(catalog, previewProfile, previewSize)
    : [];
  const drillSipedAvailable = previewProfile && previewSize && previewPattern
    ? isDrillSipedSupported(catalog, 'PVC_HOT_WELDED', previewProfile, previewSize, previewPattern)
    : false;

  if (isLoading || isLoadingRole) {
    return (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p>Loading cleat catalog...</p>
        </main>
    );
  }

  if (error) {
    return (

        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-red-600">Error: {error}</p>
          <button onClick={loadData} className="mt-2 btn btn-secondary">
            Retry
          </button>
        </main>

    );
  }

  return (
    <>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Cleats Admin</h1>
          {!isReadOnly && (
            <button
              onClick={createNew}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              + Add Cleat Entry
            </button>
          )}
        </div>

        {isReadOnly && <AdminReadOnlyBanner email={email} />}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Cleat Catalog List */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-4">Cleat Catalog ({catalog.length})</h2>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {catalog.map((item) => (
                <button
                  key={item.id}
                  onClick={() => selectItem(item)}
                  className={`w-full text-left p-3 rounded border transition-colors ${
                    selectedItem?.id === item.id
                      ? 'border-blue-500 bg-blue-50'
                      : item.is_active
                      ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      : 'border-yellow-300 bg-yellow-50 hover:bg-yellow-100'
                  }`}
                >
                  <div className="font-medium text-sm">
                    {item.cleat_profile} {item.cleat_size}
                  </div>
                  <div className="text-xs text-gray-500">
                    {CLEAT_PATTERN_LABELS[item.cleat_pattern]} | Solid: {item.min_pulley_dia_12in_solid_in}"
                    {item.min_pulley_dia_12in_drill_siped_in && ` | D&S: ${item.min_pulley_dia_12in_drill_siped_in}"`}
                  </div>
                  {!item.is_active && (
                    <span className="text-xs text-yellow-700 font-medium">INACTIVE</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Column 2: Edit Form */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-4">
              {isCreating ? 'New Cleat Entry' : selectedItem ? 'Edit Cleat Entry' : 'Select or Create'}
            </h2>

            {(isCreating || selectedItem) ? (
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Material Family</label>
                  <input
                    type="text"
                    value={formData.material_family}
                    disabled
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Cleat Profile *
                  </label>
                  <input
                    type="text"
                    value={formData.cleat_profile}
                    onChange={(e) => updateField('cleat_profile', e.target.value)}
                    disabled={!isCreating}
                    placeholder="e.g., T-Cleat, Straight, Scalloped"
                    className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md ${
                      !isCreating ? 'bg-gray-100' : ''
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Cleat Size *</label>
                  <input
                    type="text"
                    value={formData.cleat_size}
                    onChange={(e) => updateField('cleat_size', e.target.value)}
                    disabled={!isCreating}
                    placeholder='e.g., 0.5", 1", 1.5", 2"'
                    className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md ${
                      !isCreating ? 'bg-gray-100' : ''
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Cleat Pattern *</label>
                  <select
                    value={formData.cleat_pattern}
                    onChange={(e) => updateField('cleat_pattern', e.target.value)}
                    disabled={!isCreating}
                    className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md ${
                      !isCreating ? 'bg-gray-100' : ''
                    }`}
                  >
                    <option value="">Select pattern...</option>
                    {CLEAT_PATTERNS.map((p) => (
                      <option key={p} value={p}>
                        {CLEAT_PATTERN_LABELS[p]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Min Pulley Dia @ 12" - Solid (in) *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={formData.min_pulley_dia_12in_solid_in}
                    onChange={(e) => updateField('min_pulley_dia_12in_solid_in', e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Min Pulley Dia @ 12" - Drill & Siped (in)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={formData.min_pulley_dia_12in_drill_siped_in}
                    onChange={(e) => updateField('min_pulley_dia_12in_drill_siped_in', e.target.value)}
                    placeholder="Leave empty if not supported"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave empty if Drill & Siped not supported</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => updateField('notes', e.target.value)}
                    rows={2}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Source Doc</label>
                  <input
                    type="text"
                    value={formData.source_doc}
                    onChange={(e) => updateField('source_doc', e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Sort Order</label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => updateField('sort_order', e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                {saveMessage && (
                  <div
                    className={`p-3 rounded ${
                      saveMessage.type === 'success'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {saveMessage.text}
                  </div>
                )}

                {!isReadOnly && (
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isSaving ? 'Saving...' : isCreating ? 'Create' : 'Save Changes'}
                    </button>

                    {selectedItem && (
                      <button
                        type="button"
                        onClick={handleToggleActive}
                        disabled={isSaving}
                        className={`px-4 py-2 rounded ${
                          selectedItem.is_active
                            ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                            : 'bg-green-100 text-green-800 hover:bg-green-200'
                        }`}
                      >
                        {selectedItem.is_active ? 'Deactivate' : 'Reactivate'}
                      </button>
                    )}
                  </div>
                )}
              </form>
            ) : (
              <p className="text-gray-500">Select a cleat entry from the list or create a new one.</p>
            )}
          </div>

          {/* Column 3: Preview Tool + Center Factors */}
          <div className="space-y-6">
            {/* Preview Tool */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold mb-4">Preview Tool</h2>
              <p className="text-sm text-gray-600 mb-4">
                Test cleat lookup and min pulley diameter calculation
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Profile</label>
                  <select
                    value={previewProfile}
                    onChange={(e) => {
                      setPreviewProfile(e.target.value);
                      setPreviewSize('');
                      setPreviewPattern('');
                    }}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select...</option>
                    {previewProfiles.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Size</label>
                  <select
                    value={previewSize}
                    onChange={(e) => {
                      setPreviewSize(e.target.value);
                      setPreviewPattern('');
                    }}
                    disabled={!previewProfile}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select...</option>
                    {previewSizes.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Pattern</label>
                  <select
                    value={previewPattern}
                    onChange={(e) => setPreviewPattern(e.target.value as CleatPattern)}
                    disabled={!previewSize}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select...</option>
                    {previewPatterns.map((p) => (
                      <option key={p} value={p}>{CLEAT_PATTERN_LABELS[p]}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Style</label>
                  <select
                    value={previewStyle}
                    onChange={(e) => setPreviewStyle(e.target.value as CleatStyle)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="SOLID">{CLEAT_STYLE_LABELS.SOLID}</option>
                    <option value="DRILL_SIPED_1IN" disabled={!drillSipedAvailable}>
                      {CLEAT_STYLE_LABELS.DRILL_SIPED_1IN}
                      {!drillSipedAvailable && ' (not available)'}
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Centers (in)</label>
                  <select
                    value={previewCenters}
                    onChange={(e) => setPreviewCenters(parseInt(e.target.value) as CleatCenters)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {CLEAT_CENTERS_OPTIONS.map((c) => (
                      <option key={c} value={c}>{c}"</option>
                    ))}
                  </select>
                </div>

                {/* Preview Result */}
                {previewResult && (
                  <div className={`mt-4 p-3 rounded ${
                    previewResult.success ? 'bg-green-50' : 'bg-red-50'
                  }`}>
                    {previewResult.success ? (
                      <>
                        <div className="text-sm space-y-1">
                          <div>Base @ 12": <strong>{previewResult.baseMinDia12In}"</strong></div>
                          <div>Centers Factor: <strong>{previewResult.centersFactor}x</strong></div>
                          <div>Adjusted: <strong>{previewResult.adjustedMinDia?.toFixed(2)}"</strong></div>
                          <div className="text-lg font-bold text-green-800">
                            Result: {previewResult.roundedMinDia}"
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 mt-2">{previewResult.ruleSource}</p>
                        {previewResult.drillSipedCaution && (
                          <p className="text-xs text-amber-700 mt-1">
                            Drill & Siped: reduced durability caution
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-red-700 text-sm">{previewResult.error}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Center Factors */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold mb-4">Center Factors (PVC_HOT_WELDED)</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Centers</th>
                    <th className="text-left py-2">Factor</th>
                    <th className="text-left py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {centerFactors
                    .filter((f) => f.material_family === 'PVC_HOT_WELDED')
                    .map((f) => (
                      <tr key={f.id} className="border-b">
                        <td className="py-2">{f.centers_in}"</td>
                        <td className="py-2">{f.factor}x</td>
                        <td className="py-2">
                          <span className={`text-xs px-2 py-1 rounded ${
                            f.is_active ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {f.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              <p className="text-xs text-gray-500 mt-2">
                Edit center factors via API. Standard values: 12"=1.0, 8"=1.15, 6"=1.25, 4"=1.35
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800">Soft Delete Policy</h3>
              <p className="text-sm text-blue-700 mt-1">
                Cleat entries are never hard-deleted. Use the Deactivate button to hide entries
                from the calculator while preserving them for saved configurations.
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
