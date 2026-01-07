'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import clsx from 'clsx';
import {
  GearmotorCandidate,
  GearmotorSelectionResult,
} from '../../src/lib/gearmotor';

// Formatting helpers for REQUIREMENTS (can round for display)
const formatRequiredRpm = (rpm: number | null | undefined): string => {
  if (rpm === null || rpm === undefined) return '—';
  return rpm.toFixed(1);
};

const formatRequiredTorque = (torque: number | null | undefined): string => {
  if (torque === null || torque === undefined) return '—';
  return Math.round(torque).toString();
};

// Formatting helpers for CATALOG values (show exact stored values)
const formatCatalogRpm = (rpm: number): string => {
  // Show as stored: integer if whole, otherwise 1 decimal
  if (Number.isInteger(rpm)) {
    return rpm.toString();
  }
  return rpm.toFixed(1);
};

const formatCatalogTorque = (torque: number): string => {
  // Show exact stored value: integer if whole, otherwise up to 1 decimal
  if (Number.isInteger(torque)) {
    return torque.toString();
  }
  return torque.toFixed(1);
};

const formatCatalogSf = (sf: number): string => {
  // Show as stored (typically 1-2 decimals)
  if (Number.isInteger(sf)) {
    return sf.toString();
  }
  // Remove trailing zeros
  return parseFloat(sf.toFixed(2)).toString();
};

const formatMargin = (ratio: number): number => {
  return Math.round((ratio - 1) * 100);
};

// Helper to derive series code (e.g., "SI63" from size_code or part number)
const getSeriesCode = (sizeCode: string, partNumber: string): string => {
  // If size_code is numeric, use it
  const numericSize = parseInt(sizeCode, 10);
  if (!isNaN(numericSize)) {
    return `SI${numericSize}`;
  }
  // Fallback: parse from gear_unit_part_number prefix (e.g., "SI63-GU-003" => "SI63")
  const match = partNumber.match(/^(SI\d+)/);
  if (match) {
    return match[1];
  }
  // Last resort: return size_code as-is
  return sizeCode;
};

interface DriveSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  requiredOutputRpm: number | null;
  requiredOutputTorqueLbIn: number | null;
  requiredPowerHp?: number | null;
  applicationId?: string;
  initialServiceFactor?: number;
  initialSpeedTolerance?: number;
  selectedCandidate: GearmotorCandidate | null;
  onSelect: (candidate: GearmotorCandidate | null) => void;
  onServiceFactorChange?: (sf: number) => void;
}

const SERVICE_FACTOR_OPTIONS = [
  { value: 1.0, label: 'Min' },
  { value: 1.25, label: 'Light' },
  { value: 1.5, label: 'Std' },
  { value: 2.0, label: 'Heavy' },
];

// SF override validation
const SF_MIN = 0.5;
const SF_MAX = 3.0;
const SF_STEP = 0.05;

const validateSfOverride = (value: string): { valid: boolean; error: string | null; parsed: number | null } => {
  if (value === '') {
    return { valid: true, error: null, parsed: null };
  }
  const num = parseFloat(value);
  if (isNaN(num)) {
    return { valid: false, error: 'Enter a number', parsed: null };
  }
  if (num < SF_MIN || num > SF_MAX) {
    return { valid: false, error: `Must be ${SF_MIN}–${SF_MAX}`, parsed: null };
  }
  return { valid: true, error: null, parsed: num };
};

export default function DriveSelectorModal({
  isOpen,
  onClose,
  requiredOutputRpm,
  requiredOutputTorqueLbIn,
  requiredPowerHp,
  applicationId,
  initialServiceFactor = 1.5,
  initialSpeedTolerance = 15,
  selectedCandidate,
  onSelect,
  onServiceFactorChange,
}: DriveSelectorModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [serviceFactor, setServiceFactor] = useState(initialServiceFactor);
  const [sfOverrideInput, setSfOverrideInput] = useState('');
  const [sfOverrideError, setSfOverrideError] = useState<string | null>(null);
  const [speedTolerance, setSpeedTolerance] = useState(initialSpeedTolerance);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GearmotorSelectionResult | null>(null);
  const [copied, setCopied] = useState(false);

  // Compute active SF: override takes precedence if valid
  const sfOverrideValidation = validateSfOverride(sfOverrideInput);
  const activeSf = sfOverrideValidation.parsed !== null ? sfOverrideValidation.parsed : serviceFactor;
  const isOverrideActive = sfOverrideValidation.parsed !== null;

  const hasValidInputs =
    requiredOutputRpm !== null &&
    requiredOutputRpm > 0 &&
    requiredOutputTorqueLbIn !== null &&
    requiredOutputTorqueLbIn > 0;

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Query candidates
  const queryCandidates = useCallback(async () => {
    if (!hasValidInputs) return;

    // Don't query if SF override is invalid
    if (sfOverrideInput !== '' && !sfOverrideValidation.valid) {
      setSfOverrideError(sfOverrideValidation.error);
      return;
    }
    setSfOverrideError(null);

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/gearmotor/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          required_output_rpm: requiredOutputRpm,
          required_output_torque_lb_in: requiredOutputTorqueLbIn,
          chosen_service_factor: activeSf,
          speed_tolerance_pct: speedTolerance,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to query gearmotors');
      }

      const data: GearmotorSelectionResult = await response.json();
      setResult(data);

      // Auto-select first candidate if none selected and candidates exist
      if (data.candidates.length > 0 && !selectedCandidate) {
        handleSelectCandidate(data.candidates[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [hasValidInputs, requiredOutputRpm, requiredOutputTorqueLbIn, activeSf, speedTolerance, selectedCandidate, sfOverrideInput, sfOverrideValidation.valid, sfOverrideValidation.error]);

  // Query when modal opens or params change
  useEffect(() => {
    if (isOpen && hasValidInputs) {
      queryCandidates();
    }
  }, [isOpen, activeSf, speedTolerance]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle service factor change (from quick-pick buttons)
  const handleServiceFactorChange = (sf: number) => {
    setServiceFactor(sf);
    setSfOverrideInput(''); // Clear override when selecting quick-pick
    setSfOverrideError(null);
    onServiceFactorChange?.(sf);
  };

  // Handle SF override input change
  const handleSfOverrideChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSfOverrideInput(value);
    const validation = validateSfOverride(value);
    if (!validation.valid) {
      setSfOverrideError(validation.error);
    } else {
      setSfOverrideError(null);
      if (validation.parsed !== null) {
        onServiceFactorChange?.(validation.parsed);
      }
    }
  };

  // Clear SF override
  const handleClearSfOverride = () => {
    setSfOverrideInput('');
    setSfOverrideError(null);
    onServiceFactorChange?.(serviceFactor);
  };

  // Handle candidate selection
  const handleSelectCandidate = (candidate: GearmotorCandidate) => {
    onSelect(candidate);

    // Save to backend
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
          chosen_service_factor: activeSf,
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
      ``,
      `Application Requirements:`,
      `  Required RPM: ${formatRequiredRpm(requiredOutputRpm)}`,
      `  Required Torque: ${formatRequiredTorque(requiredOutputTorqueLbIn)} lb-in`,
      `  Service Factor: ${activeSf}`,
    ];

    await navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [selectedCandidate, requiredOutputRpm, requiredOutputTorqueLbIn, activeSf]);

  // Clear selection
  const handleClearSelection = () => {
    onSelect(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={modalRef}
          className="relative w-full max-w-2xl transform overflow-hidden rounded-xl bg-white shadow-2xl transition-all"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Select Gearmotor</h3>
                <p className="text-sm text-gray-500">NORD (FLEXBLOC-first)</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-4 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* A) Requirements summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Requirements
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <span className="text-xs text-gray-500 block">Output RPM</span>
                  <span className="font-mono font-semibold text-gray-900">
                    {formatRequiredRpm(requiredOutputRpm)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Output Torque</span>
                  <span className="font-mono font-semibold text-gray-900">
                    {formatRequiredTorque(requiredOutputTorqueLbIn)} <span className="text-xs font-normal text-gray-500">lb-in</span>
                  </span>
                </div>
                {requiredPowerHp && (
                  <div>
                    <span className="text-xs text-gray-500 block">Required Power</span>
                    <span className="font-mono font-semibold text-gray-900">
                      {requiredPowerHp.toFixed(2)} <span className="text-xs font-normal text-gray-500">HP</span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* B) Service Factor selector */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Service Factor
                {isOverrideActive && (
                  <span className="ml-2 px-1.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded">
                    Override
                  </span>
                )}
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {SERVICE_FACTOR_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleServiceFactorChange(opt.value)}
                    className={clsx(
                      'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                      !isOverrideActive && serviceFactor === opt.value
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    )}
                  >
                    {opt.value}
                  </button>
                ))}
                {!isOverrideActive && (
                  <span className="text-sm text-gray-500 ml-2">
                    ({SERVICE_FACTOR_OPTIONS.find((o) => o.value === serviceFactor)?.label})
                  </span>
                )}
              </div>
              {/* SF Override Input */}
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-gray-500">or override:</span>
                <input
                  type="number"
                  value={sfOverrideInput}
                  onChange={handleSfOverrideChange}
                  placeholder="e.g. 0.85"
                  min={SF_MIN}
                  max={SF_MAX}
                  step={SF_STEP}
                  className={clsx(
                    'w-24 px-2 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2',
                    sfOverrideError
                      ? 'border-red-300 focus:ring-red-200'
                      : isOverrideActive
                      ? 'border-amber-300 bg-amber-50 focus:ring-amber-200'
                      : 'border-gray-300 focus:ring-primary-200'
                  )}
                />
                {isOverrideActive && (
                  <button
                    onClick={handleClearSfOverride}
                    className="text-xs text-gray-500 hover:text-gray-700 underline"
                  >
                    Reset
                  </button>
                )}
                {sfOverrideError && (
                  <span className="text-xs text-red-600">{sfOverrideError}</span>
                )}
              </div>
              {isOverrideActive && (
                <p className="mt-1 text-xs text-amber-600">
                  Using SF {activeSf} (override)
                </p>
              )}
            </div>

            {/* C) Advanced (collapsed) */}
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
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    Speed Tolerance: {speedTolerance}%
                  </label>
                  <input
                    type="range"
                    min={5}
                    max={30}
                    step={1}
                    value={speedTolerance}
                    onChange={(e) => setSpeedTolerance(Number(e.target.value))}
                    className="w-full"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Allowed RPM range: {formatRequiredRpm(requiredOutputRpm ? requiredOutputRpm * (1 - speedTolerance / 100) : null)} – {formatRequiredRpm(requiredOutputRpm ? requiredOutputRpm * (1 + speedTolerance / 100) : null)}
                  </p>
                </div>
              )}
            </div>

            {/* D) Candidate results */}
            <div>
              {loading && (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" />
                  <p className="mt-2 text-sm text-gray-500">Searching for gearmotors...</p>
                </div>
              )}

              {error && !loading && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-4">
                  <p className="text-sm text-red-700">{error}</p>
                  <button onClick={queryCandidates} className="mt-2 text-sm text-red-600 underline">
                    Try again
                  </button>
                </div>
              )}

              {/* No matches - calm empty state */}
              {result && result.candidates.length === 0 && !loading && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                  <svg className="w-10 h-10 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-gray-600 mb-2">
                    No NORD gearmotor matches <span className="font-mono">~{formatRequiredRpm(requiredOutputRpm)}</span> RPM and <span className="font-mono">~{formatRequiredTorque(requiredOutputTorqueLbIn)}</span> lb-in at SF {activeSf}.
                  </p>
                  <p className="text-xs text-gray-500">
                    Try increasing speed tolerance or lowering service factor.
                  </p>
                </div>
              )}

              {/* Candidates table */}
              {result && result.candidates.length > 0 && !loading && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Available Gearmotors ({result.candidates.length})
                  </h4>
                  <div className="border border-gray-200 rounded-lg overflow-hidden overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-2 py-2 text-left font-medium text-gray-500 whitespace-nowrap">Series Code</th>
                          <th className="px-2 py-2 text-left font-medium text-gray-500">Size</th>
                          <th className="px-2 py-2 text-left font-medium text-gray-500">HP</th>
                          <th className="px-2 py-2 text-left font-medium text-gray-500">RPM</th>
                          <th className="px-2 py-2 text-left font-medium text-gray-500">Torque</th>
                          <th className="px-2 py-2 text-left font-medium text-gray-500 whitespace-nowrap">Cat SF</th>
                          <th className="px-2 py-2 text-left font-medium text-gray-500">Margin</th>
                          <th className="px-2 py-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {result.candidates.map((candidate, idx) => {
                          const isSelected = selectedCandidate?.performance_point_id === candidate.performance_point_id;
                          const margin = formatMargin(candidate.oversize_ratio);
                          const seriesCode = getSeriesCode(candidate.size_code, candidate.gear_unit_part_number);
                          return (
                            <tr
                              key={candidate.performance_point_id}
                              className={clsx(
                                'cursor-pointer transition-colors',
                                isSelected ? 'bg-primary-50' : 'hover:bg-gray-50'
                              )}
                              onClick={() => handleSelectCandidate(candidate)}
                            >
                              <td className="px-2 py-2.5 font-medium text-gray-900">
                                <span className="flex items-center gap-1.5">
                                  {seriesCode}
                                  {idx === 0 && (
                                    <span className="px-1.5 py-0.5 bg-green-50 text-green-600 text-xs rounded">
                                      Best
                                    </span>
                                  )}
                                </span>
                              </td>
                              <td className="px-2 py-2.5 text-gray-600">{candidate.size_code}</td>
                              <td className="px-2 py-2.5 text-gray-600">{candidate.motor_hp}</td>
                              <td
                                className="px-2 py-2.5 font-mono text-gray-600"
                                title={`Catalog RPM: ${candidate.output_rpm}`}
                              >
                                {formatCatalogRpm(candidate.output_rpm)}
                                <span className="text-xs text-gray-400 ml-1">
                                  ({candidate.speed_delta_pct > 0 ? '+' : ''}{candidate.speed_delta_pct.toFixed(0)}%)
                                </span>
                              </td>
                              <td
                                className="px-2 py-2.5 font-mono text-gray-600"
                                title={`Catalog torque: ${candidate.output_torque_lb_in} lb-in`}
                              >
                                {formatCatalogTorque(candidate.output_torque_lb_in)}
                              </td>
                              <td className="px-2 py-2.5 font-mono text-gray-500">
                                {formatCatalogSf(candidate.service_factor_catalog)}
                              </td>
                              <td className="px-2 py-2.5">
                                <span className={clsx(
                                  'px-1.5 py-0.5 rounded text-xs font-medium',
                                  margin >= 50 ? 'bg-yellow-50 text-yellow-600' :
                                  margin >= 20 ? 'bg-green-50 text-green-600' :
                                  'bg-blue-50 text-blue-600'
                                )}>
                                  +{margin}%
                                </span>
                              </td>
                              <td className="px-2 py-2.5">
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
            </div>

            {/* E) Vendor Parts */}
            {selectedCandidate && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Vendor Parts</span>
                  <button
                    onClick={handleCopyVendorParts}
                    className={clsx(
                      'px-3 py-1.5 text-sm rounded-lg flex items-center gap-1.5 transition-colors',
                      copied
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    {copied ? (
                      <>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Copied
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy BOM
                      </>
                    )}
                  </button>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium text-gray-900">
                          {selectedCandidate.gear_unit_part_number}
                        </span>
                        <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Gear Unit</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{selectedCandidate.gear_unit_description}</p>
                      <div className="mt-2 flex gap-4 text-xs text-gray-500">
                        <span><span className="text-gray-400">HP:</span> {selectedCandidate.motor_hp}</span>
                        <span><span className="text-gray-400">RPM:</span> {selectedCandidate.output_rpm}</span>
                        <span><span className="text-gray-400">Torque:</span> {selectedCandidate.output_torque_lb_in} lb-in</span>
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-gray-400 text-center border-t border-gray-100 pt-3">
                    Additional vendor parts (motors, adapters) not yet seeded.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <div>
              {selectedCandidate && (
                <button
                  onClick={handleClearSelection}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear selection
                </button>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
