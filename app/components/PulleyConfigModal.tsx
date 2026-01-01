/**
 * Pulley Configuration Modal
 *
 * Configures drive and tail pulleys for an application line.
 *
 * KEY CHANGES (v1.24):
 * - Users select MODELS (concrete sizes) not styles
 * - Shell OD and default wall come from the selected model
 * - Face width validation against model limits
 * - "Validate wall thickness" button with stress calculation
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { ApplicationPulley, LaggingType } from '../api/application-pulleys/route';
import { PulleyLibraryModel } from '../api/admin/pulley-models/route';
import {
  getBeltTrackingMode,
  getFaceProfileLabel,
} from '../../src/lib/pulley-tracking';
import {
  getEligibleModels,
  validateFaceWidth,
  validateWallThickness,
  formatWallThickness,
  WallValidationResult,
  PulleyModel,
} from '../../src/lib/pulley-models';
import { BeltTrackingMethod } from '../../src/models/sliderbed_v1/schema';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  applicationLineId: string | null;
  beltTrackingMethod?: BeltTrackingMethod | string | null;
  vGuideKey?: string | null;
  beltWidthIn?: number;
  onSave?: () => void;
}

type TabPosition = 'DRIVE' | 'TAIL';

const LAGGING_TYPE_LABELS: Record<LaggingType, string> = {
  NONE: 'None',
  RUBBER: 'Rubber',
  URETHANE: 'Urethane',
};

interface PulleyFormData {
  model_key: string;
  lagging_type: LaggingType;
  lagging_thickness_in: string;
  face_width_in: string;
  shell_wall_in: string;
  hub_centers_in: string;
  enforce_pci_checks: boolean;
  notes: string;
  // Validation state
  wallValidationStatus: 'NOT_VALIDATED' | 'PASS' | 'RECOMMEND_UPGRADE' | 'FAIL_ENGINEERING_REQUIRED';
  wallValidationResult: WallValidationResult | null;
}

const emptyForm: PulleyFormData = {
  model_key: '',
  lagging_type: 'NONE',
  lagging_thickness_in: '',
  face_width_in: '',
  shell_wall_in: '',
  hub_centers_in: '',
  enforce_pci_checks: false,
  notes: '',
  wallValidationStatus: 'NOT_VALIDATED',
  wallValidationResult: null,
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
  const [models, setModels] = useState<PulleyLibraryModel[]>([]);
  const [driveForm, setDriveForm] = useState<PulleyFormData>(emptyForm);
  const [tailForm, setTailForm] = useState<PulleyFormData>(emptyForm);
  const [existingDrive, setExistingDrive] = useState<ApplicationPulley | null>(null);
  const [existingTail, setExistingTail] = useState<ApplicationPulley | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Derive tracking mode from belt tracking inputs (READ-ONLY)
  const trackingMode = getBeltTrackingMode({ belt_tracking_method: beltTrackingMethod });
  const trackingLabel = getFaceProfileLabel(trackingMode);

  // Load models and existing pulley configs when modal opens
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
    }
  }, [isOpen]);

  async function loadData() {
    setIsLoading(true);
    setError(null);
    try {
      // Load models
      const modelsRes = await fetch('/api/admin/pulley-models');
      if (!modelsRes.ok) throw new Error('Failed to load pulley models');
      const modelsData: PulleyLibraryModel[] = await modelsRes.json();
      setModels(modelsData);

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
            // Default to first eligible drive model
            const eligibleDrive = getEligibleModelsForPosition(modelsData, 'DRIVE');
            if (eligibleDrive.length > 0) {
              setDriveForm(createFormFromModel(eligibleDrive[0]));
            }
          }

          if (tailPulley) {
            setTailForm(pulleyToForm(tailPulley));
          } else {
            // Default to first eligible tail model
            const eligibleTail = getEligibleModelsForPosition(modelsData, 'TAIL');
            if (eligibleTail.length > 0) {
              setTailForm(createFormFromModel(eligibleTail[0]));
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

  function getEligibleModelsForPosition(allModels: PulleyLibraryModel[], position: TabPosition): PulleyLibraryModel[] {
    return getEligibleModels(allModels as PulleyModel[], position, trackingMode) as PulleyLibraryModel[];
  }

  function createFormFromModel(model: PulleyLibraryModel): PulleyFormData {
    const defaultFaceWidth = beltWidthIn ? beltWidthIn + model.face_width_allowance_in : undefined;
    return {
      model_key: model.model_key,
      lagging_type: 'NONE',
      lagging_thickness_in: '',
      face_width_in: defaultFaceWidth?.toString() || '',
      shell_wall_in: model.default_shell_wall_in.toString(),
      hub_centers_in: '',
      enforce_pci_checks: false,
      notes: '',
      wallValidationStatus: 'NOT_VALIDATED',
      wallValidationResult: null,
    };
  }

  function pulleyToForm(pulley: ApplicationPulley): PulleyFormData {
    return {
      model_key: pulley.model_key || pulley.style_key, // Fallback to style_key for legacy
      lagging_type: pulley.lagging_type,
      lagging_thickness_in: pulley.lagging_thickness_in?.toString() || '',
      face_width_in: pulley.face_width_in?.toString() || '',
      shell_wall_in: pulley.shell_wall_in?.toString() || '',
      hub_centers_in: pulley.hub_centers_in?.toString() || '',
      enforce_pci_checks: pulley.enforce_pci_checks,
      notes: pulley.notes || '',
      wallValidationStatus: (pulley.wall_validation_status as PulleyFormData['wallValidationStatus']) || 'NOT_VALIDATED',
      wallValidationResult: pulley.wall_validation_result as WallValidationResult | null,
    };
  }

  // Get current selected model
  function getSelectedModel(position: TabPosition): PulleyLibraryModel | undefined {
    const form = position === 'DRIVE' ? driveForm : tailForm;
    return models.find((m) => m.model_key === form.model_key);
  }

  // Update form field
  function updateForm(position: TabPosition, field: keyof PulleyFormData, value: string | boolean | WallValidationResult | null) {
    const setter = position === 'DRIVE' ? setDriveForm : setTailForm;
    setter((prev) => ({
      ...prev,
      [field]: value,
      // Reset validation when relevant fields change
      ...((['shell_wall_in', 'face_width_in', 'lagging_type', 'lagging_thickness_in'].includes(field as string)) && {
        wallValidationStatus: 'NOT_VALIDATED' as const,
        wallValidationResult: null,
      }),
    }));
  }

  // Handle model change - apply model defaults
  function handleModelChange(position: TabPosition, modelKey: string) {
    const setter = position === 'DRIVE' ? setDriveForm : setTailForm;
    const model = models.find((m) => m.model_key === modelKey);
    const defaultFaceWidth = beltWidthIn ? beltWidthIn + (model?.face_width_allowance_in || 2) : undefined;

    setter((prev) => ({
      ...prev,
      model_key: modelKey,
      shell_wall_in: model?.default_shell_wall_in.toString() || prev.shell_wall_in,
      face_width_in: prev.face_width_in || defaultFaceWidth?.toString() || '',
      // Reset lagging if model doesn't support it
      lagging_type: model?.eligible_lagging ? prev.lagging_type : 'NONE',
      lagging_thickness_in: model?.eligible_lagging ? prev.lagging_thickness_in : '',
      // Reset validation
      wallValidationStatus: 'NOT_VALIDATED',
      wallValidationResult: null,
    }));
  }

  // Validate face width against model limits
  const getFaceWidthValidation = useCallback(
    (position: TabPosition): { valid: boolean; message: string } | null => {
      const form = position === 'DRIVE' ? driveForm : tailForm;
      const model = models.find((m) => m.model_key === form.model_key);
      if (!model || !form.face_width_in) return null;
      return validateFaceWidth(model as PulleyModel, parseFloat(form.face_width_in));
    },
    [driveForm, tailForm, models]
  );

  // Run wall thickness validation
  function runWallValidation(position: TabPosition) {
    const form = position === 'DRIVE' ? driveForm : tailForm;
    const model = models.find((m) => m.model_key === form.model_key);

    if (!model) {
      setError('Please select a pulley model first');
      return;
    }

    const faceWidth = parseFloat(form.face_width_in);
    const shellWall = parseFloat(form.shell_wall_in);

    if (!faceWidth || !shellWall) {
      setError('Face width and wall thickness are required for validation');
      return;
    }

    const result = validateWallThickness({
      model: model as PulleyModel,
      shellWallIn: shellWall,
      faceWidthIn: faceWidth,
      trackingMode,
      laggingThicknessIn: form.lagging_type !== 'NONE' ? parseFloat(form.lagging_thickness_in) || 0 : 0,
    });

    const setter = position === 'DRIVE' ? setDriveForm : setTailForm;
    setter((prev) => ({
      ...prev,
      wallValidationStatus: result.status,
      wallValidationResult: result,
    }));
  }

  // Apply recommended wall thickness
  function applyRecommendedWall(position: TabPosition) {
    const form = position === 'DRIVE' ? driveForm : tailForm;
    if (form.wallValidationResult?.recommendedWallIn) {
      updateForm(position, 'shell_wall_in', form.wallValidationResult.recommendedWallIn.toString());
    }
  }

  // Compute finished OD for display
  function getComputedFinishedOd(position: TabPosition): string {
    const form = position === 'DRIVE' ? driveForm : tailForm;
    const model = models.find((m) => m.model_key === form.model_key);
    if (!model) return '—';
    const laggingThickness = form.lagging_type !== 'NONE' ? parseFloat(form.lagging_thickness_in) || 0 : 0;
    const finishedOd = model.shell_od_in + 2 * laggingThickness;
    return `${finishedOd.toFixed(2)}"`;
  }

  async function handleSave() {
    if (!applicationLineId) {
      setError('No application line selected');
      return;
    }

    // Validate face widths
    const driveFaceValidation = getFaceWidthValidation('DRIVE');
    const tailFaceValidation = getFaceWidthValidation('TAIL');
    if (driveFaceValidation && !driveFaceValidation.valid) {
      setError(`Drive pulley: ${driveFaceValidation.message}`);
      return;
    }
    if (tailFaceValidation && !tailFaceValidation.valid) {
      setError(`Tail pulley: ${tailFaceValidation.message}`);
      return;
    }

    setIsSaving(true);
    setError(null);
    setSaveMessage(null);

    try {
      // Save drive pulley
      if (driveForm.model_key) {
        const driveModel = models.find((m) => m.model_key === driveForm.model_key);
        const drivePayload = {
          application_line_id: applicationLineId,
          position: 'DRIVE',
          model_key: driveForm.model_key,
          style_key: driveModel?.style_key || driveForm.model_key, // Keep style_key for backward compat
          face_profile: trackingMode,
          v_guide_key: trackingMode === 'V_GUIDED' ? vGuideKey : null,
          lagging_type: driveForm.lagging_type,
          lagging_thickness_in:
            driveForm.lagging_type !== 'NONE'
              ? parseFloat(driveForm.lagging_thickness_in) || null
              : null,
          face_width_in: driveForm.face_width_in ? parseFloat(driveForm.face_width_in) : null,
          shell_od_in: driveModel?.shell_od_in || null,
          shell_wall_in: driveForm.shell_wall_in ? parseFloat(driveForm.shell_wall_in) : null,
          hub_centers_in: driveForm.hub_centers_in ? parseFloat(driveForm.hub_centers_in) : null,
          enforce_pci_checks: driveForm.enforce_pci_checks,
          notes: driveForm.notes.trim() || null,
          wall_validation_status: driveForm.wallValidationStatus,
          wall_validation_result: driveForm.wallValidationResult,
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
      if (tailForm.model_key) {
        const tailModel = models.find((m) => m.model_key === tailForm.model_key);
        const tailPayload = {
          application_line_id: applicationLineId,
          position: 'TAIL',
          model_key: tailForm.model_key,
          style_key: tailModel?.style_key || tailForm.model_key,
          face_profile: trackingMode,
          v_guide_key: trackingMode === 'V_GUIDED' ? vGuideKey : null,
          lagging_type: tailForm.lagging_type,
          lagging_thickness_in:
            tailForm.lagging_type !== 'NONE'
              ? parseFloat(tailForm.lagging_thickness_in) || null
              : null,
          face_width_in: tailForm.face_width_in ? parseFloat(tailForm.face_width_in) : null,
          shell_od_in: tailModel?.shell_od_in || null,
          shell_wall_in: tailForm.shell_wall_in ? parseFloat(tailForm.shell_wall_in) : null,
          hub_centers_in: tailForm.hub_centers_in ? parseFloat(tailForm.hub_centers_in) : null,
          enforce_pci_checks: tailForm.enforce_pci_checks,
          notes: tailForm.notes.trim() || null,
          wall_validation_status: tailForm.wallValidationStatus,
          wall_validation_result: tailForm.wallValidationResult,
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
  const selectedModel = getSelectedModel(activeTab);
  const eligibleModels = getEligibleModelsForPosition(models, activeTab);
  const faceWidthValidation = getFaceWidthValidation(activeTab);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Configure Pulleys</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tracking Mode Banner */}
        <div className="px-6 py-3 bg-blue-50 border-b border-blue-100">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700 font-medium">
              Tracking: {trackingLabel}
              {trackingMode === 'V_GUIDED' && vGuideKey && ` (${vGuideKey})`}
            </span>
            <span className="text-xs text-blue-500">Change in Belt section</span>
          </div>
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

              {/* Model Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pulley Model</label>
                <select
                  value={currentForm.model_key}
                  onChange={(e) => handleModelChange(activeTab, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a model...</option>
                  {eligibleModels.map((model) => (
                    <option key={model.model_key} value={model.model_key}>
                      {model.display_name} ({model.shell_od_in}" OD)
                    </option>
                  ))}
                </select>
                {selectedModel?.description && (
                  <p className="mt-1 text-xs text-gray-500">{selectedModel.description}</p>
                )}
                {selectedModel && (
                  <p className="mt-1 text-xs text-gray-500">
                    Face width: {selectedModel.face_width_min_in}" – {selectedModel.face_width_max_in}"
                  </p>
                )}
              </div>

              {/* Face Width */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Face Width (in)</label>
                <input
                  type="number"
                  step="0.5"
                  value={currentForm.face_width_in}
                  onChange={(e) => updateForm(activeTab, 'face_width_in', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                    faceWidthValidation && !faceWidthValidation.valid ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {faceWidthValidation && !faceWidthValidation.valid && (
                  <p className="mt-1 text-xs text-red-600">{faceWidthValidation.message}</p>
                )}
                {faceWidthValidation && faceWidthValidation.valid && (
                  <p className="mt-1 text-xs text-green-600">{faceWidthValidation.message}</p>
                )}
              </div>

              {/* Wall Thickness with Validation */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Wall Thickness (in)</label>
                  <button
                    type="button"
                    onClick={() => runWallValidation(activeTab)}
                    disabled={!selectedModel || !currentForm.face_width_in || !currentForm.shell_wall_in}
                    className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
                  >
                    Validate Wall Thickness
                  </button>
                </div>
                <select
                  value={currentForm.shell_wall_in}
                  onChange={(e) => updateForm(activeTab, 'shell_wall_in', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select wall thickness...</option>
                  {selectedModel?.allowed_wall_steps_in?.map((wall) => (
                    <option key={wall} value={wall.toString()}>
                      {formatWallThickness(wall)}
                    </option>
                  ))}
                </select>

                {/* Validation Result */}
                {currentForm.wallValidationStatus !== 'NOT_VALIDATED' && currentForm.wallValidationResult && (
                  <div className={`mt-2 p-3 rounded-md text-sm ${
                    currentForm.wallValidationStatus === 'PASS'
                      ? 'bg-green-50 border border-green-200 text-green-700'
                      : currentForm.wallValidationStatus === 'RECOMMEND_UPGRADE'
                      ? 'bg-amber-50 border border-amber-200 text-amber-700'
                      : 'bg-red-50 border border-red-200 text-red-700'
                  }`}>
                    <div className="font-medium mb-1">
                      {currentForm.wallValidationStatus === 'PASS' && 'PASS'}
                      {currentForm.wallValidationStatus === 'RECOMMEND_UPGRADE' && 'Upgrade Recommended'}
                      {currentForm.wallValidationStatus === 'FAIL_ENGINEERING_REQUIRED' && 'Engineering Required'}
                    </div>
                    <p>{currentForm.wallValidationResult.message}</p>
                    <p className="text-xs mt-1">
                      Stress: {currentForm.wallValidationResult.computedStressPsi.toFixed(0)} psi / {currentForm.wallValidationResult.stressLimitPsi} psi limit
                      ({currentForm.wallValidationResult.utilizationPercent.toFixed(0)}%)
                    </p>
                    {currentForm.wallValidationResult.recommendedWallIn && (
                      <button
                        type="button"
                        onClick={() => applyRecommendedWall(activeTab)}
                        className="mt-2 text-xs px-2 py-1 bg-amber-200 text-amber-800 rounded hover:bg-amber-300"
                      >
                        Apply recommendation: {formatWallThickness(currentForm.wallValidationResult.recommendedWallIn)}
                      </button>
                    )}
                  </div>
                )}

                {currentForm.wallValidationStatus === 'NOT_VALIDATED' && currentForm.model_key && (
                  <p className="mt-1 text-xs text-amber-600">
                    Wall thickness not validated. Click "Validate" to check stress.
                  </p>
                )}
              </div>

              {/* Lagging */}
              {selectedModel?.eligible_lagging && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Lagging Type</label>
                    <select
                      value={currentForm.lagging_type}
                      onChange={(e) => updateForm(activeTab, 'lagging_type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      {Object.entries(LAGGING_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                  {currentForm.lagging_type !== 'NONE' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Lagging Thickness (in)</label>
                      <input
                        type="number"
                        step="0.125"
                        value={currentForm.lagging_thickness_in}
                        onChange={(e) => updateForm(activeTab, 'lagging_thickness_in', e.target.value)}
                        placeholder="0.25"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Summary */}
              {selectedModel && (
                <div className="bg-gray-50 p-3 rounded-md text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-gray-500">Shell OD:</span>
                      <span className="ml-2 font-medium">{selectedModel.shell_od_in}"</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Finished OD:</span>
                      <span className="ml-2 font-medium text-blue-600">{getComputedFinishedOd(activeTab)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={currentForm.notes}
                  onChange={(e) => updateForm(activeTab, 'notes', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
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
                className="px-4 py-2 text-red-600 bg-red-50 rounded-md hover:bg-red-100 text-sm"
              >
                Clear {activeTab === 'DRIVE' ? 'Drive' : 'Tail'} Pulley
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !driveForm.model_key || !tailForm.model_key}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
