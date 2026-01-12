'use client';

import { SliderbedInputs, FrameHeightMode, SliderbedOutputs } from '../../src/models/sliderbed_v1/schema';

interface Props {
  inputs: SliderbedInputs | null;
  outputs?: SliderbedOutputs | null;
}

/**
 * InputEcho - Displays a read-only summary of key input values
 * Used in Results view to show what was configured without needing to switch tabs
 */
export default function InputEcho({ inputs, outputs }: Props) {
  if (!inputs) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Input Summary Card */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Configuration Summary
        </h3>

        <div className="space-y-4">
          {/* Conveyor Geometry */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              Conveyor Geometry
            </h4>
            <div className="space-y-1.5 text-sm">
              <EchoRow label="Length (C-C)" value={`${inputs.conveyor_length_cc_in}"`} />
              <EchoRow label="Belt Width" value={`${inputs.belt_width_in}"`} />
              <EchoRow label="Drive Pulley" value={`${inputs.drive_pulley_diameter_in ?? inputs.pulley_diameter_in ?? 4}"`} />
              {inputs.tail_pulley_diameter_in && inputs.tail_pulley_diameter_in !== (inputs.drive_pulley_diameter_in ?? inputs.pulley_diameter_in ?? 4) && (
                <EchoRow label="Tail Pulley" value={`${inputs.tail_pulley_diameter_in}"`} />
              )}
              {inputs.conveyor_incline_deg !== undefined && inputs.conveyor_incline_deg !== 0 && (
                <EchoRow label="Incline" value={`${inputs.conveyor_incline_deg}°`} />
              )}
            </div>
          </div>

          {/* Frame Height */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              Frame Height
            </h4>
            <div className="space-y-1.5 text-sm">
              <EchoRow
                label="Mode"
                value={inputs.frame_height_mode ?? FrameHeightMode.Standard}
              />
              {inputs.frame_height_mode === FrameHeightMode.Custom && inputs.custom_frame_height_in && (
                <EchoRow label="Custom Height" value={`${inputs.custom_frame_height_in}"`} />
              )}
            </div>
          </div>

          {/* Belt */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              Belt
            </h4>
            <div className="space-y-1.5 text-sm">
              {inputs.belt_catalog_key ? (
                <EchoRow label="Belt" value={inputs.belt_catalog_key} />
              ) : (
                <EchoRow label="Belt" value="Not selected" className="text-gray-400" />
              )}
              <EchoRow label="Tracking" value={inputs.belt_tracking_method ?? 'Crowned'} />
              {inputs.cleats_enabled && (
                <>
                  <EchoRow label="Cleats" value="Yes" />
                  {inputs.cleat_height_in && <EchoRow label="Cleat Height" value={`${inputs.cleat_height_in}"`} />}
                </>
              )}
            </div>
          </div>

          {/* Drive */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              Drive
            </h4>
            <div className="space-y-1.5 text-sm">
              {/* Use calculated drive_shaft_rpm from outputs, with guardrail for missing calc */}
              <EchoRow
                label="Drive Shaft RPM"
                value={outputs?.drive_shaft_rpm != null ? outputs.drive_shaft_rpm.toFixed(2) : '—'}
              />
              <EchoRow
                label="Belt Speed"
                value={outputs?.belt_speed_fpm != null ? `${outputs.belt_speed_fpm.toFixed(1)} FPM` : '—'}
              />
              <EchoRow label="Location" value={inputs.drive_location ?? 'Head'} />
              {inputs.brake_motor && <EchoRow label="Brake Motor" value="Yes" />}
            </div>
          </div>

          {/* Load */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              Load
            </h4>
            <div className="space-y-1.5 text-sm">
              <EchoRow label="Part Weight" value={`${inputs.part_weight_lbs} lbs`} />
              <EchoRow label="Part Size" value={`${inputs.part_length_in}" × ${inputs.part_width_in}"`} />
              <EchoRow label="Spacing" value={`${inputs.part_spacing_in}"`} />
              <EchoRow label="Orientation" value={inputs.orientation ?? 'Lengthwise'} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

interface EchoRowProps {
  label: string;
  value: string;
  className?: string;
}

function EchoRow({ label, value, className = '' }: EchoRowProps) {
  return (
    <div className={`flex justify-between items-center text-gray-700 ${className}`}>
      <span className="text-gray-500">{label}:</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
