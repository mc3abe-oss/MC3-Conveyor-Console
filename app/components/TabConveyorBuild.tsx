/**
 * Tab 2: Conveyor Design
 *
 * Core conveyor definition:
 * - Conveyor Geometry (length, width, pulley diameter, incline)
 * - Belt Selection (from belt catalog with PIW/PIL and min pulley constraints)
 * - Belt Tracking (V-guided vs crowned, shaft diameters)
 * - Drive & Electrical (RPM, speed, power feed, controls)
 * - Advanced Parameters (friction, safety factor, belt coefficients)
 *
 * Build options and deliverables have been moved to the Build Options tab.
 */

'use client';

import {
  SliderbedInputs,
  BeltTrackingMethod,
  VGuideProfile,
  ShaftDiameterMode,
} from '../../src/models/sliderbed_v1/schema';
import { BedType } from '../../src/models/belt_conveyor_v1/schema';
import {
  calculateTrackingGuidance,
  getRiskLevelColor,
  TrackingRiskLevel,
} from '../../src/models/sliderbed_v1/tracking-guidance';
import CatalogSelect from './CatalogSelect';
import BeltSelect from './BeltSelect';
import { BeltCatalogItem } from '../api/belts/route';

interface TabConveyorBuildProps {
  inputs: SliderbedInputs;
  updateInput: (field: keyof SliderbedInputs, value: any) => void;
}

export default function TabConveyorBuild({ inputs, updateInput }: TabConveyorBuildProps) {
  // Handle belt selection - updates multiple fields at once
  const handleBeltChange = (catalogKey: string | undefined, belt: BeltCatalogItem | undefined) => {
    updateInput('belt_catalog_key', catalogKey);
    if (belt) {
      updateInput('belt_piw', belt.piw);
      updateInput('belt_pil', belt.pil);
      updateInput('belt_min_pulley_dia_no_vguide_in', belt.min_pulley_dia_no_vguide_in);
      updateInput('belt_min_pulley_dia_with_vguide_in', belt.min_pulley_dia_with_vguide_in);
    } else {
      updateInput('belt_piw', undefined);
      updateInput('belt_pil', undefined);
      updateInput('belt_min_pulley_dia_no_vguide_in', undefined);
      updateInput('belt_min_pulley_dia_with_vguide_in', undefined);
    }
  };

  // Check if pulley diameter is below belt minimum
  const isVGuided =
    inputs.belt_tracking_method === BeltTrackingMethod.VGuided ||
    inputs.belt_tracking_method === 'V-guided';
  const minPulleyDia = isVGuided
    ? inputs.belt_min_pulley_dia_with_vguide_in
    : inputs.belt_min_pulley_dia_no_vguide_in;
  const pulleyBelowMinimum =
    minPulleyDia !== undefined &&
    inputs.pulley_diameter_in > 0 &&
    inputs.pulley_diameter_in < minPulleyDia;

  return (
    <div className="space-y-6">
      {/* Section: Bed Type */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Conveyor Type
        </h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label htmlFor="bed_type" className="label">
              Bed Type
            </label>
            <select
              id="bed_type"
              className="input"
              value={(inputs as any).bed_type || BedType.SliderBed}
              onChange={(e) => updateInput('bed_type' as any, e.target.value)}
            >
              <option value={BedType.SliderBed}>Slider Bed</option>
              <option value={BedType.RollerBed}>Roller Bed</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Slider bed: Belt slides on flat plate (COF ~0.25). Roller bed: Belt rides on rollers (COF ~0.03).
            </p>
          </div>
        </div>
      </div>

      {/* Section A: Conveyor geometry */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Conveyor Geometry
        </h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label htmlFor="conveyor_length_cc_in" className="label">
              Conveyor Length (C-C) (in)
            </label>
            <input
              type="number"
              id="conveyor_length_cc_in"
              className="input"
              value={inputs.conveyor_length_cc_in}
              onChange={(e) => updateInput('conveyor_length_cc_in', parseFloat(e.target.value) || 0)}
              step="1"
              min="0"
              required
            />
          </div>

          <div>
            <label htmlFor="conveyor_width_in" className="label">
              Conveyor Width (in)
            </label>
            <input
              type="number"
              id="conveyor_width_in"
              className="input"
              value={inputs.conveyor_width_in}
              onChange={(e) => updateInput('conveyor_width_in', parseFloat(e.target.value) || 0)}
              step="1"
              min="0"
              required
            />
          </div>

          <div>
            <label htmlFor="pulley_diameter_in" className="label">
              Pulley Diameter (in)
            </label>
            <input
              type="number"
              id="pulley_diameter_in"
              className={`input ${pulleyBelowMinimum ? 'border-red-500' : ''}`}
              value={inputs.pulley_diameter_in}
              onChange={(e) => updateInput('pulley_diameter_in', parseFloat(e.target.value) || 0)}
              step="0.1"
              min="0"
              required
            />
            {pulleyBelowMinimum && (
              <p className="text-xs text-red-600 mt-1">
                Pulley diameter is below the minimum ({minPulleyDia}" for{' '}
                {isVGuided ? 'V-guided' : 'crowned'} belt).
              </p>
            )}
          </div>

          <div>
            <label htmlFor="conveyor_incline_deg" className="label">
              Incline Angle (degrees) <span className="text-gray-500">(optional)</span>
            </label>
            <input
              type="number"
              id="conveyor_incline_deg"
              className="input"
              value={inputs.conveyor_incline_deg || ''}
              onChange={(e) =>
                updateInput('conveyor_incline_deg', e.target.value ? parseFloat(e.target.value) : undefined)
              }
              step="0.1"
              min="0"
            />
          </div>
        </div>
      </div>

      {/* Section: Belt Selection */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Belt Selection</h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label htmlFor="belt_catalog_key" className="label">
              Belt
            </label>
            <BeltSelect
              id="belt_catalog_key"
              value={inputs.belt_catalog_key}
              onChange={handleBeltChange}
              showDetails={true}
            />
            <p className="text-xs text-gray-500 mt-1">
              Select a belt to auto-populate PIW/PIL and minimum pulley diameter constraints.
            </p>
          </div>

          {/* PIW/PIL Override Fields - only show when belt is selected */}
          {inputs.belt_catalog_key && (
            <>
              <div>
                <label htmlFor="belt_piw_override" className="label">
                  PIW Override (lb/in) <span className="text-gray-500">(optional)</span>
                </label>
                <input
                  type="number"
                  id="belt_piw_override"
                  className="input"
                  value={inputs.belt_piw_override ?? ''}
                  onChange={(e) =>
                    updateInput('belt_piw_override', e.target.value ? parseFloat(e.target.value) : undefined)
                  }
                  step="0.001"
                  min="0.05"
                  max="0.30"
                  placeholder={inputs.belt_piw?.toString() ?? ''}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave blank to use catalog value ({inputs.belt_piw ?? 'N/A'} lb/in)
                </p>
              </div>
              <div>
                <label htmlFor="belt_pil_override" className="label">
                  PIL Override (lb/in) <span className="text-gray-500">(optional)</span>
                </label>
                <input
                  type="number"
                  id="belt_pil_override"
                  className="input"
                  value={inputs.belt_pil_override ?? ''}
                  onChange={(e) =>
                    updateInput('belt_pil_override', e.target.value ? parseFloat(e.target.value) : undefined)
                  }
                  step="0.001"
                  min="0.05"
                  max="0.30"
                  placeholder={inputs.belt_pil?.toString() ?? ''}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave blank to use catalog value ({inputs.belt_pil ?? 'N/A'} lb/in)
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Section: Belt Tracking */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Belt Tracking</h3>

        {/* Tracking Guidance Banner */}
        {inputs.conveyor_length_cc_in > 0 && inputs.conveyor_width_in > 0 && (() => {
          const guidance = calculateTrackingGuidance(inputs);
          // showWarning used to gate warning display, but warnings now always show if present
          const _showWarning = guidance.riskLevel !== TrackingRiskLevel.Low &&
            inputs.belt_tracking_method !== guidance.recommendation;
          void _showWarning; // Suppress unused variable warning

          return (
            <div className={`mb-4 p-3 rounded-lg ${
              guidance.riskLevel === TrackingRiskLevel.High
                ? 'bg-red-50 border border-red-200'
                : guidance.riskLevel === TrackingRiskLevel.Medium
                ? 'bg-yellow-50 border border-yellow-200'
                : 'bg-green-50 border border-green-200'
            }`}>
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {guidance.riskLevel === TrackingRiskLevel.High && (
                    <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  )}
                  {guidance.riskLevel === TrackingRiskLevel.Medium && (
                    <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  )}
                  {guidance.riskLevel === TrackingRiskLevel.Low && (
                    <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="ml-3 flex-1">
                  <h4 className={`text-sm font-medium ${
                    guidance.riskLevel === TrackingRiskLevel.High
                      ? 'text-red-800'
                      : guidance.riskLevel === TrackingRiskLevel.Medium
                      ? 'text-yellow-800'
                      : 'text-green-800'
                  }`}>
                    Tracking Recommendation: {guidance.recommendation}
                    <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${getRiskLevelColor(guidance.riskLevel)}`}>
                      {guidance.riskLevel} Risk
                    </span>
                  </h4>
                  <p className={`mt-1 text-sm ${
                    guidance.riskLevel === TrackingRiskLevel.High
                      ? 'text-red-700'
                      : guidance.riskLevel === TrackingRiskLevel.Medium
                      ? 'text-yellow-700'
                      : 'text-green-700'
                  }`}>
                    {guidance.summary}
                  </p>

                  {/* Show risk factors */}
                  {guidance.factors.filter(f => f.risk !== TrackingRiskLevel.Low).length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-600 font-medium">Risk factors:</p>
                      <ul className="mt-1 text-xs text-gray-600 list-disc list-inside">
                        {guidance.factors
                          .filter(f => f.risk !== TrackingRiskLevel.Low)
                          .map((f, i) => (
                            <li key={i}>
                              <span className={`font-medium ${
                                f.risk === TrackingRiskLevel.High ? 'text-red-600' : 'text-yellow-600'
                              }`}>{f.name}</span>: {f.explanation}
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}

                  {/* Show warnings - always display if there are any */}
                  {guidance.warnings.length > 0 && (
                    <div className="mt-2 p-2 bg-white/50 rounded border border-red-200">
                      <p className="text-xs text-red-700 font-medium">Warnings:</p>
                      <ul className="mt-1 text-xs text-red-600 list-disc list-inside">
                        {guidance.warnings.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label htmlFor="belt_tracking_method" className="label">
              Belt Tracking Method
            </label>
            <select
              id="belt_tracking_method"
              className="input"
              value={inputs.belt_tracking_method}
              onChange={(e) => updateInput('belt_tracking_method', e.target.value)}
            >
              {Object.values(BeltTrackingMethod).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              V-guided uses a V-profile on the belt underside. Crowned uses crowned pulleys for tracking.
            </p>
          </div>

          {/* V-guide profile - only show if V-guided */}
          {(inputs.belt_tracking_method === BeltTrackingMethod.VGuided ||
            inputs.belt_tracking_method === 'V-guided') && (
            <div>
              <label htmlFor="v_guide_profile" className="label">
                V-Guide Profile
              </label>
              <select
                id="v_guide_profile"
                className="input"
                value={inputs.v_guide_profile || ''}
                onChange={(e) => updateInput('v_guide_profile', e.target.value || undefined)}
                required
              >
                <option value="">Select profile...</option>
                {Object.values(VGuideProfile).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="shaft_diameter_mode" className="label">
              Shaft Diameter Mode
            </label>
            <select
              id="shaft_diameter_mode"
              className="input"
              value={inputs.shaft_diameter_mode}
              onChange={(e) => updateInput('shaft_diameter_mode', e.target.value)}
            >
              {Object.values(ShaftDiameterMode).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {/* Manual shaft diameters - only show if manual mode */}
          {(inputs.shaft_diameter_mode === ShaftDiameterMode.Manual ||
            inputs.shaft_diameter_mode === 'Manual') && (
            <div className="ml-4 pl-4 border-l-2 border-gray-200 space-y-4">
              <div>
                <label htmlFor="drive_shaft_diameter_in" className="label">
                  Drive Shaft Diameter (in)
                </label>
                <input
                  type="number"
                  id="drive_shaft_diameter_in"
                  className="input"
                  value={inputs.drive_shaft_diameter_in || ''}
                  onChange={(e) =>
                    updateInput('drive_shaft_diameter_in', e.target.value ? parseFloat(e.target.value) : undefined)
                  }
                  step="0.125"
                  min="0.5"
                  max="4.0"
                  required
                />
              </div>
              <div>
                <label htmlFor="tail_shaft_diameter_in" className="label">
                  Tail Shaft Diameter (in)
                </label>
                <input
                  type="number"
                  id="tail_shaft_diameter_in"
                  className="input"
                  value={inputs.tail_shaft_diameter_in || ''}
                  onChange={(e) =>
                    updateInput('tail_shaft_diameter_in', e.target.value ? parseFloat(e.target.value) : undefined)
                  }
                  step="0.125"
                  min="0.5"
                  max="4.0"
                  required
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Section B: Drive & electrical */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Drive & Electrical
        </h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label htmlFor="drive_rpm" className="label">
              Drive RPM
            </label>
            <input
              type="number"
              id="drive_rpm"
              className="input"
              value={inputs.drive_rpm}
              onChange={(e) => updateInput('drive_rpm', parseFloat(e.target.value) || 0)}
              step="1"
              min="0"
              required
            />
          </div>

          <div>
            <label htmlFor="belt_speed_fpm" className="label">
              Belt Speed (FPM)
            </label>
            <input
              type="number"
              id="belt_speed_fpm"
              className="input"
              value={inputs.belt_speed_fpm}
              onChange={(e) => updateInput('belt_speed_fpm', parseFloat(e.target.value) || 0)}
              step="0.01"
              min="0"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Belt Speed = Drive RPM × π × Pulley Diameter / 12
            </p>
          </div>

          <div>
            <label htmlFor="power_feed" className="label">
              Power Feed
            </label>
            <CatalogSelect
              catalogKey="power_feed"
              value={inputs.power_feed}
              onChange={(value) => updateInput('power_feed', value)}
              id="power_feed"
              required
            />
          </div>

          <div>
            <label htmlFor="controls_package" className="label">
              Controls Package
            </label>
            <CatalogSelect
              catalogKey="controls_package"
              value={inputs.controls_package}
              onChange={(value) => updateInput('controls_package', value)}
              id="controls_package"
              required
            />
          </div>
        </div>
      </div>

      {/* Section C: Advanced parameters */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Advanced Parameters <span className="text-sm font-normal text-gray-500">(Optional)</span>
        </h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label htmlFor="friction_coeff" className="label">
              Friction Coefficient <span className="text-gray-500">(0.05-0.6, default: 0.25)</span>
            </label>
            <input
              type="number"
              id="friction_coeff"
              className="input"
              value={inputs.friction_coeff || ''}
              onChange={(e) =>
                updateInput('friction_coeff', e.target.value ? parseFloat(e.target.value) : undefined)
              }
              step="0.01"
              min="0.05"
              max="0.6"
            />
          </div>

          <div>
            <label htmlFor="safety_factor" className="label">
              Safety Factor <span className="text-gray-500">(1.0-5.0, default: 2.0)</span>
            </label>
            <input
              type="number"
              id="safety_factor"
              className="input"
              value={inputs.safety_factor || ''}
              onChange={(e) =>
                updateInput('safety_factor', e.target.value ? parseFloat(e.target.value) : undefined)
              }
              step="0.1"
              min="1.0"
              max="5.0"
            />
          </div>

          <div>
            <label htmlFor="starting_belt_pull_lb" className="label">
              Starting Belt Pull (lb) <span className="text-gray-500">(0-2000, default: 75)</span>
            </label>
            <input
              type="number"
              id="starting_belt_pull_lb"
              className="input"
              value={inputs.starting_belt_pull_lb || ''}
              onChange={(e) =>
                updateInput('starting_belt_pull_lb', e.target.value ? parseFloat(e.target.value) : undefined)
              }
              step="1"
              min="0"
              max="2000"
            />
          </div>

          <div>
            <label htmlFor="motor_rpm" className="label">
              Motor RPM <span className="text-gray-500">(800-3600, default: 1750)</span>
            </label>
            <input
              type="number"
              id="motor_rpm"
              className="input"
              value={inputs.motor_rpm || ''}
              onChange={(e) =>
                updateInput('motor_rpm', e.target.value ? parseFloat(e.target.value) : undefined)
              }
              step="1"
              min="800"
              max="3600"
            />
          </div>

          <div>
            <label htmlFor="belt_coeff_piw" className="label">
              Belt Coefficient PIW (lb/in) <span className="text-gray-500">(0.05-0.30, default: 0.109)</span>
            </label>
            <input
              type="number"
              id="belt_coeff_piw"
              className="input"
              value={inputs.belt_coeff_piw || ''}
              onChange={(e) =>
                updateInput('belt_coeff_piw', e.target.value ? parseFloat(e.target.value) : undefined)
              }
              step="0.001"
              min="0.05"
              max="0.30"
            />
          </div>

          <div>
            <label htmlFor="belt_coeff_pil" className="label">
              Belt Coefficient PIL (lb/in) <span className="text-gray-500">(0.05-0.30, default: 0.109)</span>
            </label>
            <input
              type="number"
              id="belt_coeff_pil"
              className="input"
              value={inputs.belt_coeff_pil || ''}
              onChange={(e) =>
                updateInput('belt_coeff_pil', e.target.value ? parseFloat(e.target.value) : undefined)
              }
              step="0.001"
              min="0.05"
              max="0.30"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
