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
import { ApplicationPulley, LaggingType, LaggingPattern } from '../api/application-pulleys/route';
import { LAGGING_PATTERN_LABELS } from '../../src/lib/lagging-patterns';
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
  getAllowedThicknessOptions,
} from '../../src/lib/pulley-models';
import { BeltTrackingMethod } from '../../src/models/sliderbed_v1/schema';
import {
  BushingSystemType,
  HUB_CONNECTION_OPTIONS,
  getVisibleBushingSystemOptions,
  getHubConnectionOption,
  getBushingSystemOption,
  requiresBushingSystem,
  isNotIdealForDrive,
  DEFAULT_DRIVE_HUB_CONNECTION_TYPE,
  DEFAULT_TAIL_HUB_CONNECTION_TYPE,
  DEFAULT_BUSHING_SYSTEM,
} from '../../src/models/sliderbed_v1/pciHubConnections';

interface Props {
  isOpen: boolean;
  pulleyEnd: 'drive' | 'tail';
  onClose: () => void;
  applicationLineId: string | null;
  beltTrackingMethod?: BeltTrackingMethod | string | null;
  vGuideKey?: string | null;
  beltWidthIn?: number;
  calculatedPulleyRpm?: number;  // Calculated pulley RPM for balancing recommendation
  onSave?: () => void;
}

type TabPosition = 'DRIVE' | 'TAIL';

const LAGGING_TYPE_LABELS: Record<LaggingType, string> = {
  NONE: 'None',
  RUBBER: 'Rubber',
  URETHANE: 'Urethane',
};

type FaceWidthMode = 'AUTO' | 'MANUAL';

interface PulleyFormData {
  model_key: string;
  lagging_type: LaggingType;
  lagging_thickness_in: string;
  lagging_pattern: LaggingPattern;
  lagging_pattern_notes: string;
  face_width_mode: FaceWidthMode;  // v1.28: AUTO = belt_width + allowance, MANUAL = user override
  face_width_allowance_in: string; // v1.28: Allowance for Auto mode
  face_width_in: string;
  shell_wall_in: string;
  hub_centers_in: string;
  enforce_pci_checks: boolean;
  notes: string;
  // v1.30: Hub Connection (PCI Pages 12-14)
  hub_connection_type: string;
  bushing_system: string;
  hub_details_expanded: boolean;
  // Pulley Balancing
  balance_required: boolean;
  balance_method: 'static' | 'dynamic';
  balance_rpm: string;
  balance_grade: string;
  balance_source: 'internal_guideline' | 'vendor_spec' | 'user_override';
  // Validation state
  wallValidationStatus: 'NOT_VALIDATED' | 'PASS' | 'RECOMMEND_UPGRADE' | 'FAIL_ENGINEERING_REQUIRED';
  wallValidationResult: WallValidationResult | null;
}

// Minimum allowance based on tracking method
const MIN_ALLOWANCE_CROWNED_IN = 2.0;
const MIN_ALLOWANCE_NOT_CROWNED_IN = 0.75;

const emptyForm: PulleyFormData = {
  model_key: '',
  lagging_type: 'NONE',
  lagging_thickness_in: '',
  lagging_pattern: 'none',
  lagging_pattern_notes: '',
  face_width_mode: 'AUTO',
  face_width_allowance_in: '',
  face_width_in: '',
  shell_wall_in: '',
  hub_centers_in: '',
  enforce_pci_checks: false,
  notes: '',
  // v1.30: Hub Connection defaults (drive default used for empty form)
  hub_connection_type: DEFAULT_DRIVE_HUB_CONNECTION_TYPE,
  bushing_system: DEFAULT_BUSHING_SYSTEM,
  hub_details_expanded: false,
  // Pulley Balancing defaults
  balance_required: false,
  balance_method: 'dynamic',
  balance_rpm: '',
  balance_grade: '',
  balance_source: 'internal_guideline',
  wallValidationStatus: 'NOT_VALIDATED',
  wallValidationResult: null,
};

export default function PulleyConfigModal({
  isOpen,
  pulleyEnd,
  onClose,
  applicationLineId,
  beltTrackingMethod,
  vGuideKey,
  beltWidthIn,
  calculatedPulleyRpm,
  onSave,
}: Props) {
  // Derive activeTab from pulleyEnd prop (no longer using internal tab state)
  const activeTab: TabPosition = pulleyEnd === 'drive' ? 'DRIVE' : 'TAIL';
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
            setDriveForm(pulleyToForm(drivePulley, modelsData, 'DRIVE'));
          } else {
            // Default to first eligible drive model
            const eligibleDrive = getEligibleModelsForPosition(modelsData, 'DRIVE');
            if (eligibleDrive.length > 0) {
              setDriveForm(createFormFromModel(eligibleDrive[0], 'DRIVE'));
            }
          }

          if (tailPulley) {
            setTailForm(pulleyToForm(tailPulley, modelsData, 'TAIL'));
          } else {
            // Default to first eligible tail model
            const eligibleTail = getEligibleModelsForPosition(modelsData, 'TAIL');
            if (eligibleTail.length > 0) {
              setTailForm(createFormFromModel(eligibleTail[0], 'TAIL'));
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

  // Get minimum allowance based on tracking mode
  function getMinAllowanceIn(): number {
    return trackingMode === 'CROWNED' ? MIN_ALLOWANCE_CROWNED_IN : MIN_ALLOWANCE_NOT_CROWNED_IN;
  }

  // Get default allowance from model or use minimum
  function getDefaultAllowance(model: PulleyLibraryModel): number {
    const modelAllowance = model.face_width_allowance_in;
    const minAllowance = getMinAllowanceIn();
    return Math.max(modelAllowance, minAllowance);
  }

  function createFormFromModel(model: PulleyLibraryModel, position: TabPosition): PulleyFormData {
    const defaultAllowance = getDefaultAllowance(model);
    const defaultFaceWidth = beltWidthIn ? beltWidthIn + defaultAllowance : undefined;
    // v1.30: Position-specific hub connection defaults
    const defaultHubConnection = position === 'DRIVE'
      ? DEFAULT_DRIVE_HUB_CONNECTION_TYPE
      : DEFAULT_TAIL_HUB_CONNECTION_TYPE;
    return {
      model_key: model.model_key,
      lagging_type: 'NONE',
      lagging_thickness_in: '',
      lagging_pattern: 'none',
      lagging_pattern_notes: '',
      face_width_mode: 'AUTO',
      face_width_allowance_in: defaultAllowance.toString(),
      face_width_in: defaultFaceWidth?.toString() || '',
      shell_wall_in: model.default_shell_wall_in.toString(),
      hub_centers_in: '',
      enforce_pci_checks: false,
      notes: '',
      // v1.30: Hub Connection defaults (position-specific)
      hub_connection_type: defaultHubConnection,
      bushing_system: DEFAULT_BUSHING_SYSTEM,
      hub_details_expanded: false,
      // Pulley Balancing defaults
      balance_required: false,
      balance_method: 'dynamic',
      balance_rpm: '',
      balance_grade: '',
      balance_source: 'internal_guideline',
      wallValidationStatus: 'NOT_VALIDATED',
      wallValidationResult: null,
    };
  }

  // Convert database pulley to form data, finding matching model
  function pulleyToForm(pulley: ApplicationPulley, allModels: PulleyLibraryModel[], position: TabPosition): PulleyFormData {
    // v1.30: Position-specific hub connection defaults
    const defaultHubConnection = position === 'DRIVE'
      ? DEFAULT_DRIVE_HUB_CONNECTION_TYPE
      : DEFAULT_TAIL_HUB_CONNECTION_TYPE;
    // Find matching model_key
    let effectiveModelKey = pulley.model_key;

    if (!effectiveModelKey && pulley.style_key && allModels.length > 0) {
      // Legacy data: find a model whose style_key matches and has similar wall thickness
      const matchingModels = allModels.filter(m => m.style_key === pulley.style_key);
      if (matchingModels.length > 0) {
        // Prefer model with matching wall thickness, or first available
        const wallMatch = matchingModels.find(
          m => pulley.shell_wall_in != null && m.default_shell_wall_in === pulley.shell_wall_in
        );
        effectiveModelKey = (wallMatch || matchingModels[0]).model_key;
      }
    }

    // Infer face width mode and allowance from saved face_width and belt_width
    // If face_width matches belt_width + some reasonable allowance, assume AUTO
    // Otherwise assume MANUAL
    const savedFaceWidth = pulley.face_width_in;
    let faceWidthMode: FaceWidthMode = 'MANUAL';
    let inferredAllowance = '';

    if (savedFaceWidth != null && beltWidthIn != null) {
      const computedAllowance = savedFaceWidth - beltWidthIn;
      // If allowance is reasonable (between 0.5 and 6 inches), assume AUTO mode
      if (computedAllowance >= 0.5 && computedAllowance <= 6) {
        faceWidthMode = 'AUTO';
        inferredAllowance = computedAllowance.toString();
      }
    }

    // If no allowance inferred but we have a model, use model's default
    if (!inferredAllowance && effectiveModelKey) {
      const model = allModels.find(m => m.model_key === effectiveModelKey);
      if (model) {
        inferredAllowance = getDefaultAllowance(model).toString();
      }
    }

    return {
      model_key: effectiveModelKey || '',
      lagging_type: pulley.lagging_type,
      lagging_thickness_in: pulley.lagging_thickness_in?.toString() || '',
      lagging_pattern: pulley.lagging_pattern || 'none',
      lagging_pattern_notes: pulley.lagging_pattern_notes || '',
      face_width_mode: faceWidthMode,
      face_width_allowance_in: inferredAllowance,
      face_width_in: pulley.face_width_in?.toString() || '',
      shell_wall_in: pulley.shell_wall_in?.toString() || '',
      hub_centers_in: pulley.hub_centers_in?.toString() || '',
      enforce_pci_checks: pulley.enforce_pci_checks,
      notes: pulley.notes || '',
      // v1.30: Hub Connection (restore from saved or default)
      hub_connection_type: pulley.hub_connection_type || defaultHubConnection,
      bushing_system: pulley.bushing_system || DEFAULT_BUSHING_SYSTEM,
      hub_details_expanded: false,
      // Pulley Balancing (restore from saved or defaults)
      balance_required: pulley.balance_required ?? false,
      balance_method: (pulley.balance_method as 'static' | 'dynamic') || 'dynamic',
      balance_rpm: pulley.balance_rpm?.toString() || '',
      balance_grade: pulley.balance_grade || '',
      balance_source: (pulley.balance_source as PulleyFormData['balance_source']) || 'internal_guideline',
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
    const defaultAllowance = model ? getDefaultAllowance(model) : getMinAllowanceIn();
    const defaultFaceWidth = beltWidthIn ? beltWidthIn + defaultAllowance : undefined;

    setter((prev) => {
      // In AUTO mode, recalculate face width. In MANUAL mode, keep existing value
      const newFaceWidth = prev.face_width_mode === 'AUTO'
        ? (defaultFaceWidth?.toString() || '')
        : (prev.face_width_in || defaultFaceWidth?.toString() || '');

      return {
        ...prev,
        model_key: modelKey,
        shell_wall_in: model?.default_shell_wall_in.toString() || prev.shell_wall_in,
        face_width_allowance_in: prev.face_width_allowance_in || defaultAllowance.toString(),
        face_width_in: newFaceWidth,
        // Reset lagging if model doesn't support it
        lagging_type: model?.eligible_lagging ? prev.lagging_type : 'NONE',
        lagging_thickness_in: model?.eligible_lagging ? prev.lagging_thickness_in : '',
        // Reset validation
        wallValidationStatus: 'NOT_VALIDATED',
        wallValidationResult: null,
      };
    });
  }

  // Handle face width mode change
  function handleFaceWidthModeChange(position: TabPosition, mode: FaceWidthMode) {
    const setter = position === 'DRIVE' ? setDriveForm : setTailForm;

    setter((prev) => {
      if (mode === 'AUTO' && beltWidthIn) {
        // Switching to AUTO: recalculate face width from belt + allowance
        const allowance = parseFloat(prev.face_width_allowance_in) || getMinAllowanceIn();
        const computedFaceWidth = beltWidthIn + allowance;
        return {
          ...prev,
          face_width_mode: mode,
          face_width_in: computedFaceWidth.toString(),
          wallValidationStatus: 'NOT_VALIDATED' as const,
          wallValidationResult: null,
        };
      } else {
        // Switching to MANUAL: keep current face_width_in
        return {
          ...prev,
          face_width_mode: mode,
        };
      }
    });
  }

  // Handle allowance change in AUTO mode
  function handleAllowanceChange(position: TabPosition, allowanceStr: string) {
    const setter = position === 'DRIVE' ? setDriveForm : setTailForm;

    setter((prev) => {
      const allowance = parseFloat(allowanceStr) || 0;
      // Only recalculate face width in AUTO mode
      if (prev.face_width_mode === 'AUTO' && beltWidthIn) {
        const computedFaceWidth = beltWidthIn + allowance;
        return {
          ...prev,
          face_width_allowance_in: allowanceStr,
          face_width_in: computedFaceWidth.toString(),
          wallValidationStatus: 'NOT_VALIDATED' as const,
          wallValidationResult: null,
        };
      } else {
        return {
          ...prev,
          face_width_allowance_in: allowanceStr,
        };
      }
    });
  }

  // Get allowance validation warning (below minimum = warning only, not error)
  function getAllowanceWarning(position: TabPosition): string | null {
    const form = position === 'DRIVE' ? driveForm : tailForm;
    const allowance = parseFloat(form.face_width_allowance_in);
    if (isNaN(allowance)) return null;

    const minAllowance = getMinAllowanceIn();
    if (allowance < minAllowance) {
      const trackingLabel = trackingMode === 'CROWNED' ? 'crowned' : 'non-crowned';
      return `Warning: Allowance ${allowance}" is below minimum ${minAllowance}" for ${trackingLabel} pulleys. This may cause belt tracking issues.`;
    }
    return null;
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

    // Only validate and save the active pulley
    const currentForm = activeTab === 'DRIVE' ? driveForm : tailForm;
    const positionLabel = activeTab === 'DRIVE' ? 'Drive' : 'Tail';

    // Validate face width for active pulley only
    const faceValidation = getFaceWidthValidation(activeTab);
    if (faceValidation && !faceValidation.valid) {
      setError(`${positionLabel} pulley: ${faceValidation.message}`);
      return;
    }

    // Validate lagging pattern notes required for custom pattern
    if (currentForm.lagging_pattern === 'custom' && !currentForm.lagging_pattern_notes.trim()) {
      setError(`${positionLabel} pulley: Pattern notes are required for custom lagging pattern`);
      return;
    }

    setIsSaving(true);
    setError(null);
    setSaveMessage(null);

    try {
      // Save only the active pulley
      if (currentForm.model_key) {
        const model = models.find((m) => m.model_key === currentForm.model_key);
        const payload = {
          application_line_id: applicationLineId,
          position: activeTab,
          model_key: currentForm.model_key,
          style_key: model?.style_key || currentForm.model_key, // Keep style_key for backward compat
          face_profile: trackingMode,
          v_guide_key: trackingMode === 'V_GUIDED' ? vGuideKey : null,
          lagging_type: currentForm.lagging_type,
          lagging_thickness_in:
            currentForm.lagging_type !== 'NONE'
              ? parseFloat(currentForm.lagging_thickness_in) || null
              : null,
          lagging_pattern: currentForm.lagging_type !== 'NONE' ? currentForm.lagging_pattern : 'none',
          lagging_pattern_notes: currentForm.lagging_pattern_notes.trim() || null,
          face_width_in: currentForm.face_width_in ? parseFloat(currentForm.face_width_in) : null,
          shell_od_in: model?.shell_od_in || null,
          shell_wall_in: currentForm.shell_wall_in ? parseFloat(currentForm.shell_wall_in) : null,
          hub_centers_in: currentForm.hub_centers_in ? parseFloat(currentForm.hub_centers_in) : null,
          enforce_pci_checks: currentForm.enforce_pci_checks,
          notes: currentForm.notes.trim() || null,
          wall_validation_status: currentForm.wallValidationStatus,
          wall_validation_result: currentForm.wallValidationResult,
          // v1.30: Hub Connection
          hub_connection_type: currentForm.hub_connection_type,
          bushing_system: requiresBushingSystem(currentForm.hub_connection_type) ? currentForm.bushing_system : null,
          // Pulley Balancing
          balance_required: currentForm.balance_required,
          balance_method: currentForm.balance_required ? currentForm.balance_method : null,
          balance_rpm: currentForm.balance_rpm ? parseFloat(currentForm.balance_rpm) : null,
          balance_grade: currentForm.balance_grade.trim() || null,
          balance_source: currentForm.balance_source,
        };

        const res = await fetch('/api/application-pulleys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(`${positionLabel} pulley: ${err.error}`);
        }
      }

      setSaveMessage(`${positionLabel} pulley configuration saved!`);
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
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Configure {activeTab === 'DRIVE' ? 'Head/Drive' : 'Tail'} Pulley
          </h2>
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

        {/* Tab row removed - modal is now locked to single pulley end */}

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

              {/* Face Width - Guided Configuration */}
              <div className="space-y-3 p-3 bg-gray-50 rounded-md border border-gray-200">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">Face Width</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleFaceWidthModeChange(activeTab, 'AUTO')}
                      className={`px-3 py-1 text-xs rounded-md transition-colors ${
                        currentForm.face_width_mode === 'AUTO'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Auto (Recommended)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFaceWidthModeChange(activeTab, 'MANUAL')}
                      className={`px-3 py-1 text-xs rounded-md transition-colors ${
                        currentForm.face_width_mode === 'MANUAL'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Manual
                    </button>
                  </div>
                </div>

                {currentForm.face_width_mode === 'AUTO' ? (
                  <>
                    {/* Auto Mode: Show belt width + allowance = face width */}
                    <div className="grid grid-cols-3 gap-2 items-end">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Belt Width</label>
                        <div className="px-3 py-2 bg-gray-100 rounded-md text-sm font-medium text-gray-700">
                          {beltWidthIn != null ? `${beltWidthIn}"` : '—'}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">+ Allowance</label>
                        <input
                          type="number"
                          step="0.25"
                          min="0.5"
                          max="6"
                          value={currentForm.face_width_allowance_in}
                          onChange={(e) => handleAllowanceChange(activeTab, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                          placeholder={getMinAllowanceIn().toString()}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">= Face Width</label>
                        <div className={`px-3 py-2 rounded-md text-sm font-semibold ${
                          faceWidthValidation && !faceWidthValidation.valid
                            ? 'bg-red-100 text-red-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {currentForm.face_width_in ? `${currentForm.face_width_in}"` : '—'}
                        </div>
                      </div>
                    </div>
                    {/* Allowance warning (below minimum) */}
                    {getAllowanceWarning(activeTab) && (
                      <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                        {getAllowanceWarning(activeTab)}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      Min allowance: {getMinAllowanceIn()}" for {trackingMode === 'CROWNED' ? 'crowned' : 'non-crowned'} pulleys
                    </p>
                  </>
                ) : (
                  <>
                    {/* Manual Mode: Direct face width input */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Face Width (in)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={currentForm.face_width_in}
                        onChange={(e) => updateForm(activeTab, 'face_width_in', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                          faceWidthValidation && !faceWidthValidation.valid ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                    </div>
                    {/* Show implied allowance for reference */}
                    {beltWidthIn != null && currentForm.face_width_in && (
                      <p className="text-xs text-gray-500">
                        Implied allowance: {(parseFloat(currentForm.face_width_in) - beltWidthIn).toFixed(2)}"
                        {parseFloat(currentForm.face_width_in) - beltWidthIn < getMinAllowanceIn() && (
                          <span className="text-amber-600"> (below min {getMinAllowanceIn()}")</span>
                        )}
                      </p>
                    )}
                  </>
                )}

                {/* Face width validation message (model limits) */}
                {faceWidthValidation && !faceWidthValidation.valid && (
                  <p className="text-xs text-red-600">{faceWidthValidation.message}</p>
                )}
                {faceWidthValidation && faceWidthValidation.valid && (
                  <p className="text-xs text-green-600">{faceWidthValidation.message}</p>
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
                  {selectedModel && getAllowedThicknessOptions(selectedModel as PulleyModel).map((opt) => (
                    <option key={opt.key} value={opt.thickness_in.toString()}>
                      {opt.label}
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
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Lagging Type</label>
                      <select
                        value={currentForm.lagging_type}
                        onChange={(e) => {
                          updateForm(activeTab, 'lagging_type', e.target.value);
                          // Reset pattern to none when disabling lagging
                          if (e.target.value === 'NONE') {
                            updateForm(activeTab, 'lagging_pattern', 'none');
                            updateForm(activeTab, 'lagging_pattern_notes', '');
                          }
                        }}
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
                  {/* Lagging Pattern - only show when lagging is enabled */}
                  {currentForm.lagging_type !== 'NONE' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Lagging Pattern</label>
                        <select
                          value={currentForm.lagging_pattern}
                          onChange={(e) => updateForm(activeTab, 'lagging_pattern', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          {Object.entries(LAGGING_PATTERN_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </div>
                      {currentForm.lagging_pattern === 'custom' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Pattern Notes *</label>
                          <input
                            type="text"
                            value={currentForm.lagging_pattern_notes}
                            onChange={(e) => updateForm(activeTab, 'lagging_pattern_notes', e.target.value)}
                            placeholder="Describe custom pattern..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Pulley Balancing */}
              <div className="space-y-3 p-3 bg-gray-50 rounded-md border border-gray-200">
                <h4 className="text-sm font-medium text-gray-700">Pulley Balancing</h4>

                {/* Recommendation note - only when RPM >= 100 */}
                {(calculatedPulleyRpm ?? 0) >= 100 && (
                  <p className="text-sm text-gray-600 bg-blue-50 p-2 rounded border border-blue-100">
                    Pulley speed exceeds 100 RPM. Balancing is recommended and must be validated with the pulley supplier.
                  </p>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {/* Balance this pulley checkbox */}
                  <div className="col-span-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentForm.balance_required}
                        onChange={(e) => updateForm(activeTab, 'balance_required', e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Balance this pulley</span>
                    </label>
                  </div>

                  {/* Balance Method */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Balance Method</label>
                    <select
                      value={currentForm.balance_method}
                      onChange={(e) => updateForm(activeTab, 'balance_method', e.target.value)}
                      disabled={!currentForm.balance_required}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md ${!currentForm.balance_required ? 'bg-gray-100 text-gray-500' : ''}`}
                    >
                      <option value="dynamic">Dynamic</option>
                      <option value="static">Static</option>
                    </select>
                  </div>

                  {/* Balance Speed (RPM) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Balance Speed (RPM)</label>
                    <input
                      type="number"
                      value={currentForm.balance_rpm || (calculatedPulleyRpm?.toString() ?? '')}
                      onChange={(e) => updateForm(activeTab, 'balance_rpm', e.target.value)}
                      placeholder={calculatedPulleyRpm ? `${calculatedPulleyRpm} (calculated)` : 'Enter RPM'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      min="0"
                      step="1"
                    />
                  </div>

                  {/* Balance Grade */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Balance Grade (optional)</label>
                    <input
                      type="text"
                      value={currentForm.balance_grade}
                      onChange={(e) => updateForm(activeTab, 'balance_grade', e.target.value)}
                      placeholder="e.g. G100"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>

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
                    {currentForm.lagging_type !== 'NONE' && currentForm.lagging_pattern !== 'none' && (
                      <div className="col-span-2">
                        <span className="text-gray-500">Lagging Pattern:</span>
                        <span className="ml-2 font-medium">
                          {LAGGING_PATTERN_LABELS[currentForm.lagging_pattern]}
                          {currentForm.lagging_pattern === 'custom' && currentForm.lagging_pattern_notes && (
                            <span className="text-gray-500 ml-1">({currentForm.lagging_pattern_notes})</span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* v1.30: Hub Connection Section (PCI Pages 12-14) */}
              <div className="space-y-3 p-3 bg-gray-50 rounded-md border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="block text-sm font-medium text-gray-700">Hub Connection</label>
                    <span
                      className="text-gray-400 hover:text-gray-600 cursor-help"
                      title="Hub choice affects fatigue life, serviceability, alignment/runout, and installation pre-stress. Source: PCI Pulley Selection Guide, Pages 12-14."
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </span>
                  </div>
                </div>

                {/* Hub Connection Type Selector */}
                <select
                  value={currentForm.hub_connection_type}
                  onChange={(e) => {
                    updateForm(activeTab, 'hub_connection_type', e.target.value);
                    // Reset bushing system to default when changing hub type
                    if (requiresBushingSystem(e.target.value)) {
                      updateForm(activeTab, 'bushing_system', DEFAULT_BUSHING_SYSTEM);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  {HUB_CONNECTION_OPTIONS.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                {/* Short description */}
                {(() => {
                  const hubOpt = getHubConnectionOption(currentForm.hub_connection_type);
                  return hubOpt && (
                    <p className="text-xs text-gray-600">{hubOpt.shortDescription}</p>
                  );
                })()}

                {/* Warning: Not ideal for drive pulley */}
                {activeTab === 'DRIVE' && isNotIdealForDrive(currentForm.hub_connection_type) && (
                  <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                    <strong>PCI Note:</strong> This hub type is not ideal for drive pulleys.
                  </div>
                )}

                {/* Bushing System Selector (conditional) */}
                {requiresBushingSystem(currentForm.hub_connection_type) && (
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-gray-600">Bushing System</label>
                    <div className="flex gap-2 flex-wrap">
                      {getVisibleBushingSystemOptions().map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => updateForm(activeTab, 'bushing_system', opt.key)}
                          className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                            currentForm.bushing_system === opt.key
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    {/* Taper-Lock warning */}
                    {currentForm.bushing_system === BushingSystemType.TaperLock && (
                      <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                        <strong>PCI:</strong> Taper-Lock is not recommended for two-hub pulleys. Some sizes use only 2 bolts at ~170° which can introduce shaft bending and higher runout. <strong>Prefer XT® for improved alignment.</strong>
                      </div>
                    )}

                    {/* Bushing description */}
                    {(() => {
                      const bushOpt = getBushingSystemOption(currentForm.bushing_system);
                      return bushOpt && !bushOpt.warning && (
                        <p className="text-xs text-gray-500">{bushOpt.description}</p>
                      );
                    })()}
                  </div>
                )}

                {/* Expandable Pros/Cons */}
                <button
                  type="button"
                  onClick={() => updateForm(activeTab, 'hub_details_expanded', !currentForm.hub_details_expanded)}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  {currentForm.hub_details_expanded ? (
                    <>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                      Hide details
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                      Show pros & cons
                    </>
                  )}
                </button>

                {currentForm.hub_details_expanded && (() => {
                  const hubOpt = getHubConnectionOption(currentForm.hub_connection_type);
                  return hubOpt && (
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <div className="font-medium text-green-700 mb-1">Pros</div>
                        <ul className="list-disc list-inside text-gray-600 space-y-0.5">
                          {hubOpt.pros.map((pro, i) => (
                            <li key={i}>{pro}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="font-medium text-red-700 mb-1">Cons</div>
                        <ul className="list-disc list-inside text-gray-600 space-y-0.5">
                          {hubOpt.cons.map((con, i) => (
                            <li key={i}>{con}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })()}
              </div>

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
              disabled={isSaving || !currentForm.model_key}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : `Save ${activeTab === 'DRIVE' ? 'Drive' : 'Tail'} Pulley`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
