'use client';

import { useState, useEffect, useCallback } from 'react';
import { GearmotorCandidate } from '../../src/lib/gearmotor';
import { GearmotorMountingStyle } from '../../src/models/sliderbed_v1/schema';
import DriveSelectorModal from './DriveSelectorModal';

// Formatting helpers
const formatRpm = (rpm: number | null | undefined): string => {
  if (rpm === null || rpm === undefined) return '—';
  return rpm.toFixed(1);
};

const formatTorque = (torque: number | null | undefined): string => {
  if (torque === null || torque === undefined) return '—';
  return Math.round(torque).toString();
};

interface DriveSelectorCardProps {
  requiredOutputRpm: number | null;
  requiredOutputTorqueLbIn: number | null;
  requiredPowerHp?: number | null;
  applicationId?: string;
  /** Mounting style from Drive Arrangement - determines if output shaft kit is required */
  gearmotorMountingStyle?: GearmotorMountingStyle | string;
  /** Output shaft option from Drive Arrangement - for chain drive configuration */
  outputShaftOption?: string | null;
  /** Output shaft bore size in inches - for hollow shaft options */
  outputShaftBoreIn?: number | null;
  /** Output shaft diameter in inches - for solid shaft (keyed) options */
  outputShaftDiameterIn?: number | null;
  /** Callback when gearmotor selection changes - receives output_rpm or null if cleared */
  onGearmotorOutputRpmChange?: (outputRpm: number | null) => void;
  /** Callback when output shaft diameter changes */
  onOutputShaftDiameterChange?: (diameter: number | null) => void;
}

/**
 * DriveSelectorCard - Compact info card for Drive & Controls config
 * Opens modal for full gearmotor selection workflow
 */
export default function DriveSelectorCard({
  requiredOutputRpm,
  requiredOutputTorqueLbIn,
  requiredPowerHp,
  applicationId,
  gearmotorMountingStyle,
  outputShaftOption,
  outputShaftBoreIn,
  outputShaftDiameterIn,
  onGearmotorOutputRpmChange,
  onOutputShaftDiameterChange,
}: DriveSelectorCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<GearmotorCandidate | null>(null);
  const [serviceFactor, setServiceFactor] = useState(1.5);

  // Check if we have valid inputs
  const hasValidInputs =
    requiredOutputRpm !== null &&
    requiredOutputRpm > 0 &&
    requiredOutputTorqueLbIn !== null &&
    requiredOutputTorqueLbIn > 0;

  // Load saved selection on mount
  useEffect(() => {
    if (applicationId) {
      loadSavedSelection();
    }
  }, [applicationId]);

  const loadSavedSelection = async () => {
    if (!applicationId) return;

    try {
      const response = await fetch(`/api/gearmotor/config?application_id=${applicationId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.config?.vendor_performance_points) {
          const point = data.config.vendor_performance_points;
          const candidate: GearmotorCandidate = {
            performance_point_id: point.id,
            gear_unit_component_id: point.vendor_components?.id ?? '',
            vendor: point.vendor,
            series: point.series,
            size_code: point.size_code,
            gear_unit_part_number: point.vendor_components?.vendor_part_number ?? '',
            gear_unit_description: point.vendor_components?.description ?? '',
            motor_hp: point.motor_hp,
            output_rpm: point.output_rpm,
            output_torque_lb_in: point.output_torque_lb_in,
            service_factor_catalog: point.service_factor_catalog,
            source_ref: point.source_ref ?? '',
            metadata_json: point.metadata_json ?? null,
            adjusted_capacity: 0,
            oversize_ratio: 1,
            speed_delta: 0,
            speed_delta_pct: 0,
          };
          setSelectedCandidate(candidate);
          // v1.38: Propagate output_rpm to parent for actual belt speed calculation
          onGearmotorOutputRpmChange?.(candidate.output_rpm ?? null);
        }
        if (data.config?.chosen_service_factor) {
          setServiceFactor(data.config.chosen_service_factor);
        }
      }
    } catch (err) {
      console.error('Failed to load drive config:', err);
    }
  };

  const handleSelect = useCallback((candidate: GearmotorCandidate | null) => {
    setSelectedCandidate(candidate);
    // v1.38: Propagate output_rpm to parent for actual belt speed calculation
    onGearmotorOutputRpmChange?.(candidate?.output_rpm ?? null);
  }, [onGearmotorOutputRpmChange]);

  // Empty state - no valid inputs
  if (!hasValidInputs) {
    return (
      <div className="border border-gray-200 bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h5 className="text-sm font-medium text-gray-700">Drive Selector</h5>
            <p className="text-xs text-gray-500 mt-0.5">Calculate to enable gearmotor selection.</p>
          </div>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">FLEXBLOC-first</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="border border-gray-200 bg-white rounded-lg p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h5 className="text-sm font-medium text-gray-900">Drive Selector</h5>
            <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">FLEXBLOC-first</span>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
          >
            {selectedCandidate ? 'Edit' : 'Choose Drive...'}
          </button>
        </div>

        {/* Status line */}
        {selectedCandidate ? (
          <div className="bg-green-50 border border-green-100 rounded-lg p-3 mb-3">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium text-green-800">
                Selected: NORD {selectedCandidate.series} (Size {selectedCandidate.size_code}, {selectedCandidate.motor_hp} HP)
              </span>
            </div>
            <p className="text-xs text-green-600 mt-1 ml-6">
              {selectedCandidate.gear_unit_part_number} — {selectedCandidate.output_rpm} RPM, {selectedCandidate.output_torque_lb_in} lb-in
            </p>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 mb-3">
            <span className="text-sm text-gray-500">No drive selected</span>
          </div>
        )}

        {/* Key metrics */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-xs text-gray-500 block">Required RPM</span>
            <span className="font-mono font-medium text-gray-900">{formatRpm(requiredOutputRpm)}</span>
          </div>
          <div>
            <span className="text-xs text-gray-500 block">Required Torque</span>
            <span className="font-mono font-medium text-gray-900">{formatTorque(requiredOutputTorqueLbIn)} <span className="text-xs font-normal text-gray-500">lb-in</span></span>
          </div>
          <div>
            <span className="text-xs text-gray-500 block">Service Factor</span>
            <span className="font-mono font-medium text-gray-900">{serviceFactor}</span>
          </div>
        </div>
      </div>

      {/* Modal */}
      <DriveSelectorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        requiredOutputRpm={requiredOutputRpm}
        requiredOutputTorqueLbIn={requiredOutputTorqueLbIn}
        requiredPowerHp={requiredPowerHp}
        applicationId={applicationId}
        initialServiceFactor={serviceFactor}
        gearmotorMountingStyle={gearmotorMountingStyle}
        outputShaftOption={outputShaftOption}
        outputShaftBoreIn={outputShaftBoreIn}
        outputShaftDiameterIn={outputShaftDiameterIn}
        selectedCandidate={selectedCandidate}
        onSelect={handleSelect}
        onServiceFactorChange={setServiceFactor}
        onOutputShaftDiameterChange={onOutputShaftDiameterChange}
      />
    </>
  );
}
