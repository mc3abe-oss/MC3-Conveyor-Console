'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import CalculatorForm from './CalculatorForm';
import DesignLogicPanel from './DesignLogicPanel';
import ApplicationContextHeader from './ApplicationContextHeader';
import { ScopeStatusBannerFromContext } from './ScopeStatusBanner';
import { ScopeProvider, OutputGate, OutputDisabledBanner } from './ScopeContext';
import SaveTargetModal, { SaveTarget } from './SaveTargetModal';
import NewApplicationGateModal, { NewApplicationTarget } from './NewApplicationGateModal';
import DuplicateApplicationModal from './DuplicateApplicationModal';
import VaultTab, { DraftVault } from './VaultTab';
import JobLineSelectModal from './JobLineSelectModal';
import MobileBottomActionBar from './MobileBottomActionBar';
import SaveRecipeModal from './SaveRecipeModal';
import { CalculationResult, SliderbedInputs, DEFAULT_PARAMETERS, buildDefaultInputs, normalizeOutputShaftOption, GearmotorMountingStyle } from '../../src/models/sliderbed_v1/schema';
import { migrateInputs } from '../../src/models/sliderbed_v1/migrate';
import { buildOutputsV2, OutputsV2 } from '../../src/models/sliderbed_v1/outputs_v2';
import { OutputsV2Tabs } from './outputs_v2';
import CommercialScopeOutput from './CommercialScopeOutput';
import { MagneticOutputsTabs } from './outputs/magnetic';
import { BeltOutputsTabs } from './outputs/belt';
import { useCurrentUserRole } from '../hooks/useCurrentUserRole';
import { CATALOG_KEYS } from '../../src/lib/catalogs';
import { payloadsEqual } from '../../src/lib/payload-compare';
import { createClient } from '../../src/lib/supabase/browser';
import { stripSoContextFromSearchParams } from '../../src/lib/strip-so-context';
import { ProductKey } from '../../src/lib/products';
import { getProduct } from '../../src/products';

type ViewMode = 'configure' | 'results' | 'outputs_v2' | 'commercial_scope' | 'vault';
type LoadState = 'idle' | 'loading' | 'loaded' | 'error' | 'awaiting-selection';

const LAST_APP_KEY = 'belt_lastApplicationId';

/**
 * Deep clone a payload for immutable snapshot storage.
 * Ensures no shared references between current state and saved snapshot.
 */
function deepClonePayload<T>(payload: T): T {
  if (payload === null || payload === undefined) return payload;
  return JSON.parse(JSON.stringify(payload));
}

interface BeltConveyorCalculatorAppProps {
  /** Product key for routing to product-specific components */
  productKey?: ProductKey;
}

/**
 * BeltConveyorCalculatorApp - The main calculator application component.
 *
 * Supports both slider bed and roller bed configurations.
 * All internal state keys and logic remain unchanged.
 */
export default function BeltConveyorCalculatorApp({
  productKey = 'belt_conveyor_v1',
}: BeltConveyorCalculatorAppProps) {
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [inputs, setInputs] = useState<SliderbedInputs | null>(null);

  // Context-driven state: linked Quote or Sales Order
  const [context, setContext] = useState<SaveTarget | null>(null);
  const [conveyorQty, setConveyorQty] = useState(1);

  // Load/Save state with dirty tracking
  const [loadedConfigurationId, setLoadedConfigurationId] = useState<string | null>(null);
  const [loadedRevisionId, setLoadedRevisionId] = useState<string | null>(null);
  const [createdByDisplay, setCreatedByDisplay] = useState<string | null>(null);
  const [applicationName, setApplicationName] = useState<string | null>(null);
  const [applicationCreatedAt, setApplicationCreatedAt] = useState<string | null>(null);
  const [applicationUpdatedAt, setApplicationUpdatedAt] = useState<string | null>(null);
  const [applicationRevisionCount, setApplicationRevisionCount] = useState<number | undefined>(undefined);
  const [initialLoadedPayload, setInitialLoadedPayload] = useState<any>(null);

  // Calculate tracking
  const [lastCalculatedPayload, setLastCalculatedPayload] = useState<any>(null);
  const [_calcStatus, setCalcStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [triggerCalculate, setTriggerCalculate] = useState<number>(0);

  // Calculation status tracking (v1.21)
  const [calculationStatus, setCalculationStatus] = useState<'draft' | 'calculated'>('draft');
  const [outputsStale, setOutputsStale] = useState(false);

  // Legacy outputs detection: detect belt outputs on magnetic conveyor
  const [hasLegacyBeltOutputs, setHasLegacyBeltOutputs] = useState(false);

  // Auto-calc state: tracks if debounce is pending
  const [isAutoCalcPending, setIsAutoCalcPending] = useState(false);
  const autoCalcTimerRef = useRef<NodeJS.Timeout | null>(null);
  const AUTO_CALC_DEBOUNCE_MS = 300;

  // Paint validation state: skip paint validation until user explicitly attempts Calculate/Save
  // This prevents paint errors from appearing on initial load
  const [hasAttemptedExplicitAction, setHasAttemptedExplicitAction] = useState(false);

  // Ref to skip URL-change effect during deliberate Clear
  const isClearingRef = useRef(false);

  const [isSaving, setIsSaving] = useState(false);

  const [toast, setToast] = useState<string | null>(null);

  // Save Recipe Modal
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [isSavingRecipe, setIsSavingRecipe] = useState(false);

  // Save Target Modal (for first save in draft mode)
  const [isSaveTargetModalOpen, setIsSaveTargetModalOpen] = useState(false);

  // New Application Gate Modal (requires Quote/SO attachment before proceeding)
  const [isNewAppGateOpen, setIsNewAppGateOpen] = useState(false);

  // Gate navigation pending: prevents load effect from reopening modal during async router.replace
  const gateNavPendingRef = useRef(false);

  // Duplicate Application Modal (shown when 409 returned on save)
  const [duplicateInfo, setDuplicateInfo] = useState<{
    identity: {
      reference_type: string;
      reference_number: string;
      reference_line: number;
      slug: string;
    };
    existing_application_id: string | null;
    existing_details: {
      id: string;
      created_at: string;
      created_by: string | null;
      updated_at: string;
    } | null;
  } | null>(null);

  // Draft Vault (local state until first save)
  const [draftVault, setDraftVault] = useState<DraftVault>({
    notes: [],
    specs: [],
    scopeLines: [],
    attachments: [],
  });

  // View mode: 'configure' or 'results'
  const [viewMode, setViewMode] = useState<ViewMode>('configure');

  // v1.42: User email for feature gating
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // User role for superuser-only features
  const { isSuperAdmin } = useCurrentUserRole();

  // Fetch user email on mount for feature gating
  useEffect(() => {
    const fetchUserEmail = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        setUserEmail(user?.email ?? null);
      } catch {
        setUserEmail(null);
      }
    };
    fetchUserEmail();
  }, []);

  // v1.42: Outputs v2 is only visible to abek@mc3mfg.com
  const showOutputsV2 = userEmail === 'abek@mc3mfg.com';

  // Commercial Scope is only visible to Super Admins
  const showCommercialScope = isSuperAdmin;

  // URL-based loading state
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
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

    // Check if loaded application's model_key matches current productKey
    // If not, redirect to the correct product page
    const loadedModelKey = application.model_key;
    if (loadedModelKey && loadedModelKey !== productKey) {
      // Map model_key to console path
      const productPaths: Record<string, string> = {
        'belt_conveyor_v1': '/console/belt',
        'magnetic_conveyor_v1': '/console/magnetic',
      };
      const targetPath = productPaths[loadedModelKey];
      if (targetPath && typeof window !== 'undefined') {
        // Preserve current query params in redirect
        const currentParams = window.location.search;
        const redirectUrl = `${targetPath}${currentParams}`;
        if (process.env.NODE_ENV === 'development') {
          console.log('[DEV][MODEL_KEY_MISMATCH] Redirecting', {
            loadedModelKey,
            currentProductKey: productKey,
            redirectUrl,
          });
        }
        router.push(redirectUrl as '/console/belt');
        return;
      }
    }

    // Extract inputs from the application (stored in inputs field, minus _config)
    const { _config, ...inputsData } = application.inputs || {};

    // Run migration to ensure all required fields have sensible defaults
    // This handles legacy configs that may be missing newer fields like material_form
    const migratedInputs = migrateInputs(inputsData as Partial<SliderbedInputs>);

    // Normalize output_shaft_option to inch-only based on mounting style (v1.45)
    // This coerces any legacy metric selections or null values to the correct inch-only value
    const mountingStyle = migratedInputs.gearmotor_mounting_style as GearmotorMountingStyle | undefined;
    const normalizedOutputShaft = normalizeOutputShaftOption(
      mountingStyle,
      migratedInputs.output_shaft_option
    );
    let normalizedInputs = {
      ...migratedInputs,
      output_shaft_option: normalizedOutputShaft,
    };

    // Seed magnetic defaults when loading a magnetic app with missing keys
    // This ensures the calculator receives valid inputs even for legacy apps
    if (productKey === 'magnetic_conveyor_v1') {
      const magneticProduct = getProduct('magnetic_conveyor_v1');
      if (magneticProduct) {
        const magneticDefaults = magneticProduct.getDefaultInputs() as Record<string, unknown>;
        // Check for required magnetic keys that might be missing
        const requiredMagneticKeys = [
          'infeed_length_in',
          'discharge_height_in',
          'incline_angle_deg',
          'magnet_width_in',
          'belt_speed_fpm',
          'conveyor_class',
        ];
        const hasMissingKeys = requiredMagneticKeys.some(
          (key) => (normalizedInputs as Record<string, unknown>)[key] === undefined
        );
        if (hasMissingKeys) {
          console.log('[Load] Seeding magnetic defaults for missing keys');
          // Merge defaults for missing keys only (don't override existing values)
          normalizedInputs = {
            ...magneticDefaults,
            ...normalizedInputs,
          };
        }
      }
    }

    // Set inputs
    setInputs(normalizedInputs as SliderbedInputs);

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

    // Set creator display if available
    setCreatedByDisplay(application.created_by_display || null);

    // Set application name if available
    setApplicationName(application.name || null);

    // Set application metadata for header display
    setApplicationCreatedAt(application.created_at || null);
    setApplicationUpdatedAt(application.updated_at || null);
    setApplicationRevisionCount(data.revision_count ?? undefined);

    // Set outputs/results if available
    if (application.expected_outputs) {
      // Detect legacy/invalid outputs on magnetic conveyor
      const outputs = application.expected_outputs as Record<string, unknown>;
      const isMagneticProduct = productKey === 'magnetic_conveyor_v1';

      if (isMagneticProduct) {
        // Check for belt-specific keys that should NOT be in magnetic outputs
        const beltOnlyKeys = ['drive_T1_lbf', 'drive_T2_lbf', 'drive_pulley_diameter_in'];
        const hasBeltKeys = beltOnlyKeys.some(key => outputs[key] !== undefined);

        // Also check for required magnetic keys that should be present
        const magneticRequiredKeys = ['chain_length_in', 'qty_magnets', 'total_torque_in_lb'];
        const hasMagneticKeys = magneticRequiredKeys.every(
          key => outputs[key] !== undefined && !Number.isNaN(outputs[key])
        );

        if (hasBeltKeys || !hasMagneticKeys) {
          // Legacy belt outputs or missing magnetic outputs - mark as stale
          setHasLegacyBeltOutputs(true);
          setOutputsStale(true);
          console.log('[Load] Legacy/missing outputs detected on magnetic conveyor - marked as stale', {
            hasBeltKeys,
            hasMagneticKeys,
          });
        } else {
          setHasLegacyBeltOutputs(false);
        }
      } else {
        setHasLegacyBeltOutputs(false);
      }

      setResult({
        success: true,
        outputs: application.expected_outputs,
        warnings: application.expected_issues || [],
        metadata: {
          calculated_at: application.updated_at || new Date().toISOString(),
          model_version_id: application.model_version || 'unknown',
          model_key: productKey,
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
  }, [productKey, router]);

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

    // Check for ?new=true - requires Quote/SO attachment gate
    const isNewApp = searchParams.get('new') === 'true';

    if (!loadUrl) {
      if (isNewApp) {
        // If gate navigation is pending (user clicked Continue but URL hasn't updated yet),
        // do NOT reopen the modal - wait for URL to update
        if (gateNavPendingRef.current) {
          console.log('[Load] Gate navigation pending, skipping modal reopen');
          return;
        }
        // New application flow - show gate modal to require Quote/SO attachment
        setIsNewAppGateOpen(true);
        setLoadState('awaiting-selection');
        return;
      }
      // No app to load and not new - redirect to home (shouldn't be here without context)
      router.push('/console');
      return;
    }

    // If we have a loadUrl and gate navigation was pending, clear the flag
    if (gateNavPendingRef.current) {
      console.log('[Load] URL updated after gate navigation, proceeding to load');
      gateNavPendingRef.current = false;
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

          // If loading by SO reference fails with 404, check if SO itself exists
          if (res.status === 404 && soBase && data.error?.includes('No Application found')) {
            console.log('[Load] No application for SO, fetching SO details to set up blank context');
            const soRes = await fetch(`/api/sales-orders?base_number=${encodeURIComponent(soBase)}`);
            if (soRes.ok) {
              const soData = await soRes.json();
              const soList = soData.data || soData; // Handle both paginated and array response
              const so = (Array.isArray(soList) ? soList : []).find((s: { base_number: number }) => String(s.base_number) === soBase);
              if (so) {
                // SO exists but has no application - set up blank context
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
            // SO not found - check if we're in new app flow
            if (isNewApp) {
              // New app flow: set up blank context without existing SO record
              // The SO will be created when the application is saved
              const parsedJobLine = jobLine ? parseInt(jobLine, 10) : 1;
              const parsedSuffix = suffix ? parseInt(suffix, 10) : null;
              setContext({
                type: 'sales_order',
                id: undefined as any, // Will be created on save
                base: parseInt(soBase, 10),
                line: parsedSuffix,
                jobLine: parsedJobLine,
                quantity: 1,
                customer_name: undefined,
              });
              setLoadState('loaded');
              showToast(`New application for SO${soBase}. Fill in details and save.`);
              return;
            }
            // Not new app flow - redirect to SO list
            console.log('[Load] SO not found, redirecting to sales orders list');
            showToast(`Sales Order ${soBase} not found.`);
            router.push('/console/sales-orders');
            return;
          }

          // Same for quotes
          if (res.status === 404 && quoteBase && data.error?.includes('No Application found')) {
            console.log('[Load] No application for Quote, fetching Quote details to set up blank context');
            const quoteRes = await fetch(`/api/quotes?base_number=${encodeURIComponent(quoteBase)}`);
            if (quoteRes.ok) {
              const quoteData = await quoteRes.json();
              const quoteList = quoteData.data || quoteData; // Handle both paginated and array response
              const quote = (Array.isArray(quoteList) ? quoteList : []).find((q: { base_number: number }) => String(q.base_number) === quoteBase);
              if (quote) {
                // Quote exists but has no application - set up blank context
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
            // Quote not found - check if we're in new app flow
            if (isNewApp) {
              // New app flow: set up blank context without existing Quote record
              // The Quote will be created when the application is saved
              const parsedJobLine = jobLine ? parseInt(jobLine, 10) : 1;
              const parsedSuffix = suffix ? parseInt(suffix, 10) : null;
              setContext({
                type: 'quote',
                id: undefined as any, // Will be created on save
                base: parseInt(quoteBase, 10),
                line: parsedSuffix,
                jobLine: parsedJobLine,
                quantity: 1,
                customer_name: undefined,
              });
              setLoadState('loaded');
              showToast(`New application for Q${quoteBase}. Fill in details and save.`);
              return;
            }
            // Not new app flow - redirect to quotes list
            console.log('[Load] Quote not found, redirecting to quotes list');
            showToast(`Quote ${quoteBase} not found.`);
            router.push('/console/quotes');
            return;
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
    // Skip if we're in the middle of a deliberate Clear operation
    if (isClearingRef.current) {
      console.log('[Load] Skipping URL change effect - clearing in progress');
      setLastLoadParams(currentParams);
      return;
    }

    // Handle gate navigation completion: URL changed after user selected target in gate modal
    if (gateNavPendingRef.current && loadState === 'awaiting-selection') {
      // Check if URL now has quote/so params (meaning navigation completed)
      if (currentQuote || currentSo) {
        console.log('[Load] Gate navigation completed, URL updated. Triggering load.');
        gateNavPendingRef.current = false;
        setLoadState('idle'); // This will trigger the main load effect
        setLastLoadParams(currentParams);
        return;
      }
    }

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
  }, [currentParams, lastLoadParams, loadState, currentQuote, currentSo]);

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

  // Handle new application gate modal selection (Quote/SO attachment)
  const handleNewAppGateSelect = async (target: NewApplicationTarget) => {
    // Close modal immediately
    setIsNewAppGateOpen(false);

    // Build reference info for exists check
    const referenceType = target.type === 'quote' ? 'QUOTE' : 'SALES_ORDER';
    const referenceNumber = target.suffix !== null
      ? `${target.base}.${target.suffix}`
      : String(target.base);

    // Check if application already exists BEFORE navigating
    try {
      const existsUrl = `/api/applications/exists?reference_type=${encodeURIComponent(referenceType)}&reference_number=${encodeURIComponent(referenceNumber)}&job_line=${encodeURIComponent(String(target.jobLine))}`;
      const existsRes = await fetch(existsUrl);
      const existsData = await existsRes.json();

      if (existsData.exists) {
        // Application already exists - show duplicate modal
        console.log('[Gate] Duplicate application found:', existsData);
        setDuplicateInfo({
          identity: {
            reference_type: referenceType,
            reference_number: referenceNumber,
            reference_line: target.jobLine,
            slug: `config:${referenceType.toLowerCase()}:${referenceNumber}:${target.jobLine}`,
          },
          existing_application_id: existsData.existing_application_id,
          existing_details: existsData.existing_details,
        });
        // Stay in awaiting-selection state, don't navigate
        return;
      }
    } catch (err) {
      console.error('[Gate] Error checking for existing application:', err);
      // On error, proceed with navigation (will fail later if duplicate)
    }

    // No duplicate found - proceed with navigation
    // Set pending flag to prevent load effect from reopening modal
    gateNavPendingRef.current = true;

    // Build new URL with the selected Quote/SO context
    const paramName = target.type === 'quote' ? 'quote' : 'so';
    const params = new URLSearchParams();
    params.set(paramName, String(target.base));
    if (target.suffix !== null) {
      params.set('suffix', String(target.suffix));
    }
    params.set('jobLine', String(target.jobLine));
    params.set('new', 'true');  // Preserve new app context for load effect

    // Navigate to the new URL (this will trigger the load effect via URL change)
    const newUrl = `${pathname}?${params.toString()}`;
    // DON'T call setLoadState('idle') here - let URL change trigger it
    router.replace(newUrl as '/console/belt');
  };

  // Handle cancel from new application gate modal
  const handleNewAppGateCancel = () => {
    setIsNewAppGateOpen(false);
    // Navigate back to console home
    router.push('/console');
  };

  // Handle "Open Existing" from duplicate application modal
  const handleOpenExistingApp = () => {
    if (!duplicateInfo?.existing_application_id) {
      // Edge case: no ID available, just close modal
      setDuplicateInfo(null);
      return;
    }

    // Navigate to the existing application
    const appId = duplicateInfo.existing_application_id;
    setDuplicateInfo(null);
    // Reset load state to idle so the load effect runs after navigation
    setLoadState('idle');
    router.push(`${pathname}?app=${encodeURIComponent(appId)}` as '/console/belt');
  };

  // Handle "Cancel" from duplicate application modal
  const handleCancelDuplicate = () => {
    // Close duplicate modal and reopen gate modal to let user try different reference
    setDuplicateInfo(null);
    // Only reopen gate modal if we're still in the new application flow
    if (searchParams.get('new') === 'true') {
      setIsNewAppGateOpen(true);
    }
  };

  // Get product name for the gate modal
  const productNameForGate = productKey === 'magnetic_conveyor_v1' ? 'Magnetic Conveyor' : 'Belt Conveyor';

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

  // Build outputs_v2 when we have inputs and successful result
  const outputsV2: OutputsV2 | null = useMemo(() => {
    if (!inputs || !result?.success || !result.outputs) {
      return null;
    }
    try {
      return buildOutputsV2({ inputs, outputs_v1: result.outputs });
    } catch (e) {
      console.error('[outputsV2] Build failed:', e);
      return null;
    }
  }, [inputs, result]);

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
        // Deep clone to ensure immutable snapshot (no shared references)
        setInitialLoadedPayload(deepClonePayload(payload));
        console.log('[Effect] Initial payload set:', payload);
      }
    }
  }, [loadedRevisionId, inputs, initialLoadedPayload, buildCurrentPayload]);

  // Effect: Auto-recalculate when inputs change (with debounce)
  // This replaces the old "invalidate and mark stale" approach
  useEffect(() => {
    // Don't auto-calc if no inputs yet
    if (!inputs) return;

    const currentPayload = buildCurrentPayload();
    if (!currentPayload) return;

    // Check if payload has changed since last calculation
    const hasChanged = lastCalculatedPayload
      ? !payloadsEqual(currentPayload, lastCalculatedPayload)
      : true; // First calc needed

    if (!hasChanged) {
      // Payload matches last calc - nothing to do
      return;
    }

    // Clear any existing debounce timer
    if (autoCalcTimerRef.current) {
      clearTimeout(autoCalcTimerRef.current);
    }

    // Mark as pending (for UI status indicator)
    setIsAutoCalcPending(true);
    console.log('[AutoCalc] Inputs changed - scheduling recalc in', AUTO_CALC_DEBOUNCE_MS, 'ms');

    // Schedule auto-calc with debounce
    autoCalcTimerRef.current = setTimeout(() => {
      console.log('[AutoCalc] Debounce complete - triggering calculation');
      setIsAutoCalcPending(false);
      setTriggerCalculate(prev => prev + 1);
    }, AUTO_CALC_DEBOUNCE_MS);

    // Cleanup on unmount or re-run
    return () => {
      if (autoCalcTimerRef.current) {
        clearTimeout(autoCalcTimerRef.current);
      }
    };
  }, [inputs, lastCalculatedPayload, buildCurrentPayload]);

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
    setHasLegacyBeltOutputs(false); // Clear legacy flag after fresh calculation

    console.log('[Calculate] Success - payload snapshot saved', calculatedPayload);
    setIsCalculating(false);
    // Note: No toast - auto-calc is silent. User sees status indicator instead.
  };

  const handleInputsChange = useCallback((newInputs: SliderbedInputs) => {
    setInputs(newInputs);
  }, []);

  const handleClear = () => {
    console.log('[Clear] Resetting all state to new application');

    // Set clearing flag to prevent URL-change effect from double-resetting state
    isClearingRef.current = true;

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
    setCreatedByDisplay(null);
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

    // Reset paint validation state (skip validation until explicit Calculate/Save)
    setHasAttemptedExplicitAction(false);

    // Clear localStorage to prevent auto-loading old app on refresh
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LAST_APP_KEY);
    }

    // Reset load state to loaded (we're now in a fresh state)
    setLoadState('loaded');

    // Clear draft vault
    setDraftVault({ notes: [], specs: [], scopeLines: [], attachments: [] });

    // Strip SO/Quote context params from URL to prevent rehydration on refresh
    const cleanedSearch = stripSoContextFromSearchParams(searchParams);
    const newUrl = cleanedSearch ? `${pathname}?${cleanedSearch}` : pathname;
    // @ts-expect-error - Next.js typed routes require string literal, but dynamic URL is valid at runtime
    router.replace(newUrl, { scroll: false });

    // Clear the clearing flag after a short delay to allow URL change to propagate
    setTimeout(() => {
      isClearingRef.current = false;
    }, 100);

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

  // Handle Rename callback from header
  const handleRenameSuccess = (newName: string) => {
    setApplicationName(newName);
    showToast('Application renamed');
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
    console.log('[DEBUG][handleSave] CALLED', { context, isDirty, loadedConfigurationId });

    // Mark that user has attempted explicit action - enables paint validation
    setHasAttemptedExplicitAction(true);

    // If no context (draft), open modal to select target
    if (!context) {
      console.log('[DEBUG][handleSave] No context - opening SaveTargetModal');
      // Draft saves allowed without calculation (v1.21)
      setIsSaveTargetModalOpen(true);
      return;
    }

    // Context exists - save to linked Quote/SO
    if (!isDirty) {
      console.log('[DEBUG][handleSave] Not dirty - showing toast');
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

    // CRITICAL: If we have a loadedConfigurationId, this is an UPDATE, not a CREATE
    // Without existing_application_id, the API will try to CREATE and hit duplicate error
    const saveAction = loadedConfigurationId ? 'UPDATE' : 'CREATE';
    console.log('[Save] Action:', saveAction, { loadedConfigurationId, context });

    const payload: Record<string, unknown> = {
      reference_type: referenceType,
      reference_number: String(context.base),
      reference_suffix: context.line ?? undefined, // Suffix (e.g., .2)
      reference_line: context.jobLine,             // Job line within the reference
      reference_id: context.id || undefined,       // UUID for FK linkage (quote_id or sales_order_id)
      customer_name: context.customer_name ?? undefined,
      quantity: context.quantity ?? conveyorQty,
      model_key: productKey,
      inputs_json: inputs,
      parameters_json: DEFAULT_PARAMETERS,
      application_json: buildApplicationJson(inputs, context.quantity ?? conveyorQty),
      // CRITICAL: Pass existing_application_id for UPDATE mode
      existing_application_id: loadedConfigurationId || undefined,
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

      console.log('[DEBUG][handleSave] Response status:', response.status, response.ok);

      if (!response.ok) {
        const raw = await response.text();
        console.log('[DEBUG][handleSave] Response NOT OK, raw:', raw);
        let errorMessage = 'Failed to save';
        try {
          const parsed = JSON.parse(raw);
          console.log('[DEBUG][handleSave] Parsed response:', parsed);

          // Handle duplicate application (409)
          if (response.status === 409 && parsed.code === 'APPLICATION_DUPLICATE') {
            console.log('[DEBUG][handleSave] 409 DUPLICATE DETECTED - setting duplicateInfo');
            setDuplicateInfo({
              identity: parsed.identity,
              existing_application_id: parsed.existing_application_id,
              existing_details: parsed.existing_details,
            });
            setIsSaving(false);
            return; // Exit early - modal will handle next steps
          }

          errorMessage = parsed.error || parsed.message || raw || errorMessage;
        } catch (parseErr) {
          console.log('[DEBUG][handleSave] Parse error:', parseErr);
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

      // Reset initial loaded payload to current state (deep clone for immutability)
      const currentPayload = buildCurrentPayload();
      setInitialLoadedPayload(deepClonePayload(currentPayload));

      // Show save feedback message from API (v1.21)
      showToast(save_message || `Saved Rev ${revision.revision_number}`);
    } catch (error) {
      console.error('[Save] Error:', error);
      showToast(error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Save as Recipe
  const handleSaveRecipe = async (data: { name: string; recipe_type: 'golden' | 'reference'; notes: string }) => {
    if (!inputs || !result?.outputs) {
      throw new Error('Missing inputs or outputs');
    }

    setIsSavingRecipe(true);
    try {
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          recipe_type: data.recipe_type,
          notes: data.notes || null,
          inputs: inputs,
          outputs: result.outputs,
          model_key: result.metadata.model_key,
          model_version_id: result.metadata.model_version_id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save recipe');
      }

      const savedRecipe = await response.json();
      showToast(`Recipe "${savedRecipe.name}" saved`);
    } finally {
      setIsSavingRecipe(false);
    }
  };

  // Handle selecting a target from the modal
  const handleSelectSaveTarget = async (target: SaveTarget) => {
    console.log('[DEBUG][handleSelectSaveTarget] CALLED with target:', target);
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

    // Note: handleSelectSaveTarget is for first-time saves from the modal
    // If loadedConfigurationId exists, this is unusual but we should handle it
    const saveAction = loadedConfigurationId ? 'UPDATE' : 'CREATE';
    console.log('[SaveTarget] Selected:', target, { willSaveAsDraft, isStale, saveAction, loadedConfigurationId });

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
      model_key: productKey,
      inputs_json: inputs,
      parameters_json: DEFAULT_PARAMETERS,
      application_json: buildApplicationJson(inputs, target.quantity),
      // Pass existing_application_id if we somehow have one (rare for modal flow)
      existing_application_id: loadedConfigurationId || undefined,
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

      console.log('[DEBUG][handleSelectSaveTarget] Response status:', response.status, response.ok);

      if (!response.ok) {
        const raw = await response.text();
        console.log('[DEBUG][handleSelectSaveTarget] Response NOT OK, raw:', raw);
        let errorMessage = 'Failed to save';
        try {
          const parsed = JSON.parse(raw);
          console.log('[DEBUG][handleSelectSaveTarget] Parsed response:', parsed);

          // Handle duplicate application (409)
          if (response.status === 409 && parsed.code === 'APPLICATION_DUPLICATE') {
            console.log('[DEBUG][handleSelectSaveTarget] 409 DUPLICATE DETECTED - setting duplicateInfo');
            setDuplicateInfo({
              identity: parsed.identity,
              existing_application_id: parsed.existing_application_id,
              existing_details: parsed.existing_details,
            });
            setIsSaving(false);
            // Revert context on duplicate (don't keep the target)
            setContext(null);
            return; // Exit early - modal will handle next steps
          }

          errorMessage = parsed.error || parsed.message || raw || errorMessage;
        } catch (parseErr) {
          console.log('[DEBUG][handleSelectSaveTarget] Parse error:', parseErr);
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

      // Set initial loaded payload (deep clone for immutability)
      const currentPayload = buildCurrentPayload();
      setInitialLoadedPayload(deepClonePayload(currentPayload));
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
    // Mark that user has attempted explicit action - enables paint validation
    setHasAttemptedExplicitAction(true);
    setTriggerCalculate(prev => prev + 1);
  };

  return (
    <div>
      {/* Toast notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-4 py-2 rounded-md shadow-lg">
          {toast}
        </div>
      )}

      {/* Modals - outside flow */}
      <SaveTargetModal
        isOpen={isSaveTargetModalOpen}
        onClose={() => setIsSaveTargetModalOpen(false)}
        onSelect={handleSelectSaveTarget}
        defaultQuantity={conveyorQty}
      />
      <SaveRecipeModal
        isOpen={isRecipeModalOpen}
        onClose={() => setIsRecipeModalOpen(false)}
        onSave={handleSaveRecipe}
        isSaving={isSavingRecipe}
      />
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
      <NewApplicationGateModal
        isOpen={isNewAppGateOpen}
        onSelect={handleNewAppGateSelect}
        onCancel={handleNewAppGateCancel}
        productName={productNameForGate}
      />
      {duplicateInfo && (
        <DuplicateApplicationModal
          isOpen={!!duplicateInfo}
          onOpenExisting={handleOpenExistingApp}
          onCancel={handleCancelDuplicate}
          identity={duplicateInfo.identity}
          existingDetails={duplicateInfo.existing_details}
        />
      )}

      {/* ============================================================ */}
      {/* DEV DEBUG PANEL - Shows save state info (remove for production) */}
      {/* ============================================================ */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-2 p-2 bg-yellow-50 border border-yellow-300 rounded text-xs font-mono">
          <div className="font-bold text-yellow-800 mb-1">DEV: Save State Debug</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-yellow-700">
            <span>application_id:</span>
            <span className={loadedConfigurationId ? 'text-green-600 font-bold' : 'text-red-600'}>{loadedConfigurationId || 'null (CREATE mode)'}</span>
            <span>context.type:</span>
            <span>{context?.type || 'null'}</span>
            <span>context.base:</span>
            <span>{context?.base || 'null'}</span>
            <span>context.jobLine:</span>
            <span>{context?.jobLine || 'null'}</span>
            <span>isDirty:</span>
            <span className={isDirty ? 'text-orange-600 font-bold' : 'text-green-600'}>{String(isDirty)}</span>
            <span>isSaving:</span>
            <span className={isSaving ? 'text-blue-600 font-bold' : ''}>{String(isSaving)}</span>
            <span>saveAction:</span>
            <span className={loadedConfigurationId ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>{loadedConfigurationId ? 'UPDATE' : 'CREATE'}</span>
            <span>loadedRevisionId:</span>
            <span className="truncate max-w-[150px]">{loadedRevisionId || 'null'}</span>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* DOCUMENT HEADER - Card with context info and mode selector   */}
      {/* ============================================================ */}
      <ScopeProvider entityType={context?.type ?? null} entityId={context?.id ?? null}>
      <div className="bg-white rounded-lg shadow-sm border border-gray-400 mb-4">
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
          onSaveAsRecipe={() => setIsRecipeModalOpen(true)}
          canSaveAsRecipe={!!(result?.success && result?.outputs && inputs)}
          onCalculate={handleCalculateClick}
          isCalculating={isCalculating}
          canSave={canSave}
          needsRecalc={needsRecalc}
          calculationStatus={calculationStatus}
          outputsStale={outputsStale}
          hasCalcError={result ? !result.success : false}
          createdByDisplay={createdByDisplay}
          createdAt={applicationCreatedAt}
          lastUpdatedAt={applicationUpdatedAt}
          revisionCount={applicationRevisionCount}
          applicationName={applicationName}
          applicationId={loadedConfigurationId}
          onRename={handleRenameSuccess}
        />

        {/* Scope Status Banner - Draft/Set toggle for linked Quote/SO */}
        <ScopeStatusBannerFromContext />

        {/* Mode Selector - Segmented Button Group */}
        <div className="px-5 pb-4">
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-100 p-1" role="tablist" aria-label="View mode">
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'configure'}
              onClick={() => setViewMode('configure')}
              className={`
                flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all
                ${viewMode === 'configure'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                }
              `}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Configure
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'results'}
              onClick={() => setViewMode('results')}
              className={`
                flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all
                ${viewMode === 'results'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                }
              `}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Results
              {(isAutoCalcPending || isCalculating) && (
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              )}
            </button>
            {showOutputsV2 && (
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'outputs_v2'}
                onClick={() => setViewMode('outputs_v2')}
                className={`
                  flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all
                  ${viewMode === 'outputs_v2'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                  }
                `}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Outputs v2
              </button>
            )}
            {showCommercialScope && (
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'commercial_scope'}
                onClick={() => setViewMode('commercial_scope')}
                className={`
                  flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all
                  ${viewMode === 'commercial_scope'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                  }
                `}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Commercial Scope
              </button>
            )}
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'vault'}
              onClick={() => setViewMode('vault')}
              className={`
                flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all
                ${viewMode === 'vault'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                }
              `}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              Vault
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* CONTENT AREA - Full width within layout container            */}
      {/* ============================================================ */}
      <div>
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
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
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

        {/* Configure Mode - Full width lanes */}
        {/* NOTE: Using CSS visibility instead of conditional rendering to prevent
            CalculatorForm from unmounting/remounting when switching tabs.
            This fixes a bug where the triggerCalculate ref would reset on remount,
            causing an unwanted recalculation that switched back to Results tab. */}
        <div className={viewMode === 'configure' ? '' : 'hidden'}>
          <CalculatorForm
            productKey={productKey}
            onCalculate={handleCalculate}
            isCalculating={isCalculating}
            initialInputs={inputs}
            onInputsChange={handleInputsChange}
            loadedRevisionId={loadedRevisionId ?? undefined}
            triggerCalculate={triggerCalculate}
            hideCalculateButton={true}
            applicationLineId={loadedConfigurationId}
            postCalcErrors={result?.errors}
            outputs={result?.outputs}
            showToast={showToast}
            skipPaintValidation={!hasAttemptedExplicitAction}
          />
        </div>

        {/* Results Mode - Full width results */}
        <div className={viewMode === 'results' ? '' : 'hidden'}>
          {/* With auto-calc, show results even if stale (they'll auto-update).
              Placeholder only shows for true draft state (never calculated). */}
          {(() => {
            // Show results if we have any result (even if stale - auto-calc will update)
            const hasResults = result && calculationStatus === 'calculated';

            if (hasResults) {
              // Render product-specific outputs based on productKey
              if (productKey === 'magnetic_conveyor_v1') {
                // Magnetic conveyor uses dedicated output tabs
                return (
                  <>
                    {/* Legacy outputs warning banner */}
                    {hasLegacyBeltOutputs && (
                      <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-sm text-amber-800">
                        <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span>Legacy outputs detected. Update an input to recalculate with magnetic-specific values.</span>
                      </div>
                    )}
                    <MagneticOutputsTabs
                      inputs={inputs as unknown as Record<string, unknown>}
                      outputs={result.outputs as unknown as Record<string, unknown>}
                      warnings={result.warnings as Array<{ severity: 'error' | 'warning' | 'info'; field?: string; code?: string; message: string }>}
                      errors={result.errors as Array<{ severity: 'error' | 'warning' | 'info'; field?: string; code?: string; message: string }>}
                    />
                  </>
                );
              }

              // Belt conveyor (default) uses dedicated output tabs
              return (
                <BeltOutputsTabs
                  inputs={inputs as unknown as Record<string, unknown>}
                  outputs={result.outputs as unknown as Record<string, unknown>}
                  warnings={result.warnings as Array<{ severity: 'error' | 'warning' | 'info'; field?: string; code?: string; message: string }>}
                  errors={result.errors as Array<{ severity: 'error' | 'warning' | 'info'; field?: string; code?: string; message: string }>}
                />
              );
            }

            // Draft state - never calculated (no Calculate button - auto-calc handles it)
            return (
              <div className="card">
                <div className="text-center py-12 text-gray-500">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No Results Yet
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Configure your inputs - results will calculate automatically.
                  </p>
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => setViewMode('configure')}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Go to Configure
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

        </div>

        {/* Outputs V2 Mode - v1.42: gated to abek@mc3mfg.com only */}
        {showOutputsV2 && (
          <div className={viewMode === 'outputs_v2' ? '' : 'hidden'}>
            <OutputDisabledBanner />
            {outputsV2 ? (
              <OutputGate>
                <OutputsV2Tabs outputs={outputsV2} />
              </OutputGate>
            ) : (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Outputs Available</h3>
                <p className="text-gray-500 mb-4">Calculate your conveyor configuration to generate Outputs V2</p>
                <button
                  type="button"
                  onClick={() => setViewMode('configure')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Go to Configure
                </button>
              </div>
            )}
          </div>
        )}

        {/* Commercial Scope Mode - Superuser only */}
        {showCommercialScope && (
          <div className={viewMode === 'commercial_scope' ? '' : 'hidden'}>
            <OutputDisabledBanner />
              {inputs ? (
                <OutputGate>
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <CommercialScopeOutput
                      inputs={inputs}
                      outputs={result?.outputs}
                      outputsV2={outputsV2}
                    />
                  </div>
                </OutputGate>
              ) : (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                  <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Configuration Available</h3>
                  <p className="text-gray-500 mb-4">Configure your conveyor to generate Commercial Scope output</p>
                  <button
                    type="button"
                    onClick={() => setViewMode('configure')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Go to Configure
                  </button>
                </div>
              )}
          </div>
        )}

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
      </ScopeProvider>

      {/* Mobile Bottom Action Bar */}
      <div className="md:hidden">
        <MobileBottomActionBar
          onCalculate={handleCalculateClick}
          onSave={handleSave}
          isCalculating={isCalculating}
          isSaving={isSaving}
          canSave={canSave}
          isDirty={isDirty}
          hasCalcError={result ? !result.success : false}
        />
      </div>
    </div>
  );
}
