/**
 * Cleats Configuration Modal
 *
 * Configures cleats for an application, following the pulley modal pattern.
 *
 * v1.24: New modal-based UX for cleats configuration
 * - All cleat fields moved into modal
 * - Added notched cleats capture (yes/no + notes)
 * - Summary card on main page
 *
 * v1.43: Cleat Weight & Spacing
 * - Added cleat weight calculation section
 * - Added spacing mode selector (divide evenly / use nominal)
 * - Live results for weight, added belt weight, etc.
 *
 * v1.44: UI Optimization
 * - 2-column layout on desktop (inputs left, results right)
 * - Larger modal (max-w-5xl, 85vh)
 * - Collapsible Assumptions and Buckets Table sections
 * - Removed redundant Geometry Summary card
 * - Reduced vertical padding
 */

'use client';

import { useMemo, useState } from 'react';
import { SliderbedInputs, SliderbedOutputs } from '../../src/models/sliderbed_v1/schema';
import {
  CLEAT_GEOMETRY,
  calculateCleatWidth,
  calculateCleatWeightEach,
  calculateCleatLayout,
  calculateCleatWeightPerFoot,
} from '../../src/models/sliderbed_v1/formulas';
import {
  getCleatProfiles,
  getCleatSizesForProfile,
  lookupCleatsMinPulleyDia,
  lookupCleatBaseMinDia12,
  getCentersFactor,
  computeCleatsMinPulleyDia,
  isDrillSipedSupported,
  getCentersBucket,
  CleatPattern,
  CleatStyle,
  CleatCenters,
  CLEAT_PATTERNS,
  CLEAT_PATTERN_LABELS,
  CLEAT_PATTERN_TOOLTIPS,
  DEFAULT_CLEAT_PATTERN,
  CLEAT_STYLE_LABELS,
  CLEAT_STYLES,
  CLEAT_CENTERS_OPTIONS,
  DEFAULT_CLEAT_MATERIAL_FAMILY,
} from '../../src/lib/cleat-catalog';
import { useCleatCatalog } from '../../src/lib/hooks/useCleatCatalog';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  inputs: SliderbedInputs;
  outputs?: SliderbedOutputs | null;
  updateInput: (field: keyof SliderbedInputs, value: any) => void;
}

/** Collapsible section component */
function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  variant = 'default',
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  variant?: 'default' | 'blue';
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const bgClass = variant === 'blue' ? 'bg-blue-50' : 'bg-gray-50';
  const borderClass = variant === 'blue' ? 'border-blue-200' : 'border-gray-200';
  const textClass = variant === 'blue' ? 'text-blue-700' : 'text-gray-600';

  return (
    <div className={`border ${borderClass} rounded-lg overflow-hidden`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 flex items-center justify-between ${bgClass} hover:bg-opacity-80 transition-colors`}
      >
        <span className={`text-xs font-semibold uppercase tracking-wide ${textClass}`}>
          {title}
        </span>
        <svg
          className={`w-4 h-4 ${textClass} transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && <div className="px-3 py-2">{children}</div>}
    </div>
  );
}

export default function CleatsConfigModal({
  isOpen,
  onClose,
  inputs,
  outputs,
  updateInput,
}: Props) {
  const { cleatCatalog, cleatCenterFactors, isLoading: cleatCatalogLoading } = useCleatCatalog();

  // Derived lists from catalog
  const cleatProfiles = useMemo(() => getCleatProfiles(cleatCatalog), [cleatCatalog]);
  const cleatSizes = inputs.cleat_profile
    ? getCleatSizesForProfile(cleatCatalog, inputs.cleat_profile)
    : [];
  // Note: cleatPatterns from catalog is no longer used; all patterns are shown unconditionally

  // Check if drill & siped is supported for current selection
  const drillSipedSupported = inputs.cleat_profile && inputs.cleat_size && inputs.cleat_pattern
    ? isDrillSipedSupported(
        cleatCatalog,
        DEFAULT_CLEAT_MATERIAL_FAMILY,
        inputs.cleat_profile,
        inputs.cleat_size,
        inputs.cleat_pattern as CleatPattern
      )
    : false;

  // Compute cleats min pulley constraint for display
  const cleatsMinPulleyResult =
    inputs.cleat_profile &&
    inputs.cleat_size &&
    inputs.cleat_pattern &&
    inputs.cleat_style &&
    inputs.cleat_centers_in
      ? lookupCleatsMinPulleyDia(
          cleatCatalog,
          cleatCenterFactors,
          DEFAULT_CLEAT_MATERIAL_FAMILY,
          inputs.cleat_profile,
          inputs.cleat_size,
          inputs.cleat_pattern as CleatPattern,
          inputs.cleat_style as CleatStyle,
          inputs.cleat_centers_in
        )
      : null;

  // Handle profile change (cascading reset)
  // Pattern defaults to STRAIGHT_CROSS per design (informational only)
  const handleCleatProfileChange = (profile: string | undefined) => {
    updateInput('cleat_profile', profile);
    updateInput('cleat_size', undefined);
    updateInput('cleat_pattern', DEFAULT_CLEAT_PATTERN);
    updateInput('cleat_height_in', undefined);
  };

  // Handle size change (cascading reset + height derivation)
  // Pattern defaults to STRAIGHT_CROSS per design (informational only)
  const handleCleatSizeChange = (size: string | undefined) => {
    updateInput('cleat_size', size);
    updateInput('cleat_pattern', DEFAULT_CLEAT_PATTERN);

    // Derive cleat_height_in from size string
    if (size) {
      const cleaned = String(size).toLowerCase().trim()
        .replace(/["\s]/g, '')
        .replace(/(in|inch|inches)$/i, '');
      const height = parseFloat(cleaned);
      if (Number.isFinite(height) && height > 0) {
        updateInput('cleat_height_in', height);
      }
    } else {
      updateInput('cleat_height_in', undefined);
    }
  };

  // Handle desired centers change
  // Updates the actual spacing field AND derives the bucket for min pulley calc
  const handleDesiredCentersChange = (desiredCenters: number | undefined) => {
    updateInput('cleat_spacing_in', desiredCenters);
    // Derive the bucket for min pulley diameter calculation
    if (desiredCenters !== undefined && desiredCenters > 0) {
      const bucket = getCentersBucket(desiredCenters);
      updateInput('cleat_centers_in', bucket);
    } else {
      updateInput('cleat_centers_in', 12); // Default to loosest bucket
    }
  };

  // Compute current bucket from spacing (for display)
  const currentBucket: CleatCenters = useMemo(() => {
    const spacing = inputs.cleat_spacing_in;
    if (spacing !== undefined && spacing > 0) {
      return getCentersBucket(spacing);
    }
    return inputs.cleat_centers_in as CleatCenters ?? 12;
  }, [inputs.cleat_spacing_in, inputs.cleat_centers_in]);

  // Compute base min diameter at 12" centers for bucket table preview
  const baseMinDia12In = useMemo(() => {
    if (!inputs.cleat_profile || !inputs.cleat_size || !inputs.cleat_pattern || !inputs.cleat_style) {
      return null;
    }
    const result = lookupCleatBaseMinDia12(
      cleatCatalog,
      DEFAULT_CLEAT_MATERIAL_FAMILY,
      inputs.cleat_profile,
      inputs.cleat_size,
      inputs.cleat_pattern as CleatPattern,
      inputs.cleat_style as CleatStyle
    );
    return result.success ? result.baseMinDia12In : null;
  }, [cleatCatalog, inputs.cleat_profile, inputs.cleat_size, inputs.cleat_pattern, inputs.cleat_style]);

  // Build bucket table data with factors and resulting min pulley diameters
  const bucketTableData = useMemo(() => {
    return CLEAT_CENTERS_OPTIONS.map((bucket) => {
      const factorResult = getCentersFactor(cleatCenterFactors, DEFAULT_CLEAT_MATERIAL_FAMILY, bucket);
      const factor = factorResult.success ? factorResult.factor : null;

      let resultingMinDia: number | null = null;
      if (baseMinDia12In !== null && factor !== null) {
        const computed = computeCleatsMinPulleyDia(baseMinDia12In, factor);
        resultingMinDia = computed.roundedUp;
      }

      // Threshold description: what desired centers map to this bucket
      let threshold: string;
      if (bucket === 4) threshold = '≤ 4"';
      else if (bucket === 6) threshold = '4.1" – 6"';
      else if (bucket === 8) threshold = '6.1" – 8"';
      else threshold = '> 8"';

      return {
        bucket,
        threshold,
        factor,
        resultingMinDia,
        isCurrent: bucket === currentBucket,
      };
    });
  }, [cleatCenterFactors, baseMinDia12In, currentBucket]);

  // v1.43: Cleat weight calculations
  const cleatWeightCalcs = useMemo(() => {
    const edgeOffset = inputs.cleat_edge_offset_in ?? 0;
    const cleatHeight = inputs.cleat_height_in ?? 0;
    const beltWidth = inputs.belt_width_in ?? 0;

    if (cleatHeight <= 0 || beltWidth <= 0) {
      return null;
    }

    // Derived cleat width
    const cleatWidth = calculateCleatWidth(beltWidth, edgeOffset);
    if (cleatWidth <= 0) {
      return null;
    }

    // Weight per cleat
    const weightEach = calculateCleatWeightEach(cleatHeight, cleatWidth);

    // Layout calculation
    const spacingMode = inputs.cleat_spacing_mode ?? 'use_nominal';
    const layout = calculateCleatLayout(
      inputs.conveyor_length_cc_in ?? 0,
      spacingMode,
      inputs.cleat_count,
      inputs.cleat_spacing_in,
      inputs.cleat_remainder_mode,
      inputs.cleat_odd_gap_size,
      inputs.cleat_odd_gap_location
    );

    // Weight per foot
    const weightPerFt = calculateCleatWeightPerFoot(weightEach, layout.pitch_in);

    // Base belt weight from outputs (if available)
    const baseBeltWeightPerFt = outputs?.belt_weight_lb_per_ft_base ?? 0;
    const effectiveBeltWeightPerFt = baseBeltWeightPerFt + weightPerFt;

    return {
      cleatWidth,
      weightEach,
      layout,
      weightPerFt,
      baseBeltWeightPerFt,
      effectiveBeltWeightPerFt,
    };
  }, [
    inputs.cleat_edge_offset_in,
    inputs.cleat_height_in,
    inputs.belt_width_in,
    inputs.conveyor_length_cc_in,
    inputs.cleat_spacing_mode,
    inputs.cleat_count,
    inputs.cleat_spacing_in,
    inputs.cleat_remainder_mode,
    inputs.cleat_odd_gap_size,
    inputs.cleat_odd_gap_location,
    outputs?.belt_weight_lb_per_ft_base,
  ]);

  // Warning for odd gap < 2"
  const oddGapWarning = cleatWeightCalcs?.layout?.odd_gap_in !== undefined &&
    cleatWeightCalcs.layout.odd_gap_in < 2
    ? `Warning: Odd gap (${cleatWeightCalcs.layout.odd_gap_in.toFixed(1)}") is less than 2"`
    : null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Modal - larger on desktop */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">Configure Cleats</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body - 2 column layout on desktop */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT COLUMN - Inputs */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Configuration</h3>

              {/* Cleat Profile */}
              <div>
                <label htmlFor="modal_cleat_profile" className="block text-sm font-medium text-gray-700 mb-1">
                  Cleat Profile
                </label>
                <select
                  id="modal_cleat_profile"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                  value={inputs.cleat_profile ?? ''}
                  onChange={(e) => handleCleatProfileChange(e.target.value || undefined)}
                  disabled={cleatCatalogLoading}
                >
                  <option value="">Select profile...</option>
                  {cleatProfiles.map((profile) => (
                    <option key={profile} value={profile}>
                      {profile}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cleat Size */}
              <div>
                <label htmlFor="modal_cleat_size" className="block text-sm font-medium text-gray-700 mb-1">
                  Cleat Size
                </label>
                <select
                  id="modal_cleat_size"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                  value={inputs.cleat_size ?? ''}
                  onChange={(e) => handleCleatSizeChange(e.target.value || undefined)}
                  disabled={!inputs.cleat_profile || cleatSizes.length === 0}
                >
                  <option value="">Select size...</option>
                  {cleatSizes.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cleat Pattern with Tooltip */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <label htmlFor="modal_cleat_pattern" className="block text-sm font-medium text-gray-700">
                    Cleat Pattern
                  </label>
                  {/* Tooltip trigger */}
                  <div className="relative group">
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-600 focus:outline-none"
                      aria-label="Pattern information"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                    {/* Tooltip content */}
                    <div className="absolute left-0 z-50 hidden group-hover:block w-72 p-2 mt-1 text-xs bg-gray-900 text-white rounded-lg shadow-lg">
                      <div className="space-y-1">
                        {CLEAT_PATTERNS.map((pattern) => (
                          <div key={pattern}>
                            <span className="font-medium">{CLEAT_PATTERN_LABELS[pattern]}:</span>
                            <span className="ml-1 text-gray-300">{CLEAT_PATTERN_TOOLTIPS[pattern]}</span>
                          </div>
                        ))}
                        <div className="pt-1 mt-1 border-t border-gray-700 text-gray-400 italic">
                          Pattern does not affect calculations.
                        </div>
                      </div>
                      <div className="absolute -top-1 left-3 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                    </div>
                  </div>
                </div>
                <select
                  id="modal_cleat_pattern"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                  value={inputs.cleat_pattern ?? DEFAULT_CLEAT_PATTERN}
                  onChange={(e) => updateInput('cleat_pattern', e.target.value)}
                >
                  {CLEAT_PATTERNS.map((pattern) => (
                    <option key={pattern} value={pattern}>
                      {CLEAT_PATTERN_LABELS[pattern]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Desired Cleat Centers */}
              <div>
                <label htmlFor="modal_desired_centers" className="block text-sm font-medium text-gray-700 mb-1">
                  Desired Cleat Centers (in)
                </label>
                <input
                  type="number"
                  id="modal_desired_centers"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                  value={inputs.cleat_spacing_in ?? ''}
                  onChange={(e) => handleDesiredCentersChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                  step="0.5"
                  min="1"
                  placeholder="e.g., 6"
                />
                <p className="text-xs text-gray-500 mt-0.5">
                  Bucket: <span className="font-medium text-blue-600">{currentBucket}"</span>
                </p>
              </div>

              {/* Cleat Style */}
              <div>
                <label htmlFor="modal_cleat_style" className="block text-sm font-medium text-gray-700 mb-1">
                  Cleat Style
                </label>
                <select
                  id="modal_cleat_style"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                  value={inputs.cleat_style ?? 'SOLID'}
                  onChange={(e) => updateInput('cleat_style', e.target.value)}
                >
                  {CLEAT_STYLES.map((style) => (
                    <option
                      key={style}
                      value={style}
                      disabled={style === 'DRILL_SIPED_1IN' && !drillSipedSupported}
                    >
                      {CLEAT_STYLE_LABELS[style]}
                      {style === 'DRILL_SIPED_1IN' && !drillSipedSupported && ' (N/A)'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Drill & Siped Caution */}
              {inputs.cleat_style === 'DRILL_SIPED_1IN' && (
                <div className="p-2 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-2">
                  <svg className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <p className="text-xs text-amber-700">
                    <span className="font-medium">Drill & Siped:</span> Reduced strength. For drainage only.
                  </p>
                </div>
              )}

              {/* Cleat Edge Offset */}
              <div>
                <label htmlFor="modal_cleat_edge_offset" className="block text-sm font-medium text-gray-700 mb-1">
                  Cleat Edge Offset (in)
                </label>
                <input
                  type="number"
                  id="modal_cleat_edge_offset"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                  value={inputs.cleat_edge_offset_in ?? ''}
                  onChange={(e) =>
                    updateInput('cleat_edge_offset_in', e.target.value ? parseFloat(e.target.value) : undefined)
                  }
                  step="0.25"
                  min="0"
                  max="12"
                  placeholder="e.g., 0.5"
                />
              </div>

              {/* Notched Cleats */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Are the cleats notched?
                </label>
                <div className="flex gap-4">
                  <label className="inline-flex items-center text-sm">
                    <input
                      type="radio"
                      name="cleats_notched"
                      checked={inputs.cleats_notched !== true}
                      onChange={() => {
                        updateInput('cleats_notched', false);
                        updateInput('cleats_notch_notes', undefined);
                      }}
                      className="mr-2"
                    />
                    No
                  </label>
                  <label className="inline-flex items-center text-sm">
                    <input
                      type="radio"
                      name="cleats_notched"
                      checked={inputs.cleats_notched === true}
                      onChange={() => updateInput('cleats_notched', true)}
                      className="mr-2"
                    />
                    Yes
                  </label>
                </div>
              </div>

              {/* Notch Notes */}
              {inputs.cleats_notched === true && (
                <div>
                  <label htmlFor="modal_notch_notes" className="block text-sm font-medium text-gray-700 mb-1">
                    Notch Notes <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="modal_notch_notes"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                    rows={2}
                    value={inputs.cleats_notch_notes ?? ''}
                    onChange={(e) => updateInput('cleats_notch_notes', e.target.value || undefined)}
                    placeholder="Describe notch details..."
                  />
                </div>
              )}

              <hr className="border-gray-200" />

              {/* Spacing Mode Section */}
              <h4 className="text-sm font-semibold text-gray-700">Cleat Weight & Spacing</h4>

              {/* Spacing Mode */}
              <div>
                <label htmlFor="modal_spacing_mode" className="block text-sm font-medium text-gray-700 mb-1">
                  Spacing Mode
                </label>
                <select
                  id="modal_spacing_mode"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                  value={inputs.cleat_spacing_mode ?? 'use_nominal'}
                  onChange={(e) => updateInput('cleat_spacing_mode', e.target.value as 'divide_evenly' | 'use_nominal')}
                >
                  <option value="use_nominal">Use Nominal Spacing</option>
                  <option value="divide_evenly">Divide Evenly</option>
                </select>
              </div>

              {/* Divide Evenly: Cleat Count */}
              {inputs.cleat_spacing_mode === 'divide_evenly' && (
                <div>
                  <label htmlFor="modal_cleat_count" className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Cleats
                  </label>
                  <input
                    type="number"
                    id="modal_cleat_count"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                    value={inputs.cleat_count ?? ''}
                    onChange={(e) => updateInput('cleat_count', e.target.value ? parseInt(e.target.value) : undefined)}
                    min="1"
                    placeholder="e.g., 10"
                  />
                </div>
              )}

              {/* Use Nominal: Remainder Handling */}
              {(inputs.cleat_spacing_mode ?? 'use_nominal') === 'use_nominal' && (
                <>
                  <div>
                    <label htmlFor="modal_remainder_mode" className="block text-sm font-medium text-gray-700 mb-1">
                      Remainder Handling
                    </label>
                    <select
                      id="modal_remainder_mode"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                      value={inputs.cleat_remainder_mode ?? 'spread_evenly'}
                      onChange={(e) => updateInput('cleat_remainder_mode', e.target.value as 'spread_evenly' | 'one_odd_gap')}
                    >
                      <option value="spread_evenly">Spread Evenly</option>
                      <option value="one_odd_gap">One Odd Gap</option>
                    </select>
                  </div>

                  {inputs.cleat_remainder_mode === 'one_odd_gap' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="modal_odd_gap_size" className="block text-xs font-medium text-gray-700 mb-1">
                          Odd Gap Size
                        </label>
                        <select
                          id="modal_odd_gap_size"
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                          value={inputs.cleat_odd_gap_size ?? 'larger'}
                          onChange={(e) => updateInput('cleat_odd_gap_size', e.target.value as 'smaller' | 'larger')}
                        >
                          <option value="smaller">Smaller</option>
                          <option value="larger">Larger</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="modal_odd_gap_location" className="block text-xs font-medium text-gray-700 mb-1">
                          Odd Gap Location
                        </label>
                        <select
                          id="modal_odd_gap_location"
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                          value={inputs.cleat_odd_gap_location ?? 'tail'}
                          onChange={(e) => updateInput('cleat_odd_gap_location', e.target.value as 'head' | 'tail' | 'center')}
                        >
                          <option value="tail">Tail</option>
                          <option value="head">Head</option>
                          <option value="center">Center</option>
                        </select>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Odd Gap Warning */}
              {oddGapWarning && (
                <div className="p-2 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="text-xs text-amber-700">{oddGapWarning}</p>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN - Results & Constraints */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Results</h3>

              {/* Cleats Constraint Card */}
              {cleatsMinPulleyResult && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Cleats Constraint
                  </h4>
                  {cleatsMinPulleyResult.success ? (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Base @ 12":</span>
                        <span className="font-medium text-gray-900">
                          {cleatsMinPulleyResult.baseMinDia12In?.toFixed(1)}"
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Factor:</span>
                        <span className="font-medium text-gray-900">
                          {cleatsMinPulleyResult.centersFactor.toFixed(2)}x
                        </span>
                      </div>
                      <div className="col-span-2 flex justify-between border-t border-gray-200 pt-1 mt-1">
                        <span className="text-gray-700 font-medium">Min Pulley:</span>
                        <span className="font-bold text-blue-600">
                          {cleatsMinPulleyResult.roundedMinDia?.toFixed(1)}"
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-red-600">{cleatsMinPulleyResult.error}</p>
                  )}
                </div>
              )}

              {/* Cleat Weight Results */}
              {cleatWeightCalcs && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">
                    Cleat Weight Results
                  </h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-green-600">Weight/Cleat:</span>
                      <span className="font-medium text-green-900">{cleatWeightCalcs.weightEach.toFixed(3)} lb</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-600">Cleat Count:</span>
                      <span className="font-medium text-green-900">{cleatWeightCalcs.layout.cleat_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-600">Actual Pitch:</span>
                      <span className="font-medium text-green-900">{cleatWeightCalcs.layout.pitch_in.toFixed(2)}"</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-600">Cleats/ft:</span>
                      <span className="font-medium text-green-900">
                        {cleatWeightCalcs.layout.pitch_in > 0 ? (12 / cleatWeightCalcs.layout.pitch_in).toFixed(2) : '--'}
                      </span>
                    </div>
                    <div className="col-span-2 border-t border-green-200 pt-1 mt-1">
                      <div className="flex justify-between">
                        <span className="text-green-600">Added Belt Weight:</span>
                        <span className="font-bold text-green-800">{cleatWeightCalcs.weightPerFt.toFixed(3)} lb/ft</span>
                      </div>
                    </div>
                    {cleatWeightCalcs.baseBeltWeightPerFt > 0 && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-green-600">Base Belt:</span>
                          <span className="font-medium text-green-900">{cleatWeightCalcs.baseBeltWeightPerFt.toFixed(3)} lb/ft</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-green-600">Effective:</span>
                          <span className="font-bold text-green-800">{cleatWeightCalcs.effectiveBeltWeightPerFt.toFixed(3)} lb/ft</span>
                        </div>
                      </>
                    )}
                  </div>
                  {/* Layout Summary */}
                  <div className="mt-2 pt-2 border-t border-green-200">
                    <p className="text-xs text-green-800">{cleatWeightCalcs.layout.summary}</p>
                  </div>
                  {/* Belt pull indicator */}
                  <div className="mt-2 pt-2 border-t border-green-200 flex items-center gap-2">
                    <svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs text-green-700">Belt pull includes cleat weight</span>
                  </div>
                </div>
              )}

              {!cleatWeightCalcs && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-500 italic">
                    Select cleat size and set edge offset to see weight calculations.
                  </p>
                </div>
              )}

              {/* Assumptions (Collapsible) */}
              <CollapsibleSection title="Assumptions (T-Cleat)" defaultOpen={false} variant="blue">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-600">Thickness:</span>
                    <span className="font-medium text-blue-900">{CLEAT_GEOMETRY.THICKNESS_IN}"</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-600">Base Length:</span>
                    <span className="font-medium text-blue-900">{CLEAT_GEOMETRY.BASE_LENGTH_IN}"</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-600">Material:</span>
                    <span className="font-medium text-blue-900">{CLEAT_GEOMETRY.MATERIAL}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-600">Density:</span>
                    <span className="font-medium text-blue-900">{CLEAT_GEOMETRY.DENSITY_LB_PER_IN3} lb/in³</span>
                  </div>
                  <div className="col-span-2 flex justify-between border-t border-blue-200 pt-1 mt-1">
                    <span className="text-blue-600">Cleat Width:</span>
                    <span className="font-medium text-blue-900">
                      {cleatWeightCalcs ? `${cleatWeightCalcs.cleatWidth.toFixed(2)}"` : '--'}
                      <span className="text-xs text-blue-600 ml-1">(belt − 2×offset)</span>
                    </span>
                  </div>
                </div>
              </CollapsibleSection>

              {/* Centers Bucket Table (Collapsible) */}
              <CollapsibleSection title="Centers Buckets Table" defaultOpen={false}>
                <table className="w-full text-xs">
                  <thead className="bg-gray-100 text-gray-500 uppercase">
                    <tr>
                      <th className="px-2 py-1 text-left font-medium">Bucket</th>
                      <th className="px-2 py-1 text-left font-medium">Range</th>
                      <th className="px-2 py-1 text-center font-medium">Factor</th>
                      <th className="px-2 py-1 text-right font-medium">Min Pulley</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {bucketTableData.map((row) => (
                      <tr
                        key={row.bucket}
                        className={row.isCurrent ? 'bg-blue-50' : 'bg-white'}
                      >
                        <td className="px-2 py-1 font-medium text-gray-900">
                          {row.bucket}"
                          {row.isCurrent && (
                            <span className="ml-1 text-[10px] px-1 py-0.5 bg-blue-600 text-white rounded">
                              Current
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-1 text-gray-600">{row.threshold}</td>
                        <td className="px-2 py-1 text-center text-gray-600">
                          {row.factor !== null ? `${row.factor.toFixed(2)}x` : '—'}
                        </td>
                        <td className="px-2 py-1 text-right font-medium">
                          {row.resultingMinDia !== null ? (
                            <span className={row.isCurrent ? 'text-blue-700' : 'text-gray-900'}>
                              {row.resultingMinDia.toFixed(1)}"
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CollapsibleSection>
            </div>
          </div>
        </div>

        {/* Footer - Sticky */}
        <div className="flex justify-between gap-3 px-6 py-3 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <button
            onClick={() => {
              // Remove cleats configuration
              updateInput('cleats_mode', 'none');
              updateInput('cleats_enabled', false);
              updateInput('cleat_profile', undefined);
              updateInput('cleat_size', undefined);
              updateInput('cleat_pattern', undefined);
              updateInput('cleat_height_in', undefined);
              updateInput('cleat_centers_in', undefined);
              updateInput('cleat_spacing_in', undefined);
              updateInput('cleat_style', undefined);
              updateInput('cleat_edge_offset_in', undefined);
              updateInput('cleats_notched', undefined);
              updateInput('cleats_notch_notes', undefined);
              onClose();
            }}
            className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50"
          >
            Remove Cleats
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
