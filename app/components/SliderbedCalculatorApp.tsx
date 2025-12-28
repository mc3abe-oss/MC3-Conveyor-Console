'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import CalculatorForm from './CalculatorForm';
import CalculationResults from './CalculationResults';
import ReferenceHeader from './ReferenceHeader';
import FindConfigModal from './FindConfigModal';
import InputEcho from './InputEcho';
import { CalculationResult, SliderbedInputs, DEFAULT_PARAMETERS } from '../../src/models/sliderbed_v1/schema';
import { CATALOG_KEYS } from '../../src/lib/catalogs';
import { payloadsEqual } from '../../src/lib/payload-compare';

type ViewMode = 'configure' | 'results';

interface Configuration {
  id: string;
  reference_type: string;
  reference_number: string;
  line_key: string;
  latest_revision_number: number;
}

/**
 * SliderbedCalculatorApp - The main calculator application component.
 *
 * This is extracted from the original page.tsx to allow embedding in the console shell.
 * All internal state keys and logic remain unchanged.
 */
export default function SliderbedCalculatorApp() {
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [inputs, setInputs] = useState<SliderbedInputs | null>(null);

  // Reference state
  const [referenceType, setReferenceType] = useState<'QUOTE' | 'SALES_ORDER'>('QUOTE');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [lineKey, setLineKey] = useState('1');
  const [conveyorQty, setConveyorQty] = useState(1);

  // Load/Save state with dirty tracking
  const [loadedConfigurationId, setLoadedConfigurationId] = useState<string | null>(null);
  const [loadedRevisionId, setLoadedRevisionId] = useState<string | null>(null);
  const [initialLoadedPayload, setInitialLoadedPayload] = useState<any>(null);

  // Calculate tracking
  const [lastCalculatedPayload, setLastCalculatedPayload] = useState<any>(null);
  const [calcStatus, setCalcStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [triggerCalculate, setTriggerCalculate] = useState<number>(0);

  const [loadedState, setLoadedState] = useState<{
    isLoaded: boolean;
    revisionNumber?: number;
    savedAt?: string;
    savedByUser?: string;
    configurationId?: string;
  }>({ isLoaded: false });

  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [toast, setToast] = useState<string | null>(null);

  // Find Config Modal
  const [isFindModalOpen, setIsFindModalOpen] = useState(false);

  // View mode: 'configure' or 'results'
  const [viewMode, setViewMode] = useState<ViewMode>('configure');

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  // Build application_json from inputs with all application fields
  // NOTE: conveyorQty is passed separately since it's line-level metadata, not a calculator input
  const buildApplicationJson = (inputs: SliderbedInputs, qty: number = 1) => {
    const applicationFields: Record<string, { item_key: string; label: string } | string | number> = {};

    // Line-level metadata (quote/order data, NOT engineering inputs)
    applicationFields.conveyor_qty = qty;

    // Extract catalog fields
    Object.keys(CATALOG_KEYS).forEach((fieldName) => {
      const value = inputs[fieldName as keyof SliderbedInputs];
      if (value) {
        applicationFields[fieldName] = {
          item_key: value as string,
          label: value as string,
        };
      }
    });

    // Extract non-catalog fields (stored as plain strings)
    const nonCatalogFields = [
      'parts_sharp',
      'field_wiring_required',
      'labels_required',
      'send_to_estimating',
      'ambient_temperature',
    ];

    nonCatalogFields.forEach((fieldName) => {
      const value = inputs[fieldName as keyof SliderbedInputs];
      if (value !== undefined) {
        applicationFields[fieldName] = value as string;
      }
    });

    return applicationFields;
  };

  // Build current payload for dirty tracking (excludes outputs and warnings)
  const buildCurrentPayload = useCallback(() => {
    if (!inputs) return null;

    return {
      inputs_json: inputs,
      parameters_json: DEFAULT_PARAMETERS,
      application_json: buildApplicationJson(inputs, conveyorQty),
    };
  }, [inputs, conveyorQty]);

  // Compute isDirty
  const isDirty = useMemo(() => {
    if (!initialLoadedPayload || !inputs) {
      console.log('[isDirty] false - missing payload or inputs', { hasPayload: !!initialLoadedPayload, hasInputs: !!inputs });
      return false;
    }

    const currentPayload = buildCurrentPayload();
    if (!currentPayload) {
      console.log('[isDirty] false - currentPayload is null');
      return false;
    }

    const dirty = !payloadsEqual(currentPayload, initialLoadedPayload);
    console.log('[isDirty]', dirty, { currentPayload, initialLoadedPayload });
    return dirty;
  }, [initialLoadedPayload, buildCurrentPayload, inputs]);

  // Compute isCalculatedFresh - true if current payload matches last calculated payload
  const isCalculatedFresh = useMemo(() => {
    if (!lastCalculatedPayload || !inputs) {
      console.log('[isCalculatedFresh] false - missing lastCalculatedPayload or inputs');
      return false;
    }

    const currentPayload = buildCurrentPayload();
    if (!currentPayload) {
      console.log('[isCalculatedFresh] false - currentPayload is null');
      return false;
    }

    const fresh = payloadsEqual(currentPayload, lastCalculatedPayload);
    console.log('[isCalculatedFresh]', fresh, { currentPayload, lastCalculatedPayload });
    return fresh;
  }, [lastCalculatedPayload, buildCurrentPayload, inputs]);

  // Compute needsRecalc - true if inputs changed since last calculation OR never calculated
  const needsRecalc = useMemo(() => {
    // If no result/outputs yet, need to calculate
    if (!result) {
      console.log('[needsRecalc] true - no result yet');
      return true;
    }

    // If we have a lastCalculatedPayload, check if current differs
    if (lastCalculatedPayload && inputs) {
      const currentPayload = buildCurrentPayload();
      if (!currentPayload) {
        console.log('[needsRecalc] true - currentPayload is null');
        return true;
      }

      const changed = !payloadsEqual(currentPayload, lastCalculatedPayload);
      console.log('[needsRecalc]', changed, { currentPayload, lastCalculatedPayload });
      return changed;
    }

    // No lastCalculatedPayload but have result - shouldn't happen, but assume needs recalc
    console.log('[needsRecalc] true - have result but no lastCalculatedPayload');
    return true;
  }, [lastCalculatedPayload, buildCurrentPayload, inputs, result]);

  // Can save if:
  // 1) Has reference type and number
  // 2) If loaded config exists: must be dirty AND NOT need recalc (calculation is fresh)
  // 3) If no loaded config: allow save (new config creation, but still needs calc from handleSave checks)
  const hasReference = !!(referenceType && referenceNumber);
  const canSave = hasReference && (loadedConfigurationId ? (isDirty && !needsRecalc) : true);

  // Calculate button always enabled
  const canCalculate = true;

  // Debug: Log state changes
  console.log('[state]', { hasReference, loadedConfigurationId, isDirty, needsRecalc, isCalculatedFresh, canSave, canCalculate });

  // Effect: Set initial payload after load completes
  // This ensures we snapshot the payload AFTER inputs are populated from load
  useEffect(() => {
    if (loadedRevisionId && inputs && !initialLoadedPayload) {
      console.log('[Effect] Setting initial payload after load', { loadedRevisionId });
      const payload = buildCurrentPayload();
      if (payload) {
        setInitialLoadedPayload(payload);
        console.log('[Effect] Initial payload set:', payload);
      }
    }
  }, [loadedRevisionId, inputs, initialLoadedPayload, buildCurrentPayload]);

  // Effect: Invalidate calculation when inputs change
  useEffect(() => {
    if (!inputs || !lastCalculatedPayload) return;

    const currentPayload = buildCurrentPayload();
    if (!currentPayload) return;

    // Check if payload has changed since last calculation
    const hasChanged = !payloadsEqual(currentPayload, lastCalculatedPayload);

    if (hasChanged && calcStatus === 'ok') {
      console.log('[Effect] Inputs changed - calculation invalidated');
      setCalcStatus('idle');
    }
  }, [inputs, lastCalculatedPayload, buildCurrentPayload, calcStatus]);

  const handleCalculate = async (calculationResult: CalculationResult) => {
    setIsCalculating(true);
    // Simulate brief loading for UX
    await new Promise((resolve) => setTimeout(resolve, 200));
    setResult(calculationResult);

    // Snapshot the payload that was calculated
    const calculatedPayload = buildCurrentPayload();
    setLastCalculatedPayload(calculatedPayload);
    setCalcStatus('ok');

    console.log('[Calculate] Success - payload snapshot saved', calculatedPayload);
    setIsCalculating(false);

    // Show feedback without forcing navigation
    showToast('Results updated');
  };

  const handleInputsChange = useCallback((newInputs: SliderbedInputs) => {
    setInputs(newInputs);
  }, []);

  const handleReferenceNumberChange = (value: string) => {
    // Strip non-digits
    const numericOnly = value.replace(/\D/g, '');
    setReferenceNumber(numericOnly);
  };

  const handleLineKeyChange = (value: string) => {
    // Allow only digits, minimum 1
    const numericOnly = value.replace(/\D/g, '');
    if (numericOnly === '' || parseInt(numericOnly) < 1) {
      setLineKey('1');
    } else {
      setLineKey(numericOnly);
    }
  };

  const handleClear = () => {
    console.log('[Clear] Resetting all state');

    // Reset reference fields
    setReferenceType('QUOTE');
    setReferenceNumber('');
    setLineKey('1');
    setConveyorQty(1);

    // Reset loaded state
    setLoadedConfigurationId(null);
    setLoadedRevisionId(null);
    setInitialLoadedPayload(null);
    setLoadedState({ isLoaded: false });

    // Reset inputs to null (form will use its defaults)
    setInputs(null);

    // Clear results and calculation status
    setResult(null);
    setLastCalculatedPayload(null);
    setCalcStatus('idle');

    showToast('Calculator reset');
  };

  const handleLoad = async () => {
    if (!referenceNumber) {
      showToast('Please enter a reference number');
      return;
    }

    console.log('[Load] Loading configuration:', { referenceType, referenceNumber, lineKey });

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/configurations/load?reference_type=${referenceType}&reference_number=${encodeURIComponent(referenceNumber)}&reference_line=${lineKey}`
      );

      if (!response.ok) {
        const error = await response.json() as { error?: string };
        console.error('[Load] API error:', error);
        throw new Error(error.error || 'Failed to load');
      }

      const data = await response.json() as { configuration: any; revision: any };
      const { configuration, revision } = data;

      console.log('[Load] Loaded configuration:', { configId: configuration.id, revisionId: revision.id, revisionNumber: revision.revision_number });

      // Set loaded IDs
      setLoadedConfigurationId(configuration.id);
      setLoadedRevisionId(revision.id);

      // Update loaded state
      setLoadedState({
        isLoaded: true,
        revisionNumber: revision.revision_number,
        savedAt: revision.created_at,
        savedByUser: revision.created_by_user_id,
        configurationId: configuration.id,
      });

      // Restore conveyor_qty from application_json (default to 1 if not present)
      const savedQty = revision.application_json?.conveyor_qty;
      setConveyorQty(typeof savedQty === 'number' && savedQty >= 1 ? savedQty : 1);

      // Set inputs from revision
      setInputs(revision.inputs_json);

      // If revision has outputs, restore them and mark as calculated
      if (revision.outputs_json) {
        setResult({
          success: true,
          outputs: revision.outputs_json,
          warnings: revision.warnings_json || [],
          metadata: {
            model_version_id: '1.0.0',
            calculated_at: revision.created_at || new Date().toISOString(),
            model_key: 'sliderbed_conveyor_v1',
          },
        });
        setCalcStatus('ok');

        // Set lastCalculatedPayload to match loaded state (considered "calculated")
        const loadedPayload = {
          inputs_json: revision.inputs_json,
          parameters_json: DEFAULT_PARAMETERS,
          application_json: revision.application_json,
        };
        setLastCalculatedPayload(loadedPayload);
        console.log('[Load] Restored outputs and set lastCalculatedPayload');
      } else {
        // No outputs - clear result and calculation status
        setResult(null);
        setCalcStatus('idle');
        setLastCalculatedPayload(null);
        console.log('[Load] No outputs in revision, cleared calc state');
      }

      // Clear initial payload so the effect can set it after inputs update
      setInitialLoadedPayload(null);
      console.log('[Load] Cleared initial payload, will be set by effect');

      showToast(`Loaded ${referenceType} ${referenceNumber} Rev ${revision.revision_number}`);
    } catch (error) {
      console.error('[Load] Error:', error);
      showToast(error instanceof Error ? error.message : 'Failed to load configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    // 1. Validate reference inputs first
    if (!referenceType || !referenceNumber) {
      showToast('Enter Quote/SO and number');
      return;
    }

    // Validate line key is numeric >= 1
    const lineNumber = parseInt(lineKey);
    if (isNaN(lineNumber) || lineNumber < 1) {
      showToast('Line must be a number >= 1');
      return;
    }

    // 2. If no configuration loaded, check if it already exists BEFORE requiring calculation
    if (!loadedConfigurationId) {
      console.log('[Save] No loaded config - checking existence first');
      try {
        const checkResponse = await fetch(
          `/api/configurations/load?reference_type=${referenceType}&reference_number=${encodeURIComponent(referenceNumber)}&reference_line=${lineKey}`
        );

        if (checkResponse.ok) {
          // Configuration exists - block save immediately
          const refTypeLabel = referenceType === 'QUOTE' ? 'Quote' : 'Sales Order';
          showToast(`This ${refTypeLabel} number + line already exists. Click Load to open it, then make changes and Save to create a new revision.`);
          return;
        }
        // 404 means it doesn't exist - continue to calculation checks
      } catch (error) {
        // Network error or other issue - log but proceed
        console.warn('[Save] Existence check failed, proceeding:', error);
      }
    }

    // 3. If configuration is loaded, enforce calculate-first save-second workflow
    if (loadedConfigurationId) {
      // Check if there are changes
      if (!isDirty) {
        showToast('No changes to save');
        return;
      }

      // Check if calculation is fresh
      if (!isCalculatedFresh) {
        showToast('Changes detected. Click Calculate before saving.');
        return;
      }
    }

    // 4. For new configs, require calculation
    if (!loadedConfigurationId && calcStatus !== 'ok') {
      showToast('Please calculate before saving');
      return;
    }

    if (!inputs || !result) {
      showToast('Please calculate before saving');
      return;
    }

    // Debug logging
    console.log('[Save] Starting save operation', {
      loadedConfigurationId,
      loadedRevisionId,
      isDirty,
      canSave,
      referenceType,
      referenceNumber,
      lineKey,
    });

    const payload = {
      reference_type: referenceType,
      reference_number: referenceNumber,
      reference_line: parseInt(lineKey),
      model_key: 'sliderbed_conveyor_v1',
      inputs_json: inputs,
      parameters_json: DEFAULT_PARAMETERS,
      application_json: buildApplicationJson(inputs, conveyorQty),
      outputs_json: result.outputs,
      warnings_json: result.warnings,
    };

    console.log('[Save] Payload:', payload);

    setIsSaving(true);
    try {
      const response = await fetch('/api/configurations/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const raw = await response.text();
        console.error('[Save] status:', response.status, response.statusText);
        console.error('[Save] raw:', raw);

        let errorMessage = 'Failed to save';
        try {
          const parsed = JSON.parse(raw);
          errorMessage = parsed.error || parsed.message || raw || errorMessage;
        } catch {
          errorMessage = raw || errorMessage;
        }

        throw new Error(errorMessage);
      }

      const data = await response.json() as { status?: string; configuration: any; revision: any; message?: string };
      const { status, configuration, revision, message } = data;

      console.log('[Save] API response:', { status, configuration, revision, message });

      if (status === 'no_change') {
        // Server detected no changes - don't update state
        console.log('[Save] No changes detected by server');
        showToast(message || 'No changes to save');
        return;
      }

      // Update loaded IDs
      setLoadedConfigurationId(configuration.id);
      setLoadedRevisionId(revision.id);

      // Update loaded state
      setLoadedState({
        isLoaded: true,
        revisionNumber: revision.revision_number,
        savedAt: revision.created_at,
        savedByUser: revision.created_by_user_id,
        configurationId: configuration.id,
      });

      // Reset initial loaded payload to current state
      const currentPayload = buildCurrentPayload();
      setInitialLoadedPayload(currentPayload);

      console.log('[Save] Updated state, new revision:', revision.revision_number);

      showToast(`Saved Rev ${revision.revision_number}`);
    } catch (error) {
      console.error('[Save] Error:', error);
      showToast(error instanceof Error ? error.message : 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFindConfig = async (config: Configuration) => {
    setIsFindModalOpen(false);

    // Update reference fields
    setReferenceType(config.reference_type as 'QUOTE' | 'SALES_ORDER');
    setReferenceNumber(config.reference_number);
    setLineKey(config.line_key || '1');

    // Load the configuration
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/configurations/load?reference_type=${config.reference_type}&reference_number=${encodeURIComponent(config.reference_number)}&reference_line=${config.line_key || '1'}`
      );

      if (!response.ok) {
        throw new Error('Failed to load configuration');
      }

      const data = await response.json() as { configuration: any; revision: any };
      const { configuration, revision } = data;

      // Set loaded IDs
      setLoadedConfigurationId(configuration.id);
      setLoadedRevisionId(revision.id);

      // Update loaded state
      setLoadedState({
        isLoaded: true,
        revisionNumber: revision.revision_number,
        savedAt: revision.created_at,
        savedByUser: revision.created_by_user_id,
        configurationId: configuration.id,
      });

      // Restore conveyor_qty from application_json (default to 1 if not present)
      const savedQty = revision.application_json?.conveyor_qty;
      setConveyorQty(typeof savedQty === 'number' && savedQty >= 1 ? savedQty : 1);

      // Set inputs from revision
      setInputs(revision.inputs_json);

      // If revision has outputs, restore them and mark as calculated
      if (revision.outputs_json) {
        setResult({
          success: true,
          outputs: revision.outputs_json,
          warnings: revision.warnings_json || [],
          metadata: {
            model_version_id: '1.0.0',
            calculated_at: revision.created_at || new Date().toISOString(),
            model_key: 'sliderbed_conveyor_v1',
          },
        });
        setCalcStatus('ok');

        // Set lastCalculatedPayload to match loaded state
        const loadedPayload = {
          inputs_json: revision.inputs_json,
          parameters_json: DEFAULT_PARAMETERS,
          application_json: revision.application_json,
        };
        setLastCalculatedPayload(loadedPayload);
        console.log('[FindConfig] Restored outputs and set lastCalculatedPayload');
      } else {
        // No outputs - clear result and calculation status
        setResult(null);
        setCalcStatus('idle');
        setLastCalculatedPayload(null);
        console.log('[FindConfig] No outputs, cleared calc state');
      }

      // Clear initial payload so the effect can set it after inputs update
      setInitialLoadedPayload(null);
      console.log('[FindConfig] Cleared initial payload, will be set by effect');

      showToast(`Loaded ${config.reference_type} ${config.reference_number} Rev ${revision.revision_number}`);
    } catch (error) {
      console.error('Load error:', error);
      showToast('Failed to load configuration');
    } finally {
      setIsLoading(false);
    }
  };

  // Wrapper to trigger Calculate from header button
  const handleCalculateClick = () => {
    console.log('[CalculateClick] User clicked Calculate in header');
    setTriggerCalculate(prev => prev + 1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        {/* Toast notification */}
        {toast && (
          <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-4 py-2 rounded-md shadow-lg">
            {toast}
          </div>
        )}

        {/* Find Config Modal */}
        <FindConfigModal
          isOpen={isFindModalOpen}
          onClose={() => setIsFindModalOpen(false)}
          onSelect={handleFindConfig}
        />

        {/* Reference Header */}
        <ReferenceHeader
          referenceType={referenceType}
          referenceNumber={referenceNumber}
          lineKey={lineKey}
          conveyorQty={conveyorQty}
          onReferenceTypeChange={setReferenceType}
          onReferenceNumberChange={handleReferenceNumberChange}
          onLineKeyChange={handleLineKeyChange}
          onConveyorQtyChange={setConveyorQty}
          onLoad={handleLoad}
          onSave={handleSave}
          onCalculate={handleCalculateClick}
          onClear={handleClear}
          loadedState={loadedState}
          isSaving={isSaving}
          isLoading={isLoading}
          isCalculating={isCalculating}
          canSave={canSave}
          canCalculate={canCalculate}
          isDirty={isDirty}
          needsRecalc={needsRecalc}
          onOpenFindModal={() => setIsFindModalOpen(true)}
        />

        {/* Page-level Mode Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex gap-x-8" aria-label="View mode">
            <button
              type="button"
              onClick={() => setViewMode('configure')}
              className={`
                whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors
                ${
                  viewMode === 'configure'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Configure
              </span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('results')}
              className={`
                whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors
                ${
                  viewMode === 'results'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Results
                {/* Stale indicator badge */}
                {result && needsRecalc && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded">
                    Stale
                  </span>
                )}
              </span>
            </button>
          </nav>
        </div>

        {/* Configure Mode - Full width lanes */}
        {/* NOTE: Using CSS visibility instead of conditional rendering to prevent
            CalculatorForm from unmounting/remounting when switching tabs.
            This fixes a bug where the triggerCalculate ref would reset on remount,
            causing an unwanted recalculation that switched back to Results tab. */}
        <div className={viewMode === 'configure' ? '' : 'hidden'}>
          <CalculatorForm
            onCalculate={handleCalculate}
            isCalculating={isCalculating}
            initialInputs={inputs}
            onInputsChange={handleInputsChange}
            loadedRevisionId={loadedRevisionId ?? undefined}
            triggerCalculate={triggerCalculate}
            hideCalculateButton={true}
          />

          {/* View Results CTA */}
          <div className="mt-6 flex justify-center gap-4">
            <button
              type="button"
              onClick={handleCalculateClick}
              disabled={isCalculating}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isCalculating ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Calculating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Calculate & View Results
                </>
              )}
            </button>
            {result && (
              <button
                type="button"
                onClick={() => setViewMode('results')}
                className="px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                View Last Results
                {needsRecalc && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded">
                    Stale
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Results Mode - Full width results */}
        <div className={viewMode === 'results' ? '' : 'hidden'}>
          {/* Stale Results Banner */}
          {result && needsRecalc && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-800">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">Results are stale.</span>
                <span className="text-sm">Inputs have changed since last calculation.</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  handleCalculateClick();
                }}
                className="px-3 py-1.5 bg-amber-600 text-white text-sm font-medium rounded hover:bg-amber-700 transition-colors"
              >
                Recalculate
              </button>
            </div>
          )}

          {result ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Results - Takes 2 columns */}
              <div className="lg:col-span-2">
                <CalculationResults result={result} inputs={inputs ?? undefined} />
              </div>

              {/* Input Echo - Summary of key inputs */}
              <div className="lg:col-span-1">
                <InputEcho inputs={inputs} />
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="text-center py-12 text-gray-500">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No calculation yet
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Configure your conveyor and click Calculate to see results
                </p>
                <button
                  type="button"
                  onClick={() => setViewMode('configure')}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Go to Configure
                </button>
              </div>
            </div>
          )}

          {/* Edit Inputs CTA */}
          {result && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => setViewMode('configure')}
                className="px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Configuration
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
