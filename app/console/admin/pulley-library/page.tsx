/**
 * Admin Pulley Library Page
 *
 * Two-tab interface:
 * - Tab 1: Styles (conceptual - DRUM, WING, SPIRAL_WING) - rarely edited
 * - Tab 2: Models (concrete - PCI_DRUM_4IN, etc.) - day-to-day engineering setup
 *
 * CRITICAL: style_type is IMMUTABLE after creation
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  getAllThicknessOptions,
  getThicknessOption,
  getThicknessOptionByValue,
} from '../../../../src/lib/thickness';

// ============================================================================
// TYPES
// ============================================================================

type AdminTab = 'styles' | 'models';
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
  tube_stress_limit_flat_psi: number | null;
  tube_stress_limit_vgroove_psi: number | null;
  notes: string | null;
  is_active: boolean;
  sort_order: number;
}

interface PulleyModel {
  model_key: string;
  display_name: string;
  description: string | null;
  style_key: string;
  shell_od_in: number;
  default_shell_wall_in: number;
  allowed_wall_steps_in: number[];
  // Canonical thickness keys (v1.51)
  allowed_wall_thickness_keys: string[] | null;
  default_wall_thickness_key: string | null;
  face_width_min_in: number;
  face_width_max_in: number;
  face_width_allowance_in: number;
  eligible_drive: boolean;
  eligible_tail: boolean;
  eligible_dirty_side: boolean;
  eligible_crown: boolean;
  eligible_v_guided: boolean;
  eligible_lagging: boolean;
  tube_stress_limit_flat_psi: number | null;
  tube_stress_limit_vgroove_psi: number | null;
  notes: string | null;
  source_doc: string | null;
  is_active: boolean;
  sort_order: number;
}

const STYLE_TYPE_LABELS: Record<PulleyStyleType, string> = {
  DRUM: 'Drum',
  WING: 'Wing',
  SPIRAL_WING: 'Spiral Wing',
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AdminPulleyLibraryPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('models');

  return (
    <>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Pulley Library</h1>
          <p className="text-gray-600">Manage pulley styles and models</p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-4">
            <button
              onClick={() => setActiveTab('models')}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'models'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Models
              <span className="ml-1 text-xs text-gray-400">(Concrete sizes)</span>
            </button>
            <button
              onClick={() => setActiveTab('styles')}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'styles'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Styles
              <span className="ml-1 text-xs text-gray-400">(Conceptual types)</span>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'styles' ? <StylesTab /> : <ModelsTab />}
      </main>
    </>
  );
}

// ============================================================================
// STYLES TAB
// ============================================================================

function StylesTab() {
  const [styles, setStyles] = useState<PulleyStyle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<PulleyStyle | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    loadStyles();
  }, [showInactive]);

  async function loadStyles() {
    setIsLoading(true);
    try {
      const url = showInactive
        ? '/api/admin/pulley-library?active_only=false'
        : '/api/admin/pulley-library';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch');
      setStyles(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: List */}
      <div className="lg:col-span-1 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Styles ({styles.length})</h2>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-xs text-gray-500">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-gray-300 h-3 w-3"
              />
              Inactive
            </label>
            <button
              onClick={() => {
                setSelectedStyle(null);
                setIsCreating(true);
              }}
              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              + New
            </button>
          </div>
        </div>
        <div className="max-h-[calc(100vh-350px)] overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">Loading...</div>
          ) : error ? (
            <div className="p-4 text-center text-red-500">{error}</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {styles.map((style) => (
                <li key={style.key}>
                  <button
                    onClick={() => {
                      setSelectedStyle(style);
                      setIsCreating(false);
                    }}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 ${
                      selectedStyle?.key === style.key ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                    } ${!style.is_active ? 'opacity-50' : ''}`}
                  >
                    <div className="font-medium text-gray-900">{style.name}</div>
                    <div className="text-xs text-gray-500">
                      {STYLE_TYPE_LABELS[style.style_type]} | {style.key}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Right: Edit Form */}
      <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 shadow-sm">
        {!selectedStyle && !isCreating ? (
          <div className="p-8 text-center text-gray-500">
            <p className="mb-2">Select a style to view or edit.</p>
            <p className="text-xs text-gray-400">
              Styles are conceptual pulley types (Drum, Wing, Spiral Wing).
              <br />
              They are rarely edited. Use Models for day-to-day engineering.
            </p>
          </div>
        ) : (
          <StyleForm
            style={selectedStyle}
            isCreating={isCreating}
            onSaved={() => {
              loadStyles();
              setIsCreating(false);
            }}
            onCancel={() => {
              setSelectedStyle(null);
              setIsCreating(false);
            }}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// STYLE FORM
// ============================================================================

interface StyleFormProps {
  style: PulleyStyle | null;
  isCreating: boolean;
  onSaved: () => void;
  onCancel: () => void;
}

function StyleForm({ style, isCreating, onSaved, onCancel }: StyleFormProps) {
  const [formData, setFormData] = useState({
    key: style?.key || '',
    name: style?.name || '',
    description: style?.description || '',
    style_type: style?.style_type || 'DRUM' as PulleyStyleType,
    eligible_drive: style?.eligible_drive ?? true,
    eligible_tail: style?.eligible_tail ?? true,
    eligible_dirty_side: style?.eligible_dirty_side ?? false,
    eligible_crown: style?.eligible_crown ?? true,
    eligible_v_guided: style?.eligible_v_guided ?? false,
    eligible_lagging: style?.eligible_lagging ?? true,
    tube_stress_limit_flat_psi: style?.tube_stress_limit_flat_psi?.toString() || '10000',
    tube_stress_limit_vgroove_psi: style?.tube_stress_limit_vgroove_psi?.toString() || '3400',
    notes: style?.notes || '',
    is_active: style?.is_active ?? true,
    sort_order: style?.sort_order?.toString() || '0',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (style) {
      setFormData({
        key: style.key,
        name: style.name,
        description: style.description || '',
        style_type: style.style_type,
        eligible_drive: style.eligible_drive,
        eligible_tail: style.eligible_tail,
        eligible_dirty_side: style.eligible_dirty_side,
        eligible_crown: style.eligible_crown,
        eligible_v_guided: style.eligible_v_guided,
        eligible_lagging: style.eligible_lagging,
        tube_stress_limit_flat_psi: style.tube_stress_limit_flat_psi?.toString() || '10000',
        tube_stress_limit_vgroove_psi: style.tube_stress_limit_vgroove_psi?.toString() || '3400',
        notes: style.notes || '',
        is_active: style.is_active,
        sort_order: style.sort_order?.toString() || '0',
      });
    }
  }, [style]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.key.trim() || !formData.name.trim()) {
      setMessage({ type: 'error', text: 'Key and Name are required' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/pulley-library', {
        method: isCreating ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: formData.key.trim().toUpperCase().replace(/\s+/g, '_'),
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          style_type: formData.style_type,
          eligible_drive: formData.eligible_drive,
          eligible_tail: formData.eligible_tail,
          eligible_dirty_side: formData.eligible_dirty_side,
          eligible_crown: formData.eligible_crown,
          eligible_v_guided: formData.eligible_v_guided,
          eligible_lagging: formData.eligible_lagging,
          tube_stress_limit_flat_psi: parseFloat(formData.tube_stress_limit_flat_psi) || 10000,
          tube_stress_limit_vgroove_psi: parseFloat(formData.tube_stress_limit_vgroove_psi) || 3400,
          notes: formData.notes.trim() || null,
          is_active: formData.is_active,
          sort_order: parseInt(formData.sort_order) || 0,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to save');
      }

      setMessage({ type: 'success', text: isCreating ? 'Created!' : 'Saved!' });
      onSaved();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Save failed' });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <div className="flex items-center justify-between border-b pb-4">
        <h2 className="text-lg font-semibold">
          {isCreating ? 'New Style' : `Edit: ${style?.name}`}
        </h2>
      </div>

      {message && (
        <div className={`p-3 rounded text-sm ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Key {!isCreating && <span className="text-gray-400">(immutable)</span>}
          </label>
          <input
            type="text"
            value={formData.key}
            onChange={(e) => setFormData({ ...formData, key: e.target.value })}
            disabled={!isCreating}
            className="w-full px-3 py-2 border rounded-md disabled:bg-gray-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Style Type {!isCreating && <span className="text-gray-400">(immutable)</span>}
          </label>
          <select
            value={formData.style_type}
            onChange={(e) => setFormData({ ...formData, style_type: e.target.value as PulleyStyleType })}
            disabled={!isCreating}
            className="w-full px-3 py-2 border rounded-md disabled:bg-gray-100"
          >
            {Object.entries(STYLE_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          {!isCreating && (
            <p className="text-xs text-amber-600 mt-1">
              Style type cannot be changed. Create a new style if needed.
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
          <input
            type="number"
            value={formData.sort_order}
            onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Eligibility</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { field: 'eligible_drive', label: 'Drive' },
            { field: 'eligible_tail', label: 'Tail' },
            { field: 'eligible_dirty_side', label: 'Dirty Side' },
            { field: 'eligible_crown', label: 'Crowned' },
            { field: 'eligible_v_guided', label: 'V-Guided' },
            { field: 'eligible_lagging', label: 'Lagging' },
          ].map(({ field, label }) => (
            <label key={field} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={formData[field as keyof typeof formData] as boolean}
                onChange={(e) => setFormData({ ...formData, [field]: e.target.checked })}
                className="rounded"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Stress Limit Flat (psi)</label>
          <input
            type="number"
            value={formData.tube_stress_limit_flat_psi}
            onChange={(e) => setFormData({ ...formData, tube_stress_limit_flat_psi: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Stress Limit V-Groove (psi)</label>
          <input
            type="number"
            value={formData.tube_stress_limit_vgroove_psi}
            onChange={(e) => setFormData({ ...formData, tube_stress_limit_vgroove_psi: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={2}
          className="w-full px-3 py-2 border rounded-md"
        />
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={formData.is_active}
          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
          className="rounded"
        />
        <span className="text-sm">Active</span>
      </label>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
          Cancel
        </button>
        <button type="submit" disabled={isSaving} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
          {isSaving ? 'Saving...' : isCreating ? 'Create' : 'Save'}
        </button>
      </div>
    </form>
  );
}

// ============================================================================
// MODELS TAB
// ============================================================================

function ModelsTab() {
  const [models, setModels] = useState<PulleyModel[]>([]);
  const [styles, setStyles] = useState<PulleyStyle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<PulleyModel | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    loadData();
  }, [showInactive]);

  async function loadData() {
    setIsLoading(true);
    try {
      const [modelsRes, stylesRes] = await Promise.all([
        fetch(showInactive ? '/api/admin/pulley-models?active_only=false' : '/api/admin/pulley-models'),
        fetch('/api/admin/pulley-library'),
      ]);
      if (!modelsRes.ok || !stylesRes.ok) throw new Error('Failed to fetch');
      setModels(await modelsRes.json());
      setStyles(await stylesRes.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: List */}
      <div className="lg:col-span-1 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Models ({models.length})</h2>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-xs text-gray-500">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-gray-300 h-3 w-3"
              />
              Inactive
            </label>
            <button
              onClick={() => {
                setSelectedModel(null);
                setIsCreating(true);
              }}
              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              + New
            </button>
          </div>
        </div>
        <div className="max-h-[calc(100vh-350px)] overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">Loading...</div>
          ) : error ? (
            <div className="p-4 text-center text-red-500">{error}</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {models.map((model) => (
                <li key={model.model_key}>
                  <button
                    onClick={() => {
                      setSelectedModel(model);
                      setIsCreating(false);
                    }}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 ${
                      selectedModel?.model_key === model.model_key
                        ? 'bg-blue-50 border-l-4 border-blue-600'
                        : ''
                    } ${!model.is_active ? 'opacity-50' : ''}`}
                  >
                    <div className="font-medium text-gray-900">{model.display_name}</div>
                    <div className="text-xs text-gray-500">
                      {model.shell_od_in}" OD | {model.style_key}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Face: {model.face_width_min_in}" – {model.face_width_max_in}"
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Right: Edit Form */}
      <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 shadow-sm">
        {!selectedModel && !isCreating ? (
          <div className="p-8 text-center text-gray-500">
            <p className="mb-2">Select a model to view or edit.</p>
            <p className="text-xs text-gray-400">
              Models are concrete pulley options with specific sizes and limits.
              <br />
              Users select from these models when configuring pulleys.
            </p>
          </div>
        ) : (
          <ModelForm
            model={selectedModel}
            styles={styles}
            isCreating={isCreating}
            onSaved={() => {
              loadData();
              setIsCreating(false);
            }}
            onCancel={() => {
              setSelectedModel(null);
              setIsCreating(false);
            }}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MODEL FORM
// ============================================================================

interface ModelFormProps {
  model: PulleyModel | null;
  styles: PulleyStyle[];
  isCreating: boolean;
  onSaved: () => void;
  onCancel: () => void;
}

function ModelForm({ model, styles, isCreating, onSaved, onCancel }: ModelFormProps) {
  // Get all canonical thickness options
  const allThicknessOptions = useMemo(() => getAllThicknessOptions(), []);

  // Derive initial allowed keys from model (canonical keys if available, else from legacy values)
  const deriveAllowedKeys = (m: PulleyModel | null): string[] => {
    if (m?.allowed_wall_thickness_keys && m.allowed_wall_thickness_keys.length > 0) {
      return m.allowed_wall_thickness_keys;
    }
    // Derive from legacy numeric values
    if (m?.allowed_wall_steps_in) {
      return m.allowed_wall_steps_in
        .map(v => getThicknessOptionByValue(v, 0.005)?.key)
        .filter((k): k is string => k !== undefined);
    }
    return ['ga_12', 'ga_10', 'frac_3_16']; // Default for new models
  };

  // Derive initial default key
  const deriveDefaultKey = (m: PulleyModel | null): string | null => {
    if (m?.default_wall_thickness_key) {
      return m.default_wall_thickness_key;
    }
    if (m?.default_shell_wall_in) {
      return getThicknessOptionByValue(m.default_shell_wall_in, 0.005)?.key || null;
    }
    return 'ga_10'; // Default for new models
  };

  // Check for unmatched legacy values
  const unmatchedLegacyValues = useMemo(() => {
    if (!model?.allowed_wall_steps_in) return [];
    return model.allowed_wall_steps_in.filter(v => !getThicknessOptionByValue(v, 0.005));
  }, [model]);

  const [formData, setFormData] = useState({
    model_key: model?.model_key || '',
    display_name: model?.display_name || '',
    description: model?.description || '',
    style_key: model?.style_key || (styles[0]?.key || ''),
    shell_od_in: model?.shell_od_in?.toString() || '6.0',
    // Canonical thickness keys (primary)
    allowed_wall_thickness_keys: deriveAllowedKeys(model),
    default_wall_thickness_key: deriveDefaultKey(model),
    face_width_min_in: model?.face_width_min_in?.toString() || '6.0',
    face_width_max_in: model?.face_width_max_in?.toString() || '48.0',
    face_width_allowance_in: model?.face_width_allowance_in?.toString() || '2.0',
    eligible_drive: model?.eligible_drive ?? true,
    eligible_tail: model?.eligible_tail ?? true,
    eligible_dirty_side: model?.eligible_dirty_side ?? false,
    eligible_crown: model?.eligible_crown ?? true,
    eligible_v_guided: model?.eligible_v_guided ?? false,
    eligible_lagging: model?.eligible_lagging ?? true,
    tube_stress_limit_flat_psi: model?.tube_stress_limit_flat_psi?.toString() || '',
    tube_stress_limit_vgroove_psi: model?.tube_stress_limit_vgroove_psi?.toString() || '',
    notes: model?.notes || '',
    source_doc: model?.source_doc || '',
    is_active: model?.is_active ?? true,
    sort_order: model?.sort_order?.toString() || '0',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (model) {
      setFormData({
        model_key: model.model_key,
        display_name: model.display_name,
        description: model.description || '',
        style_key: model.style_key,
        shell_od_in: model.shell_od_in.toString(),
        allowed_wall_thickness_keys: deriveAllowedKeys(model),
        default_wall_thickness_key: deriveDefaultKey(model),
        face_width_min_in: model.face_width_min_in.toString(),
        face_width_max_in: model.face_width_max_in.toString(),
        face_width_allowance_in: model.face_width_allowance_in.toString(),
        eligible_drive: model.eligible_drive,
        eligible_tail: model.eligible_tail,
        eligible_dirty_side: model.eligible_dirty_side,
        eligible_crown: model.eligible_crown,
        eligible_v_guided: model.eligible_v_guided,
        eligible_lagging: model.eligible_lagging,
        tube_stress_limit_flat_psi: model.tube_stress_limit_flat_psi?.toString() || '',
        tube_stress_limit_vgroove_psi: model.tube_stress_limit_vgroove_psi?.toString() || '',
        notes: model.notes || '',
        source_doc: model.source_doc || '',
        is_active: model.is_active,
        sort_order: model.sort_order.toString(),
      });
    }
  }, [model]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validate allowed thickness keys
    if (formData.allowed_wall_thickness_keys.length === 0) {
      setMessage({ type: 'error', text: 'At least one wall thickness is required' });
      return;
    }

    // Validate default is in allowed list
    if (formData.default_wall_thickness_key && !formData.allowed_wall_thickness_keys.includes(formData.default_wall_thickness_key)) {
      setMessage({ type: 'error', text: 'Default wall thickness must be in the allowed list' });
      return;
    }

    // Derive numeric values from canonical keys for backward compatibility
    const wallSteps = formData.allowed_wall_thickness_keys
      .map(key => getThicknessOption(key)?.thickness_in)
      .filter((v): v is number => v !== undefined)
      .sort((a, b) => a - b);

    const defaultWallIn = formData.default_wall_thickness_key
      ? getThicknessOption(formData.default_wall_thickness_key)?.thickness_in ?? 0.134
      : wallSteps[0] ?? 0.134;

    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/pulley-models', {
        method: isCreating ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_key: formData.model_key.trim().toUpperCase().replace(/\s+/g, '_'),
          display_name: formData.display_name.trim(),
          description: formData.description.trim() || null,
          style_key: formData.style_key,
          shell_od_in: parseFloat(formData.shell_od_in),
          // Legacy numeric fields (for backward compatibility)
          default_shell_wall_in: defaultWallIn,
          allowed_wall_steps_in: wallSteps,
          // Canonical thickness keys (primary)
          allowed_wall_thickness_keys: formData.allowed_wall_thickness_keys,
          default_wall_thickness_key: formData.default_wall_thickness_key,
          face_width_min_in: parseFloat(formData.face_width_min_in),
          face_width_max_in: parseFloat(formData.face_width_max_in),
          face_width_allowance_in: parseFloat(formData.face_width_allowance_in),
          eligible_drive: formData.eligible_drive,
          eligible_tail: formData.eligible_tail,
          eligible_dirty_side: formData.eligible_dirty_side,
          eligible_crown: formData.eligible_crown,
          eligible_v_guided: formData.eligible_v_guided,
          eligible_lagging: formData.eligible_lagging,
          tube_stress_limit_flat_psi: formData.tube_stress_limit_flat_psi
            ? parseFloat(formData.tube_stress_limit_flat_psi)
            : null,
          tube_stress_limit_vgroove_psi: formData.tube_stress_limit_vgroove_psi
            ? parseFloat(formData.tube_stress_limit_vgroove_psi)
            : null,
          notes: formData.notes.trim() || null,
          source_doc: formData.source_doc.trim() || null,
          is_active: formData.is_active,
          sort_order: parseInt(formData.sort_order) || 0,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to save');
      }

      setMessage({ type: 'success', text: isCreating ? 'Created!' : 'Saved!' });
      onSaved();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Save failed' });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto">
      <div className="flex items-center justify-between border-b pb-4">
        <h2 className="text-lg font-semibold">
          {isCreating ? 'New Model' : `Edit: ${model?.display_name}`}
        </h2>
      </div>

      {message && (
        <div className={`p-3 rounded text-sm ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Model Key {!isCreating && <span className="text-gray-400">(immutable)</span>}
          </label>
          <input
            type="text"
            value={formData.model_key}
            onChange={(e) => setFormData({ ...formData, model_key: e.target.value })}
            disabled={!isCreating}
            placeholder="e.g., PCI_DRUM_6IN"
            className="w-full px-3 py-2 border rounded-md disabled:bg-gray-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
          <input
            type="text"
            value={formData.display_name}
            onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
            placeholder="e.g., PCI Drum – 6&quot;"
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Style {!isCreating && <span className="text-gray-400">(immutable)</span>}
          </label>
          <select
            value={formData.style_key}
            onChange={(e) => setFormData({ ...formData, style_key: e.target.value })}
            disabled={!isCreating}
            className="w-full px-3 py-2 border rounded-md disabled:bg-gray-100"
          >
            {styles.map((s) => (
              <option key={s.key} value={s.key}>
                {s.name} ({STYLE_TYPE_LABELS[s.style_type]})
              </option>
            ))}
          </select>
          {!isCreating && (
            <p className="text-xs text-amber-600 mt-1">
              Style cannot be changed. Create a new model if needed.
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Source Doc</label>
          <input
            type="text"
            value={formData.source_doc}
            onChange={(e) => setFormData({ ...formData, source_doc: e.target.value })}
            placeholder="e.g., PCI-001"
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
      </div>

      {/* Shell Geometry */}
      <div className="border-t pt-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Shell Geometry</h3>

        {/* Shell OD */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Shell OD (in)</label>
          <input
            type="number"
            step="0.5"
            value={formData.shell_od_in}
            onChange={(e) => setFormData({ ...formData, shell_od_in: e.target.value })}
            className="w-32 px-3 py-2 border rounded-md"
          />
        </div>

        {/* Wall Thickness Picker */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Allowed Wall Thicknesses
            <span className="ml-2 text-xs text-gray-400 font-normal">
              (check to allow, select one as default)
            </span>
          </label>

          {/* Unmatched legacy warning */}
          {unmatchedLegacyValues.length > 0 && (
            <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded text-sm text-amber-700">
              <strong>Warning:</strong> {unmatchedLegacyValues.length} legacy value(s) not in canonical library:{' '}
              {unmatchedLegacyValues.map(v => `${v}"`).join(', ')}
            </div>
          )}

          {/* Thickness table */}
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 w-12">Allow</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Thickness</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 w-16">Default</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allThicknessOptions.map((opt) => {
                  const isAllowed = formData.allowed_wall_thickness_keys.includes(opt.key);
                  const isDefault = formData.default_wall_thickness_key === opt.key;

                  return (
                    <tr key={opt.key} className={isAllowed ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={isAllowed}
                          onChange={(e) => {
                            const newAllowed = e.target.checked
                              ? [...formData.allowed_wall_thickness_keys, opt.key]
                              : formData.allowed_wall_thickness_keys.filter(k => k !== opt.key);

                            // If unchecking the default, clear it
                            const newDefault = (!e.target.checked && isDefault)
                              ? null
                              : formData.default_wall_thickness_key;

                            setFormData({
                              ...formData,
                              allowed_wall_thickness_keys: newAllowed,
                              default_wall_thickness_key: newDefault,
                            });
                          }}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className={`px-3 py-2 ${isAllowed ? 'text-gray-900' : 'text-gray-400'}`}>
                        {opt.label}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="radio"
                          name="default_wall_thickness"
                          checked={isDefault}
                          disabled={!isAllowed}
                          onChange={() => {
                            setFormData({
                              ...formData,
                              default_wall_thickness_key: opt.key,
                            });
                          }}
                          className="text-blue-600 disabled:opacity-30"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="mt-2 text-xs text-gray-500">
            {formData.allowed_wall_thickness_keys.length} thickness(es) allowed
            {formData.default_wall_thickness_key && (
              <span className="ml-2">
                • Default: {allThicknessOptions.find(o => o.key === formData.default_wall_thickness_key)?.label || formData.default_wall_thickness_key}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Face Width */}
      <div className="border-t pt-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Face Width Limits</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min (in)</label>
            <input
              type="number"
              step="0.5"
              value={formData.face_width_min_in}
              onChange={(e) => setFormData({ ...formData, face_width_min_in: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max (in)</label>
            <input
              type="number"
              step="0.5"
              value={formData.face_width_max_in}
              onChange={(e) => setFormData({ ...formData, face_width_max_in: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Allowance (in)</label>
            <input
              type="number"
              step="0.5"
              value={formData.face_width_allowance_in}
              onChange={(e) => setFormData({ ...formData, face_width_allowance_in: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
        </div>
      </div>

      {/* Eligibility */}
      <div className="border-t pt-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Eligibility</h3>
        <div className="grid grid-cols-3 gap-2">
          {[
            { field: 'eligible_drive', label: 'Drive' },
            { field: 'eligible_tail', label: 'Tail' },
            { field: 'eligible_dirty_side', label: 'Dirty Side' },
            { field: 'eligible_crown', label: 'Crowned' },
            { field: 'eligible_v_guided', label: 'V-Guided' },
            { field: 'eligible_lagging', label: 'Lagging' },
          ].map(({ field, label }) => (
            <label key={field} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={formData[field as keyof typeof formData] as boolean}
                onChange={(e) => setFormData({ ...formData, [field]: e.target.checked })}
                className="rounded"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* Stress Limits */}
      <div className="border-t pt-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Stress Limits (override style defaults)</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Flat/Crowned (psi)</label>
            <input
              type="number"
              value={formData.tube_stress_limit_flat_psi}
              onChange={(e) => setFormData({ ...formData, tube_stress_limit_flat_psi: e.target.value })}
              placeholder="Leave empty to inherit from style"
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">V-Groove (psi)</label>
            <input
              type="number"
              value={formData.tube_stress_limit_vgroove_psi}
              onChange={(e) => setFormData({ ...formData, tube_stress_limit_vgroove_psi: e.target.value })}
              placeholder="Leave empty to inherit from style"
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="border-t pt-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={2}
          className="w-full px-3 py-2 border rounded-md"
        />
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="rounded"
          />
          <span className="text-sm">Active</span>
        </label>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Sort Order</label>
          <input
            type="number"
            value={formData.sort_order}
            onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
            className="w-20 px-2 py-1 text-sm border rounded-md"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
          Cancel
        </button>
        <button type="submit" disabled={isSaving} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
          {isSaving ? 'Saving...' : isCreating ? 'Create' : 'Save'}
        </button>
      </div>
    </form>
  );
}
