'use client';

import { CalculationResult, SliderbedInputs, SpeedMode } from '../../src/models/sliderbed_v1/schema';
import {
  calculateTrackingGuidance,
  getRiskLevelColor,
  TrackingRiskLevel,
} from '../../src/models/sliderbed_v1/tracking-guidance';
import clsx from 'clsx';

interface Props {
  result: CalculationResult;
  inputs?: SliderbedInputs;
}

export default function CalculationResults({ result, inputs }: Props) {
  if (!result.success) {
    return (
      <div className="card">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className="h-6 w-6 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Calculation Failed
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <ul className="list-disc list-inside space-y-1">
                {result.errors?.map((error, index) => (
                  <li key={index}>{error.message}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { outputs, warnings } = result;

  if (!outputs) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Warnings/Info */}
      {warnings && warnings.length > 0 && (
        <div className="card">
          <div className="space-y-2">
            {warnings.map((warning, index) => (
              <div
                key={index}
                className={clsx(
                  'flex items-start p-3 rounded-md',
                  warning.severity === 'warning' && 'bg-yellow-50',
                  warning.severity === 'info' && 'bg-blue-50'
                )}
              >
                <div className="flex-shrink-0">
                  {warning.severity === 'warning' && (
                    <svg
                      className="h-5 w-5 text-yellow-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                  {warning.severity === 'info' && (
                    <svg
                      className="h-5 w-5 text-blue-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
                <div className="ml-3">
                  <p
                    className={clsx(
                      'text-sm',
                      warning.severity === 'warning' && 'text-yellow-800',
                      warning.severity === 'info' && 'text-blue-800'
                    )}
                  >
                    {warning.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Results */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Calculation Results
        </h3>

        <div className="grid grid-cols-1 gap-4">
          {/* Key Results - Highlighted */}
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-primary-900 mb-3">
              Key Outputs
            </h4>
            <div className="space-y-2">
              {/* v1.6: Show speed mode context */}
              <div className="flex justify-between items-center text-primary-700 mb-2 pb-2 border-b border-primary-200">
                <span className="text-sm">Speed Mode:</span>
                <span className="font-mono font-semibold">
                  {outputs.speed_mode_used === SpeedMode.BeltSpeed || outputs.speed_mode_used === 'belt_speed'
                    ? 'Belt Speed → Drive RPM'
                    : 'Drive RPM → Belt Speed'}
                </span>
              </div>
              <ResultRow
                label="Motor RPM"
                value={outputs.motor_rpm_used}
                decimals={0}
                highlight
              />
              <ResultRow
                label="Belt Speed"
                value={outputs.belt_speed_fpm}
                unit="FPM"
                decimals={2}
                highlight
              />
              <ResultRow
                label="Drive Shaft RPM"
                value={outputs.drive_shaft_rpm}
                decimals={2}
                highlight
              />
              <ResultRow
                label="Gear Ratio"
                value={outputs.gear_ratio}
                decimals={2}
                highlight
              />
              <ResultRow
                label="Torque"
                value={outputs.torque_drive_shaft_inlbf}
                unit="in-lbf"
                decimals={2}
                highlight
              />
            </div>
          </div>

          {/* Load Calculations */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              Load Calculations
            </h4>
            <div className="space-y-1.5 text-sm">
              <ResultRow
                label="Parts on Belt"
                value={outputs.parts_on_belt}
                decimals={2}
              />
              <ResultRow
                label="Load on Belt"
                value={outputs.load_on_belt_lbf}
                unit="lbf"
                decimals={2}
              />
              <ResultRow
                label="Belt Weight"
                value={outputs.belt_weight_lbf}
                unit="lbf"
                decimals={2}
              />
              <ResultRow
                label="Total Load"
                value={outputs.total_load_lbf}
                unit="lbf"
                decimals={2}
              />
            </div>
          </div>

          {/* Belt Pull */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              Belt Pull
            </h4>
            <div className="space-y-1.5 text-sm">
              <ResultRow
                label="Friction Pull"
                value={outputs.friction_pull_lb}
                unit="lb"
                decimals={2}
              />
              <ResultRow
                label="Incline Pull"
                value={outputs.incline_pull_lb}
                unit="lb"
                decimals={2}
              />
              <ResultRow
                label="Starting Belt Pull"
                value={outputs.starting_belt_pull_lb}
                unit="lb"
                decimals={2}
              />
              <ResultRow
                label="Total Belt Pull"
                value={outputs.total_belt_pull_lb}
                unit="lb"
                decimals={2}
              />
            </div>
          </div>

          {/* Other Outputs */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              Additional Details
            </h4>
            <div className="space-y-1.5 text-sm">
              <ResultRow
                label="Total Belt Length"
                value={outputs.total_belt_length_in}
                unit="in"
                decimals={2}
              />
            </div>
          </div>

          {/* Belt Tracking */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              Belt Tracking
            </h4>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between items-center text-gray-700">
                <span>Tracking Method:</span>
                <span className="font-mono font-semibold">
                  {outputs.is_v_guided ? 'V-Guided' : 'Crowned'}
                </span>
              </div>
              <ResultRow
                label="Pulley Face Length"
                value={outputs.pulley_face_length_in}
                unit="in"
                decimals={2}
              />
              <ResultRow
                label="Drive Shaft Diameter"
                value={outputs.drive_shaft_diameter_in}
                unit="in"
                decimals={3}
              />
              <ResultRow
                label="Tail Shaft Diameter"
                value={outputs.tail_shaft_diameter_in}
                unit="in"
                decimals={3}
              />
            </div>

            {/* Tracking Guidance Summary */}
            {inputs && inputs.conveyor_length_cc_in > 0 && inputs.conveyor_width_in > 0 && (() => {
              const guidance = calculateTrackingGuidance(inputs);
              const isOptimal = inputs.belt_tracking_method === guidance.recommendation;

              return (
                <div className={`mt-3 p-2 rounded text-xs ${
                  isOptimal
                    ? 'bg-green-50 border border-green-200'
                    : guidance.riskLevel === TrackingRiskLevel.High
                    ? 'bg-red-50 border border-red-200'
                    : 'bg-yellow-50 border border-yellow-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getRiskLevelColor(guidance.riskLevel)}`}>
                      {guidance.riskLevel} Risk
                    </span>
                    {isOptimal ? (
                      <span className="text-green-700">
                        Current selection matches recommendation
                      </span>
                    ) : (
                      <span className={guidance.riskLevel === TrackingRiskLevel.High ? 'text-red-700' : 'text-yellow-700'}>
                        Recommended: {guidance.recommendation}
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Throughput Outputs */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              Throughput Analysis
            </h4>
            <div className="space-y-1.5 text-sm">
              <ResultRow
                label="Pitch"
                value={outputs.pitch_in}
                unit="in"
                decimals={2}
              />
              <ResultRow
                label="Belt Speed (derived)"
                value={outputs.belt_speed_fpm}
                unit="FPM"
                decimals={2}
              />
              <ResultRow
                label="Capacity"
                value={outputs.capacity_pph}
                unit="pph"
                decimals={1}
              />
              {outputs.target_pph !== undefined && (
                <>
                  <ResultRow
                    label="Target Throughput"
                    value={outputs.target_pph}
                    unit="pph"
                    decimals={1}
                  />
                  <div className="flex justify-between items-center text-gray-700">
                    <span>Meets Throughput:</span>
                    <span className="font-mono font-semibold">
                      {outputs.meets_throughput ? 'Yes' : 'No'}
                    </span>
                  </div>
                  {outputs.rpm_required_for_target !== undefined && (
                    <ResultRow
                      label="RPM required to achieve throughput + margin"
                      value={outputs.rpm_required_for_target}
                      unit="RPM"
                      decimals={1}
                    />
                  )}
                  {outputs.throughput_margin_achieved_pct !== undefined && (
                    <ResultRow
                      label="Margin Achieved"
                      value={outputs.throughput_margin_achieved_pct}
                      unit="%"
                      decimals={1}
                    />
                  )}
                </>
              )}
            </div>
          </div>

          {/* Frame Height & Rollers */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              Frame & Rollers
            </h4>
            <div className="space-y-1.5 text-sm">
              {outputs.effective_frame_height_in !== undefined && (
                <ResultRow
                  label="Effective Frame Height"
                  value={outputs.effective_frame_height_in}
                  unit="in"
                  decimals={2}
                />
              )}
              {outputs.gravity_roller_quantity !== undefined && (
                <div className="flex justify-between items-center text-gray-700">
                  <span>Gravity Return Rollers:</span>
                  <span className="font-mono font-semibold">
                    {outputs.gravity_roller_quantity} rollers
                    <span className="text-xs text-gray-500 ml-1">
                      (spaced at {outputs.gravity_roller_spacing_in}")
                    </span>
                  </span>
                </div>
              )}
              {outputs.requires_snub_rollers && outputs.snub_roller_quantity !== undefined && outputs.snub_roller_quantity > 0 && (
                <div className="flex justify-between items-center text-gray-700">
                  <span>Snub Rollers:</span>
                  <span className="font-mono font-semibold">
                    {outputs.snub_roller_quantity} rollers
                    <span className="text-xs text-gray-500 ml-1">
                      (low profile frame)
                    </span>
                  </span>
                </div>
              )}
              {outputs.requires_snub_rollers === false && (
                <div className="flex justify-between items-center text-gray-500">
                  <span>Snub Rollers:</span>
                  <span className="font-mono">Not required</span>
                </div>
              )}
            </div>
          </div>

          {/* Power-User Parameters Used */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              Parameters Used
            </h4>
            <div className="space-y-1.5 text-sm">
              <ResultRow
                label="Safety Factor"
                value={outputs.safety_factor_used}
                decimals={2}
              />
              <ResultRow
                label="PIW (lb/in width)"
                value={outputs.piw_used}
                decimals={3}
              />
              <ResultRow
                label="PIL (lb/in length)"
                value={outputs.pil_used}
                decimals={3}
              />
              {outputs.belt_piw_effective !== undefined && (
                <ResultRow
                  label="Belt PIW (effective)"
                  value={outputs.belt_piw_effective}
                  decimals={3}
                />
              )}
              {outputs.belt_pil_effective !== undefined && (
                <ResultRow
                  label="Belt PIL (effective)"
                  value={outputs.belt_pil_effective}
                  decimals={3}
                />
              )}
              <ResultRow
                label="Starting Belt Pull"
                value={outputs.starting_belt_pull_lb_used}
                unit="lb"
                decimals={1}
              />
              <ResultRow
                label="Friction Coefficient"
                value={outputs.friction_coeff_used}
                decimals={2}
              />
              <ResultRow
                label="Motor RPM"
                value={outputs.motor_rpm_used}
                decimals={0}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="text-xs text-gray-500 text-center">
        Model: {result.metadata.model_key} | Version: {result.metadata.model_version_id}
        <br />
        Calculated at: {new Date(result.metadata.calculated_at).toLocaleString()}
      </div>
    </div>
  );
}

interface ResultRowProps {
  label: string;
  value: number;
  unit?: string;
  decimals?: number;
  highlight?: boolean;
}

function ResultRow({ label, value, unit, decimals = 2, highlight }: ResultRowProps) {
  return (
    <div
      className={clsx(
        'flex justify-between items-center',
        highlight ? 'text-primary-900' : 'text-gray-700'
      )}
    >
      <span className={highlight ? 'font-medium' : ''}>{label}:</span>
      <span className={clsx('font-mono', highlight && 'font-semibold text-lg')}>
        {value.toFixed(decimals)}
        {unit && <span className="ml-1 text-xs">{unit}</span>}
      </span>
    </div>
  );
}
