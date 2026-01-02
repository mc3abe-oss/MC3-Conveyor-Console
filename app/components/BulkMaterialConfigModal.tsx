/**
 * Bulk Material Configuration Modal
 *
 * Modal-based configuration for bulk material conveying, following the
 * Cleats modal UX pattern (Configure button -> Modal -> Done/Cancel).
 *
 * v1.33: Created as part of Material Definition UX Fixes
 * - Moved bulk material configuration from inline toggle to modal
 * - Removes nested tab-like navigation from Material Definition card
 */

'use client';

import {
  SliderbedInputs,
  BulkInputMethod,
  DensitySource,
  FeedBehavior,
  FEED_BEHAVIOR_LABELS,
} from '../../src/models/sliderbed_v1/schema';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  inputs: SliderbedInputs;
  updateInput: (field: keyof SliderbedInputs, value: any) => void;
}

export default function BulkMaterialConfigModal({
  isOpen,
  onClose,
  inputs,
  updateInput,
}: Props) {
  if (!isOpen) return null;

  const bulkInputMethod = (inputs.bulk_input_method as BulkInputMethod | string) ?? BulkInputMethod.WeightFlow;
  const isVolumeFlow = bulkInputMethod === BulkInputMethod.VolumeFlow || bulkInputMethod === 'VOLUME_FLOW';
  const feedBehavior = (inputs.feed_behavior as FeedBehavior | string) ?? FeedBehavior.Continuous;
  const isSurge = feedBehavior === FeedBehavior.Surge || feedBehavior === 'SURGE';

  const handleRemoveBulk = () => {
    // Clear bulk-specific fields and revert to Parts mode
    updateInput('material_form', 'PARTS');
    updateInput('bulk_input_method', undefined);
    updateInput('mass_flow_lbs_per_hr', undefined);
    updateInput('volume_flow_ft3_per_hr', undefined);
    updateInput('density_lbs_per_ft3', undefined);
    updateInput('density_source', undefined);
    updateInput('smallest_lump_size_in', undefined);
    updateInput('largest_lump_size_in', undefined);
    updateInput('feed_behavior', undefined);
    updateInput('surge_multiplier', undefined);
    updateInput('surge_duration_sec', undefined);
    onClose();
  };

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
          <h2 className="text-lg font-semibold text-gray-900">Configure Bulk Material</h2>
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
          {/* Flow Input Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Flow Input Method
            </label>
            <div className="flex gap-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="bulk_input_method"
                  checked={!isVolumeFlow}
                  onChange={() => updateInput('bulk_input_method', BulkInputMethod.WeightFlow)}
                  className="mr-2"
                />
                Weight Flow (lbs/hr)
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="bulk_input_method"
                  checked={isVolumeFlow}
                  onChange={() => updateInput('bulk_input_method', BulkInputMethod.VolumeFlow)}
                  className="mr-2"
                />
                Volume Flow (ft³/hr)
              </label>
            </div>
          </div>

          {/* Flow Rate */}
          {!isVolumeFlow ? (
            <div>
              <label htmlFor="modal_mass_flow" className="block text-sm font-medium text-gray-700 mb-1">
                Mass Flow Rate (lbs/hr)
              </label>
              <input
                type="number"
                id="modal_mass_flow"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={inputs.mass_flow_lbs_per_hr ?? ''}
                onChange={(e) => updateInput('mass_flow_lbs_per_hr', e.target.value ? parseFloat(e.target.value) : undefined)}
                step="1"
                min="0"
                placeholder="e.g., 1000"
              />
            </div>
          ) : (
            <div>
              <label htmlFor="modal_volume_flow" className="block text-sm font-medium text-gray-700 mb-1">
                Volume Flow Rate (ft³/hr)
              </label>
              <input
                type="number"
                id="modal_volume_flow"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={inputs.volume_flow_ft3_per_hr ?? ''}
                onChange={(e) => updateInput('volume_flow_ft3_per_hr', e.target.value ? parseFloat(e.target.value) : undefined)}
                step="0.1"
                min="0"
                placeholder="e.g., 50"
              />
            </div>
          )}

          {/* Bulk Density */}
          <div>
            <label htmlFor="modal_density" className="block text-sm font-medium text-gray-700 mb-1">
              Bulk Density (lbs/ft³)
              {!isVolumeFlow && <span className="text-gray-400 font-normal ml-1">(optional for weight flow)</span>}
            </label>
            <input
              type="number"
              id="modal_density"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              value={inputs.density_lbs_per_ft3 ?? ''}
              onChange={(e) => updateInput('density_lbs_per_ft3', e.target.value ? parseFloat(e.target.value) : undefined)}
              step="0.1"
              min="0"
              placeholder="e.g., 45"
            />
          </div>

          {/* Density Source (only for volume flow) */}
          {isVolumeFlow && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Density Source
              </label>
              <div className="flex gap-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="density_source"
                    checked={(inputs.density_source ?? DensitySource.Known) === DensitySource.Known || inputs.density_source === 'KNOWN'}
                    onChange={() => updateInput('density_source', DensitySource.Known)}
                    className="mr-2"
                  />
                  Known
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="density_source"
                    checked={inputs.density_source === DensitySource.AssumedClass || inputs.density_source === 'ASSUMED_CLASS'}
                    onChange={() => updateInput('density_source', DensitySource.AssumedClass)}
                    className="mr-2"
                  />
                  Assumed from class
                </label>
              </div>
            </div>
          )}

          {/* Divider */}
          <hr className="border-gray-200" />

          {/* Lump Sizes */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="modal_smallest_lump" className="block text-sm font-medium text-gray-700 mb-1">
                Smallest Lump Size (in) <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="number"
                id="modal_smallest_lump"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={inputs.smallest_lump_size_in ?? ''}
                onChange={(e) => updateInput('smallest_lump_size_in', e.target.value ? parseFloat(e.target.value) : undefined)}
                step="0.5"
                min="0"
                placeholder="e.g., 0.5"
              />
            </div>
            <div>
              <label htmlFor="modal_largest_lump" className="block text-sm font-medium text-gray-700 mb-1">
                Largest Lump Size (in) <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="number"
                id="modal_largest_lump"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={inputs.largest_lump_size_in ?? inputs.max_lump_size_in ?? ''}
                onChange={(e) => updateInput('largest_lump_size_in', e.target.value ? parseFloat(e.target.value) : undefined)}
                step="0.5"
                min="0"
                placeholder="e.g., 4"
              />
            </div>
          </div>

          {/* Divider */}
          <hr className="border-gray-200" />

          {/* Feed Behavior */}
          <div>
            <label htmlFor="modal_feed_behavior" className="block text-sm font-medium text-gray-700 mb-1">
              Feed Behavior
            </label>
            <select
              id="modal_feed_behavior"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              value={feedBehavior}
              onChange={(e) => updateInput('feed_behavior', e.target.value as FeedBehavior)}
            >
              {Object.values(FeedBehavior).map((fb) => (
                <option key={fb} value={fb}>{FEED_BEHAVIOR_LABELS[fb]}</option>
              ))}
            </select>
          </div>

          {/* Surge Configuration (only when surge selected) */}
          {isSurge && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-4">
              <h4 className="text-sm font-medium text-amber-800">Surge Configuration</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="modal_surge_multiplier" className="block text-sm font-medium text-gray-700 mb-1">
                    Surge Multiplier (peak ÷ avg)
                  </label>
                  <input
                    type="number"
                    id="modal_surge_multiplier"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    value={inputs.surge_multiplier ?? 1.5}
                    onChange={(e) => updateInput('surge_multiplier', e.target.value ? parseFloat(e.target.value) : undefined)}
                    step="0.1"
                    min="1"
                    placeholder="1.5"
                  />
                </div>
                <div>
                  <label htmlFor="modal_surge_duration" className="block text-sm font-medium text-gray-700 mb-1">
                    Surge Duration (sec) <span className="text-gray-400 font-normal">(opt)</span>
                  </label>
                  <input
                    type="number"
                    id="modal_surge_duration"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    value={inputs.surge_duration_sec ?? ''}
                    onChange={(e) => updateInput('surge_duration_sec', e.target.value ? parseFloat(e.target.value) : undefined)}
                    step="1"
                    min="0"
                    placeholder="e.g., 30"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Configuration Summary
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Flow Method:</span>
                <span className="font-medium text-gray-900">
                  {isVolumeFlow ? 'Volume' : 'Weight'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Flow Rate:</span>
                <span className="font-medium text-gray-900">
                  {isVolumeFlow
                    ? (inputs.volume_flow_ft3_per_hr != null ? `${inputs.volume_flow_ft3_per_hr} ft³/hr` : '--')
                    : (inputs.mass_flow_lbs_per_hr != null ? `${inputs.mass_flow_lbs_per_hr} lbs/hr` : '--')
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Density:</span>
                <span className="font-medium text-gray-900">
                  {inputs.density_lbs_per_ft3 != null ? `${inputs.density_lbs_per_ft3} lbs/ft³` : '--'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Feed Behavior:</span>
                <span className="font-medium text-gray-900">
                  {FEED_BEHAVIOR_LABELS[feedBehavior as FeedBehavior] ?? feedBehavior}
                </span>
              </div>
              {isSurge && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Surge Multiplier:</span>
                  <span className="font-medium text-amber-600">
                    {inputs.surge_multiplier ?? 1.5}x
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleRemoveBulk}
            className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50"
          >
            Remove Bulk Config
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

/**
 * Helper to generate inline summary text for bulk configuration
 */
export function getBulkMaterialSummary(inputs: SliderbedInputs): string | null {
  const bulkInputMethod = inputs.bulk_input_method as BulkInputMethod | string;
  const isVolumeFlow = bulkInputMethod === BulkInputMethod.VolumeFlow || bulkInputMethod === 'VOLUME_FLOW';

  const flowRate = isVolumeFlow
    ? (inputs.volume_flow_ft3_per_hr != null ? `${inputs.volume_flow_ft3_per_hr} ft³/hr` : null)
    : (inputs.mass_flow_lbs_per_hr != null ? `${inputs.mass_flow_lbs_per_hr} lbs/hr` : null);

  if (!flowRate) return null;

  const feedBehavior = inputs.feed_behavior as FeedBehavior | string;
  const isSurge = feedBehavior === FeedBehavior.Surge || feedBehavior === 'SURGE';

  let summary = flowRate;
  if (isSurge && inputs.surge_multiplier) {
    summary += ` (surge ${inputs.surge_multiplier}x)`;
  }

  return summary;
}
