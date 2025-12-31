/**
 * Pulley Configuration Modal
 *
 * Allows configuring drive and tail pulleys for an application line.
 * Uses the new PCI-aligned pulley model with:
 * - pulley_library_styles (admin truth)
 * - application_pulleys (per-line configuration)
 */

'use client';

import { useState, useEffect } from 'react';
import { PulleyLibraryStyle } from '../api/admin/pulley-library/route';
import { ApplicationPulley, FaceProfile, LaggingType } from '../api/application-pulleys/route';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  applicationLineId: string | null;
  vGuideKey?: string; // Current V-guide selection from inputs
  onSave?: () => void; // Callback after successful save
}

type TabPosition = 'DRIVE' | 'TAIL';

const LAGGING_TYPE_LABELS: Record<LaggingType, string> = {
  NONE: 'None',
  RUBBER: 'Rubber',
  URETHANE: 'Urethane',
};

interface PulleyFormData {
  style_key: string;
  face_profile: FaceProfile;
  v_guide_key: string;
  lagging_type: LaggingType;
  lagging_thickness_in: string;
  shell_od_in: string;
  shell_wall_in: string;
  hub_centers_in: string;
  enforce_pci_checks: boolean;
  notes: string;
}

const emptyForm: PulleyFormData = {
  style_key: '',
  face_profile: 'FLAT',
  v_guide_key: '',
  lagging_type: 'NONE',
  lagging_thickness_in: '',
  shell_od_in: '',
  shell_wall_in: '',
  hub_centers_in: '',
  enforce_pci_checks: false,
  notes: '',
};

export default function PulleyConfigModal({
  isOpen,
  onClose,
  applicationLineId,
  vGuideKey,
  onSave,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabPosition>('DRIVE');
  const [styles, setStyles] = useState<PulleyLibraryStyle[]>([]);
  const [driveForm, setDriveForm] = useState<PulleyFormData>(emptyForm);
  const [tailForm, setTailForm] = useState<PulleyFormData>(emptyForm);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Load styles and existing pulley configs when modal opens
  useEffect(() => {
    if (isOpen && applicationLineId) {
      loadData();
    }
  }, [isOpen, applicationLineId]);

  // Auto-populate V-guide key from inputs
  useEffect(() => {
    if (vGuideKey) {
      setDriveForm((prev) => ({ ...prev, v_guide_key: vGuideKey }));
      setTailForm((prev) => ({ ...prev, v_guide_key: vGuideKey }));
    }
  }, [vGuideKey]);

  async function loadData() {
    setIsLoading(true);
    setError(null);
    try {
      // Load styles
      const stylesRes = await fetch('/api/admin/pulley-library');
      if (!stylesRes.ok) throw new Error('Failed to load pulley styles');
      const stylesData = await stylesRes.json();
      setStyles(stylesData);

      // Load existing pulleys for this line
      if (applicationLineId) {
        const pulleysRes = await fetch(`/api/application-pulleys?line_id=${applicationLineId}`);
        if (pulleysRes.ok) {
          const pulleysData = await pulleysRes.json();

          // Populate forms with existing data
          const drivePulley = pulleysData.find((p: ApplicationPulley) => p.position === 'DRIVE');
          const tailPulley = pulleysData.find((p: ApplicationPulley) => p.position === 'TAIL');

          if (drivePulley) {
            setDriveForm(pulleyToForm(drivePulley));
          } else {
            // Default to first eligible drive style
            const defaultDrive = stylesData.find((s: PulleyLibraryStyle) => s.eligible_drive);
            if (defaultDrive) {
              setDriveForm({ ...emptyForm, style_key: defaultDrive.key });
            }
          }

          if (tailPulley) {
            setTailForm(pulleyToForm(tailPulley));
          } else {
            // Default to first eligible tail style
            const defaultTail = stylesData.find((s: PulleyLibraryStyle) => s.eligible_tail);
            if (defaultTail) {
              setTailForm({ ...emptyForm, style_key: defaultTail.key });
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }

  function pulleyToForm(pulley: ApplicationPulley): PulleyFormData {
    return {
      style_key: pulley.style_key,
      face_profile: pulley.face_profile,
      v_guide_key: pulley.v_guide_key || '',
      lagging_type: pulley.lagging_type,
      lagging_thickness_in: pulley.lagging_thickness_in?.toString() || '',
      shell_od_in: pulley.shell_od_in?.toString() || '',
      shell_wall_in: pulley.shell_wall_in?.toString() || '',
      hub_centers_in: pulley.hub_centers_in?.toString() || '',
      enforce_pci_checks: pulley.enforce_pci_checks,
      notes: pulley.notes || '',
    };
  }

  // Get filtered styles for current position
  function getStylesForPosition(position: TabPosition): PulleyLibraryStyle[] {
    return styles.filter((s) =>
      position === 'DRIVE' ? s.eligible_drive : s.eligible_tail
    );
  }

  // Get current selected style
  function getSelectedStyle(position: TabPosition): PulleyLibraryStyle | undefined {
    const form = position === 'DRIVE' ? driveForm : tailForm;
    return styles.find((s) => s.key === form.style_key);
  }

  // Update form field
  function updateForm(position: TabPosition, field: keyof PulleyFormData, value: string | boolean) {
    const setter = position === 'DRIVE' ? setDriveForm : setTailForm;
    setter((prev) => ({ ...prev, [field]: value }));
  }

  // Handle style change - reset dependent fields
  function handleStyleChange(position: TabPosition, styleKey: string) {
    const setter = position === 'DRIVE' ? setDriveForm : setTailForm;
    const style = styles.find((s) => s.key === styleKey);

    setter((prev) => ({
      ...prev,
      style_key: styleKey,
      // Reset face_profile if not compatible
      face_profile: style?.eligible_crown ? prev.face_profile : 'FLAT',
      // Reset lagging if not compatible
      lagging_type: style?.eligible_lagging ? prev.lagging_type : 'NONE',
      lagging_thickness_in: style?.eligible_lagging ? prev.lagging_thickness_in : '',
    }));
  }

  async function handleSave() {
    if (!applicationLineId) {
      setError('No application line selected');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSaveMessage(null);

    try {
      // Save drive pulley
      if (driveForm.style_key) {
        const drivePayload = {
          application_line_id: applicationLineId,
          position: 'DRIVE',
          style_key: driveForm.style_key,
          face_profile: driveForm.face_profile,
          v_guide_key: driveForm.face_profile === 'V_GUIDED' ? driveForm.v_guide_key : null,
          lagging_type: driveForm.lagging_type,
          lagging_thickness_in: driveForm.lagging_type !== 'NONE'
            ? parseFloat(driveForm.lagging_thickness_in) || null
            : null,
          shell_od_in: driveForm.shell_od_in ? parseFloat(driveForm.shell_od_in) : null,
          shell_wall_in: driveForm.shell_wall_in ? parseFloat(driveForm.shell_wall_in) : null,
          hub_centers_in: driveForm.hub_centers_in ? parseFloat(driveForm.hub_centers_in) : null,
          enforce_pci_checks: driveForm.enforce_pci_checks,
          notes: driveForm.notes.trim() || null,
        };

        const driveRes = await fetch('/api/application-pulleys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(drivePayload),
        });

        if (!driveRes.ok) {
          const err = await driveRes.json();
          throw new Error(`Drive pulley: ${err.error}`);
        }
      }

      // Save tail pulley
      if (tailForm.style_key) {
        const tailPayload = {
          application_line_id: applicationLineId,
          position: 'TAIL',
          style_key: tailForm.style_key,
          face_profile: tailForm.face_profile,
          v_guide_key: tailForm.face_profile === 'V_GUIDED' ? tailForm.v_guide_key : null,
          lagging_type: tailForm.lagging_type,
          lagging_thickness_in: tailForm.lagging_type !== 'NONE'
            ? parseFloat(tailForm.lagging_thickness_in) || null
            : null,
          shell_od_in: tailForm.shell_od_in ? parseFloat(tailForm.shell_od_in) : null,
          shell_wall_in: tailForm.shell_wall_in ? parseFloat(tailForm.shell_wall_in) : null,
          hub_centers_in: tailForm.hub_centers_in ? parseFloat(tailForm.hub_centers_in) : null,
          enforce_pci_checks: tailForm.enforce_pci_checks,
          notes: tailForm.notes.trim() || null,
        };

        const tailRes = await fetch('/api/application-pulleys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tailPayload),
        });

        if (!tailRes.ok) {
          const err = await tailRes.json();
          throw new Error(`Tail pulley: ${err.error}`);
        }
      }

      setSaveMessage('Pulley configuration saved!');
      onSave?.();

      // Close after short delay
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  }

  if (!isOpen) return null;

  const currentForm = activeTab === 'DRIVE' ? driveForm : tailForm;
  const selectedStyle = getSelectedStyle(activeTab);
  const eligibleStyles = getStylesForPosition(activeTab);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Configure Pulleys</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 border-b border-gray-200">
          <div className="flex gap-4">
            {(['DRIVE', 'TAIL'] as TabPosition[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'DRIVE' ? 'Head/Drive Pulley' : 'Tail Pulley'}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
          {isLoading ? (
            <div className="py-8 text-center text-gray-500">Loading...</div>
          ) : (
            <div className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                  {error}
                </div>
              )}
              {saveMessage && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
                  {saveMessage}
                </div>
              )}

              {/* Style Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pulley Style
                </label>
                <select
                  value={currentForm.style_key}
                  onChange={(e) => handleStyleChange(activeTab, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a style...</option>
                  {eligibleStyles.map((style) => (
                    <option key={style.key} value={style.key}>
                      {style.name} ({style.style_type})
                    </option>
                  ))}
                </select>
                {selectedStyle?.description && (
                  <p className="mt-1 text-xs text-gray-500">{selectedStyle.description}</p>
                )}
              </div>

              {/* Face Profile */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Face Profile
                </label>
                <select
                  value={currentForm.face_profile}
                  onChange={(e) => updateForm(activeTab, 'face_profile', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="FLAT">Flat</option>
                  {selectedStyle?.eligible_crown && (
                    <option value="CROWNED">Crowned</option>
                  )}
                  {selectedStyle?.eligible_v_guided && (
                    <option value="V_GUIDED">V-Guided</option>
                  )}
                </select>
              </div>

              {/* V-Guide Key (only if V_GUIDED) */}
              {currentForm.face_profile === 'V_GUIDED' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    V-Guide Profile
                  </label>
                  <input
                    type="text"
                    value={currentForm.v_guide_key}
                    onChange={(e) => updateForm(activeTab, 'v_guide_key', e.target.value)}
                    placeholder="e.g., K10"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Use the V-guide key from the application (e.g., K10, K13)
                  </p>
                </div>
              )}

              {/* Lagging */}
              {selectedStyle?.eligible_lagging && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Lagging Type
                    </label>
                    <select
                      value={currentForm.lagging_type}
                      onChange={(e) => updateForm(activeTab, 'lagging_type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      {Object.entries(LAGGING_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                  {currentForm.lagging_type !== 'NONE' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Lagging Thickness (in)
                      </label>
                      <input
                        type="number"
                        step="0.125"
                        value={currentForm.lagging_thickness_in}
                        onChange={(e) => updateForm(activeTab, 'lagging_thickness_in', e.target.value)}
                        placeholder="0.25"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Geometry (optional) */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Geometry (optional - for PCI stress checks)
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Shell OD (in)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={currentForm.shell_od_in}
                      onChange={(e) => updateForm(activeTab, 'shell_od_in', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Shell Wall (in)</label>
                    <input
                      type="number"
                      step="0.0625"
                      value={currentForm.shell_wall_in}
                      onChange={(e) => updateForm(activeTab, 'shell_wall_in', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Hub Centers (in)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={currentForm.hub_centers_in}
                      onChange={(e) => updateForm(activeTab, 'hub_centers_in', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* PCI Enforcement */}
              <label className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  checked={currentForm.enforce_pci_checks}
                  onChange={(e) => updateForm(activeTab, 'enforce_pci_checks', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Enforce PCI tube stress checks</span>
              </label>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={currentForm.notes}
                  onChange={(e) => updateForm(activeTab, 'notes', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !driveForm.style_key || !tailForm.style_key}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
}
