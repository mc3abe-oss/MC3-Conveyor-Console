/**
 * Admin Pulley Library Page
 *
 * Manages pulley_library_styles table - the admin engineering truth for pulley styles.
 *
 * Features:
 * - View all pulley styles with eligibility flags
 * - Add new styles (key becomes immutable after save)
 * - Edit existing styles
 * - Soft delete (deactivate) styles
 */

'use client';

import { useState, useEffect } from 'react';
import Header from '../../components/Header';

type PulleyStyleType = 'DRUM' | 'WING' | 'SPIRAL_WING';

interface PulleyStyle {
  key: string;
  name: string;
  description: string | null;
  style_type: PulleyStyleType;
  material_class: string;
  eligible_drive: boolean;
  eligible_tail: boolean;
  eligible_dirty_side: boolean;
  eligible_crown: boolean;
  eligible_v_guided: boolean;
  eligible_lagging: boolean;
  face_width_rule: string;
  face_width_allowance_in: number | null;
  tube_stress_limit_flat_psi: number | null;
  tube_stress_limit_vgroove_psi: number | null;
  notes: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface FormData {
  key: string;
  name: string;
  description: string;
  style_type: PulleyStyleType;
  material_class: string;
  eligible_drive: boolean;
  eligible_tail: boolean;
  eligible_dirty_side: boolean;
  eligible_crown: boolean;
  eligible_v_guided: boolean;
  eligible_lagging: boolean;
  face_width_rule: string;
  face_width_allowance_in: string;
  tube_stress_limit_flat_psi: string;
  tube_stress_limit_vgroove_psi: string;
  notes: string;
  is_active: boolean;
  sort_order: string;
}

const emptyForm: FormData = {
  key: '',
  name: '',
  description: '',
  style_type: 'DRUM',
  material_class: 'STEEL',
  eligible_drive: true,
  eligible_tail: true,
  eligible_dirty_side: false,
  eligible_crown: true,
  eligible_v_guided: false,
  eligible_lagging: true,
  face_width_rule: 'BELT_PLUS_ALLOWANCE',
  face_width_allowance_in: '2.0',
  tube_stress_limit_flat_psi: '10000',
  tube_stress_limit_vgroove_psi: '3400',
  notes: '',
  is_active: true,
  sort_order: '0',
};

const STYLE_TYPE_LABELS: Record<PulleyStyleType, string> = {
  DRUM: 'Drum',
  WING: 'Wing',
  SPIRAL_WING: 'Spiral Wing',
};

export default function AdminPulleyLibraryPage() {
  const [styles, setStyles] = useState<PulleyStyle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<PulleyStyle | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  // Load styles on mount
  useEffect(() => {
    loadStyles();
  }, [showInactive]);

  async function loadStyles() {
    setIsLoading(true);
    setError(null);
    try {
      const url = showInactive
        ? '/api/admin/pulley-library?active_only=false'
        : '/api/admin/pulley-library';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch pulley styles');
      const data = await response.json();
      setStyles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pulley styles');
    } finally {
      setIsLoading(false);
    }
  }

  function selectStyle(style: PulleyStyle) {
    setSelectedStyle(style);
    setIsCreating(false);
    setFormData({
      key: style.key,
      name: style.name,
      description: style.description || '',
      style_type: style.style_type,
      material_class: style.material_class,
      eligible_drive: style.eligible_drive,
      eligible_tail: style.eligible_tail,
      eligible_dirty_side: style.eligible_dirty_side,
      eligible_crown: style.eligible_crown,
      eligible_v_guided: style.eligible_v_guided,
      eligible_lagging: style.eligible_lagging,
      face_width_rule: style.face_width_rule,
      face_width_allowance_in: style.face_width_allowance_in?.toString() || '2.0',
      tube_stress_limit_flat_psi: style.tube_stress_limit_flat_psi?.toString() || '10000',
      tube_stress_limit_vgroove_psi: style.tube_stress_limit_vgroove_psi?.toString() || '3400',
      notes: style.notes || '',
      is_active: style.is_active,
      sort_order: style.sort_order?.toString() || '0',
    });
    setSaveMessage(null);
  }

  function createNewStyle() {
    setSelectedStyle(null);
    setIsCreating(true);
    setFormData(emptyForm);
    setSaveMessage(null);
  }

  function updateField<K extends keyof FormData>(field: K, value: FormData[K]) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    // Validate required fields
    if (!formData.key.trim()) {
      setSaveMessage({ type: 'error', text: 'Key is required' });
      return;
    }
    if (!formData.name.trim()) {
      setSaveMessage({ type: 'error', text: 'Name is required' });
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const payload = {
        key: formData.key.trim().toUpperCase().replace(/\s+/g, '_'),
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        style_type: formData.style_type,
        material_class: formData.material_class,
        eligible_drive: formData.eligible_drive,
        eligible_tail: formData.eligible_tail,
        eligible_dirty_side: formData.eligible_dirty_side,
        eligible_crown: formData.eligible_crown,
        eligible_v_guided: formData.eligible_v_guided,
        eligible_lagging: formData.eligible_lagging,
        face_width_rule: formData.face_width_rule,
        face_width_allowance_in: parseFloat(formData.face_width_allowance_in) || 2.0,
        tube_stress_limit_flat_psi: parseFloat(formData.tube_stress_limit_flat_psi) || 10000,
        tube_stress_limit_vgroove_psi: parseFloat(formData.tube_stress_limit_vgroove_psi) || 3400,
        notes: formData.notes.trim() || null,
        is_active: formData.is_active,
        sort_order: parseInt(formData.sort_order) || 0,
      };

      const method = isCreating ? 'POST' : 'PUT';
      const response = await fetch('/api/admin/pulley-library', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save');
      }

      const savedStyle = await response.json();
      setSaveMessage({ type: 'success', text: isCreating ? 'Style created!' : 'Style updated!' });

      // Refresh list and select the saved item
      await loadStyles();
      setSelectedStyle(savedStyle);
      setIsCreating(false);
    } catch (err) {
      setSaveMessage({ type: 'error', text: err instanceof Error ? err.message : 'Save failed' });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeactivate() {
    if (!selectedStyle) return;

    if (!confirm(`Deactivate style "${selectedStyle.name}"? It will no longer appear in selections.`)) {
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/pulley-library?key=${encodeURIComponent(selectedStyle.key)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to deactivate');
      }

      setSaveMessage({ type: 'success', text: 'Style deactivated' });
      await loadStyles();
      setSelectedStyle(null);
      setFormData(emptyForm);
    } catch (err) {
      setSaveMessage({ type: 'error', text: err instanceof Error ? err.message : 'Deactivation failed' });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <Header loadedConfigurationId={null} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pulley Library</h1>
            <p className="text-gray-600">Manage pulley styles (engineering truth)</p>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-gray-300"
              />
              Show inactive
            </label>
            <button
              onClick={createNewStyle}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              + New Style
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: Style list */}
          <div className="lg:col-span-1 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Styles ({styles.length})</h2>
            </div>
            <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-gray-500">Loading...</div>
              ) : styles.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No styles found</div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {styles.map((style) => (
                    <li key={style.key}>
                      <button
                        onClick={() => selectStyle(style)}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                          selectedStyle?.key === style.key ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                        } ${!style.is_active ? 'opacity-50' : ''}`}
                      >
                        <div className="font-medium text-gray-900">{style.name}</div>
                        <div className="text-sm text-gray-500">
                          {STYLE_TYPE_LABELS[style.style_type]} | {style.key}
                          {!style.is_active && <span className="ml-2 text-red-600">(inactive)</span>}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {[
                            style.eligible_drive && 'Drive',
                            style.eligible_tail && 'Tail',
                            style.eligible_crown && 'Crown',
                            style.eligible_v_guided && 'V-Guide',
                            style.eligible_dirty_side && 'Dirty',
                          ]
                            .filter(Boolean)
                            .join(' | ')}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Right column: Edit form */}
          <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 shadow-sm">
            {!selectedStyle && !isCreating ? (
              <div className="p-8 text-center text-gray-500">
                Select a style to edit or click "New Style" to create one.
              </div>
            ) : (
              <form onSubmit={handleSave} className="p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {isCreating ? 'New Style' : `Edit: ${selectedStyle?.name}`}
                  </h2>
                  {!isCreating && selectedStyle?.is_active && (
                    <button
                      type="button"
                      onClick={handleDeactivate}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Deactivate
                    </button>
                  )}
                </div>

                {saveMessage && (
                  <div
                    className={`p-3 rounded-md ${
                      saveMessage.type === 'success'
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}
                  >
                    {saveMessage.text}
                  </div>
                )}

                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Key <span className="text-red-500">*</span>
                      {!isCreating && <span className="text-gray-400 ml-1">(immutable)</span>}
                    </label>
                    <input
                      type="text"
                      value={formData.key}
                      onChange={(e) => updateField('key', e.target.value)}
                      disabled={!isCreating}
                      placeholder="e.g., DRUM_STEEL_CROWNED"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      placeholder="e.g., Crowned Steel Drum"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Style Type</label>
                    <select
                      value={formData.style_type}
                      onChange={(e) => updateField('style_type', e.target.value as PulleyStyleType)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      {Object.entries(STYLE_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Material Class</label>
                    <input
                      type="text"
                      value={formData.material_class}
                      onChange={(e) => updateField('material_class', e.target.value)}
                      placeholder="STEEL"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Eligibility Flags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Eligibility Flags</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      { field: 'eligible_drive', label: 'Drive Position' },
                      { field: 'eligible_tail', label: 'Tail Position' },
                      { field: 'eligible_dirty_side', label: 'Dirty Side OK' },
                      { field: 'eligible_crown', label: 'Can Crown' },
                      { field: 'eligible_v_guided', label: 'V-Guide Compatible' },
                      { field: 'eligible_lagging', label: 'Can Lag' },
                    ].map(({ field, label }) => (
                      <label key={field} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData[field as keyof FormData] as boolean}
                          onChange={(e) => updateField(field as keyof FormData, e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Stress Limits */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tube Stress Limit (Flat/Crowned) psi
                    </label>
                    <input
                      type="number"
                      value={formData.tube_stress_limit_flat_psi}
                      onChange={(e) => updateField('tube_stress_limit_flat_psi', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tube Stress Limit (V-Groove) psi
                    </label>
                    <input
                      type="number"
                      value={formData.tube_stress_limit_vgroove_psi}
                      onChange={(e) => updateField('tube_stress_limit_vgroove_psi', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Face Width Allowance (in)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={formData.face_width_allowance_in}
                      onChange={(e) => updateField('face_width_allowance_in', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Notes & Sort */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => updateField('notes', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                      <input
                        type="number"
                        value={formData.sort_order}
                        onChange={(e) => updateField('sort_order', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => updateField('is_active', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Active</span>
                    </label>
                  </div>
                </div>

                {/* Submit */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStyle(null);
                      setIsCreating(false);
                      setFormData(emptyForm);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : isCreating ? 'Create Style' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
