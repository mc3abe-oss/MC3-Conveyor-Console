/**
 * Discrete Parts Configuration Modal
 *
 * Modal-based configuration for discrete parts conveying, following the
 * Cleats modal UX pattern (Configure button -> Modal -> Done/Cancel).
 *
 * v1.33: Created as part of Material Definition UX Fixes
 * - Explicit mode selection (no defaults)
 * - All discrete parts fields in modal
 */

'use client';

import {
  SliderbedInputs,
  Orientation,
  ORIENTATION_LABELS,
} from '../../src/models/sliderbed_v1/schema';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  inputs: SliderbedInputs;
  updateInput: (field: keyof SliderbedInputs, value: any) => void;
}

export default function DiscretePartsConfigModal({
  isOpen,
  onClose,
  inputs,
  updateInput,
}: Props) {
  if (!isOpen) return null;

  const handleRemoveDiscrete = () => {
    // Clear discrete-specific fields and revert to no mode
    updateInput('material_form', undefined);
    updateInput('part_length_in', 0);
    updateInput('part_width_in', 0);
    updateInput('part_weight_lbs', 0);
    updateInput('orientation', Orientation.Lengthwise);
    updateInput('part_spacing_in', 0);
    updateInput('required_throughput_pph', undefined);
    updateInput('throughput_margin_pct', undefined);
    updateInput('parts_sharp', 'No');
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
          <h2 className="text-lg font-semibold text-gray-900">Configure Discrete Parts</h2>
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
          {/* Part Dimensions */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Part Dimensions</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="modal_part_length" className="block text-sm font-medium text-gray-700 mb-1">
                  Length (in)
                </label>
                <input
                  type="number"
                  id="modal_part_length"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  value={inputs.part_length_in || ''}
                  onChange={(e) => updateInput('part_length_in', e.target.value ? parseFloat(e.target.value) : 0)}
                  step="0.1"
                  min="0"
                  placeholder="e.g., 12"
                />
              </div>
              <div>
                <label htmlFor="modal_part_width" className="block text-sm font-medium text-gray-700 mb-1">
                  Width (in)
                </label>
                <input
                  type="number"
                  id="modal_part_width"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  value={inputs.part_width_in || ''}
                  onChange={(e) => updateInput('part_width_in', e.target.value ? parseFloat(e.target.value) : 0)}
                  step="0.1"
                  min="0"
                  placeholder="e.g., 8"
                />
              </div>
              <div>
                <label htmlFor="modal_part_weight" className="block text-sm font-medium text-gray-700 mb-1">
                  Weight (lbs)
                </label>
                <input
                  type="number"
                  id="modal_part_weight"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  value={inputs.part_weight_lbs || ''}
                  onChange={(e) => updateInput('part_weight_lbs', e.target.value ? parseFloat(e.target.value) : 0)}
                  step="0.1"
                  min="0"
                  placeholder="e.g., 5"
                />
              </div>
              <div>
                <label htmlFor="modal_orientation" className="block text-sm font-medium text-gray-700 mb-1">
                  Orientation
                </label>
                <select
                  id="modal_orientation"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  value={inputs.orientation ?? Orientation.Lengthwise}
                  onChange={(e) => updateInput('orientation', e.target.value as Orientation)}
                >
                  <option value={Orientation.Lengthwise}>{ORIENTATION_LABELS[Orientation.Lengthwise]}</option>
                  <option value={Orientation.Crosswise}>{ORIENTATION_LABELS[Orientation.Crosswise]}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Divider */}
          <hr className="border-gray-200" />

          {/* Throughput */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Throughput</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="modal_part_spacing" className="block text-sm font-medium text-gray-700 mb-1">
                  Part Spacing (in)
                </label>
                <input
                  type="number"
                  id="modal_part_spacing"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  value={inputs.part_spacing_in || ''}
                  onChange={(e) => updateInput('part_spacing_in', e.target.value ? parseFloat(e.target.value) : 0)}
                  step="0.1"
                  min="0"
                  placeholder="e.g., 6"
                />
                <p className="text-xs text-gray-500 mt-1">Center-to-center spacing</p>
              </div>
              <div>
                <label htmlFor="modal_throughput" className="block text-sm font-medium text-gray-700 mb-1">
                  Required Throughput (pph) <span className="text-gray-400 font-normal">(opt)</span>
                </label>
                <input
                  type="number"
                  id="modal_throughput"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  value={inputs.required_throughput_pph ?? ''}
                  onChange={(e) => updateInput('required_throughput_pph', e.target.value ? parseFloat(e.target.value) : undefined)}
                  step="1"
                  min="0"
                  placeholder="e.g., 500"
                />
              </div>
              <div>
                <label htmlFor="modal_margin" className="block text-sm font-medium text-gray-700 mb-1">
                  Throughput Margin (%) <span className="text-gray-400 font-normal">(opt)</span>
                </label>
                <input
                  type="number"
                  id="modal_margin"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  value={inputs.throughput_margin_pct ?? ''}
                  onChange={(e) => updateInput('throughput_margin_pct', e.target.value ? parseFloat(e.target.value) : undefined)}
                  step="1"
                  min="0"
                  placeholder="e.g., 10"
                />
              </div>
            </div>
          </div>

          {/* Divider */}
          <hr className="border-gray-200" />

          {/* Parts Sharp */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Are the parts sharp?
            </label>
            <div className="flex gap-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="parts_sharp_modal"
                  checked={inputs.parts_sharp !== 'Yes'}
                  onChange={() => updateInput('parts_sharp', 'No')}
                  className="mr-2"
                />
                No
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="parts_sharp_modal"
                  checked={inputs.parts_sharp === 'Yes'}
                  onChange={() => updateInput('parts_sharp', 'Yes')}
                  className="mr-2"
                />
                Yes
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Sharp parts may require cut-resistant belt material.
            </p>
          </div>

          {/* Summary */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Configuration Summary
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Dimensions:</span>
                <span className="font-medium text-gray-900">
                  {inputs.part_length_in || 0}" x {inputs.part_width_in || 0}"
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Weight:</span>
                <span className="font-medium text-gray-900">
                  {inputs.part_weight_lbs || 0} lbs
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Spacing:</span>
                <span className="font-medium text-gray-900">
                  {inputs.part_spacing_in || 0}" c-c
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Sharp:</span>
                <span className="font-medium text-gray-900">
                  {inputs.parts_sharp === 'Yes' ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleRemoveDiscrete}
            className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50"
          >
            Remove Configuration
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
 * Helper to generate inline summary text for discrete parts configuration
 */
export function getDiscretePartsSummary(inputs: SliderbedInputs): string | null {
  const length = inputs.part_length_in;
  const width = inputs.part_width_in;
  const weight = inputs.part_weight_lbs;

  if (!length && !width && !weight) return null;

  return `${length || 0}" x ${width || 0}" @ ${weight || 0} lbs`;
}
