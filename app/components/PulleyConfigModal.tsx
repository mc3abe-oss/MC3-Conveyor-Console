/**
 * Pulley Configuration Modal
 *
 * Configures drive and tail pulleys for an application line.
 *
 * CRITICAL: Belt tracking drives pulley face profile.
 * - Users do NOT select face profile in this modal
 * - Face profile is derived from belt tracking and shown READ-ONLY
 * - Style options are filtered by position AND tracking eligibility
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { PulleyLibraryStyle } from '../api/admin/pulley-library/route';
import { ApplicationPulley, LaggingType } from '../api/application-pulleys/route';
import {
  getBeltTrackingMode,
  getFaceProfileLabel,
  getEligiblePulleyStyles,
  isStyleCompatible,
  computeFinishedOd,
  PulleyStyleEligibility,
} from '../../src/lib/pulley-tracking';
import { BeltTrackingMethod } from '../../src/models/sliderbed_v1/schema';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  applicationLineId: string | null;
  /** Current belt tracking method from inputs */
  beltTrackingMethod?: BeltTrackingMethod | string | null;
  /** Current V-guide key from inputs (for reference) */
  vGuideKey?: string | null;
  /** Current belt width for face width default */
  beltWidthIn?: number;
  /** Callback after successful save */
  onSave?: () => void;
}

type TabPosition = 'DRIVE' | 'TAIL';

const LAGGING_TYPE_LABELS: Record<LaggingType, string> = {
  NONE: 'None',
  RUBBER: 'Rubber',
  URETHANE: 'Urethane',
};

/** Default face width allowance (belt width + this value) */
const FACE_WIDTH_ALLOWANCE_IN = 2.0;

interface PulleyFormData {
  style_key: string;
  lagging_type: LaggingType;
  lagging_thickness_in: string;
  face_width_in: string;
  shell_od_in: string;
  shell_wall_in: string;
  hub_centers_in: string;
  enforce_pci_checks: boolean;
  notes: string;
}

const emptyForm: PulleyFormData = {
  style_key: '',
  lagging_type: 'NONE',
  lagging_thickness_in: '',
  face_width_in: '',
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
  beltTrackingMethod,
  vGuideKey,
  beltWidthIn,
  onSave,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabPosition>('DRIVE');
  const [styles, setStyles] = useState<PulleyLibraryStyle[]>([]);
  const [driveForm, setDriveForm] = useState<PulleyFormData>(emptyForm);
  const [tailForm, setTailForm] = useState<PulleyFormData>(emptyForm);
  const [existingDrive, setExistingDrive] = useState<ApplicationPulley | null>(null);
  const [existingTail, setExistingTail] = useState<ApplicationPulley | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Derive tracking mode from belt tracking inputs (READ-ONLY)
  const trackingMode = getBeltTrackingMode({ belt_tracking_method: beltTrackingMethod });
  const trackingLabel = getFaceProfileLabel(trackingMode);

  // Default face width from belt width
  const defaultFaceWidth = beltWidthIn ? beltWidthIn + FACE_WIDTH_ALLOWANCE_IN : undefined;

  // Load styles and existing pulley configs when modal opens
  useEffect(() => {
    if (isOpen && applicationLineId) {
      loadData();
    }
  }, [isOpen, applicationLineId]);

  // Reset forms when modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSaveMessage(null);
      setShowAdvanced(false);
    }
  }, [isOpen]);

  async function loadData() {
    setIsLoading(true);
    setError(null);
    try {
      // Load styles
      const stylesRes = await fetch('/api/admin/pulley-library');
      if (!stylesRes.ok) throw new Error('Failed to load pulley styles');
      const stylesData: PulleyLibraryStyle[] = await stylesRes.json();
      setStyles(stylesData);

      // Load existing pulleys for this line
      if (applicationLineId) {
        const pulleysRes = await fetch(`/api/application-pulleys?line_id=${applicationLineId}`);
        if (pulleysRes.ok) {
          const pulleysData: ApplicationPulley[] = await pulleysRes.json();

          const drivePulley = pulleysData.find((p) => p.position === 'DRIVE');
          const tailPulley = pulleysData.find((p) => p.position === 'TAIL');

          setExistingDrive(drivePulley || null);
          setExistingTail(tailPulley || null);

          if (drivePulley) {
            setDriveForm(pulleyToForm(drivePulley));
          } else {
            // Default to first eligible drive style
            const eligibleDrive = getEligibleStyles(stylesData, 'DRIVE');
            if (eligibleDrive.length > 0) {
              setDriveForm({
                ...emptyForm,
                style_key: eligibleDrive[0].key,
                face_width_in: defaultFaceWidth?.toString() || '',
              });
            }
          }

          if (tailPulley) {
            setTailForm(pulleyToForm(tailPulley));
          } else {
            // Default to first eligible tail style
            const eligibleTail = getEligibleStyles(stylesData, 'TAIL');
            if (eligibleTail.length > 0) {
              setTailForm({
                ...emptyForm,
                style_key: eligibleTail[0].key,
                face_width_in: defaultFaceWidth?.toString() || '',
              });
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
      lagging_type: pulley.lagging_type,
      lagging_thickness_in: pulley.lagging_thickness_in?.toString() || '',
      face_width_in: pulley.face_width_in?.toString() || '',
      shell_od_in: pulley.shell_od_in?.toString() || '',
      shell_wall_in: pulley.shell_wall_in?.toString() || '',
      hub_centers_in: pulley.hub_centers_in?.toString() || '',
      enforce_pci_checks: pulley.enforce_pci_checks,
      notes: pulley.notes || '',
    };
  }

  // Get filtered styles for position + tracking
  const getEligibleStyles = useCallback(
    (allStyles: PulleyLibraryStyle[], position: TabPosition): PulleyStyleEligibility[] => {
      return getEligiblePulleyStyles(
        allStyles.map((s) => ({
          key: s.key,
          name: s.name,
          eligible_drive: s.eligible_drive,
          eligible_tail: s.eligible_tail,
          eligible_crown: s.eligible_crown,
          eligible_v_guided: s.eligible_v_guided,
          is_active: s.is_active,
        })),
        position,
        trackingMode
      );
    },
    [trackingMode]
  );

  // Get current selected style
  function getSelectedStyle(position: TabPosition): PulleyLibraryStyle | undefined {
    const form = position === 'DRIVE' ? driveForm : tailForm;
    return styles.find((s) => s.key === form.style_key);
  }

  // Check if current style is compatible with tracking
  function isCurrentStyleCompatible(position: TabPosition): boolean {
    const form = position === 'DRIVE' ? driveForm : tailForm;
    const style = styles.find((s) => s.key === form.style_key);
    if (!style) return true; // No style selected yet
    return isStyleCompatible(
      {
        key: style.key,
        name: style.name,
        eligible_drive: style.eligible_drive,
        eligible_tail: style.eligible_tail,
        eligible_crown: style.eligible_crown,
        eligible_v_guided: style.eligible_v_guided,
        is_active: style.is_active,
      },
      position,
      trackingMode
    );
  }

  // Update form field
  function updateForm(position: TabPosition, field: keyof PulleyFormData, value: string | boolean) {
    const setter = position === 'DRIVE' ? setDriveForm : setTailForm;
    setter((prev) => ({ ...prev, [field]: value }));
  }

  // Handle style change - apply style defaults
  function handleStyleChange(position: TabPosition, styleKey: string) {
    const setter = position === 'DRIVE' ? setDriveForm : setTailForm;
    const style = styles.find((s) => s.key === styleKey);

    setter((prev) => ({
      ...prev,
      style_key: styleKey,
      // Reset lagging if style doesn't support it
      lagging_type: style?.eligible_lagging ? prev.lagging_type : 'NONE',
      lagging_thickness_in: style?.eligible_lagging ? prev.lagging_thickness_in : '',
      // Apply style defaults for face width if empty
      face_width_in: prev.face_width_in || defaultFaceWidth?.toString() || '',
    }));
  }

  // Compute finished OD for display
  function getComputedFinishedOd(form: PulleyFormData): string {
    const shellOd = parseFloat(form.shell_od_in);
    const isLagged = form.lagging_type !== 'NONE';
    const thickness = parseFloat(form.lagging_thickness_in);
    const finished = computeFinishedOd(shellOd, isLagged, thickness);
    return finished ? `${finished.toFixed(2)}"` : '—';
  }

  async function handleSave() {
    if (!applicationLineId) {
      setError('No application line selected');
      return;
    }

    // Validate style compatibility
    if (!isCurrentStyleCompatible('DRIVE') || !isCurrentStyleCompatible('TAIL')) {
      setError('Selected style is not compatible with current belt tracking. Please select a different style.');
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
          // Face profile derived from tracking - not user input
          face_profile: trackingMode,
          v_guide_key: trackingMode === 'V_GUIDED' ? vGuideKey : null,
          lagging_type: driveForm.lagging_type,
          lagging_thickness_in:
            driveForm.lagging_type !== 'NONE'
              ? parseFloat(driveForm.lagging_thickness_in) || null
              : null,
          face_width_in: driveForm.face_width_in ? parseFloat(driveForm.face_width_in) : null,
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
          face_profile: trackingMode,
          v_guide_key: trackingMode === 'V_GUIDED' ? vGuideKey : null,
          lagging_type: tailForm.lagging_type,
          lagging_thickness_in:
            tailForm.lagging_type !== 'NONE'
              ? parseFloat(tailForm.lagging_thickness_in) || null
              : null,
          face_width_in: tailForm.face_width_in ? parseFloat(tailForm.face_width_in) : null,
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
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleClear(position: TabPosition) {
    const existing = position === 'DRIVE' ? existingDrive : existingTail;
    if (!existing) return;

    try {
      const res = await fetch(`/api/application-pulleys?id=${existing.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      // Reset form and clear existing
      const setter = position === 'DRIVE' ? setDriveForm : setTailForm;
      const setExisting = position === 'DRIVE' ? setExistingDrive : setExistingTail;
      setter(emptyForm);
      setExisting(null);
      onSave?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Clear failed');
    }
  }

  if (!isOpen) return null;

  const currentForm = activeTab === 'DRIVE' ? driveForm : tailForm;
  const selectedStyle = getSelectedStyle(activeTab);
  const eligibleStyles = getEligibleStyles(styles, activeTab);
  const styleCompatible = isCurrentStyleCompatible(activeTab);

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
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Tracking Mode Banner - READ ONLY */}
        <div className="px-6 py-3 bg-blue-50 border-b border-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-blue-700 font-medium">
                Tracking (from Belt): {trackingLabel}
              </span>
              {trackingMode === 'V_GUIDED' && vGuideKey && (
                <span className="ml-2 text-xs text-blue-600">({vGuideKey})</span>
              )}
            </div>
            <span className="text-xs text-blue-500">Change tracking in the Belt section</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 border-b border-gray-200">
          <div className="flex gap-4">
            {(['DRIVE', 'TAIL'] as TabPosition[]).map((tab) => {
              const tabCompatible =
                tab === 'DRIVE' ? isCurrentStyleCompatible('DRIVE') : isCurrentStyleCompatible('TAIL');
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  } ${!tabCompatible ? 'text-red-500' : ''}`}
                >
                  {tab === 'DRIVE' ? 'Head/Drive Pulley' : 'Tail Pulley'}
                  {!tabCompatible && <span className="ml-1 text-red-500">!</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[55vh]">
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

              {/* Style Compatibility Warning */}
              {!styleCompatible && currentForm.style_key && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                  <strong>Style not compatible:</strong> The selected style "{selectedStyle?.name}" is
                  not compatible with {trackingLabel} tracking. Please select a different style.
                </div>
              )}

              {/* Style Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pulley Style</label>
                <select
                  value={currentForm.style_key}
                  onChange={(e) => handleStyleChange(activeTab, e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                    !styleCompatible ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select a style...</option>
                  {eligibleStyles.map((style) => (
                    <option key={style.key} value={style.key}>
                      {style.name}
                    </option>
                  ))}
                </select>
                {selectedStyle?.description && (
                  <p className="mt-1 text-xs text-gray-500">{selectedStyle.description}</p>
                )}
                {eligibleStyles.length === 0 && (
                  <p className="mt-1 text-xs text-amber-600">
                    No styles available for {activeTab.toLowerCase()} position with {trackingLabel}{' '}
                    tracking.
                  </p>
                )}
              </div>

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
                        <option key={value} value={value}>
                          {label}
                        </option>
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

              {/* Face Width */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Face Width (in)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={currentForm.face_width_in}
                  onChange={(e) => updateForm(activeTab, 'face_width_in', e.target.value)}
                  placeholder={defaultFaceWidth ? `${defaultFaceWidth} (belt + ${FACE_WIDTH_ALLOWANCE_IN}")` : 'Enter face width'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                {defaultFaceWidth && !currentForm.face_width_in && (
                  <p className="mt-1 text-xs text-gray-500">
                    Default: {defaultFaceWidth}" (belt width + {FACE_WIDTH_ALLOWANCE_IN}" allowance)
                  </p>
                )}
              </div>

              {/* Advanced Geometry Toggle */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  <svg
                    className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                  Advanced Geometry (for PCI stress checks)
                </button>

                {showAdvanced && (
                  <div className="mt-3 space-y-3">
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

                    {/* Computed Finished OD */}
                    <div className="text-sm">
                      <span className="text-gray-600">Finished OD (computed): </span>
                      <span className="font-medium text-blue-600">
                        {getComputedFinishedOd(currentForm)}
                      </span>
                    </div>

                    {/* PCI Enforcement */}
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={currentForm.enforce_pci_checks}
                        onChange={(e) => updateForm(activeTab, 'enforce_pci_checks', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Enforce PCI tube stress checks</span>
                    </label>
                  </div>
                )}
              </div>

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
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
          <div>
            {(activeTab === 'DRIVE' ? existingDrive : existingTail) && (
              <button
                onClick={() => handleClear(activeTab)}
                className="px-4 py-2 text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors text-sm"
              >
                Clear {activeTab === 'DRIVE' ? 'Drive' : 'Tail'} Pulley
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !driveForm.style_key || !tailForm.style_key || !styleCompatible}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
