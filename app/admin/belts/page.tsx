/**
 * Admin Belt Editor Page
 *
 * Allows admin/engineer users to view, edit, and manage belt catalog entries.
 * Changes are versioned for rollback capability.
 */

'use client';

import { useState, useEffect } from 'react';
import { BeltCatalogItem } from '../../api/belts/route';
import { clearBeltCatalogCache } from '../../hooks/useBeltCatalog';
import Header from '../../components/Header';

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
}

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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (!changeReason.trim()) {
      setSaveMessage({ type: 'error', text: 'Please provide a change reason' });
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
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
