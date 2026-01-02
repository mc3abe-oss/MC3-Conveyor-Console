/**
 * AdvancedParametersModal - Modal for editing Advanced Parameters
 *
 * Contains only Advanced Parameters fields:
 * - Friction Coefficient
 * - Safety Factor
 * - Starting Belt Pull
 *
 * Uses draft state pattern:
 * - Cancel = discard all changes
 * - Apply = batch commit changes and close
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { SliderbedInputs } from '../../src/models/sliderbed_v1/schema';

// Fields managed by this modal - ONLY Advanced Parameters
type DraftFields = Pick<
  SliderbedInputs,
  | 'friction_coeff'
  | 'safety_factor'
  | 'starting_belt_pull_lb'
>;

interface AdvancedParametersModalProps {
  isOpen: boolean;
  onClose: () => void;
  inputs: SliderbedInputs;
  updateInput: (field: keyof SliderbedInputs, value: any) => void;
}

export default function AdvancedParametersModal({
  isOpen,
  onClose,
  inputs,
  updateInput,
}: AdvancedParametersModalProps) {
  const [draft, setDraft] = useState<DraftFields>({} as DraftFields);
  const modalRef = useRef<HTMLDivElement>(null);

  // Initialize draft when modal opens
  useEffect(() => {
    if (isOpen) {
      setDraft({
        friction_coeff: inputs.friction_coeff,
        safety_factor: inputs.safety_factor,
        starting_belt_pull_lb: inputs.starting_belt_pull_lb,
      });
    }
  }, [isOpen, inputs]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleCancel();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        handleCancel();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const updateDraft = <K extends keyof DraftFields>(field: K, value: DraftFields[K]) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleCancel = () => {
    onClose();
  };

  const handleApply = () => {
    const fieldsToUpdate: Array<[keyof SliderbedInputs, any]> = [];

    (Object.keys(draft) as Array<keyof DraftFields>).forEach((field) => {
      const draftValue = draft[field];
      const currentValue = inputs[field];

      if (draftValue !== currentValue) {
        fieldsToUpdate.push([field, draftValue]);
      }
    });

    fieldsToUpdate.forEach(([field, value]) => {
      updateInput(field, value);
    });

    onClose();
  };

  const handleResetToDefaults = () => {
    setDraft({
      friction_coeff: undefined,
      safety_factor: undefined,
      starting_belt_pull_lb: undefined,
    });
  };

  if (!isOpen) return null;

  const hasOverrides = draft.friction_coeff !== undefined || draft.safety_factor !== undefined || draft.starting_belt_pull_lb !== undefined;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={modalRef}
          className="relative w-full max-w-md bg-white rounded-lg shadow-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Edit Advanced Parameters</h2>
            <button
              type="button"
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-4">
            <p className="text-sm text-gray-500">
              Override default calculation parameters. Leave blank to use defaults.
            </p>

            <div>
              <label htmlFor="modal_friction_coeff" className="label">
                Friction Coefficient <span className="text-gray-500">(default: 0.25)</span>
              </label>
              <input
                type="number"
                id="modal_friction_coeff"
                className="input"
                value={draft.friction_coeff ?? ''}
                placeholder="0.25"
                onChange={(e) =>
                  updateDraft('friction_coeff', e.target.value ? parseFloat(e.target.value) : undefined)
                }
                step="0.01"
                min="0.05"
                max="0.6"
              />
              <p className="text-xs text-gray-500 mt-1">Range: 0.05 – 0.6</p>
            </div>

            <div>
              <label htmlFor="modal_safety_factor" className="label">
                Safety Factor <span className="text-gray-500">(default: 2.0)</span>
              </label>
              <input
                type="number"
                id="modal_safety_factor"
                className="input"
                value={draft.safety_factor ?? ''}
                placeholder="2.0"
                onChange={(e) =>
                  updateDraft('safety_factor', e.target.value ? parseFloat(e.target.value) : undefined)
                }
                step="0.1"
                min="1.0"
                max="5.0"
              />
              <p className="text-xs text-gray-500 mt-1">Range: 1.0 – 5.0</p>
            </div>

            <div>
              <label htmlFor="modal_starting_belt_pull" className="label">
                Starting Belt Pull (lb) <span className="text-gray-500">(default: 75)</span>
              </label>
              <input
                type="number"
                id="modal_starting_belt_pull"
                className="input"
                value={draft.starting_belt_pull_lb ?? ''}
                placeholder="75"
                onChange={(e) =>
                  updateDraft('starting_belt_pull_lb', e.target.value ? parseFloat(e.target.value) : undefined)
                }
                step="1"
                min="0"
                max="2000"
              />
              <p className="text-xs text-gray-500 mt-1">Range: 0 – 2000 lb</p>
            </div>

            {hasOverrides && (
              <button
                type="button"
                onClick={handleResetToDefaults}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Reset all to defaults
              </button>
            )}
          </div>

          {/* Footer - Actions */}
          <div className="border-t border-gray-200 px-6 py-4">
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
