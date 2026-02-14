/**
 * Admin Magnet Catalog Page
 *
 * Manages magnet_catalog entries for the magnet bar configuration system.
 *
 * Features:
 * - List all magnets with filtering by material_type and cross_section_key
 * - Add new magnets with full specification entry
 * - Edit existing magnets
 * - Deactivate/reactivate magnets (soft delete)
 *
 * Part of Phase 2: Magnet Catalog Admin UI
 */

'use client';

import { useState, useEffect } from 'react';
import { useCurrentUserRole } from '../../../../hooks/useCurrentUserRole';
import { AdminReadOnlyBanner } from '../../../../components/AdminReadOnlyBanner';

// Types matching magnet_catalog table
interface Magnet {
  id: string;
  part_number: string;
  name: string;
  description: string | null;
  cross_section_key: string;
  material_type: 'ceramic' | 'neo';
  grade: '5' | '8' | '35' | '50';
  length_in: number;
  width_in: number;
  height_in: number;
  weight_lb: number;
  hold_force_proxy_lb: number;
  efficiency_factor: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface MagnetFormData {
  part_number: string;
  name: string;
  description: string;
  cross_section_key: string;
  material_type: 'ceramic' | 'neo';
  grade: '5' | '8' | '35' | '50';
  length_in: string;
  width_in: string;
  height_in: string;
  weight_lb: string;
  hold_force_proxy_lb: string;
  efficiency_factor: string;
  is_active: boolean;
}

const emptyForm: MagnetFormData = {
  part_number: '',
  name: '',
  description: '',
  cross_section_key: '1.00x1.38',
  material_type: 'ceramic',
  grade: '5',
  length_in: '',
  width_in: '1.0',
  height_in: '1.38',
  weight_lb: '',
  hold_force_proxy_lb: '',
  efficiency_factor: '1.0',
  is_active: true,
};

// Cross-section options
const CROSS_SECTIONS = [
  { key: '1.00x1.38', label: 'Standard (1.00" x 1.38")', width: '1.0', height: '1.38' },
  { key: '1.00x2.00', label: 'Heavy Duty (1.00" x 2.00")', width: '1.0', height: '2.0' },
];

// Grade options by material type
const GRADES: Record<'ceramic' | 'neo', { value: string; label: string }[]> = {
  ceramic: [
    { value: '5', label: 'Grade 5 (Standard)' },
    { value: '8', label: 'Grade 8 (Stronger)' },
  ],
  neo: [
    { value: '35', label: 'Grade 35' },
    { value: '50', label: 'Grade 50 (Strongest)' },
  ],
};

export default function AdminMagnetsPage() {
  const { canBeltAdmin, email, isLoading: isLoadingRole } = useCurrentUserRole();
  const isReadOnly = !canBeltAdmin;

  const [magnets, setMagnets] = useState<Magnet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMagnet, setSelectedMagnet] = useState<Magnet | null>(null);
  const [formData, setFormData] = useState<MagnetFormData>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Filters
  const [filterMaterialType, setFilterMaterialType] = useState<string>('');
  const [filterCrossSection, setFilterCrossSection] = useState<string>('');
  const [showInactive, setShowInactive] = useState(false);

  // Load magnets on mount and when filters change
  useEffect(() => {
    void loadMagnets();
  }, [filterMaterialType, filterCrossSection, showInactive]);

  async function loadMagnets() {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterMaterialType) params.set('material_type', filterMaterialType);
      if (filterCrossSection) params.set('cross_section_key', filterCrossSection);
      if (showInactive) params.set('include_inactive', 'true');

      const response = await fetch(`/api/admin/magnets?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch magnets');
      const data = await response.json();
      setMagnets(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load magnets');
    } finally {
      setIsLoading(false);
    }
  }

  function selectMagnet(magnet: Magnet) {
    setSelectedMagnet(magnet);
    setIsCreating(false);
    setFormData({
      part_number: magnet.part_number,
      name: magnet.name,
      description: magnet.description || '',
      cross_section_key: magnet.cross_section_key,
      material_type: magnet.material_type,
      grade: magnet.grade,
      length_in: magnet.length_in.toString(),
      width_in: magnet.width_in.toString(),
      height_in: magnet.height_in.toString(),
      weight_lb: magnet.weight_lb.toString(),
      hold_force_proxy_lb: magnet.hold_force_proxy_lb.toString(),
      efficiency_factor: magnet.efficiency_factor.toString(),
      is_active: magnet.is_active,
    });
    setSaveMessage(null);
  }

  function createNewMagnet() {
    setSelectedMagnet(null);
    setIsCreating(true);
    setFormData(emptyForm);
    setSaveMessage(null);
  }

  function updateField(field: keyof MagnetFormData, value: string | boolean) {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      // Auto-update dimensions when cross_section changes
      if (field === 'cross_section_key') {
        const section = CROSS_SECTIONS.find((cs) => cs.key === value);
        if (section) {
          updated.width_in = section.width;
          updated.height_in = section.height;
        }
      }

      // Reset grade when material type changes
      if (field === 'material_type') {
        const materialType = value as 'ceramic' | 'neo';
        updated.grade = GRADES[materialType][0].value as '5' | '8' | '35' | '50';
      }

      return updated;
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.part_number.trim()) {
      setSaveMessage({ type: 'error', text: 'Part number is required' });
      return;
    }

    if (!formData.name.trim()) {
      setSaveMessage({ type: 'error', text: 'Name is required' });
      return;
    }

    // Validate numeric fields
    const numericFields = ['length_in', 'width_in', 'height_in', 'weight_lb', 'hold_force_proxy_lb', 'efficiency_factor'] as const;
    for (const field of numericFields) {
      const val = parseFloat(formData[field]);
      if (isNaN(val) || val < 0) {
        setSaveMessage({ type: 'error', text: `${field.replace(/_/g, ' ')} must be a valid positive number` });
        return;
      }
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const payload = {
        id: selectedMagnet?.id,
        part_number: formData.part_number.trim(),
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        cross_section_key: formData.cross_section_key,
        material_type: formData.material_type,
        grade: formData.grade,
        length_in: parseFloat(formData.length_in),
        width_in: parseFloat(formData.width_in),
        height_in: parseFloat(formData.height_in),
        weight_lb: parseFloat(formData.weight_lb),
        hold_force_proxy_lb: parseFloat(formData.hold_force_proxy_lb),
        efficiency_factor: parseFloat(formData.efficiency_factor),
        is_active: formData.is_active,
      };

      const response = await fetch('/api/admin/magnets', {
        method: isCreating ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to save magnet');
      }

      await loadMagnets();
      setSaveMessage({ type: 'success', text: isCreating ? 'Magnet created!' : 'Magnet updated!' });

      if (isCreating) {
        setIsCreating(false);
        // Select the newly created magnet
        const newMagnets = await (await fetch('/api/admin/magnets?include_inactive=true')).json();
        const newMagnet = newMagnets.find((m: Magnet) => m.part_number === formData.part_number);
        if (newMagnet) {
          selectMagnet(newMagnet);
        }
      }
    } catch (err) {
      setSaveMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save' });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleActive() {
    if (!selectedMagnet) return;

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const payload = {
        ...selectedMagnet,
        is_active: !selectedMagnet.is_active,
      };

      const response = await fetch('/api/admin/magnets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to update status');
      }

      await loadMagnets();
      setSelectedMagnet((prev) => (prev ? { ...prev, is_active: !prev.is_active } : null));
      setFormData((prev) => ({ ...prev, is_active: !prev.is_active }));
      setSaveMessage({
        type: 'success',
        text: selectedMagnet.is_active ? 'Magnet deactivated' : 'Magnet reactivated',
      });
    } catch (err) {
      setSaveMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update' });
    } finally {
      setIsSaving(false);
    }
  }

  // Format dimensions for display
  function formatDimensions(magnet: Magnet): string {
    return `${magnet.width_in}" x ${magnet.height_in}" x ${magnet.length_in}"`;
  }

  if (isLoading || isLoadingRole) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-4">Magnet Catalog Admin</h1>
        <p>Loading...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-4">Magnet Catalog Admin</h1>
        <p className="text-red-600">{error}</p>
        <button onClick={loadMagnets} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">
          Retry
        </button>
      </main>
    );
  }

  return (
    <>
      {isReadOnly && <AdminReadOnlyBanner email={email} />}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-2">Magnet Catalog Admin</h1>
        <p className="text-gray-600 mb-6">
          Manage magnet specifications for bar configuration. Hold force values are effective removal
          capacity per magnet (no additional efficiency factor applied).
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Magnet List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4">
              {/* Filters */}
              <div className="mb-4 space-y-2">
                <div className="flex gap-2">
                  <select
                    value={filterMaterialType}
                    onChange={(e) => setFilterMaterialType(e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                  >
                    <option value="">All Materials</option>
                    <option value="ceramic">Ceramic</option>
                    <option value="neo">Neodymium</option>
                  </select>
                  <select
                    value={filterCrossSection}
                    onChange={(e) => setFilterCrossSection(e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                  >
                    <option value="">All Sizes</option>
                    {CROSS_SECTIONS.map((cs) => (
                      <option key={cs.key} value={cs.key}>
                        {cs.label.split(' ')[0]}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="flex items-center text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={showInactive}
                    onChange={(e) => setShowInactive(e.target.checked)}
                    className="mr-2"
                  />
                  Show inactive
                </label>
              </div>

              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Magnets ({magnets.length})</h2>
                {!isReadOnly && (
                  <button
                    onClick={createNewMagnet}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                  >
                    + New
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {magnets.map((magnet) => (
                  <button
                    key={magnet.id}
                    onClick={() => selectMagnet(magnet)}
                    className={`w-full text-left p-3 rounded border ${
                      selectedMagnet?.id === magnet.id
                        ? 'border-blue-500 bg-blue-50'
                        : magnet.is_active
                        ? 'border-gray-200 hover:bg-gray-50'
                        : 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{magnet.name}</span>
                      <div className="flex gap-1">
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded ${
                            magnet.material_type === 'ceramic'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {magnet.material_type === 'ceramic' ? 'Cer' : 'Neo'}
                        </span>
                        {!magnet.is_active && (
                          <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                            Off
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {magnet.part_number} | {formatDimensions(magnet)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {magnet.hold_force_proxy_lb} lbs/magnet
                    </div>
                  </button>
                ))}
                {magnets.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No magnets found. {!showInactive && 'Try enabling "Show inactive".'}
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
                  ? 'New Magnet'
                  : selectedMagnet
                  ? `Edit: ${selectedMagnet.name}`
                  : 'Select a magnet to edit'}
              </h2>

              {(selectedMagnet || isCreating) && (
                <form onSubmit={handleSave} className="space-y-4">
                  {/* Identity */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Part Number *
                      </label>
                      <input
                        type="text"
                        value={formData.part_number}
                        onChange={(e) => updateField('part_number', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                        required
                        disabled={isReadOnly}
                        placeholder="e.g., MAG050100013753500"
                      />
                    </div>
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
                        disabled={isReadOnly}
                        placeholder="e.g., Ceramic 5 - 3.5&quot; Standard"
                      />
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
                      disabled={isReadOnly}
                      placeholder="Optional description"
                    />
                  </div>

                  {/* Type & Grade */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cross Section
                      </label>
                      <select
                        value={formData.cross_section_key}
                        onChange={(e) => updateField('cross_section_key', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                        disabled={isReadOnly}
                      >
                        {CROSS_SECTIONS.map((cs) => (
                          <option key={cs.key} value={cs.key}>
                            {cs.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Material Type
                      </label>
                      <select
                        value={formData.material_type}
                        onChange={(e) => updateField('material_type', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                        disabled={isReadOnly}
                      >
                        <option value="ceramic">Ceramic</option>
                        <option value="neo">Neodymium</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Grade
                      </label>
                      <select
                        value={formData.grade}
                        onChange={(e) => updateField('grade', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                        disabled={isReadOnly}
                      >
                        {GRADES[formData.material_type].map((g) => (
                          <option key={g.value} value={g.value}>
                            {g.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Dimensions */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Width (in) *
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        value={formData.width_in}
                        onChange={(e) => updateField('width_in', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50"
                        required
                        disabled={isReadOnly}
                      />
                      <p className="text-xs text-gray-500 mt-1">From cross-section</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Height (in) *
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        value={formData.height_in}
                        onChange={(e) => updateField('height_in', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50"
                        required
                        disabled={isReadOnly}
                      />
                      <p className="text-xs text-gray-500 mt-1">From cross-section</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Length (in) *
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        value={formData.length_in}
                        onChange={(e) => updateField('length_in', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                        required
                        disabled={isReadOnly}
                        placeholder="e.g., 3.5"
                      />
                      <p className="text-xs text-gray-500 mt-1">Variable dimension</p>
                    </div>
                  </div>

                  {/* Physical Properties */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Weight (lb) *
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        value={formData.weight_lb}
                        onChange={(e) => updateField('weight_lb', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                        required
                        disabled={isReadOnly}
                        placeholder="e.g., 0.5"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Hold Force (lb) *
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        value={formData.hold_force_proxy_lb}
                        onChange={(e) => updateField('hold_force_proxy_lb', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                        required
                        disabled={isReadOnly}
                        placeholder="e.g., 0.1207"
                      />
                      <p className="text-xs text-gray-500 mt-1">Effective removal capacity</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Efficiency Factor
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.efficiency_factor}
                        onChange={(e) => updateField('efficiency_factor', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50"
                        disabled={isReadOnly}
                      />
                      <p className="text-xs text-gray-500 mt-1">Usually 1.0 (pre-applied)</p>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center">
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
                      disabled={isSaving || isReadOnly}
                      className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      {isSaving ? 'Saving...' : isCreating ? 'Create Magnet' : 'Save Changes'}
                    </button>

                    {selectedMagnet && !isCreating && !isReadOnly && (
                      <button
                        type="button"
                        onClick={handleToggleActive}
                        disabled={isSaving}
                        className={`px-4 py-2 rounded ${
                          selectedMagnet.is_active
                            ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border border-yellow-300'
                            : 'bg-green-100 text-green-800 hover:bg-green-200 border border-green-300'
                        } disabled:opacity-50`}
                      >
                        {selectedMagnet.is_active ? 'Deactivate' : 'Reactivate'}
                      </button>
                    )}
                  </div>

                  {/* Info Notice */}
                  <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded text-sm text-gray-600">
                    <strong>Note:</strong> Magnets cannot be deleted to preserve data integrity in
                    saved bar configurations. Use &quot;Deactivate&quot; to hide magnets from new selections.
                  </div>
                </form>
              )}

              {!selectedMagnet && !isCreating && (
                <div className="text-center py-8 text-gray-500">
                  <p>Select a magnet from the list to edit, or click &quot;+ New&quot; to create one.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
