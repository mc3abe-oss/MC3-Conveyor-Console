'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { runCalculation } from '../../src/lib/calculator';
import {
  SliderbedInputs,
  SliderbedOutputs,
  CalculationResult,
  buildDefaultInputs,
} from '../../src/models/sliderbed_v1/schema';
import TabApplicationDemand from './TabApplicationDemand';
import TabConveyorPhysical from './TabConveyorPhysical';
import TabDriveControls from './TabDriveControls';
import TabBuildOptions from './TabBuildOptions';
import { useConfigureIssues, ConfigureTabKey, Issue, SectionKey } from './useConfigureIssues';
import StatusLight from './StatusLight';
import { ValidationError } from '../../src/models/sliderbed_v1/schema';
import { getFieldMapping } from '../../src/lib/validation/fieldToSection';

/**
 * Configure sub-tab type (alias to ConfigureTabKey for local use)
 */
type ConfigureTab = ConfigureTabKey;

/**
 * Tab configuration for the Configure sub-tabs
 */
const CONFIGURE_TABS: { id: ConfigureTab; label: string }[] = [
  { id: 'application', label: 'Application' },
  { id: 'physical', label: 'Physical' },
  { id: 'drive', label: 'Drive & Controls' },
  { id: 'build', label: 'Build Options' },
];

interface Props {
  onCalculate: (result: CalculationResult) => void;
  isCalculating: boolean;
  initialInputs?: SliderbedInputs | null;
  onInputsChange?: (inputs: SliderbedInputs) => void;
  loadedRevisionId?: string; // Key to track when to reload inputs
  triggerCalculate?: number; // Counter to trigger calculation from parent
  hideCalculateButton?: boolean; // Hide the form's Calculate button if calculation is triggered externally
  applicationLineId?: string | null; // Application ID for per-line configurations (pulleys)
  /** Post-calc validation errors from last calculation result (for inline display) */
  postCalcErrors?: ValidationError[];
  /** Calculated outputs for display in sub-tabs (e.g., shaft diameters) */
  outputs?: SliderbedOutputs | null;
  /** v1.35: Toast notification callback */
  showToast?: (message: string) => void;
}

export default function CalculatorForm({
  onCalculate,
  isCalculating,
  initialInputs,
  onInputsChange,
  loadedRevisionId,
  triggerCalculate,
  hideCalculateButton = false,
  applicationLineId,
  postCalcErrors,
  outputs,
  showToast,
}: Props) {
  // Active sub-tab state
  const [activeTab, setActiveTab] = useState<ConfigureTab>('application');

  // Use buildDefaultInputs() as single source of truth for initial form state
  const [inputs, setInputs] = useState<SliderbedInputs>(buildDefaultInputs);

  // Track the last loaded revision ID to prevent infinite loops
  const lastLoadedRevisionIdRef = useRef<string | null>(null);

  // Load inputs from initialInputs ONLY when loadedRevisionId changes
  // This prevents infinite loops caused by object identity changes
  useEffect(() => {
    if (initialInputs && loadedRevisionId && loadedRevisionId !== lastLoadedRevisionIdRef.current) {
      lastLoadedRevisionIdRef.current = loadedRevisionId;
      setInputs(initialInputs);
    }
  }, [loadedRevisionId, initialInputs]);

  // Notify parent of input changes ONCE when inputs change
  // Use a ref to track if we've already notified for this exact input state
  const lastNotifiedInputsRef = useRef<string | null>(null);
  useEffect(() => {
    if (onInputsChange) {
      const serialized = JSON.stringify(inputs);
      if (serialized !== lastNotifiedInputsRef.current) {
        lastNotifiedInputsRef.current = serialized;
        onInputsChange(inputs);
      }
    }
  }, [inputs, onInputsChange]);

  // Trigger calculation when triggerCalculate counter changes
  const lastTriggerRef = useRef<number>(0);
  useEffect(() => {
    if (triggerCalculate !== undefined && triggerCalculate > 0 && triggerCalculate !== lastTriggerRef.current) {
      lastTriggerRef.current = triggerCalculate;
      const result = runCalculation({ inputs });
      onCalculate(result);
    }
  }, [triggerCalculate, inputs, onCalculate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = runCalculation({ inputs });
    onCalculate(result);
  };

  const updateInput = (field: keyof SliderbedInputs, value: any) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
  };

  // Compute validation issues (includes pre-calc tracking and min pulley checks)
  const { sectionCounts, tabCounts, getTrackingIssue, getMinPulleyIssues, getIssuesForSection } = useConfigureIssues(inputs);

  // Convert post-calc ValidationErrors to Issues and organize by section
  const postCalcIssuesBySection = useMemo(() => {
    const bySection: Partial<Record<SectionKey, Issue[]>> = {};
    if (!postCalcErrors) return bySection;

    for (const error of postCalcErrors) {
      const mapping = getFieldMapping(error.field);
      if (!mapping) continue;

      const issue: Issue = {
        severity: error.severity,
        message: error.message,
        tabKey: mapping.tabKey,
        sectionKey: mapping.sectionKey,
        fieldKeys: error.field ? [error.field as keyof SliderbedInputs] : undefined,
      };

      if (!bySection[mapping.sectionKey]) {
        bySection[mapping.sectionKey] = [];
      }
      bySection[mapping.sectionKey]!.push(issue);
    }

    return bySection;
  }, [postCalcErrors]);

  // Helper to get merged issues for a section (pre-calc + post-calc, de-duped)
  const getMergedIssuesForSection = useCallback((sectionKey: SectionKey): Issue[] => {
    const preCalcIssues = getIssuesForSection(sectionKey);
    const postCalc = postCalcIssuesBySection[sectionKey] ?? [];

    // Merge and de-dupe by message
    const seen = new Set<string>();
    const merged: Issue[] = [];

    for (const issue of [...preCalcIssues, ...postCalc]) {
      if (!seen.has(issue.message)) {
        seen.add(issue.message);
        merged.push(issue);
      }
    }

    return merged;
  }, [getIssuesForSection, postCalcIssuesBySection]);

  // Merge section counts (pre-calc + post-calc) for StatusLight indicators
  const mergedSectionCounts = useMemo(() => {
    // Start with pre-calc counts
    const merged = { ...sectionCounts };

    // Add post-calc error counts
    for (const [sectionKey, issues] of Object.entries(postCalcIssuesBySection)) {
      const key = sectionKey as SectionKey;
      if (!merged[key]) continue;

      const errorCount = issues.filter((i) => i.severity === 'error').length;
      const warningCount = issues.filter((i) => i.severity === 'warning').length;

      merged[key] = {
        errors: merged[key].errors + errorCount,
        warnings: merged[key].warnings + warningCount,
      };
    }

    return merged;
  }, [sectionCounts, postCalcIssuesBySection]);

  // Handle Enter key press to trigger recalculation
  const handleKeyPress = (e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (e.key === 'Enter' && target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      const result = runCalculation({ inputs });
      onCalculate(result);
    }
  };

  return (
    <form onSubmit={handleSubmit} onKeyPress={handleKeyPress} className="space-y-6">
      {/* Configure Sub-Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Sub-tab navigation */}
        <div className="border-b border-gray-200 bg-gray-50">
          <nav className="flex -mb-px overflow-x-auto scrollbar-hide" aria-label="Configure tabs">
            {CONFIGURE_TABS.map((tab) => {
              const counts = tabCounts[tab.id];

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex-1 md:flex-1 flex-shrink-0 whitespace-nowrap
                    py-3 px-4 text-center font-medium text-sm transition-colors
                    min-h-[44px] min-w-[100px]
                    border-b-2 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500
                    ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600 bg-white'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-100'
                    }
                  `}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    {tab.label}
                    <StatusLight
                      errorCount={counts.errors}
                      warningCount={counts.warnings}
                      size="sm"
                    />
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab content */}
        <div className="p-6">
          {/* Application Tab */}
          {activeTab === 'application' && (
            <TabApplicationDemand inputs={inputs} updateInput={updateInput} sectionCounts={sectionCounts} getIssuesForSection={getIssuesForSection} />
          )}

          {/* Physical Tab */}
          {activeTab === 'physical' && (
            <TabConveyorPhysical
              inputs={inputs}
              updateInput={updateInput}
              sectionCounts={mergedSectionCounts}
              getTrackingIssue={getTrackingIssue}
              getMinPulleyIssues={getMinPulleyIssues}
              applicationLineId={applicationLineId}
              getMergedIssuesForSection={getMergedIssuesForSection}
              outputs={outputs}
              showToast={showToast}
            />
          )}

          {/* Drive & Controls Tab */}
          {activeTab === 'drive' && (
            <TabDriveControls inputs={inputs} updateInput={updateInput} sectionCounts={sectionCounts} getIssuesForSection={getIssuesForSection} outputs={outputs} />
          )}

          {/* Build Options Tab */}
          {activeTab === 'build' && (
            <TabBuildOptions inputs={inputs} updateInput={updateInput} sectionCounts={mergedSectionCounts} getIssuesForSection={getMergedIssuesForSection} />
          )}
        </div>
      </div>

      {/* Calculate Button - hidden if triggered externally */}
      {!hideCalculateButton && (
        <div className="pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={isCalculating}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isCalculating ? 'Calculating...' : 'Calculate'}
          </button>
        </div>
      )}
    </form>
  );
}
