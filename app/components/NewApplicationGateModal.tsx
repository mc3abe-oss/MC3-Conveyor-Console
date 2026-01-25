'use client';

import { useState } from 'react';

export interface NewApplicationTarget {
  type: 'quote' | 'sales_order';
  base: number;
  suffix: number | null;
  jobLine: number;
}

interface NewApplicationGateModalProps {
  isOpen: boolean;
  onSelect: (target: NewApplicationTarget) => void;
  onCancel: () => void;
  productName: string;
}

/**
 * NewApplicationGateModal
 *
 * Blocking modal shown when creating a new application (?new=true).
 * Requires user to attach the application to either a Quote or Sales Order
 * before proceeding to the calculator.
 */
export default function NewApplicationGateModal({
  isOpen,
  onSelect,
  onCancel,
  productName,
}: NewApplicationGateModalProps) {
  const [targetType, setTargetType] = useState<'quote' | 'sales_order'>('quote');
  const [baseNumber, setBaseNumber] = useState('');
  const [suffixNumber, setSuffixNumber] = useState('');
  const [jobLine, setJobLine] = useState('1');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate base number
    const base = parseInt(baseNumber, 10);
    if (isNaN(base) || base <= 0) {
      setError('Please enter a valid base number');
      return;
    }

    // Parse optional suffix
    const suffix = suffixNumber.trim() ? parseInt(suffixNumber, 10) : null;
    if (suffixNumber.trim() && (isNaN(suffix as number) || (suffix as number) < 0)) {
      setError('Please enter a valid suffix number');
      return;
    }

    // Parse job line
    const job = parseInt(jobLine, 10);
    if (isNaN(job) || job <= 0) {
      setError('Please enter a valid job line number');
      return;
    }

    onSelect({
      type: targetType,
      base,
      suffix,
      jobLine: job,
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 transition-opacity" />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              Link Application
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              New <strong>{productName}</strong> applications must be linked to a
              Quote or Sales Order. This ensures proper commercial tracking.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Target Type Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Link to
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTargetType('quote')}
                  className={`
                    p-4 rounded-lg border-2 text-center transition-all
                    ${targetType === 'quote'
                      ? 'border-mc3-blue bg-mc3-blue/5 ring-2 ring-mc3-blue/20'
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <div className="text-sm font-medium text-gray-900">Quote</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Estimating phase
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType('sales_order')}
                  className={`
                    p-4 rounded-lg border-2 text-center transition-all
                    ${targetType === 'sales_order'
                      ? 'border-mc3-blue bg-mc3-blue/5 ring-2 ring-mc3-blue/20'
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <div className="text-sm font-medium text-gray-900">
                    Sales Order
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Build phase</div>
                </button>
              </div>
            </div>

            {/* Number Inputs */}
            <div className="space-y-4 mb-6">
              {/* Base Number */}
              <div>
                <label
                  htmlFor="base-number"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  {targetType === 'quote' ? 'Quote' : 'SO'} Number{' '}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="base-number"
                  value={baseNumber}
                  onChange={(e) => setBaseNumber(e.target.value)}
                  placeholder={targetType === 'quote' ? 'e.g., 62633' : 'e.g., 12345'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-mc3-blue focus:border-mc3-blue"
                  autoFocus
                />
              </div>

              {/* Suffix (Optional) */}
              <div>
                <label
                  htmlFor="suffix"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Suffix <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  id="suffix"
                  value={suffixNumber}
                  onChange={(e) => setSuffixNumber(e.target.value)}
                  placeholder="e.g., 2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-mc3-blue focus:border-mc3-blue"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave blank for no suffix
                </p>
              </div>

              {/* Job Line */}
              <div>
                <label
                  htmlFor="job-line"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Job Line <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="job-line"
                  value={jobLine}
                  onChange={(e) => setJobLine(e.target.value)}
                  placeholder="e.g., 1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-mc3-blue focus:border-mc3-blue"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!baseNumber.trim()}
                className={`
                  px-6 py-2 text-sm font-medium rounded-md transition-colors
                  ${baseNumber.trim()
                    ? 'bg-mc3-blue text-white hover:bg-mc3-navy'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }
                `}
              >
                Continue
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
