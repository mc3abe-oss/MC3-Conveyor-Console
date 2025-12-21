/**
 * Tab 2: Conveyor & Build
 *
 * Conveyor geometry, drive, electrical features, and calculation inputs
 */

'use client';

import {
  SliderbedInputs,
  BeltTrackingMethod,
  VGuideProfile,
  ShaftDiameterMode,
} from '../../src/models/sliderbed_v1/schema';
import CatalogSelect from './CatalogSelect';

interface TabConveyorBuildProps {
  inputs: SliderbedInputs;
  updateInput: (field: keyof SliderbedInputs, value: any) => void;
}

export default function TabConveyorBuild({ inputs, updateInput }: TabConveyorBuildProps) {
  return (
    <div className="space-y-6">
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
              className="input"
              value={inputs.pulley_diameter_in}
              onChange={(e) => updateInput('pulley_diameter_in', parseFloat(e.target.value) || 0)}
              step="0.1"
              min="0"
              required
            />
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

      {/* Section: Belt Tracking */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Belt Tracking</h3>
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
            <>
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
            </>
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

      {/* Section C: Calculation parameters */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Calculation Parameters <span className="text-sm font-normal text-gray-500">(Optional)</span>
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

      {/* Section D: Build options & deliverables */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Build Options & Deliverables
        </h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label htmlFor="spec_source" className="label">
              Spec Source
            </label>
            <CatalogSelect
              catalogKey="spec_source"
              value={inputs.spec_source}
              onChange={(value) => updateInput('spec_source', value)}
              id="spec_source"
              required
            />
          </div>

          {inputs.spec_source === 'CUSTOMER_SPEC' && (
            <div>
              <label htmlFor="customer_spec_reference" className="label">
                Customer Spec Reference <span className="text-gray-500">(required)</span>
              </label>
              <input
                type="text"
                id="customer_spec_reference"
                className="input"
                value={inputs.customer_spec_reference || ''}
                onChange={(e) => updateInput('customer_spec_reference', e.target.value || undefined)}
                required
              />
            </div>
          )}

          <div>
            <label htmlFor="support_option" className="label">
              Support Option
            </label>
            <CatalogSelect
              catalogKey="support_option"
              value={inputs.support_option}
              onChange={(value) => updateInput('support_option', value)}
              id="support_option"
              required
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="field_wiring_required"
              className="mr-2 h-4 w-4"
              checked={inputs.field_wiring_required === 'Yes'}
              onChange={(e) => updateInput('field_wiring_required', e.target.checked ? 'Yes' : 'No')}
            />
            <label htmlFor="field_wiring_required" className="label mb-0">
              Field Wiring Required
            </label>
          </div>

          <div>
            <label htmlFor="bearing_grade" className="label">
              Bearing Grade
            </label>
            <CatalogSelect
              catalogKey="bearing_grade"
              value={inputs.bearing_grade}
              onChange={(value) => updateInput('bearing_grade', value)}
              id="bearing_grade"
              required
            />
          </div>

          <div>
            <label htmlFor="documentation_package" className="label">
              Documentation Package
            </label>
            <CatalogSelect
              catalogKey="documentation_package"
              value={inputs.documentation_package}
              onChange={(value) => updateInput('documentation_package', value)}
              id="documentation_package"
              required
            />
          </div>

          <div>
            <label htmlFor="finish_paint_system" className="label">
              Finish Paint System
            </label>
            <CatalogSelect
              catalogKey="finish_paint_system"
              value={inputs.finish_paint_system}
              onChange={(value) => updateInput('finish_paint_system', value)}
              id="finish_paint_system"
              required
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="labels_required"
              className="mr-2 h-4 w-4"
              checked={inputs.labels_required === 'Yes'}
              onChange={(e) => updateInput('labels_required', e.target.checked ? 'Yes' : 'No')}
            />
            <label htmlFor="labels_required" className="label mb-0">
              Labels Required
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="send_to_estimating"
              className="mr-2 h-4 w-4"
              checked={inputs.send_to_estimating === 'Yes'}
              onChange={(e) => updateInput('send_to_estimating', e.target.checked ? 'Yes' : 'No')}
            />
            <label htmlFor="send_to_estimating" className="label mb-0">
              Send to Estimating
            </label>
          </div>

          <div>
            <label htmlFor="motor_brand" className="label">
              Motor Brand
            </label>
            <CatalogSelect
              catalogKey="motor_brand"
              value={inputs.motor_brand}
              onChange={(value) => updateInput('motor_brand', value)}
              id="motor_brand"
              required
            />
          </div>
        </div>
      </div>
    </div>
  );
}
