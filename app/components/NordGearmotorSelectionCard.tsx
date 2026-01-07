'use client';

import { useState, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import {
  GearmotorCandidate,
  GearmotorSelectionResult,
} from '../../src/lib/gearmotor';

interface NordGearmotorSelectionCardProps {
  requiredOutputRpm: number | null;
  requiredOutputTorqueLbIn: number | null;
  applicationId?: string;
  onSelect?: (candidate: GearmotorCandidate | null) => void;
}

const SERVICE_FACTOR_OPTIONS = [
  { value: 1.0, label: 'Min' },
  { value: 1.25, label: 'Light' },
  { value: 1.5, label: 'Std' },
  { value: 2.0, label: 'Heavy' },
];

/**
 * NordGearmotorSelectionCard - Compact NORD gearmotor selection for Drive & Controls config
 */
export default function NordGearmotorSelectionCard({
  requiredOutputRpm,
  requiredOutputTorqueLbIn,
  applicationId,
  onSelect,
}: NordGearmotorSelectionCardProps) {
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

  // Copy state
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
      queryCandidates();
    }
  }, [serviceFactor, speedTolerance]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial query
  useEffect(() => {
    if (hasValidInputs) {
      queryCandidates();
    }
  }, [hasValidInputs]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle candidate selection
  const handleSelectCandidate = (candidate: GearmotorCandidate) => {
    setSelectedCandidate(candidate);
    onSelect?.(candidate);

    // Save to backend if we have an application ID
    if (applicationId) {
      saveDriveConfig(candidate);
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

  // Copy vendor parts
  const handleCopyVendorParts = useCallback(async () => {
    if (!selectedCandidate) return;

    const lines = [
      `NORD ${selectedCandidate.series} Gearmotor`,
      `Part: ${selectedCandidate.gear_unit_part_number}`,
      `${selectedCandidate.motor_hp}HP | ${selectedCandidate.output_rpm} RPM | ${selectedCandidate.output_torque_lb_in} lb-in`,
      `Required: ${requiredOutputRpm?.toFixed(1)} RPM / ${requiredOutputTorqueLbIn?.toFixed(0)} lb-in @ SF ${serviceFactor}`,
    ];

    await navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [selectedCandidate, requiredOutputRpm, requiredOutputTorqueLbIn, serviceFactor]);

  // Empty state - no valid inputs
  if (!hasValidInputs) {
    return (
      <div className="border border-gray-200 bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h5 className="text-sm font-medium text-gray-700">NORD Gearmotor Selection</h5>
          <span className="text-xs text-gray-400">FLEXBLOC-first</span>
        </div>
        <p className="text-sm text-gray-500">Calculate to enable gearmotor selection.</p>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 bg-white rounded-lg overflow-hidden">
      {/* Compact Header */}
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h5 className="text-sm font-medium text-gray-900">NORD Gearmotor Selection</h5>
          {result?.selected_series && (
            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-xs rounded">
              {result.selected_series}
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400">FLEXBLOC-first policy</span>
      </div>

      <div className="p-4 space-y-4">
        {/* Requirements row - compact */}
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-gray-500">Required:</span>
            <span className="font-mono font-medium text-gray-900 ml-1">
              {requiredOutputRpm?.toFixed(1)} RPM
            </span>
          </div>
          <div>
            <span className="font-mono font-medium text-gray-900">
              {requiredOutputTorqueLbIn?.toFixed(0)} lb-in
            </span>
          </div>
        </div>

        {/* Service Factor - compact buttons */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 w-20">Service Factor</span>
          <div className="flex gap-1">
            {SERVICE_FACTOR_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setServiceFactor(opt.value)}
                className={clsx(
                  'px-2.5 py-1 text-xs font-medium rounded transition-colors',
                  serviceFactor === opt.value
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {opt.value}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-400">
            {SERVICE_FACTOR_OPTIONS.find((o) => o.value === serviceFactor)?.label}
          </span>
        </div>

        {/* Advanced toggle - inline */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <svg
              className={clsx('w-3 h-3 transition-transform', showAdvanced && 'rotate-90')}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Speed tolerance
          </button>
          {showAdvanced && (
            <div className="flex items-center gap-2 flex-1">
              <input
                type="range"
                min={5}
                max={25}
                step={1}
                value={speedTolerance}
                onChange={(e) => setSpeedTolerance(Number(e.target.value))}
                className="flex-1 h-1"
              />
              <span className="text-xs font-mono text-gray-600 w-8">{speedTolerance}%</span>
            </div>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-4">
            <div className="animate-spin w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" />
            <p className="mt-1 text-xs text-gray-500">Searching...</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-100 rounded p-2 text-xs text-red-700">
            {error}
            <button onClick={queryCandidates} className="ml-2 underline">Retry</button>
          </div>
        )}

        {/* No results message */}
        {result?.message && !loading && (
          <div className="bg-yellow-50 border border-yellow-100 rounded p-2 text-xs text-yellow-700">
            {result.message}
          </div>
        )}

        {/* Candidates Table - compact */}
        {result && result.candidates.length > 0 && !loading && (
          <div className="border border-gray-200 rounded overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-1.5 text-left font-medium text-gray-500">Series</th>
                  <th className="px-2 py-1.5 text-left font-medium text-gray-500">Size</th>
                  <th className="px-2 py-1.5 text-left font-medium text-gray-500">HP</th>
                  <th className="px-2 py-1.5 text-left font-medium text-gray-500">RPM</th>
                  <th className="px-2 py-1.5 text-left font-medium text-gray-500">Torque</th>
                  <th className="px-2 py-1.5 text-left font-medium text-gray-500">Margin</th>
                  <th className="px-2 py-1.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {result.candidates.map((candidate, idx) => {
                  const isSelected = selectedCandidate?.performance_point_id === candidate.performance_point_id;
                  const margin = Math.round((candidate.oversize_ratio - 1) * 100);
                  return (
                    <tr
                      key={candidate.performance_point_id}
                      className={clsx(
                        'cursor-pointer transition-colors',
                        isSelected ? 'bg-primary-50' : 'hover:bg-gray-50'
                      )}
                      onClick={() => handleSelectCandidate(candidate)}
                    >
                      <td className="px-2 py-1.5 font-medium text-gray-900">
                        <span className="flex items-center gap-1">
                          {candidate.series}
                          {idx === 0 && (
                            <span className="px-1 py-0.5 bg-green-50 text-green-600 text-[10px] rounded">
                              Best
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-gray-600">{candidate.size_code}</td>
                      <td className="px-2 py-1.5 text-gray-600">{candidate.motor_hp}</td>
                      <td className="px-2 py-1.5 font-mono text-gray-600">
                        {candidate.output_rpm}
                        <span className="text-gray-400 ml-0.5">
                          ({candidate.speed_delta_pct > 0 ? '+' : ''}{candidate.speed_delta_pct.toFixed(0)}%)
                        </span>
                      </td>
                      <td className="px-2 py-1.5 font-mono text-gray-600">
                        {candidate.output_torque_lb_in}
                      </td>
                      <td className="px-2 py-1.5">
                        <span className={clsx(
                          'px-1 py-0.5 rounded text-[10px] font-medium',
                          margin >= 50 ? 'bg-yellow-50 text-yellow-600' :
                          margin >= 20 ? 'bg-green-50 text-green-600' :
                          'bg-blue-50 text-blue-600'
                        )}>
                          +{margin}%
                        </span>
                      </td>
                      <td className="px-2 py-1.5">
                        <span
                          className={clsx(
                            'px-1.5 py-0.5 text-[10px] font-medium rounded',
                            isSelected
                              ? 'bg-primary-600 text-white'
                              : 'bg-gray-100 text-gray-500'
                          )}
                        >
                          {isSelected ? 'Selected' : 'Select'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Vendor Parts - compact */}
        {selectedCandidate && (
          <div className="border border-gray-200 rounded overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-700">Vendor Parts</span>
              <button
                onClick={handleCopyVendorParts}
                className={clsx(
                  'px-2 py-1 text-xs rounded flex items-center gap-1 transition-colors',
                  copied
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {copied ? (
                  <>
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Copied
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>
            <div className="p-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-50 rounded flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium text-gray-900">
                      {selectedCandidate.gear_unit_part_number}
                    </span>
                    <span className="text-[10px] text-gray-400">Gear Unit</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{selectedCandidate.gear_unit_description}</p>
                </div>
              </div>
              <p className="mt-2 text-[10px] text-gray-400 text-center">
                Additional parts (motors, adapters) not yet seeded.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
