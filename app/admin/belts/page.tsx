/**
 * Admin Belt Editor Page
 *
 * Allows admin/engineer users to view, edit, and manage belt catalog entries.
 * Changes are versioned for rollback capability.
 *
 * v1.11: Added material_profile support
 * v1.11 Phase 4: Added cleat_method to material_profile
 */

'use client';

import { useState, useEffect } from 'react';
import { BeltCatalogItem, BeltMaterialProfile } from '../../api/belts/route';
import { clearBeltCatalogCache } from '../../hooks/useBeltCatalog';
import Header from '../../components/Header';

interface MaterialProfileFormData {
  enabled: boolean;
  material_family: string;
  construction: string;
  min_dia_no_vguide_in: string;
  min_dia_with_vguide_in: string;
  notes: string;
  source_ref: string;
  // Phase 3A: Banding support
  supports_banding: boolean;
  banding_min_dia_no_vguide_in: string;
  banding_min_dia_with_vguide_in: string;
  // Phase 4: Cleat method
  cleat_method: 'hot_welded' | 'molded' | 'mechanical' | '';
}

interface BeltFormData {
  catalog_key: string;
  display_name: string;
  manufacturer: string;
  material: string;
  surface: string;
  food_grade: boolean;
  cut_resistant: boolean;
  oil_resistant: boolean;
  abrasion_resistant: boolean;
  antistatic: boolean;
  thickness_in: string;
  piw: string;
  pil: string;
  min_pulley_dia_no_vguide_in: string;
  min_pulley_dia_with_vguide_in: string;
  notes: string;
  tags: string;
  is_active: boolean;
  // Material profile (v1.11)
  material_profile: MaterialProfileFormData;
}

const emptyMaterialProfile: MaterialProfileFormData = {
  enabled: false,
  material_family: '',
  construction: '',
  min_dia_no_vguide_in: '',
  min_dia_with_vguide_in: '',
  notes: '',
  source_ref: '',
  // Phase 3A: Banding support
  supports_banding: false,
  banding_min_dia_no_vguide_in: '',
  banding_min_dia_with_vguide_in: '',
  // Phase 4: Cleat method
  cleat_method: '',
};

const emptyForm: BeltFormData = {
  catalog_key: '',
  display_name: '',
  manufacturer: '',
  material: '',
  surface: '',
  food_grade: false,
  cut_resistant: false,
  oil_resistant: false,
  abrasion_resistant: false,
  antistatic: false,
  thickness_in: '',
  piw: '',
  pil: '',
  min_pulley_dia_no_vguide_in: '',
  min_pulley_dia_with_vguide_in: '',
  notes: '',
  tags: '',
  is_active: true,
  material_profile: { ...emptyMaterialProfile },
};

export default function AdminBeltsPage() {
  const [belts, setBelts] = useState<BeltCatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBelt, setSelectedBelt] = useState<BeltCatalogItem | null>(null);
  const [formData, setFormData] = useState<BeltFormData>(emptyForm);
  const [changeReason, setChangeReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // Load belts on mount
  useEffect(() => {
    loadBelts();
  }, []);

  async function loadBelts() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/belts');
      if (!response.ok) throw new Error('Failed to fetch belts');
      const data = await response.json();
      setBelts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load belts');
    } finally {
      setIsLoading(false);
    }
  }

  function selectBelt(belt: BeltCatalogItem) {
    setSelectedBelt(belt);
    const mp = belt.material_profile;
    setFormData({
      catalog_key: belt.catalog_key,
      display_name: belt.display_name,
      manufacturer: belt.manufacturer || '',
      material: belt.material,
      surface: belt.surface || '',
      food_grade: belt.food_grade,
      cut_resistant: belt.cut_resistant,
      oil_resistant: belt.oil_resistant,
      abrasion_resistant: belt.abrasion_resistant,
      antistatic: belt.antistatic,
      thickness_in: belt.thickness_in?.toString() || '',
      piw: belt.piw.toString(),
      pil: belt.pil.toString(),
      min_pulley_dia_no_vguide_in: belt.min_pulley_dia_no_vguide_in.toString(),
      min_pulley_dia_with_vguide_in: belt.min_pulley_dia_with_vguide_in.toString(),
      notes: belt.notes || '',
      tags: belt.tags?.join(', ') || '',
      is_active: belt.is_active,
      material_profile: mp
        ? {
            enabled: true,
            material_family: mp.material_family || '',
            construction: mp.construction || '',
            min_dia_no_vguide_in: mp.min_dia_no_vguide_in?.toString() || '',
            min_dia_with_vguide_in: mp.min_dia_with_vguide_in?.toString() || '',
            notes: mp.notes || '',
            source_ref: mp.source_ref || '',
            // Phase 3A: Banding support
            supports_banding: mp.supports_banding || false,
            banding_min_dia_no_vguide_in: mp.banding_min_dia_no_vguide_in?.toString() || '',
            banding_min_dia_with_vguide_in: mp.banding_min_dia_with_vguide_in?.toString() || '',
            // Phase 4: Cleat method
            cleat_method: mp.cleat_method || '',
          }
        : { ...emptyMaterialProfile },
    });
    setChangeReason('');
    setSaveMessage(null);
  }

  function createNewBelt() {
    setSelectedBelt(null);
    setFormData(emptyForm);
    setChangeReason('');
    setSaveMessage(null);
  }

  function updateField(field: keyof BeltFormData, value: string | boolean) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function updateMaterialProfileField(field: keyof MaterialProfileFormData, value: string | boolean) {
    setFormData((prev) => ({
      ...prev,
      material_profile: { ...prev.material_profile, [field]: value },
    }));
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
      // Build material_profile if enabled
      const mp = formData.material_profile;
      let materialProfile: BeltMaterialProfile | null = null;
      if (mp.enabled && mp.material_family.trim()) {
        materialProfile = {
          material_family: mp.material_family.trim(),
          construction: mp.construction.trim() || undefined,
          min_dia_no_vguide_in: mp.min_dia_no_vguide_in
            ? parseFloat(mp.min_dia_no_vguide_in)
            : undefined,
          min_dia_with_vguide_in: mp.min_dia_with_vguide_in
            ? parseFloat(mp.min_dia_with_vguide_in)
            : undefined,
          notes: mp.notes.trim() || undefined,
          source_ref: mp.source_ref.trim() || undefined,
          // Phase 3A: Banding support
          supports_banding: mp.supports_banding || undefined,
          banding_min_dia_no_vguide_in: mp.supports_banding && mp.banding_min_dia_no_vguide_in
            ? parseFloat(mp.banding_min_dia_no_vguide_in)
            : undefined,
          banding_min_dia_with_vguide_in: mp.supports_banding && mp.banding_min_dia_with_vguide_in
            ? parseFloat(mp.banding_min_dia_with_vguide_in)
            : undefined,
          // Phase 4: Cleat method
          cleat_method: mp.cleat_method || undefined,
        };
      }

      const belt = {
        catalog_key: formData.catalog_key,
        display_name: formData.display_name,
        manufacturer: formData.manufacturer || null,
        material: formData.material,
        surface: formData.surface || null,
        food_grade: formData.food_grade,
        cut_resistant: formData.cut_resistant,
        oil_resistant: formData.oil_resistant,
        abrasion_resistant: formData.abrasion_resistant,
        antistatic: formData.antistatic,
        thickness_in: formData.thickness_in ? parseFloat(formData.thickness_in) : null,
        piw: parseFloat(formData.piw),
        pil: parseFloat(formData.pil),
        min_pulley_dia_no_vguide_in: parseFloat(formData.min_pulley_dia_no_vguide_in),
        min_pulley_dia_with_vguide_in: parseFloat(formData.min_pulley_dia_with_vguide_in),
        notes: formData.notes || null,
        tags: formData.tags
          ? formData.tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
          : null,
        is_active: formData.is_active,
        material_profile: materialProfile,
        material_profile_version: materialProfile ? 1 : undefined,
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

      // Clear cache and reload
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

  return (
    <>
      <Header loadedConfigurationId={null} />
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
                  }`}
                >
                  <div className="font-medium">{belt.display_name}</div>
                  <div className="text-xs text-gray-500">
                    {belt.material} | PIW: {belt.piw}
                    {belt.material_profile && (
                      <span className="ml-1 text-blue-600">
                        | Profile: {belt.material_profile.material_family}
                        {belt.material_profile.min_dia_no_vguide_in !== undefined &&
                          ` (${belt.material_profile.min_dia_no_vguide_in}″)`}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">
              {selectedBelt ? `Edit: ${selectedBelt.display_name}` : 'New Belt'}
            </h2>

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

              <div className="grid grid-cols-3 gap-4">
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
                  <label className="flex items-center mt-6">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => updateField('is_active', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm">Active</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Pulley Dia (no V-guide) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.min_pulley_dia_no_vguide_in}
                    onChange={(e) => updateField('min_pulley_dia_no_vguide_in', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Pulley Dia (V-guided) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.min_pulley_dia_with_vguide_in}
                    onChange={(e) => updateField('min_pulley_dia_with_vguide_in', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    required
                  />
                </div>
              </div>

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

              {/* Material Profile Section (v1.11) */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Material Profile
                    <span className="ml-2 text-xs text-gray-500 font-normal">
                      (v1.11 - overrides legacy min pulley values when set)
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.material_profile.enabled}
                      onChange={(e) => updateMaterialProfileField('enabled', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm">Enable</span>
                  </label>
                </div>

                {formData.material_profile.enabled && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Material Family *
                        </label>
                        <input
                          type="text"
                          value={formData.material_profile.material_family}
                          onChange={(e) => updateMaterialProfileField('material_family', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                          placeholder="e.g., PVC, PU, Rubber"
                          required={formData.material_profile.enabled}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Construction
                        </label>
                        <input
                          type="text"
                          value={formData.material_profile.construction}
                          onChange={(e) => updateMaterialProfileField('construction', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                          placeholder="e.g., 2-ply, fabric reinforced"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Min Dia (no V-guide) [in]
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={formData.material_profile.min_dia_no_vguide_in}
                          onChange={(e) => updateMaterialProfileField('min_dia_no_vguide_in', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                          placeholder="Override legacy value"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Min Dia (V-guided) [in]
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={formData.material_profile.min_dia_with_vguide_in}
                          onChange={(e) => updateMaterialProfileField('min_dia_with_vguide_in', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                          placeholder="Override legacy value"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Source Reference
                        </label>
                        <input
                          type="text"
                          value={formData.material_profile.source_ref}
                          onChange={(e) => updateMaterialProfileField('source_ref', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                          placeholder="e.g., Belting Specs Aug 2022"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Profile Notes
                        </label>
                        <input
                          type="text"
                          value={formData.material_profile.notes}
                          onChange={(e) => updateMaterialProfileField('notes', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                          placeholder="Additional material notes"
                        />
                      </div>
                    </div>

                    {/* Phase 3A: Head Tension Banding Section */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-xs font-medium text-gray-600">
                          Head Tension Banding
                          <span className="ml-1 text-gray-400 font-normal">
                            (higher min pulley requirements)
                          </span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.material_profile.supports_banding}
                            onChange={(e) => updateMaterialProfileField('supports_banding', e.target.checked)}
                            className="mr-2"
                          />
                          <span className="text-xs">Supports Banding</span>
                        </label>
                      </div>

                      {formData.material_profile.supports_banding && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Banding Min Dia (no V-guide) [in]
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              value={formData.material_profile.banding_min_dia_no_vguide_in}
                              onChange={(e) => updateMaterialProfileField('banding_min_dia_no_vguide_in', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                              placeholder="e.g., 4.0"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Banding Min Dia (V-guided) [in]
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              value={formData.material_profile.banding_min_dia_with_vguide_in}
                              onChange={(e) => updateMaterialProfileField('banding_min_dia_with_vguide_in', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                              placeholder="e.g., 5.0"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Phase 4: Cleat Method */}
                    <div className="border-t border-gray-200 pt-3 mt-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Cleat Attachment Method
                      </label>
                      <select
                        value={formData.material_profile.cleat_method}
                        onChange={(e) => updateMaterialProfileField('cleat_method', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                      >
                        <option value="">Not specified</option>
                        <option value="hot_welded">Hot Welded (PVC - requires min pulley multiplier)</option>
                        <option value="molded">Molded (no multiplier)</option>
                        <option value="mechanical">Mechanical (no multiplier)</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Hot-welded PVC cleats require larger minimum pulley diameters based on cleat spacing.
                      </p>
                    </div>
                  </div>
                )}
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

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {isSaving ? 'Saving...' : 'Save Belt'}
                </button>
              </div>
            </form>
          </div>
        </div>
        </div>
      </main>
    </>
  );
}
