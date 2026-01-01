/**
 * Cleats Configuration Modal
 *
 * Configures cleats for an application, following the pulley modal pattern.
 *
 * v1.24: New modal-based UX for cleats configuration
 * - All cleat fields moved into modal
 * - Added notched cleats capture (yes/no + notes)
 * - Summary card on main page
 */

'use client';

import { useMemo } from 'react';
import { SliderbedInputs } from '../../src/models/sliderbed_v1/schema';
import {
  useCleatCatalog,
  getCleatProfiles,
  getCleatSizesForProfile,
  getCleatPatternsForProfileSize,
  lookupCleatsMinPulleyDia,
  isDrillSipedSupported,
  getCentersBucket,
  CleatPattern,
  CleatStyle,
  CleatCenters,
  CLEAT_PATTERN_LABELS,
  CLEAT_STYLE_LABELS,
  CLEAT_STYLES,
  DEFAULT_CLEAT_MATERIAL_FAMILY,
} from '../../src/lib/cleat-catalog';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  inputs: SliderbedInputs;
  updateInput: (field: keyof SliderbedInputs, value: any) => void;
}

export default function CleatsConfigModal({
  isOpen,
  onClose,
  inputs,
  updateInput,
}: Props) {
  const { cleatCatalog, cleatCenterFactors, isLoading: cleatCatalogLoading } = useCleatCatalog();

  // Derived lists from catalog
  const cleatProfiles = useMemo(() => getCleatProfiles(cleatCatalog), [cleatCatalog]);
  const cleatSizes = inputs.cleat_profile
    ? getCleatSizesForProfile(cleatCatalog, inputs.cleat_profile)
    : [];
  const cleatPatterns = inputs.cleat_profile && inputs.cleat_size
    ? getCleatPatternsForProfileSize(cleatCatalog, inputs.cleat_profile, inputs.cleat_size)
    : [];

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
  const handleCleatProfileChange = (profile: string | undefined) => {
    updateInput('cleat_profile', profile);
    updateInput('cleat_size', undefined);
    updateInput('cleat_pattern', undefined);
    updateInput('cleat_height_in', undefined);
  };

  // Handle size change (cascading reset + height derivation)
  const handleCleatSizeChange = (size: string | undefined) => {
    updateInput('cleat_size', size);
    updateInput('cleat_pattern', undefined);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
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

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-130px)] space-y-6">
          {/* Cleat Profile */}
          <div>
            <label htmlFor="modal_cleat_profile" className="block text-sm font-medium text-gray-700 mb-1">
              Cleat Profile
            </label>
            <select
              id="modal_cleat_profile"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
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

          {/* Cleat Pattern */}
          <div>
            <label htmlFor="modal_cleat_pattern" className="block text-sm font-medium text-gray-700 mb-1">
              Cleat Pattern
            </label>
            <select
              id="modal_cleat_pattern"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              value={inputs.cleat_pattern ?? ''}
              onChange={(e) => updateInput('cleat_pattern', e.target.value || undefined)}
              disabled={!inputs.cleat_size || cleatPatterns.length === 0}
            >
              <option value="">Select pattern...</option>
              {cleatPatterns.map((pattern) => (
                <option key={pattern} value={pattern}>
                  {CLEAT_PATTERN_LABELS[pattern]}
                </option>
              ))}
            </select>
          </div>

          {/* Desired Cleat Centers - User editable */}
          <div>
            <label htmlFor="modal_desired_centers" className="block text-sm font-medium text-gray-700 mb-1">
              Desired Cleat Centers (in)
            </label>
            <input
              type="number"
              id="modal_desired_centers"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              value={inputs.cleat_spacing_in ?? ''}
              onChange={(e) => handleDesiredCentersChange(e.target.value ? parseFloat(e.target.value) : undefined)}
              step="0.5"
              min="1"
              placeholder="e.g., 6"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the actual cleat spacing you want on the belt.
            </p>
          </div>

          {/* Centers Bucket - Read-only display */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-800">Centers Bucket (for min pulley calc)</span>
                  <span className="text-sm font-bold text-blue-700">{currentBucket}" bucket</span>
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  This bucket is derived from your desired centers and is used only to calculate the minimum recommended pulley diameter. Tighter spacing uses a smaller bucket, which increases the minimum.
                </p>
              </div>
            </div>
          </div>

          {/* Cleat Style */}
          <div>
            <label htmlFor="modal_cleat_style" className="block text-sm font-medium text-gray-700 mb-1">
              Cleat Style
            </label>
            <select
              id="modal_cleat_style"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
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
                  {style === 'DRILL_SIPED_1IN' && !drillSipedSupported && ' (not available)'}
                </option>
              ))}
            </select>
          </div>

          {/* Drill & Siped Caution */}
          {inputs.cleat_style === 'DRILL_SIPED_1IN' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
              <div className="flex items-start">
                <svg className="h-5 w-5 text-amber-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-amber-800">Drill & Siped Cleats</h4>
                  <p className="mt-1 text-sm text-amber-700">
                    Perforated cleats have reduced structural strength. Recommended for drainage applications only.
                  </p>
                </div>
              </div>
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              value={inputs.cleat_edge_offset_in ?? ''}
              onChange={(e) =>
                updateInput('cleat_edge_offset_in', e.target.value ? parseFloat(e.target.value) : undefined)
              }
              step="0.25"
              min="0"
              max="12"
              placeholder="e.g., 0.5"
            />
            <p className="text-xs text-gray-500 mt-1">
              Distance from belt edge to cleat end (0" - 12")
            </p>
          </div>

          {/* Divider */}
          <hr className="border-gray-200" />

          {/* Notched Cleats Question */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Are the cleats notched?
            </label>
            <div className="flex gap-4">
              <label className="inline-flex items-center">
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
              <label className="inline-flex items-center">
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

          {/* Notch Notes (only if notched) */}
          {inputs.cleats_notched === true && (
            <div>
              <label htmlFor="modal_notch_notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notch Notes <span className="text-red-500">*</span>
              </label>
              <textarea
                id="modal_notch_notes"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                value={inputs.cleats_notch_notes ?? ''}
                onChange={(e) => updateInput('cleats_notch_notes', e.target.value || undefined)}
                placeholder="Describe notch details..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Document notch location, size, and purpose.
              </p>
            </div>
          )}

          {/* Divider */}
          <hr className="border-gray-200" />

          {/* Constraint Readout */}
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
                    <span className="text-gray-600">Centers Factor:</span>
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

          {/* Geometry Summary */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Geometry Summary
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Cleat Height:</span>
                <span className="font-medium text-gray-900">
                  {inputs.cleat_height_in != null ? `${inputs.cleat_height_in}"` : '--'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Desired Centers:</span>
                <span className="font-medium text-gray-900">
                  {inputs.cleat_spacing_in != null ? `${inputs.cleat_spacing_in}"` : '--'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Calc Bucket:</span>
                <span className="font-medium text-blue-600">{currentBucket}"</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Edge Offset:</span>
                <span className="font-medium text-gray-900">
                  {inputs.cleat_edge_offset_in != null ? `${inputs.cleat_edge_offset_in}"` : '--'}
                </span>
              </div>
              {inputs.cleats_notched && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Notched:</span>
                  <span className="font-medium text-amber-600">Yes</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
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
