'use client';

import { useState, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import {
  GearmotorCandidate,
  GearmotorSelectionResult,
} from '../../src/lib/gearmotor';

interface GearmotorSelectorProps {
  requiredOutputRpm: number | null;
  requiredOutputTorqueLbIn: number | null;
  applicationId?: string;
  onSelect?: (candidate: GearmotorCandidate | null) => void;
  className?: string;
}

const SERVICE_FACTOR_OPTIONS = [
  { value: 1.0, label: '1.0 (Minimum)' },
  { value: 1.25, label: '1.25 (Light)' },
  { value: 1.5, label: '1.5 (Standard)' },
  { value: 2.0, label: '2.0 (Heavy)' },
];

/**
 * GearmotorSelector - NORD gearmotor selection component
 *
 * Shows requirements, allows SF selection, displays candidates,
 * and shows vendor parts for selected gearmotor.
 */
export default function GearmotorSelector({
  requiredOutputRpm,
  requiredOutputTorqueLbIn,
  applicationId,
  onSelect,
  className,
}: GearmotorSelectorProps) {
  // Selection state
  const [serviceFactor, setServiceFactor] = useState(1.5);
  const [speedTolerance, setSpeedTolerance] = useState(15);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Query state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GearmotorSelectionResult | null>(null);

  // Selected candidate
  const [selectedCandidate, setSelectedCandidate] = useState<GearmotorCandidate | null>(null);

  // Copy state for vendor parts
  const [copied, setCopied] = useState(false);

  // Check if we have valid inputs
  const hasValidInputs =
    requiredOutputRpm !== null &&
    requiredOutputRpm > 0 &&
    requiredOutputTorqueLbIn !== null &&
    requiredOutputTorqueLbIn > 0;

  // Query candidates
  const queryCandidates = useCallback(async () => {
    if (!hasValidInputs) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/gearmotor/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          required_output_rpm: requiredOutputRpm,
          required_output_torque_lb_in: requiredOutputTorqueLbIn,
          chosen_service_factor: serviceFactor,
          speed_tolerance_pct: speedTolerance,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to query gearmotors');
      }

      const data: GearmotorSelectionResult = await response.json();
      setResult(data);

      // Auto-select first candidate if any
      if (data.candidates.length > 0 && !selectedCandidate) {
        setSelectedCandidate(data.candidates[0]);
        onSelect?.(data.candidates[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [hasValidInputs, requiredOutputRpm, requiredOutputTorqueLbIn, serviceFactor, speedTolerance, onSelect, selectedCandidate]);

  // Query on mount and when inputs change
  useEffect(() => {
    if (hasValidInputs) {
      void queryCandidates();
    }
  }, [serviceFactor, speedTolerance]); // Intentionally not including queryCandidates to avoid loops

  // Initial query
  useEffect(() => {
    if (hasValidInputs) {
      void queryCandidates();
    }
  }, [hasValidInputs]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle candidate selection
  const handleSelectCandidate = (candidate: GearmotorCandidate) => {
    setSelectedCandidate(candidate);
    onSelect?.(candidate);

    // Save to backend if we have an application ID
    if (applicationId) {
      void saveDriveConfig(candidate);
    }
  };

  // Save drive config
  const saveDriveConfig = async (candidate: GearmotorCandidate) => {
    if (!applicationId) return;

    try {
      await fetch('/api/gearmotor/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: applicationId,
          required_output_rpm: requiredOutputRpm,
          required_output_torque_lb_in: requiredOutputTorqueLbIn,
          chosen_service_factor: serviceFactor,
          speed_tolerance_pct: speedTolerance,
          selected_performance_point_id: candidate.performance_point_id,
        }),
      });
    } catch (err) {
      console.error('Failed to save drive config:', err);
    }
  };

  // Copy vendor parts to clipboard
  const handleCopyVendorParts = useCallback(async () => {
    if (!selectedCandidate) return;

    const lines = [
      `NORD ${selectedCandidate.series} Gearmotor Selection`,
      ``,
      `Part Number: ${selectedCandidate.gear_unit_part_number}`,
      `Description: ${selectedCandidate.gear_unit_description}`,
      ``,
      `Specifications:`,
      `  Series: ${selectedCandidate.series}`,
      `  Size: ${selectedCandidate.size_code}`,
      `  Motor HP: ${selectedCandidate.motor_hp}`,
      `  Output RPM: ${selectedCandidate.output_rpm}`,
      `  Output Torque: ${selectedCandidate.output_torque_lb_in} lb-in`,
      `  Catalog SF: ${selectedCandidate.service_factor_catalog}`,
      ``,
      `Application Requirements:`,
      `  Required RPM: ${requiredOutputRpm}`,
      `  Required Torque: ${requiredOutputTorqueLbIn} lb-in`,
      `  Service Factor: ${serviceFactor}`,
    ];

    await navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [selectedCandidate, requiredOutputRpm, requiredOutputTorqueLbIn, serviceFactor]);

  // Render empty state if no valid inputs
  if (!hasValidInputs) {
    return (
      <div className={clsx('bg-gray-50 border border-gray-200 rounded-lg p-6', className)}>
        <div className="text-center text-gray-500">
          <svg
            className="w-12 h-12 mx-auto text-gray-300 mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <p className="font-medium text-gray-600">Gearmotor Selection</p>
          <p className="text-sm mt-1">
            Calculate drive requirements first to enable gearmotor selection.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('bg-white border border-gray-200 rounded-lg overflow-hidden', className)}>
      {/* Header */}
      <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">NORD Gearmotor Selection</h3>
            <p className="text-sm text-gray-500">FLEXBLOC-first policy</p>
          </div>
          {result?.selected_series && (
            <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
              {result.selected_series}
            </span>
          )}
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Requirements (read-only) */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Required Output RPM
            </label>
            <div className="text-lg font-semibold text-gray-900 font-mono">
              {requiredOutputRpm?.toFixed(1)}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Required Output Torque
            </label>
            <div className="text-lg font-semibold text-gray-900 font-mono">
              {requiredOutputTorqueLbIn?.toFixed(1)} <span className="text-sm font-normal text-gray-500">lb-in</span>
            </div>
          </div>
        </div>

        {/* Service Factor Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Service Factor
          </label>
          <div className="flex gap-2">
            {SERVICE_FACTOR_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setServiceFactor(opt.value)}
                className={clsx(
                  'px-4 py-2 text-sm font-medium rounded-md transition-colors',
                  serviceFactor === opt.value
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                {opt.value}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {SERVICE_FACTOR_OPTIONS.find((o) => o.value === serviceFactor)?.label}
          </p>
        </div>

        {/* Advanced Options */}
        <div>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
          >
            <svg
              className={clsx('w-4 h-4 transition-transform', showAdvanced && 'rotate-90')}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Advanced Options
          </button>
          {showAdvanced && (
            <div className="mt-3 p-4 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Speed Tolerance: {speedTolerance}%
              </label>
              <input
                type="range"
                min={5}
                max={25}
                step={1}
                value={speedTolerance}
                onChange={(e) => setSpeedTolerance(Number(e.target.value))}
                className="w-full"
              />
              <p className="mt-1 text-xs text-gray-500">
                Allowed RPM deviation: {requiredOutputRpm ? `${(requiredOutputRpm * speedTolerance / 100).toFixed(1)} RPM` : '-'}
              </p>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" />
            <p className="mt-2 text-sm text-gray-500">Searching for gearmotors...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{error}</p>
            <button
              onClick={queryCandidates}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* No Results Message */}
        {result?.message && !loading && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 text-sm">{result.message}</p>
          </div>
        )}

        {/* Candidates Table */}
        {result && result.candidates.length > 0 && !loading && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Available Gearmotors ({result.candidates.length})
            </h4>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Series</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">HP</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">RPM</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Torque</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Margin</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {result.candidates.map((candidate, idx) => {
                    const isSelected = selectedCandidate?.performance_point_id === candidate.performance_point_id;
                    const margin = ((candidate.oversize_ratio - 1) * 100).toFixed(0);
                    return (
                      <tr
                        key={candidate.performance_point_id}
                        className={clsx(
                          'transition-colors cursor-pointer',
                          isSelected ? 'bg-primary-50' : 'hover:bg-gray-50'
                        )}
                        onClick={() => handleSelectCandidate(candidate)}
                      >
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {candidate.series}
                          {idx === 0 && (
                            <span className="ml-2 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                              Best
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{candidate.size_code}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{candidate.motor_hp}</td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-600">
                          {candidate.output_rpm}
                          <span className="text-xs text-gray-400 ml-1">
                            ({candidate.speed_delta_pct > 0 ? '+' : ''}{candidate.speed_delta_pct.toFixed(1)}%)
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-600">
                          {candidate.output_torque_lb_in}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={clsx(
                            'px-2 py-0.5 rounded text-xs font-medium',
                            Number(margin) >= 50 ? 'bg-yellow-100 text-yellow-700' :
                            Number(margin) >= 20 ? 'bg-green-100 text-green-700' :
                            'bg-blue-100 text-blue-700'
                          )}>
                            +{margin}%
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectCandidate(candidate);
                            }}
                            className={clsx(
                              'px-3 py-1 text-xs font-medium rounded transition-colors',
                              isSelected
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            )}
                          >
                            {isSelected ? 'Selected' : 'Select'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Selected Vendor Parts Panel */}
        {selectedCandidate && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Vendor Parts</h4>
              <button
                onClick={handleCopyVendorParts}
                className={clsx(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5',
                  copied
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                {copied ? (
                  <>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Copied
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>
            <div className="p-4">
              {/* Gear Unit */}
              <div className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                      Gear Unit
                    </span>
                    <span className="text-xs text-gray-500">Qty: 1</span>
                  </div>
                  <p className="mt-1 font-mono text-sm font-medium text-gray-900">
                    {selectedCandidate.gear_unit_part_number}
                  </p>
                  <p className="text-sm text-gray-600">
                    {selectedCandidate.gear_unit_description}
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">HP:</span>{' '}
                      <span className="font-medium">{selectedCandidate.motor_hp}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">RPM:</span>{' '}
                      <span className="font-medium">{selectedCandidate.output_rpm}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Torque:</span>{' '}
                      <span className="font-medium">{selectedCandidate.output_torque_lb_in} lb-in</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Placeholder for additional components */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <p className="text-sm text-gray-500 text-center">
                  Additional vendor parts (motors, adapters, output kits) not yet seeded.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
