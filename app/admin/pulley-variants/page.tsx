/**
 * Admin Pulley Variants Page
 *
 * Allows admin/engineer users to view, edit, and manage pulley variants.
 * Variants define bore/hub/lagging options and finished_od_in.
 */

'use client';

import { useState, useEffect } from 'react';
import {
  PulleyFamily,
  PulleyVariant,
  validatePulleyVariant,
  getFinishedOdIn,
} from '../../../src/lib/pulley-families';
import { clearPulleyFamiliesCache } from '../../hooks/usePulleyFamilies';
import Header from '../../components/Header';

interface VariantFormData {
  pulley_variant_key: string;
  pulley_family_key: string;
  bore_in: string;
  hub_style: string;
  bearing_type: string;
  lagging_type: string;
  lagging_thickness_in: string;
  lagging_durometer_shore_a: string;
  finished_od_in: string;
  runout_max_in: string;
  paint_spec: string;
  source: string;
  notes: string;
  is_active: boolean;
}

interface VariantWithFamily extends PulleyVariant {
  family: PulleyFamily;
}

const emptyForm: VariantFormData = {
  pulley_variant_key: '',
  pulley_family_key: '',
  bore_in: '',
  hub_style: '',
  bearing_type: '',
  lagging_type: '',
  lagging_thickness_in: '',
  lagging_durometer_shore_a: '',
  finished_od_in: '',
  runout_max_in: '',
  paint_spec: '',
  source: '',
  notes: '',
  is_active: true,
};

export default function AdminPulleyVariantsPage() {
  const [variants, setVariants] = useState<VariantWithFamily[]>([]);
  const [families, setFamilies] = useState<PulleyFamily[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<VariantWithFamily | null>(null);
  const [formData, setFormData] = useState<VariantFormData>(emptyForm);
  const [changeReason, setChangeReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    setError(null);
    try {
      const [variantsRes, familiesRes] = await Promise.all([
        fetch('/api/pulley-variants?includeInactive=true'),
        fetch('/api/pulley-families?includeInactive=true'),
      ]);

      if (!variantsRes.ok) throw new Error('Failed to fetch variants');
      if (!familiesRes.ok) throw new Error('Failed to fetch families');

      const [variantsData, familiesData] = await Promise.all([
        variantsRes.json(),
        familiesRes.json(),
      ]);

      setVariants(variantsData);
      setFamilies(familiesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }

  function selectVariant(variant: VariantWithFamily) {
    setSelectedVariant(variant);
    setFormData({
      pulley_variant_key: variant.pulley_variant_key,
      pulley_family_key: variant.pulley_family_key,
      bore_in: variant.bore_in?.toString() || '',
      hub_style: variant.hub_style || '',
      bearing_type: variant.bearing_type || '',
      lagging_type: variant.lagging_type || '',
      lagging_thickness_in: variant.lagging_thickness_in?.toString() || '',
      lagging_durometer_shore_a: variant.lagging_durometer_shore_a?.toString() || '',
      finished_od_in: variant.finished_od_in?.toString() || '',
      runout_max_in: variant.runout_max_in?.toString() || '',
      paint_spec: variant.paint_spec || '',
      source: variant.source || '',
      notes: variant.notes || '',
      is_active: variant.is_active,
    });
    setChangeReason('');
    setSaveMessage(null);
  }

  function createNewVariant() {
    setSelectedVariant(null);
    setFormData(emptyForm);
    setChangeReason('');
    setSaveMessage(null);
  }

  function updateField(field: keyof VariantFormData, value: string | boolean) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  // Get the selected family for displaying shell_od_in
  const selectedFamily = families.find((f) => f.pulley_family_key === formData.pulley_family_key);
  const effectiveFinishedOd = formData.finished_od_in
    ? parseFloat(formData.finished_od_in)
    : selectedFamily?.shell_od_in;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    // Build variant object
    const variant = {
      pulley_variant_key: formData.pulley_variant_key,
      pulley_family_key: formData.pulley_family_key,
      bore_in: formData.bore_in ? parseFloat(formData.bore_in) : null,
      hub_style: formData.hub_style || null,
      bearing_type: formData.bearing_type || null,
      lagging_type: formData.lagging_type || null,
      lagging_thickness_in: formData.lagging_thickness_in ? parseFloat(formData.lagging_thickness_in) : null,
      lagging_durometer_shore_a: formData.lagging_durometer_shore_a ? parseFloat(formData.lagging_durometer_shore_a) : null,
      finished_od_in: formData.finished_od_in ? parseFloat(formData.finished_od_in) : null,
      runout_max_in: formData.runout_max_in ? parseFloat(formData.runout_max_in) : null,
      paint_spec: formData.paint_spec || null,
      source: formData.source || null,
      notes: formData.notes || null,
      is_active: formData.is_active,
    };

    // Validate locally before sending
    const validation = validatePulleyVariant(variant);
    if (!validation.isValid) {
      setSaveMessage({ type: 'error', text: validation.errors.join('; ') });
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const response = await fetch('/api/pulley-variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variant, change_reason: changeReason }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || err.details || 'Failed to save variant');
      }

      clearPulleyFamiliesCache();
      await loadData();

      setSaveMessage({ type: 'success', text: 'Pulley variant saved successfully!' });
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
        <h1 className="text-2xl font-bold mb-4">Pulley Variants Admin</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Pulley Variants Admin</h1>
        <p className="text-red-600">{error}</p>
        <button onClick={loadData} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <Header loadedConfigurationId={null} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-6">Pulley Variants Admin</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Variant List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Variants</h2>
                <button
                  onClick={createNewVariant}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                >
                  + New
                </button>
              </div>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {variants.map((variant) => {
                  const finishedOd = getFinishedOdIn(variant, variant.family);
                  return (
                    <button
                      key={variant.pulley_variant_key}
                      onClick={() => selectVariant(variant)}
                      className={`w-full text-left p-3 rounded border ${
                        selectedVariant?.pulley_variant_key === variant.pulley_variant_key
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      } ${!variant.is_active ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{finishedOd}&quot; OD</span>
                        {variant.lagging_type && variant.lagging_type !== 'none' && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">
                            {variant.lagging_type}
                          </span>
                        )}
                        {!variant.is_active && (
                          <span className="px-1.5 py-0.5 text-xs bg-gray-200 text-gray-600 rounded">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {variant.family.manufacturer} {variant.family.shell_od_in}&quot; {variant.family.style}
                        {variant.bearing_type && ` | ${variant.bearing_type}`}
                      </div>
                    </button>
                  );
                })}
                {variants.length === 0 && (
                  <p className="text-gray-500 text-sm">No variants found. Create one to get started.</p>
                )}
              </div>
            </div>
          </div>

          {/* Edit Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">
                {selectedVariant ? `Edit: ${selectedVariant.pulley_variant_key}` : 'New Pulley Variant'}
              </h2>

              <form onSubmit={handleSave} className="space-y-4">
                {/* Identification */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Variant Key *
                    </label>
                    <input
                      type="text"
                      value={formData.pulley_variant_key}
                      onChange={(e) => updateField('pulley_variant_key', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      required
                      disabled={!!selectedVariant}
                      placeholder="e.g., PCI_FC_8IN_48_5_K17_LAGGED_BUSHED"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Family *
                    </label>
                    <select
                      value={formData.pulley_family_key}
                      onChange={(e) => updateField('pulley_family_key', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      required
                    >
                      <option value="">Select a family...</option>
                      {families.map((f) => (
                        <option key={f.pulley_family_key} value={f.pulley_family_key}>
                          {f.manufacturer} {f.shell_od_in}&quot; {f.style} ({f.pulley_family_key})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Family Info (readonly) */}
                {selectedFamily && (
                  <div className="p-3 bg-gray-50 rounded border border-gray-200 text-sm">
                    <div className="font-medium text-gray-700 mb-1">Selected Family</div>
                    <div className="text-gray-600">
                      Shell OD: {selectedFamily.shell_od_in}&quot; | Face: {selectedFamily.face_width_in}&quot;
                      {selectedFamily.v_groove_section && ` | V-Groove: ${selectedFamily.v_groove_section}`}
                    </div>
                  </div>
                )}

                {/* Bore and Hub */}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Bore & Hub</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bore (in)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        value={formData.bore_in}
                        onChange={(e) => updateField('bore_in', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Hub Style
                      </label>
                      <input
                        type="text"
                        value={formData.hub_style}
                        onChange={(e) => updateField('hub_style', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                        placeholder="e.g., XTH25 + XTB25"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bearing Type
                      </label>
                      <input
                        type="text"
                        value={formData.bearing_type}
                        onChange={(e) => updateField('bearing_type', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                        placeholder="e.g., bushing, Timken, ER"
                      />
                    </div>
                  </div>
                </div>

                {/* Lagging */}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Lagging</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Lagging Type
                      </label>
                      <input
                        type="text"
                        value={formData.lagging_type}
                        onChange={(e) => updateField('lagging_type', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                        placeholder="e.g., none, SBR, Urethane"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Thickness (in)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        value={formData.lagging_thickness_in}
                        onChange={(e) => updateField('lagging_thickness_in', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Durometer (Shore A)
                      </label>
                      <input
                        type="number"
                        value={formData.lagging_durometer_shore_a}
                        onChange={(e) => updateField('lagging_durometer_shore_a', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                        placeholder="0-100"
                      />
                    </div>
                  </div>
                </div>

                {/* Finished OD */}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Finished Diameter</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Finished OD (in)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        value={formData.finished_od_in}
                        onChange={(e) => updateField('finished_od_in', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                        placeholder="Leave blank to use shell OD"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Effective: {effectiveFinishedOd ? `${effectiveFinishedOd}"` : '-'}
                        {!formData.finished_od_in && selectedFamily && ' (from family shell OD)'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Runout (in)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        value={formData.runout_max_in}
                        onChange={(e) => updateField('runout_max_in', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                      />
                    </div>
                  </div>
                </div>

                {/* Paint & Source */}
                <div className="border-t pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Paint Spec</label>
                      <input
                        type="text"
                        value={formData.paint_spec}
                        onChange={(e) => updateField('paint_spec', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                        placeholder="e.g., Paint ends only"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                      <input
                        type="text"
                        value={formData.source}
                        onChange={(e) => updateField('source', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                        placeholder="e.g., PCL-Q143384 item 1"
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => updateField('notes', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    placeholder="e.g., Quoted part F08ZX48HFZZZXX257ZC"
                  />
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
                    {isSaving ? 'Saving...' : 'Save Variant'}
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
