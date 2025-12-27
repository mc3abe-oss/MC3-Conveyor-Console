/**
 * Admin Pulley Editor Page (v1.15)
 *
 * Allows admin/engineer users to view, edit, and manage pulley catalog entries.
 * Changes are versioned for rollback capability.
 *
 * CRITICAL: Internal bearing pulleys are TAIL ONLY.
 * When shaft_arrangement = INTERNAL_BEARINGS:
 * - allow_tail is forced TRUE and disabled
 * - all other station flags are forced FALSE and disabled
 */

'use client';

import { useState, useEffect } from 'react';
import {
  PulleyCatalogItem,
  ShaftArrangement,
  HubConnection,
  PulleyConstruction,
  SHAFT_ARRANGEMENT_LABELS,
  HUB_CONNECTION_LABELS,
  PULLEY_CONSTRUCTION_LABELS,
  validatePulleyCatalogItem,
} from '../../../src/lib/pulley-catalog';
import { clearPulleyCatalogCache } from '../../hooks/usePulleyCatalog';
import Header from '../../components/Header';

interface PulleyFormData {
  catalog_key: string;
  display_name: string;
  manufacturer: string;
  part_number: string;
  diameter_in: string;
  face_width_max_in: string;
  face_width_min_in: string;
  crown_height_in: string;
  construction: PulleyConstruction;
  shell_material: string;
  is_lagged: boolean;
  lagging_type: string;
  lagging_thickness_in: string;
  shaft_arrangement: ShaftArrangement;
  hub_connection: HubConnection;
  allow_head_drive: boolean;
  allow_tail: boolean;
  allow_snub: boolean;
  allow_bend: boolean;
  allow_takeup: boolean;
  dirty_side_ok: boolean;
  max_shaft_rpm: string;
  max_belt_speed_fpm: string;
  max_tension_pli: string;
  is_preferred: boolean;
  is_active: boolean;
  notes: string;
  tags: string;
}

const emptyForm: PulleyFormData = {
  catalog_key: '',
  display_name: '',
  manufacturer: '',
  part_number: '',
  diameter_in: '',
  face_width_max_in: '',
  face_width_min_in: '',
  crown_height_in: '0',
  construction: 'DRUM',
  shell_material: 'steel',
  is_lagged: false,
  lagging_type: '',
  lagging_thickness_in: '',
  shaft_arrangement: 'THROUGH_SHAFT_EXTERNAL_BEARINGS',
  hub_connection: 'KEYED',
  allow_head_drive: true,
  allow_tail: true,
  allow_snub: false,
  allow_bend: false,
  allow_takeup: false,
  dirty_side_ok: true,
  max_shaft_rpm: '',
  max_belt_speed_fpm: '800',
  max_tension_pli: '',
  is_preferred: false,
  is_active: true,
  notes: '',
  tags: '',
};

export default function AdminPulleysPage() {
  const [pulleys, setPulleys] = useState<PulleyCatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPulley, setSelectedPulley] = useState<PulleyCatalogItem | null>(null);
  const [formData, setFormData] = useState<PulleyFormData>(emptyForm);
  const [changeReason, setChangeReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // INTERNAL_BEARINGS = tail only
  const isInternalBearings = formData.shaft_arrangement === 'INTERNAL_BEARINGS';

  // Load pulleys on mount
  useEffect(() => {
    loadPulleys();
  }, []);

  // When shaft_arrangement changes to INTERNAL_BEARINGS, enforce tail-only
  useEffect(() => {
    if (isInternalBearings) {
      setFormData((prev) => ({
        ...prev,
        allow_head_drive: false,
        allow_tail: true,
        allow_snub: false,
        allow_bend: false,
        allow_takeup: false,
      }));
    }
  }, [isInternalBearings]);

  async function loadPulleys() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/pulleys');
      if (!response.ok) throw new Error('Failed to fetch pulleys');
      const data = await response.json();
      setPulleys(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pulleys');
    } finally {
      setIsLoading(false);
    }
  }

  function selectPulley(pulley: PulleyCatalogItem) {
    setSelectedPulley(pulley);
    setFormData({
      catalog_key: pulley.catalog_key,
      display_name: pulley.display_name,
      manufacturer: pulley.manufacturer || '',
      part_number: pulley.part_number || '',
      diameter_in: pulley.diameter_in.toString(),
      face_width_max_in: pulley.face_width_max_in.toString(),
      face_width_min_in: pulley.face_width_min_in?.toString() || '',
      crown_height_in: pulley.crown_height_in.toString(),
      construction: pulley.construction,
      shell_material: pulley.shell_material,
      is_lagged: pulley.is_lagged,
      lagging_type: pulley.lagging_type || '',
      lagging_thickness_in: pulley.lagging_thickness_in?.toString() || '',
      shaft_arrangement: pulley.shaft_arrangement,
      hub_connection: pulley.hub_connection,
      allow_head_drive: pulley.allow_head_drive,
      allow_tail: pulley.allow_tail,
      allow_snub: pulley.allow_snub,
      allow_bend: pulley.allow_bend,
      allow_takeup: pulley.allow_takeup,
      dirty_side_ok: pulley.dirty_side_ok,
      max_shaft_rpm: pulley.max_shaft_rpm?.toString() || '',
      max_belt_speed_fpm: pulley.max_belt_speed_fpm?.toString() || '',
      max_tension_pli: pulley.max_tension_pli?.toString() || '',
      is_preferred: pulley.is_preferred,
      is_active: pulley.is_active,
      notes: pulley.notes || '',
      tags: pulley.tags?.join(', ') || '',
    });
    setChangeReason('');
    setSaveMessage(null);
  }

  function createNewPulley() {
    setSelectedPulley(null);
    setFormData(emptyForm);
    setChangeReason('');
    setSaveMessage(null);
  }

  function updateField(field: keyof PulleyFormData, value: string | boolean) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (!changeReason.trim()) {
      setSaveMessage({ type: 'error', text: 'Please provide a change reason' });
      return;
    }

    // Build pulley object
    const pulley = {
      catalog_key: formData.catalog_key,
      display_name: formData.display_name,
      manufacturer: formData.manufacturer || null,
      part_number: formData.part_number || null,
      diameter_in: parseFloat(formData.diameter_in),
      face_width_max_in: parseFloat(formData.face_width_max_in),
      face_width_min_in: formData.face_width_min_in ? parseFloat(formData.face_width_min_in) : null,
      crown_height_in: parseFloat(formData.crown_height_in) || 0,
      construction: formData.construction,
      shell_material: formData.shell_material,
      is_lagged: formData.is_lagged,
      lagging_type: formData.is_lagged ? formData.lagging_type || null : null,
      lagging_thickness_in: formData.is_lagged && formData.lagging_thickness_in
        ? parseFloat(formData.lagging_thickness_in)
        : null,
      shaft_arrangement: formData.shaft_arrangement,
      hub_connection: formData.hub_connection,
      allow_head_drive: isInternalBearings ? false : formData.allow_head_drive,
      allow_tail: isInternalBearings ? true : formData.allow_tail,
      allow_snub: isInternalBearings ? false : formData.allow_snub,
      allow_bend: isInternalBearings ? false : formData.allow_bend,
      allow_takeup: isInternalBearings ? false : formData.allow_takeup,
      dirty_side_ok: formData.dirty_side_ok,
      max_shaft_rpm: formData.max_shaft_rpm ? parseFloat(formData.max_shaft_rpm) : null,
      max_belt_speed_fpm: formData.max_belt_speed_fpm ? parseFloat(formData.max_belt_speed_fpm) : null,
      max_tension_pli: formData.max_tension_pli ? parseFloat(formData.max_tension_pli) : null,
      is_preferred: formData.is_preferred,
      is_active: formData.is_active,
      notes: formData.notes || null,
      tags: formData.tags
        ? formData.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : null,
    };

    // Validate locally before sending
    const validation = validatePulleyCatalogItem(pulley);
    if (!validation.isValid) {
      setSaveMessage({ type: 'error', text: validation.errors.join('; ') });
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const response = await fetch('/api/pulleys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pulley, change_reason: changeReason }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || err.details || 'Failed to save pulley');
      }

      // Clear cache and reload
      clearPulleyCatalogCache();
      await loadPulleys();

      setSaveMessage({ type: 'success', text: 'Pulley saved successfully!' });
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
        <h1 className="text-2xl font-bold mb-4">Pulley Catalog Admin</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Pulley Catalog Admin</h1>
        <p className="text-red-600">{error}</p>
        <button onClick={loadPulleys} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <Header loadedConfigurationId={null} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-6">Pulley Catalog Admin</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pulley List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Pulleys</h2>
                <button
                  onClick={createNewPulley}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                >
                  + New
                </button>
              </div>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {pulleys.map((pulley) => (
                  <button
                    key={pulley.id}
                    onClick={() => selectPulley(pulley)}
                    className={`w-full text-left p-3 rounded border ${
                      selectedPulley?.id === pulley.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{pulley.display_name}</span>
                      {pulley.is_preferred && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-1 rounded">Preferred</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {pulley.diameter_in}&quot; {pulley.construction}
                      {pulley.is_lagged && ' | Lagged'}
                      {pulley.shaft_arrangement === 'INTERNAL_BEARINGS' && (
                        <span className="ml-1 text-orange-600 font-medium">| TAIL ONLY</span>
                      )}
                    </div>
                  </button>
                ))}
                {pulleys.length === 0 && (
                  <p className="text-gray-500 text-sm">No pulleys found. Create one to get started.</p>
                )}
              </div>
            </div>
          </div>

          {/* Edit Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">
                {selectedPulley ? `Edit: ${selectedPulley.display_name}` : 'New Pulley'}
              </h2>

              <form onSubmit={handleSave} className="space-y-4">
                {/* Identification */}
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
                      disabled={!!selectedPulley}
                      placeholder="e.g., STD_DRUM_4_STEEL"
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

                <div className="grid grid-cols-2 gap-4">
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Part Number</label>
                    <input
                      type="text"
                      value={formData.part_number}
                      onChange={(e) => updateField('part_number', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                    />
                  </div>
                </div>

                {/* Physical Specs */}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Physical Specifications</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Diameter (in) *
                      </label>
                      <input
                        type="number"
                        step="0.25"
                        value={formData.diameter_in}
                        onChange={(e) => updateField('diameter_in', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Face Width Max (in) *
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={formData.face_width_max_in}
                        onChange={(e) => updateField('face_width_max_in', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Face Width Min (in)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={formData.face_width_min_in}
                        onChange={(e) => updateField('face_width_min_in', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Crown Height (in)
                      </label>
                      <input
                        type="number"
                        step="0.0625"
                        value={formData.crown_height_in}
                        onChange={(e) => updateField('crown_height_in', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                      />
                    </div>
                  </div>
                </div>

                {/* Construction */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Construction *</label>
                    <select
                      value={formData.construction}
                      onChange={(e) => updateField('construction', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                    >
                      {(Object.keys(PULLEY_CONSTRUCTION_LABELS) as PulleyConstruction[]).map((c) => (
                        <option key={c} value={c}>
                          {PULLEY_CONSTRUCTION_LABELS[c]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Shell Material</label>
                    <input
                      type="text"
                      value={formData.shell_material}
                      onChange={(e) => updateField('shell_material', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      placeholder="steel, stainless, aluminum"
                    />
                  </div>
                </div>

                {/* Lagging */}
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <label className="flex items-center mb-3">
                    <input
                      type="checkbox"
                      checked={formData.is_lagged}
                      onChange={(e) => updateField('is_lagged', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium">Lagged Pulley</span>
                  </label>
                  {formData.is_lagged && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Lagging Type
                        </label>
                        <input
                          type="text"
                          value={formData.lagging_type}
                          onChange={(e) => updateField('lagging_type', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                          placeholder="rubber, ceramic, diamond"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Lagging Thickness (in) *
                        </label>
                        <input
                          type="number"
                          step="0.0625"
                          value={formData.lagging_thickness_in}
                          onChange={(e) => updateField('lagging_thickness_in', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                          required={formData.is_lagged}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Shaft Interface */}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Shaft Interface</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Shaft Arrangement *
                      </label>
                      <select
                        value={formData.shaft_arrangement}
                        onChange={(e) => updateField('shaft_arrangement', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                      >
                        {(Object.keys(SHAFT_ARRANGEMENT_LABELS) as ShaftArrangement[]).map((s) => (
                          <option key={s} value={s}>
                            {SHAFT_ARRANGEMENT_LABELS[s]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Hub Connection *
                      </label>
                      <select
                        value={formData.hub_connection}
                        onChange={(e) => updateField('hub_connection', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                      >
                        {(Object.keys(HUB_CONNECTION_LABELS) as HubConnection[]).map((h) => (
                          <option key={h} value={h}>
                            {HUB_CONNECTION_LABELS[h]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Station Compatibility */}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Station Compatibility</h3>
                  {isInternalBearings && (
                    <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded text-sm text-orange-800">
                      <strong>Internal Bearings:</strong> This pulley type can ONLY be used at the tail position.
                      Station flags are locked.
                    </div>
                  )}
                  <div className="flex flex-wrap gap-4">
                    {(
                      [
                        ['allow_head_drive', 'Head/Drive'],
                        ['allow_tail', 'Tail'],
                        ['allow_snub', 'Snub'],
                        ['allow_bend', 'Bend'],
                        ['allow_takeup', 'Take-Up'],
                        ['dirty_side_ok', 'Dirty Side OK'],
                      ] as const
                    ).map(([key, label]) => {
                      // Determine if this field should be disabled
                      const isStationField = key !== 'dirty_side_ok';
                      const isDisabled = isInternalBearings && isStationField;
                      const forcedValue = isInternalBearings && isStationField
                        ? key === 'allow_tail'
                        : undefined;

                      return (
                        <label
                          key={key}
                          className={`flex items-center ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={forcedValue !== undefined ? forcedValue : formData[key]}
                            onChange={(e) => !isDisabled && updateField(key, e.target.checked)}
                            className="mr-2"
                            disabled={isDisabled}
                          />
                          <span className="text-sm">{label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Operating Limits */}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Operating Limits</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Shaft RPM
                      </label>
                      <input
                        type="number"
                        value={formData.max_shaft_rpm}
                        onChange={(e) => updateField('max_shaft_rpm', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Belt Speed (fpm)
                      </label>
                      <input
                        type="number"
                        value={formData.max_belt_speed_fpm}
                        onChange={(e) => updateField('max_belt_speed_fpm', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                        placeholder="e.g., 800 (B105.1)"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Tension (pli)
                      </label>
                      <input
                        type="number"
                        value={formData.max_tension_pli}
                        onChange={(e) => updateField('max_tension_pli', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                      />
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="border-t pt-4">
                  <div className="flex flex-wrap gap-6">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.is_preferred}
                        onChange={(e) => updateField('is_preferred', e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium">Preferred</span>
                      <span className="ml-1 text-xs text-gray-500">(shown first in selection)</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => updateField('is_active', e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium">Active</span>
                    </label>
                  </div>
                </div>

                {/* Tags & Notes */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tags (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={formData.tags}
                      onChange={(e) => updateField('tags', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      placeholder="standard, drum, 4-inch"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <input
                      type="text"
                      value={formData.notes}
                      onChange={(e) => updateField('notes', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                    />
                  </div>
                </div>

                {/* Change Reason & Save */}
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
                    {isSaving ? 'Saving...' : 'Save Pulley'}
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
