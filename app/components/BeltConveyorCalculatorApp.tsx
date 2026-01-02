'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import CalculatorForm from './CalculatorForm';
import CalculationResults from './CalculationResults';
import DesignLogicPanel from './DesignLogicPanel';
import ApplicationContextHeader from './ApplicationContextHeader';
import SaveTargetModal, { SaveTarget } from './SaveTargetModal';
import InputEcho from './InputEcho';
import VaultTab, { DraftVault } from './VaultTab';
import JobLineSelectModal from './JobLineSelectModal';
import MobileBottomActionBar from './MobileBottomActionBar';
import { CalculationResult, SliderbedInputs, DEFAULT_PARAMETERS, buildDefaultInputs } from '../../src/models/sliderbed_v1/schema';
import { CATALOG_KEYS } from '../../src/lib/catalogs';
import { payloadsEqual } from '../../src/lib/payload-compare';
import { MODEL_KEY } from '../../src/lib/model-identity';

type ViewMode = 'configure' | 'results' | 'vault';
type LoadState = 'idle' | 'loading' | 'loaded' | 'error' | 'awaiting-selection';

const LAST_APP_KEY = 'belt_lastApplicationId';

/**
 * BeltConveyorCalculatorApp - The main calculator application component.
 *
 * Supports both slider bed and roller bed configurations.
 * All internal state keys and logic remain unchanged.
 */
export default function BeltConveyorCalculatorApp() {
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [inputs, setInputs] = useState<SliderbedInputs | null>(null);

  // Context-driven state: linked Quote or Sales Order
  const [context, setContext] = useState<SaveTarget | null>(null);
  const [conveyorQty, setConveyorQty] = useState(1);

  // Load/Save state with dirty tracking
  const [loadedConfigurationId, setLoadedConfigurationId] = useState<string | null>(null);
  const [loadedRevisionId, setLoadedRevisionId] = useState<string | null>(null);
  const [initialLoadedPayload, setInitialLoadedPayload] = useState<any>(null);

  // Calculate tracking
  const [lastCalculatedPayload, setLastCalculatedPayload] = useState<any>(null);
  const [calcStatus, setCalcStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [triggerCalculate, setTriggerCalculate] = useState<number>(0);

  // Calculation status tracking (v1.21)
  const [calculationStatus, setCalculationStatus] = useState<'draft' | 'calculated'>('draft');
  const [outputsStale, setOutputsStale] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  const [toast, setToast] = useState<string | null>(null);

  // Save Target Modal (for first save in draft mode)
  const [isSaveTargetModalOpen, setIsSaveTargetModalOpen] = useState(false);

  // Draft Vault (local state until first save)
  const [draftVault, setDraftVault] = useState<DraftVault>({
    notes: [],
    specs: [],
    scopeLines: [],
    attachments: [],
  });

  // View mode: 'configure' or 'results'
  const [viewMode, setViewMode] = useState<ViewMode>('configure');

  // URL-based loading state
  const searchParams = useSearchParams();
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [jobLineSelectModal, setJobLineSelectModal] = useState<{
    isOpen: boolean;
    availableJobLines: number[];
    referenceType: 'QUOTE' | 'SALES_ORDER';
    referenceBase: string;
    suffix: number | null;
  } | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  // Load application from API response
  const loadApplicationFromResponse = useCallback((data: any) => {
    // DEV: LOAD_APP_START
    if (process.env.NODE_ENV === 'development') {
      console.log('[DEV][LOAD_APP_START]', {
        receivedData: data,
        hasApplication: !!data?.application,
        applicationId: data?.application?.id,
      });
    }

    const { application, context: loadedContext } = data;

    if (!application) {
      setLoadError('Invalid application data');
      setLoadState('error');
      if (process.env.NODE_ENV === 'development') {
        console.log('[DEV][LOAD_APP_END] FAILED - no application in data');
      }
      return;
    }

    // Extract inputs from the application (stored in inputs field, minus _config)
    const { _config, ...inputsData } = application.inputs || {};

    // Set inputs
    setInputs(inputsData as SliderbedInputs);

    // Set context from loaded data
    if (loadedContext) {
      setContext(loadedContext);
      setConveyorQty(loadedContext.quantity || 1);

      // Set calculation status from loaded context (v1.21)
      const loadedCalcStatus = loadedContext.calculation_status ?? 'draft';
      const loadedOutputsStale = loadedContext.outputs_stale ?? false;
      setCalculationStatus(loadedCalcStatus);
      setOutputsStale(loadedOutputsStale);

      // Default to Configure tab when loading draft or stale
      if (loadedCalcStatus === 'draft' || loadedOutputsStale) {
        setViewMode('configure');
      }
    }

    // Set loaded IDs
    // DEV: SET_LOADED_APP_ID
    if (process.env.NODE_ENV === 'development') {
      console.log('[DEV][SET_LOADED_APP_ID]', {
        newValue: application.id,
        source: 'loadApplicationFromResponse',
      });
    }
    setLoadedConfigurationId(application.id);
    setLoadedRevisionId(application.id);

    // Set outputs/results if available
    if (application.expected_outputs) {
      setResult({
        success: true,
        outputs: application.expected_outputs,
        warnings: application.expected_issues || [],
        metadata: {
          calculated_at: application.updated_at || new Date().toISOString(),
          model_version_id: application.model_version || 'unknown',
          model_key: MODEL_KEY,
        },
      });
      setCalcStatus('ok');
    }

    // Save to localStorage for "last used" feature
    if (typeof window !== 'undefined') {
      localStorage.setItem(LAST_APP_KEY, application.id);
    }

    setLoadState('loaded');
    // DEV: LOAD_APP_END
    if (process.env.NODE_ENV === 'development') {
      console.log('[DEV][LOAD_APP_END] SUCCESS', {
        applicationId: application.id,
        hasContext: !!loadedContext,
        hasOutputs: !!application.expected_outputs,
      });
    }
    console.log('[Load] Application loaded:', application.id);
  }, []);

  // Effect: Load application based on URL params or localStorage
  useEffect(() => {
    if (loadState !== 'idle') return;

    const appId = searchParams.get('app');
    const quoteBase = searchParams.get('quote');
    const soBase = searchParams.get('so');
    const suffix = searchParams.get('suffix');
    const jobLine = searchParams.get('jobLine');

    // Build load URL
    let loadUrl: string | null = null;

    if (appId) {
      loadUrl = `/api/applications/load?app=${encodeURIComponent(appId)}`;
    } else if (quoteBase) {
      loadUrl = `/api/applications/load?quote=${encodeURIComponent(quoteBase)}`;
      if (suffix) loadUrl += `&suffix=${encodeURIComponent(suffix)}`;
      if (jobLine) loadUrl += `&jobLine=${encodeURIComponent(jobLine)}`;
    } else if (soBase) {
      loadUrl = `/api/applications/load?so=${encodeURIComponent(soBase)}`;
      if (suffix) loadUrl += `&suffix=${encodeURIComponent(suffix)}`;
      if (jobLine) loadUrl += `&jobLine=${encodeURIComponent(jobLine)}`;
    }
    // No URL params = start fresh (blank state)
    // Removed auto-load from localStorage - user must explicitly navigate to an SO/Quote

    if (!loadUrl) {
      // No app to load - start fresh (Draft Application)
      setLoadState('loaded');
      return;
    }

    // Load the application
    setLoadState('loading');
    setLoadError(null);

    fetch(loadUrl)
      .then(async (res) => {
        const data = await res.json();

        if (!res.ok) {
          // If loading last-used app fails, clear it and start fresh
          if (!appId && !quoteBase && !soBase && typeof window !== 'undefined') {
            localStorage.removeItem(LAST_APP_KEY);
            setLoadState('loaded'); // Start fresh, no error
            return;
          }

          // If loading by SO reference fails with 404, the SO exists but has no application yet
          // Set up a blank context linked to that SO so user can start working
          if (res.status === 404 && soBase && data.error?.includes('No Application found')) {
            console.log('[Load] No application for SO, fetching SO details to set up blank context');
            const soRes = await fetch(`/api/sales-orders?base_number=${encodeURIComponent(soBase)}`);
            if (soRes.ok) {
              const soList = await soRes.json();
              const so = soList.find((s: { base_number: number }) => String(s.base_number) === soBase);
              if (so) {
                // Set up blank context linked to this SO
                setContext({
                  type: 'sales_order',
                  id: so.id,
                  base: so.base_number,
                  line: so.suffix_line ?? null,
                  jobLine: 1,
                  quantity: 1,
                  customer_name: so.customer_name,
                });
                setLoadState('loaded');
                showToast(`Linked to SO${so.base_number}. Fill in details and save.`);
                return;
              }
            }
          }

          // Same for quotes
          if (res.status === 404 && quoteBase && data.error?.includes('No Application found')) {
            console.log('[Load] No application for Quote, fetching Quote details to set up blank context');
            const quoteRes = await fetch(`/api/quotes?base_number=${encodeURIComponent(quoteBase)}`);
            if (quoteRes.ok) {
              const quoteList = await quoteRes.json();
              const quote = quoteList.find((q: { base_number: number }) => String(q.base_number) === quoteBase);
              if (quote) {
                // Set up blank context linked to this Quote
                setContext({
                  type: 'quote',
                  id: quote.id,
                  base: quote.base_number,
                  line: quote.suffix_line ?? null,
                  jobLine: 1,
                  quantity: 1,
                  customer_name: quote.customer_name,
                });
                setLoadState('loaded');
                showToast(`Linked to Q${quote.base_number}. Fill in details and save.`);
                return;
              }
            }
          }

          throw new Error(data.error || 'Failed to load application');
        }

        // Check if we need job line selection
        if (data.needsJobLineSelection) {
          setJobLineSelectModal({
            isOpen: true,
            availableJobLines: data.availableJobLines,
            referenceType: data.referenceType,
            referenceBase: data.referenceBase,
            suffix: data.suffix,
          });
          setLoadState('awaiting-selection'); // Wait for user to pick a job line
          return;
        }

        loadApplicationFromResponse(data);
      })
      .catch((err) => {
        console.error('[Load] Error:', err);
        setLoadError(err.message);
        setLoadState('error');
      });
  }, [loadState, searchParams, loadApplicationFromResponse]);

  // Effect: Reset load state when URL params change (to reload different application)
  const currentAppId = searchParams.get('app');
  const currentQuote = searchParams.get('quote');
  const currentSo = searchParams.get('so');
  const currentSuffix = searchParams.get('suffix');
  const currentJobLine = searchParams.get('jobLine');

  const [lastLoadParams, setLastLoadParams] = useState<string | null>(null);
  const currentParams = `${currentAppId}|${currentQuote}|${currentSo}|${currentSuffix}|${currentJobLine}`;

  useEffect(() => {
    if (lastLoadParams !== null && lastLoadParams !== currentParams && loadState === 'loaded') {
      console.log('[Load] URL params changed, resetting to reload new application');
      // DEV: LOADED_APP_ID_RESET
      if (process.env.NODE_ENV === 'development') {
        console.log('[DEV][LOADED_APP_ID_RESET]', {
          reason: 'URL_PARAMS_CHANGED',
          oldParams: lastLoadParams,
          newParams: currentParams,
        });
      }
      setLoadState('idle');
      setLoadedConfigurationId(null);
      setLoadedRevisionId(null);
      setContext(null);
      setResult(null);
      setInputs(null);
    }
    setLastLoadParams(currentParams);
  }, [currentParams, lastLoadParams, loadState]);

  // Handle job line selection
  const handleJobLineSelect = (selectedJobLine: number) => {
    if (!jobLineSelectModal) return;

    const { referenceType, referenceBase, suffix } = jobLineSelectModal;
    const paramName = referenceType === 'QUOTE' ? 'quote' : 'so';

    let loadUrl = `/api/applications/load?${paramName}=${encodeURIComponent(referenceBase)}`;
    if (suffix) loadUrl += `&suffix=${encodeURIComponent(String(suffix))}`;
    loadUrl += `&jobLine=${encodeURIComponent(String(selectedJobLine))}`;

    setJobLineSelectModal(null);
    setLoadState('loading');

    fetch(loadUrl)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to load application');
        }
        loadApplicationFromResponse(data);
      })
      .catch((err) => {
        console.error('[Load] Error after job line selection:', err);
        setLoadError(err.message);
        setLoadState('error');
      });
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
  // 1) If linked context: must have changes (dirty) - draft saves allowed (v1.21)
  // 2) If no context: allow save (will open modal to select target)
  const canSave = context ? isDirty : true;

  // Calculate button always enabled
  const canCalculate = true;

  // Debug: Log state changes
  console.log('[state]', { context, loadedConfigurationId, isDirty, needsRecalc, isCalculatedFresh, canSave, canCalculate });

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
      setOutputsStale(true); // Mark outputs as stale when inputs change
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

    // Update calculation status to 'calculated' (v1.21)
    setCalculationStatus('calculated');
    setOutputsStale(false);

    console.log('[Calculate] Success - payload snapshot saved', calculatedPayload);
    setIsCalculating(false);

    // Show feedback without forcing navigation
    showToast('Results updated');
  };

  const handleInputsChange = useCallback((newInputs: SliderbedInputs) => {
    setInputs(newInputs);
  }, []);

  const handleClear = () => {
    console.log('[Clear] Resetting all state to new application');

    // DEV: LOADED_APP_ID_RESET
    if (process.env.NODE_ENV === 'development') {
      console.log('[DEV][LOADED_APP_ID_RESET]', {
        reason: 'HANDLE_CLEAR',
        previousId: loadedConfigurationId,
      });
    }

    // Reset context (unlink from Quote/SO)
    setContext(null);
    setConveyorQty(1);

    // Reset loaded state - use a unique revision ID to trigger CalculatorForm reset
    setLoadedConfigurationId(null);
    const clearRevisionId = `__clear__${Date.now()}`;
    setLoadedRevisionId(clearRevisionId);
    setInitialLoadedPayload(null);

    // Reset inputs to factory defaults (using buildDefaultInputs for single source of truth)
    setInputs(buildDefaultInputs());

    // Clear results and calculation status
    setResult(null);
    setLastCalculatedPayload(null);
    setCalcStatus('idle');

    // Reset calculation status fields
    setCalculationStatus('draft');
    setOutputsStale(false);

    // Clear localStorage to prevent auto-loading old app on refresh
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LAST_APP_KEY);
    }

    // Reset load state to loaded (we're now in a fresh state)
    setLoadState('loaded');

    // Clear draft vault
    setDraftVault({ notes: [], specs: [], scopeLines: [], attachments: [] });

    showToast('Cleared - start fresh');
  };

  // Handle Delete Line callback from header
  const handleDeleteLine = () => {
    console.log('[DeleteLine] Line deleted, clearing state');

    // Show appropriate toast
    const lineType = context?.type === 'quote' ? 'Quote' : 'Sales Order';
    showToast(`${lineType} line deleted`);

    // Clear all state (same as handleClear)
    setContext(null);
    setConveyorQty(1);
    setLoadedConfigurationId(null);
    setLoadedRevisionId(null);
    setInitialLoadedPayload(null);
    setInputs(null);
    setResult(null);
    setLastCalculatedPayload(null);
    setCalcStatus('idle');
    setCalculationStatus('draft');
    setOutputsStale(false);

    if (typeof window !== 'undefined') {
      localStorage.removeItem(LAST_APP_KEY);
    }

    setLoadState('loaded');
    setDraftVault({ notes: [], specs: [], scopeLines: [], attachments: [] });
  };

  // Handle Delete Draft callback from header (for unsaved drafts with context)
  // Draft = a Quote/Sales Order header row with no linked calc_recipes application
  const handleDeleteDraft = async () => {
    if (!context) {
      console.warn('[DeleteDraft] No context to delete');
      return;
    }

    // DEV: Log all identity fields for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('[DEV][DELETE_DRAFT_CLICK]', {
        reference_type: context.type,
        reference_number: context.type === 'quote' ? `Q${context.base}` : `SO${context.base}`,
        reference_id: context.id,
        base: context.base,
        line: context.line,
        jobLine: context.jobLine,
        applicationId: loadedConfigurationId,
        // These should all be null for a true draft (unsaved)
        loadedConfigurationId,
        loadedRevisionId,
      });
    }

    // Determine the DELETE endpoint based on context type
    const endpoint = context.type === 'quote'
      ? `/api/quotes/${context.id}`
      : `/api/sales-orders/${context.id}`;

    if (process.env.NODE_ENV === 'development') {
      console.log('[DEV][DELETE_DRAFT_API_CALL]', {
        method: 'DELETE',
        url: endpoint,
      });
    }

    try {
      const response = await fetch(endpoint, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (process.env.NODE_ENV === 'development') {
        console.log('[DEV][DELETE_DRAFT_API_RESPONSE]', {
          status: response.status,
          ok: response.ok,
          body: data,
        });
      }

      if (!response.ok) {
        console.error('[DeleteDraft] API error:', data);
        showToast(data.error || 'Failed to delete draft');
        return;
      }

      // Success - show toast
      const typeLabel = context.type === 'quote' ? 'Quote' : 'Sales Order';
      showToast(`${typeLabel} draft deleted`);

      // Clear all state
      setContext(null);
      setConveyorQty(1);
      setLoadedConfigurationId(null);
      setLoadedRevisionId(null);
      setInitialLoadedPayload(null);
      setInputs(null);
      setResult(null);
      setLastCalculatedPayload(null);
      setCalcStatus('idle');
      setCalculationStatus('draft');
      setOutputsStale(false);

      if (typeof window !== 'undefined') {
        localStorage.removeItem(LAST_APP_KEY);
      }

      setLoadState('loaded');
      setDraftVault({ notes: [], specs: [], scopeLines: [], attachments: [] });
    } catch (error) {
      console.error('[DeleteDraft] Network error:', error);
      showToast('Failed to delete draft');
    }
  };

  // Handle Save button click
  const handleSave = async () => {
    // If no context (draft), open modal to select target
    if (!context) {
      // Draft saves allowed without calculation (v1.21)
      setIsSaveTargetModalOpen(true);
      return;
    }

    // Context exists - save to linked Quote/SO
    if (!isDirty) {
      showToast('No changes to save');
      return;
    }

    if (!inputs) {
      showToast('No inputs to save');
      return;
    }

    // Determine if this is a draft save or calculated save (v1.21)
    const willSaveAsDraft = !result || needsRecalc;
    const isStale = result && needsRecalc;

    console.log('[Save] Saving to context:', context, { willSaveAsDraft, isStale });

    // Map context.type to reference_type enum (v1: must be Quote or SO)
    const referenceType = context.type === 'quote' ? 'QUOTE' : 'SALES_ORDER';

    const payload: Record<string, unknown> = {
      reference_type: referenceType,
      reference_number: String(context.base),
      reference_suffix: context.line ?? undefined, // Suffix (e.g., .2)
      reference_line: context.jobLine,             // Job line within the reference
      reference_id: context.id || undefined,       // UUID for FK linkage (quote_id or sales_order_id)
      customer_name: context.customer_name ?? undefined,
      quantity: context.quantity ?? conveyorQty,
      model_key: 'belt_conveyor_v1',
      inputs_json: inputs,
      parameters_json: DEFAULT_PARAMETERS,
      application_json: buildApplicationJson(inputs, context.quantity ?? conveyorQty),
      // Include outputs only if we have results (v1.21)
      ...(result ? {
        outputs_json: result.outputs,
        warnings_json: result.warnings,
        outputs_stale: isStale, // Mark as stale if inputs changed since calculation
      } : {}),
    };

    setIsSaving(true);
    try {
      const response = await fetch('/api/configurations/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const raw = await response.text();
        let errorMessage = 'Failed to save';
        try {
          const parsed = JSON.parse(raw);
          errorMessage = parsed.error || parsed.message || raw || errorMessage;
        } catch {
          errorMessage = raw || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json() as {
        status?: string;
        configuration: any;
        revision: any;
        message?: string;
        save_message?: string;
        calculation_status?: 'draft' | 'calculated';
        is_calculated?: boolean;
        outputs_stale?: boolean;
      };
      const { status, configuration, revision, message, save_message, calculation_status: newCalcStatus, outputs_stale: newOutputsStale } = data;

      if (status === 'no_change') {
        showToast(message || 'No changes to save');
        return;
      }

      // Update loaded IDs
      setLoadedConfigurationId(configuration.id);
      setLoadedRevisionId(revision.id);

      // Update calculation status (v1.21)
      if (newCalcStatus) setCalculationStatus(newCalcStatus);
      if (newOutputsStale !== undefined) setOutputsStale(newOutputsStale);

      // Save to localStorage for "last used" feature
      if (typeof window !== 'undefined' && configuration.id) {
        localStorage.setItem(LAST_APP_KEY, configuration.id);
      }

      // Reset initial loaded payload to current state
      const currentPayload = buildCurrentPayload();
      setInitialLoadedPayload(currentPayload);

      // Show save feedback message from API (v1.21)
      showToast(save_message || `Saved Rev ${revision.revision_number}`);
    } catch (error) {
      console.error('[Save] Error:', error);
      showToast(error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle selecting a target from the modal
  const handleSelectSaveTarget = async (target: SaveTarget) => {
    setIsSaveTargetModalOpen(false);

    // DEV logging
    if (process.env.NODE_ENV === 'development') {
      console.log('[DEV][SaveTarget] Target received:', target);
    }

    if (!inputs) {
      showToast('No inputs to save');
      return;
    }

    // Determine if this is a draft save or calculated save (v1.21)
    const willSaveAsDraft = !result || needsRecalc;
    const isStale = result && needsRecalc;

    console.log('[SaveTarget] Selected:', target, { willSaveAsDraft, isStale });

    // Set context (link to selected Quote/SO)
    setContext(target);

    // Save to the selected target
    // Map target.type to reference_type enum (v1: must be Quote or SO)
    const referenceType = target.type === 'quote' ? 'QUOTE' : 'SALES_ORDER';

    const payload: Record<string, unknown> = {
      reference_type: referenceType,
      reference_number: String(target.base),
      reference_suffix: target.line ?? undefined,  // Suffix (e.g., .2)
      reference_line: target.jobLine,              // Job line within the reference
      reference_id: target.id || undefined,        // UUID for FK linkage (quote_id or sales_order_id)
      customer_name: target.customer_name ?? undefined,
      quantity: target.quantity,
      model_key: 'belt_conveyor_v1',
      inputs_json: inputs,
      parameters_json: DEFAULT_PARAMETERS,
      application_json: buildApplicationJson(inputs, target.quantity),
      // Include outputs only if we have results (v1.21)
      ...(result ? {
        outputs_json: result.outputs,
        warnings_json: result.warnings,
        outputs_stale: isStale, // Mark as stale if inputs changed since calculation
      } : {}),
    };

    // DEV: SAVE_CLICK
    if (process.env.NODE_ENV === 'development') {
      console.log('[DEV][SAVE_CLICK]', {
        payload,
        currentLoadedConfigurationId: loadedConfigurationId,
        currentRoute: typeof window !== 'undefined' ? window.location.href : 'unknown',
        target,
      });
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/configurations/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const raw = await response.text();
        let errorMessage = 'Failed to save';
        try {
          const parsed = JSON.parse(raw);
          errorMessage = parsed.error || parsed.message || raw || errorMessage;
        } catch {
          errorMessage = raw || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json() as {
        status?: string;
        applicationId?: string;  // TOP-LEVEL for easy access
        configuration?: any;
        revision?: any;
        recipe?: any;
        save_message?: string;
        calculation_status?: 'draft' | 'calculated';
        is_calculated?: boolean;
        outputs_stale?: boolean;
      };

      const { applicationId: topLevelId, configuration, revision, recipe, save_message, calculation_status: newCalcStatus, outputs_stale: newOutputsStale } = data;

      // Get the application ID - prefer top-level, then fallback to nested
      const configId = topLevelId || configuration?.id || recipe?.id;
      const revisionId = revision?.id || recipe?.id;

      // DEV: SAVE_RESPONSE
      if (process.env.NODE_ENV === 'development') {
        console.log('[DEV][SAVE_RESPONSE]', {
          statusCode: response.status,
          fullResponse: data,
          derivedConfigId: configId,
          derivedRevisionId: revisionId,
        });
      }

      if (!configId) {
        throw new Error('Save succeeded but no application ID returned');
      }

      // Save to localStorage for "last used" feature
      if (typeof window !== 'undefined') {
        localStorage.setItem(LAST_APP_KEY, configId);
      }

      // CRITICAL: Reload the application from server to get fresh truth
      // This ensures we exit Draft mode and have consistent state
      if (process.env.NODE_ENV === 'development') {
        console.log('[DEV][SaveTarget] Reloading application from server:', configId);
      }

      const reloadResponse = await fetch(`/api/applications/load?app=${encodeURIComponent(configId)}`);
      if (reloadResponse.ok) {
        const reloadData = await reloadResponse.json();
        if (process.env.NODE_ENV === 'development') {
          console.log('[DEV][POST_SAVE_HYDRATION] About to call loadApplicationFromResponse', {
            configId,
            reloadData,
            currentLastLoadParams: lastLoadParams,
            currentParams,
          });
        }
        // IMPORTANT: Update lastLoadParams BEFORE calling loadApplicationFromResponse
        // This prevents the URL params change effect from immediately resetting our state
        // because loadApplicationFromResponse sets loadState='loaded' which could trigger the effect
        setLastLoadParams(currentParams);
        loadApplicationFromResponse(reloadData);
        if (process.env.NODE_ENV === 'development') {
          console.log('[DEV][POST_SAVE_HYDRATION] loadApplicationFromResponse completed');
        }
        showToast(save_message || 'Saved successfully');
      } else {
        // Fallback: just set the IDs if reload fails
        console.warn('[SaveTarget] Reload failed, using local state');
        // DEV: SET_LOADED_APP_ID (fallback)
        if (process.env.NODE_ENV === 'development') {
          console.log('[DEV][SET_LOADED_APP_ID]', {
            newValue: configId,
            source: 'handleSelectSaveTarget_fallback',
            reloadStatus: reloadResponse.status,
          });
        }
        if (configId) setLoadedConfigurationId(configId);
        if (revisionId) setLoadedRevisionId(revisionId);
        if (newCalcStatus) setCalculationStatus(newCalcStatus);
        if (newOutputsStale !== undefined) setOutputsStale(newOutputsStale);
        showToast(save_message || 'Saved (reload pending)');
      }

      // Persist draft vault entries to the database
      if (configId && (draftVault.notes.length > 0 || draftVault.specs.length > 0 || draftVault.scopeLines.length > 0 || draftVault.attachments.length > 0)) {
        console.log('[SaveTarget] Persisting draft vault entries...');
        try {
          // Persist notes
          for (const note of draftVault.notes) {
            await fetch(`/api/applications/${configId}/notes`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ content: note.content }),
            });
          }
          // Persist specs (current ones only)
          for (const spec of draftVault.specs.filter(s => s.is_current)) {
            await fetch(`/api/applications/${configId}/specs`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                key: spec.key,
                value: spec.value,
                units: spec.units,
                confidence: spec.confidence,
              }),
            });
          }
          // Persist scope lines
          for (const line of draftVault.scopeLines) {
            await fetch(`/api/applications/${configId}/scope-lines`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: line.text,
                category: line.category,
                inclusion: line.inclusion,
                position: line.position,
              }),
            });
          }
          // Persist attachments
          for (const att of draftVault.attachments) {
            await fetch(`/api/applications/${configId}/attachments`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                file_name: att.file_name,
                file_path: att.file_path,
                tag: att.tag,
              }),
            });
          }
          // Clear draft vault after persistence
          setDraftVault({ notes: [], specs: [], scopeLines: [], attachments: [] });
          console.log('[SaveTarget] Draft vault entries persisted');
        } catch (vaultErr) {
          console.error('[SaveTarget] Failed to persist vault entries:', vaultErr);
          // Don't fail the save, just log the error
        }
      }

      // Set initial loaded payload
      const currentPayload = buildCurrentPayload();
      setInitialLoadedPayload(currentPayload);
    } catch (error) {
      console.error('[SaveTarget] Error:', error);
      showToast(error instanceof Error ? error.message : 'Failed to save');
      // Revert context on error
      setContext(null);
    } finally {
      setIsSaving(false);
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

        {/* Save Target Modal (for first save in draft mode) */}
        <SaveTargetModal
          isOpen={isSaveTargetModalOpen}
          onClose={() => setIsSaveTargetModalOpen(false)}
          onSelect={handleSelectSaveTarget}
          defaultQuantity={conveyorQty}
        />

        {/* Line Selection Modal */}
        {jobLineSelectModal && (
          <JobLineSelectModal
            isOpen={jobLineSelectModal.isOpen}
            availableJobLines={jobLineSelectModal.availableJobLines}
            referenceType={jobLineSelectModal.referenceType}
            referenceBase={jobLineSelectModal.referenceBase}
            suffix={jobLineSelectModal.suffix}
            onSelect={handleJobLineSelect}
            onClose={() => setJobLineSelectModal(null)}
          />
        )}

        {/* Loading State */}
        {loadState === 'loading' && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-gray-500">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Loading application...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {loadState === 'error' && loadError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-red-800">Failed to load application</h3>
                <p className="text-sm text-red-700 mt-1">{loadError}</p>
                <button
                  onClick={() => { setLoadState('loaded'); setLoadError(null); }}
                  className="mt-2 text-sm font-medium text-red-600 hover:text-red-500"
                >
                  Start a new application instead
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Application Context Header */}
        <ApplicationContextHeader
          context={context}
          loadedConfigurationId={loadedConfigurationId}
          onClear={handleClear}
          onDeleteLine={handleDeleteLine}
          onDeleteDraft={handleDeleteDraft}
          isDirty={isDirty}
          isSaving={isSaving}
          onSave={handleSave}
          onCalculate={handleCalculateClick}
          isCalculating={isCalculating}
          canSave={canSave}
          needsRecalc={needsRecalc}
          calculationStatus={calculationStatus}
          outputsStale={outputsStale}
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
            <button
              type="button"
              onClick={() => setViewMode('vault')}
              className={`
                whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors
                ${
                  viewMode === 'vault'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                Vault
                {!context && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-500 rounded">
                    Draft
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
            applicationLineId={loadedConfigurationId}
            postCalcErrors={result?.errors}
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
          {/* Determine if we should show valid results or placeholder (v1.21) */}
          {(() => {
            // Show valid results only if: result exists AND calculation_status is calculated AND not stale
            // Note: outputsStale is now reliably set when inputs change after calculation
            const hasValidResults = result && calculationStatus === 'calculated' && !outputsStale;

            if (hasValidResults) {
              return (
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
              );
            }

            // Draft or stale state - show placeholder (v1.21)
            return (
              <div className="card">
                <div className="text-center py-12 text-gray-500">
                  <svg
                    className="mx-auto h-12 w-12 text-amber-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    {outputsStale ? 'Results are stale' : 'Draft Application'}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {outputsStale
                      ? 'Inputs have changed since the last calculation. Recalculate to get valid results.'
                      : 'This application has not been calculated yet. Configure inputs and run Calculate.'}
                  </p>
                  <div className="mt-4 flex justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setViewMode('configure')}
                      className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Go to Configure
                    </button>
                    <button
                      type="button"
                      onClick={handleCalculateClick}
                      disabled={isCalculating}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                    >
                      {isCalculating ? 'Calculating...' : 'Calculate Now'}
                    </button>
                  </div>
                </div>

                {/* Design Logic Panel - Always visible for education */}
                <div className="mt-6">
                  <DesignLogicPanel />
                </div>
              </div>
            );
          })()}

          {/* Edit Inputs CTA - Only show when we have valid calculated results */}
          {result && calculationStatus === 'calculated' && !outputsStale && (
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

        {/* Vault Mode */}
        <div className={viewMode === 'vault' ? '' : 'hidden'}>
          <VaultTab
            applicationId={loadedConfigurationId}
            onOpenSaveModal={() => setIsSaveTargetModalOpen(true)}
            draftVault={draftVault}
            onDraftVaultChange={setDraftVault}
          />
        </div>

        {/* Spacer for mobile bottom action bar */}
        <div className="h-24 md:hidden" aria-hidden="true" />
      </div>

      {/* Mobile Bottom Action Bar */}
      <div className="md:hidden">
        <MobileBottomActionBar
          onCalculate={handleCalculateClick}
          onSave={handleSave}
          isCalculating={isCalculating}
          isSaving={isSaving}
          canSave={canSave}
          isDirty={isDirty}
          outputsStale={outputsStale}
        />
      </div>
    </div>
  );
}
