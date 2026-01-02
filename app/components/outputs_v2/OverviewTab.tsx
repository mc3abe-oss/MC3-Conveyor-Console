'use client';

import { OutputsV2 } from '../../../src/models/sliderbed_v1/outputs_v2';

interface OverviewTabProps {
  outputs: OutputsV2;
}

/**
 * OverviewTab - Summary, Calc Results, and Support System
 */
export default function OverviewTab({ outputs }: OverviewTabProps) {
  const { summary, calc_results, support_system, design_geometry } = outputs;

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Conveyor Summary</h3>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Type:</span>
            <span className="font-mono capitalize">{summary.conveyor_type}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Duty:</span>
            <span className="font-mono capitalize">{summary.duty}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Belt Speed:</span>
            <span className="font-mono">{summary.belt_speed_fpm?.toFixed(1) ?? '—'} FPM</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Center Distance:</span>
            <span className="font-mono">{summary.center_distance_in?.toFixed(1) ?? '—'}"</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Overall Length:</span>
            <span className="font-mono">{summary.overall_length_in?.toFixed(1) ?? '—'}"</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Incline:</span>
            <span className="font-mono">{summary.incline_deg?.toFixed(1) ?? 0}&deg;</span>
          </div>
          {summary.environment_tags.length > 0 && (
            <div className="col-span-2 flex items-start gap-2 mt-1">
              <span className="text-gray-600 text-sm">Environment:</span>
              <div className="flex flex-wrap gap-1">
                {summary.environment_tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Calculation Results Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Calculation Results</h3>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Effective Tension:</span>
            <span className="font-mono">{calc_results.effective_tension_lbf?.toFixed(1) ?? '—'} lbf</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Required Torque:</span>
            <span className="font-mono">{calc_results.required_torque_inlb?.toFixed(1) ?? '—'} in-lb</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Required Power:</span>
            <span className="font-mono">{calc_results.required_power_hp?.toFixed(3) ?? '—'} HP</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Drive RPM:</span>
            <span className="font-mono">{calc_results.drive_rpm?.toFixed(1) ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Service Factor:</span>
            <span className="font-mono">{calc_results.service_factor?.toFixed(2) ?? '—'}</span>
          </div>
          {calc_results.wrap_angle_deg != null && (
            <div className="flex justify-between">
              <span className="text-gray-600">Wrap Angle:</span>
              <span className="font-mono">{calc_results.wrap_angle_deg.toFixed(0)}&deg;</span>
            </div>
          )}
        </div>
      </div>

      {/* Support System Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Support System</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Support Type:</span>
            <span className="font-mono capitalize">{support_system.support_type.replace(/_/g, ' ')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Floor Supported:</span>
            <span className="font-mono">{support_system.is_floor_supported ? 'Yes' : 'No'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Has Legs:</span>
            <span className="font-mono">{support_system.has_legs ? 'Yes' : 'No'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Has Casters:</span>
            <span className="font-mono">{support_system.has_casters ? 'Yes' : 'No'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">TOB Relevance:</span>
            <span className="font-mono capitalize">{support_system.tob_relevance.replace(/_/g, ' ')}</span>
          </div>
        </div>
      </div>

      {/* Design Geometry Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Design Geometry</h3>
        <div className="space-y-2 text-sm">
          {design_geometry.top_of_belt_in.applicable && (
            <div className="flex justify-between">
              <span className="text-gray-600">Top of Belt:</span>
              <span className="font-mono">
                {design_geometry.top_of_belt_in.value?.toFixed(2) ?? '—'}"
                {design_geometry.top_of_belt_in.reference_only && (
                  <span className="text-xs text-gray-500 ml-1">(ref)</span>
                )}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600">Frame Height:</span>
            <span className="font-mono">
              {design_geometry.frame_height_in.value?.toFixed(2) ?? '—'}"
              {design_geometry.frame_height_in.reference_only && (
                <span className="text-xs text-gray-500 ml-1">(ref)</span>
              )}
            </span>
          </div>
          {design_geometry.roller_spacing_in.return != null && (
            <div className="flex justify-between">
              <span className="text-gray-600">Return Roller Spacing:</span>
              <span className="font-mono">{design_geometry.roller_spacing_in.return.toFixed(1)}"</span>
            </div>
          )}
        </div>

        {/* Pulley Locations */}
        {design_geometry.pulley_locations.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-600 mb-2">Pulley Locations</p>
            <div className="space-y-1 text-xs">
              {design_geometry.pulley_locations.map((loc) => (
                <div key={loc.component_id} className="flex justify-between text-gray-700">
                  <span className="font-mono">{loc.component_id}</span>
                  <span className="font-mono">Station: {loc.station_in?.toFixed(1) ?? '—'}"</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
