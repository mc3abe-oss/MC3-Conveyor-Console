/**
 * Admin Pulley Families Page
 *
 * Allows admin/engineer users to view, edit, and manage pulley families.
 * Families define shell/construction specs (shell_od_in, face_width_in, v_groove specs).
 */

'use client';

import { useState, useEffect } from 'react';
import {
  PulleyFamily,
  validatePulleyFamily,
} from '../../../src/lib/pulley-families';
import { clearPulleyFamiliesCache } from '../../hooks/usePulleyFamilies';
import Header from '../../components/Header';

interface FamilyFormData {
  pulley_family_key: string;
  manufacturer: string;
  style: string;
  material: string;
  shell_od_in: string;
  face_width_in: string;
  shell_wall_in: string;
  is_crowned: boolean;
  crown_type: string;
  v_groove_section: string;
  v_groove_top_width_in: string;
  v_groove_bottom_width_in: string;
  v_groove_depth_in: string;
  source: string;
  notes: string;
  is_active: boolean;
}

const emptyForm: FamilyFormData = {
  pulley_family_key: '',
  manufacturer: '',
  style: 'Flat Face',
  material: 'Mild steel',
  shell_od_in: '',
  face_width_in: '',
  shell_wall_in: '',
  is_crowned: false,
  crown_type: '',
  v_groove_section: '',
  v_groove_top_width_in: '',
  v_groove_bottom_width_in: '',
  v_groove_depth_in: '',
  source: '',
  notes: '',
  is_active: true,
};

export default function AdminPulleyFamiliesPage() {
  const [families, setFamilies] = useState<PulleyFamily[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFamily, setSelectedFamily] = useState<PulleyFamily | null>(null);
  const [formData, setFormData] = useState<FamilyFormData>(emptyForm);
  const [changeReason, setChangeReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadFamilies();
  }, []);

  async function loadFamilies() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/pulley-families?includeInactive=true');
      if (!response.ok) throw new Error('Failed to fetch families');
      const data = await response.json();
      setFamilies(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load families');
    } finally {
      setIsLoading(false);
    }
  }

  function selectFamily(family: PulleyFamily) {
    setSelectedFamily(family);
    setFormData({
      pulley_family_key: family.pulley_family_key,
      manufacturer: family.manufacturer,
      style: family.style,
      material: family.material,
      shell_od_in: family.shell_od_in.toString(),
      face_width_in: family.face_width_in.toString(),
      shell_wall_in: family.shell_wall_in?.toString() || '',
      is_crowned: family.is_crowned,
      crown_type: family.crown_type || '',
      v_groove_section: family.v_groove_section || '',
      v_groove_top_width_in: family.v_groove_top_width_in?.toString() || '',
      v_groove_bottom_width_in: family.v_groove_bottom_width_in?.toString() || '',
      v_groove_depth_in: family.v_groove_depth_in?.toString() || '',
      source: family.source || '',
      notes: family.notes || '',
      is_active: family.is_active,
    });
    setChangeReason('');
    setSaveMessage(null);
  }

  function createNewFamily() {
    setSelectedFamily(null);
    setFormData(emptyForm);
    setChangeReason('');
    setSaveMessage(null);
  }

  function updateField(field: keyof FamilyFormData, value: string | boolean) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    // Build family object
    const family = {
      pulley_family_key: formData.pulley_family_key,
      manufacturer: formData.manufacturer,
      style: formData.style,
      material: formData.material,
      shell_od_in: parseFloat(formData.shell_od_in),
      face_width_in: parseFloat(formData.face_width_in),
      shell_wall_in: formData.shell_wall_in ? parseFloat(formData.shell_wall_in) : null,
      is_crowned: formData.is_crowned,
      crown_type: formData.crown_type || null,
      v_groove_section: formData.v_groove_section || null,
      v_groove_top_width_in: formData.v_groove_top_width_in ? parseFloat(formData.v_groove_top_width_in) : null,
      v_groove_bottom_width_in: formData.v_groove_bottom_width_in ? parseFloat(formData.v_groove_bottom_width_in) : null,
      v_groove_depth_in: formData.v_groove_depth_in ? parseFloat(formData.v_groove_depth_in) : null,
      source: formData.source || null,
      notes: formData.notes || null,
      is_active: formData.is_active,
    };

    // Validate locally before sending
    const validation = validatePulleyFamily(family);
    if (!validation.isValid) {
      setSaveMessage({ type: 'error', text: validation.errors.join('; ') });
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const response = await fetch('/api/pulley-families', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ family, change_reason: changeReason }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || err.details || 'Failed to save family');
      }

      clearPulleyFamiliesCache();
      await loadFamilies();

      setSaveMessage({ type: 'success', text: 'Pulley family saved successfully!' });
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
        <h1 className="text-2xl font-bold mb-4">Pulley Families Admin</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Pulley Families Admin</h1>
        <p className="text-red-600">{error}</p>
        <button onClick={loadFamilies} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <Header loadedConfigurationId={null} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-6">Pulley Families Admin</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Family List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Families</h2>
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
                    key={family.pulley_family_key}
                    onClick={() => selectFamily(family)}
                    className={`w-full text-left p-3 rounded border ${
                      selectedFamily?.pulley_family_key === family.pulley_family_key
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    } ${!family.is_active ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{family.manufacturer} {family.shell_od_in}&quot;</span>
                      {!family.is_active && (
                        <span className="px-1.5 py-0.5 text-xs bg-gray-200 text-gray-600 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {family.style} | Face: {family.face_width_in}&quot;
                      {family.v_groove_section && ` | ${family.v_groove_section}`}
                    </div>
                  </button>
                ))}
                {families.length === 0 && (
                  <p className="text-gray-500 text-sm">No families found. Create one to get started.</p>
                )}
              </div>
            </div>
          </div>

          {/* Edit Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">
                {selectedFamily ? `Edit: ${selectedFamily.pulley_family_key}` : 'New Pulley Family'}
              </h2>

              <form onSubmit={handleSave} className="space-y-4">
                {/* Identification */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Family Key *
                    </label>
                    <input
                      type="text"
                      value={formData.pulley_family_key}
                      onChange={(e) => updateField('pulley_family_key', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      required
                      disabled={!!selectedFamily}
                      placeholder="e.g., PCI_FC_8IN_48_5_K17"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Manufacturer *
                    </label>
                    <input
                      type="text"
                      value={formData.manufacturer}
                      onChange={(e) => updateField('manufacturer', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      required
                      placeholder="e.g., PCI"
                    />
                  </div>
                </div>

                {/* Style and Material */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Style *</label>
                    <select
                      value={formData.style}
                      onChange={(e) => updateField('style', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                    >
                      <option value="Flat Face">Flat Face</option>
                      <option value="Crowned">Crowned</option>
                      <option value="Wing">Wing</option>
                      <option value="Spiral">Spiral</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Material *</label>
                    <input
                      type="text"
                      value={formData.material}
                      onChange={(e) => updateField('material', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      required
                      placeholder="e.g., Mild steel"
                    />
                  </div>
                </div>

                {/* Shell Specs */}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Shell Specifications</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Shell OD (in) *
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        value={formData.shell_od_in}
                        onChange={(e) => updateField('shell_od_in', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Face Width (in) *
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        value={formData.face_width_in}
                        onChange={(e) => updateField('face_width_in', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Shell Wall (in)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        value={formData.shell_wall_in}
                        onChange={(e) => updateField('shell_wall_in', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                      />
                    </div>
                  </div>
                </div>

                {/* Crown Specs */}
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <label className="flex items-center mb-3">
                    <input
                      type="checkbox"
                      checked={formData.is_crowned}
                      onChange={(e) => updateField('is_crowned', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium">Crowned Pulley</span>
                  </label>
                  {formData.is_crowned && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Crown Type
                      </label>
                      <input
                        type="text"
                        value={formData.crown_type}
                        onChange={(e) => updateField('crown_type', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                        placeholder="e.g., Standard, Trapezoidal"
                      />
                    </div>
                  )}
                </div>

                {/* V-Groove Specs */}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">V-Groove Specifications</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                      <input
                        type="text"
                        value={formData.v_groove_section}
                        onChange={(e) => updateField('v_groove_section', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                        placeholder="e.g., K10, K17"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Top Width (in)</label>
                      <input
                        type="number"
                        step="0.001"
                        value={formData.v_groove_top_width_in}
                        onChange={(e) => updateField('v_groove_top_width_in', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bottom Width (in)</label>
                      <input
                        type="number"
                        step="0.001"
                        value={formData.v_groove_bottom_width_in}
                        onChange={(e) => updateField('v_groove_bottom_width_in', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Depth (in)</label>
                      <input
                        type="number"
                        step="0.001"
                        value={formData.v_groove_depth_in}
                        onChange={(e) => updateField('v_groove_depth_in', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                      />
                    </div>
                  </div>
                </div>

                {/* Source & Notes */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                    <input
                      type="text"
                      value={formData.source}
                      onChange={(e) => updateField('source', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      placeholder="e.g., PCL-Q143384"
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

                {/* Status */}
                <div className="border-t pt-4">
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

                {/* Change Reason & Save */}
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Change Reason
                  </label>
                  <input
                    type="text"
                    value={changeReason}
                    onChange={(e) => setChangeReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    placeholder="Describe why you're making this change..."
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
                    {isSaving ? 'Saving...' : 'Save Family'}
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
