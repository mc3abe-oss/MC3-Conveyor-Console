/**
 * Tab 1: Application & Demand
 *
 * Defines what and how much we are handling + environmental conditions
 */

'use client';

import {
  SliderbedInputs,
  Orientation,
  PulleySurfaceType,
  DirectionMode,
  SideLoadingDirection,
  SideLoadingSeverity,
} from '../../src/models/sliderbed_v1/schema';
import CatalogSelect from './CatalogSelect';

interface TabApplicationDemandProps {
  inputs: SliderbedInputs;
  updateInput: (field: keyof SliderbedInputs, value: any) => void;
}

export default function TabApplicationDemand({ inputs, updateInput }: TabApplicationDemandProps) {
  return (
    <div className="space-y-6">
      {/* Section A: Product Definition */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Product Definition
        </h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label htmlFor="orientation" className="label">
              Orientation
            </label>
            <select
              id="orientation"
              className="input"
              value={inputs.orientation}
              onChange={(e) => updateInput('orientation', e.target.value as Orientation)}
              required
            >
              <option value={Orientation.Lengthwise}>Lengthwise</option>
              <option value={Orientation.Crosswise}>Crosswise</option>
            </select>
          </div>

          <div>
            <label htmlFor="material_type" className="label">
              Material Type
            </label>
            <CatalogSelect
              catalogKey="material_type"
              value={inputs.material_type}
              onChange={(value) => updateInput('material_type', value)}
              id="material_type"
              required
            />
          </div>

          <div>
            <label htmlFor="process_type" className="label">
              Process Type
            </label>
            <CatalogSelect
              catalogKey="process_type"
              value={inputs.process_type}
              onChange={(value) => updateInput('process_type', value)}
              id="process_type"
              required
            />
          </div>

          <div>
            <label className="label">Parts Sharp</label>
            <div className="flex gap-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="parts_sharp"
                  checked={inputs.parts_sharp === 'No'}
                  onChange={() => updateInput('parts_sharp', 'No')}
                  className="mr-2"
                />
                No
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="parts_sharp"
                  checked={inputs.parts_sharp === 'Yes'}
                  onChange={() => updateInput('parts_sharp', 'Yes')}
                  className="mr-2"
                />
                Yes
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="part_weight_lbs" className="label">
              Part Weight (lbs)
            </label>
            <input
              type="number"
              id="part_weight_lbs"
              className="input"
              value={inputs.part_weight_lbs}
              onChange={(e) => updateInput('part_weight_lbs', parseFloat(e.target.value) || 0)}
              step="0.1"
              min="0"
              required
            />
          </div>

          <div>
            <label htmlFor="part_length_in" className="label">
              Part Length (in)
            </label>
            <input
              type="number"
              id="part_length_in"
              className="input"
              value={inputs.part_length_in}
              onChange={(e) => updateInput('part_length_in', parseFloat(e.target.value) || 0)}
              step="0.1"
              min="0"
              required
            />
          </div>

          <div>
            <label htmlFor="part_width_in" className="label">
              Part Width (in)
            </label>
            <input
              type="number"
              id="part_width_in"
              className="input"
              value={inputs.part_width_in}
              onChange={(e) => updateInput('part_width_in', parseFloat(e.target.value) || 0)}
              step="0.1"
              min="0"
              required
            />
          </div>

          <div>
            <label htmlFor="drop_height_in" className="label">
              Drop Height (in)
            </label>
            <input
              type="number"
              id="drop_height_in"
              className="input"
              value={inputs.drop_height_in}
              onChange={(e) => updateInput('drop_height_in', parseFloat(e.target.value) || 0)}
              step="0.1"
              min="0"
            />
            <p className="text-xs text-gray-500 mt-1">
              Vertical drop onto the belt. Zero is perfectly acceptable.
            </p>
          </div>
        </div>
      </div>

      {/* Section B: Throughput Requirements */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Throughput Requirements
        </h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label htmlFor="part_spacing_in" className="label">
              Part Spacing (in)
            </label>
            <input
              type="number"
              id="part_spacing_in"
              className="input"
              value={inputs.part_spacing_in}
              onChange={(e) => updateInput('part_spacing_in', parseFloat(e.target.value) || 0)}
              step="0.1"
              min="0"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Center-to-center distance between parts in direction of travel.
            </p>
          </div>

          <div>
            <label htmlFor="required_throughput_pph" className="label">
              Required Throughput (parts/hour) <span className="text-gray-500">(optional)</span>
            </label>
            <input
              type="number"
              id="required_throughput_pph"
              className="input"
              value={inputs.required_throughput_pph || ''}
              onChange={(e) =>
                updateInput('required_throughput_pph', e.target.value ? parseFloat(e.target.value) : undefined)
              }
              step="1"
              min="0"
            />
          </div>

          <div>
            <label htmlFor="throughput_margin_pct" className="label">
              Throughput Margin (%) <span className="text-gray-500">(optional)</span>
            </label>
            <input
              type="number"
              id="throughput_margin_pct"
              className="input"
              value={inputs.throughput_margin_pct || ''}
              onChange={(e) =>
                updateInput('throughput_margin_pct', e.target.value ? parseFloat(e.target.value) : undefined)
              }
              step="1"
              min="0"
            />
          </div>
        </div>
      </div>

      {/* Section C: Application Details (moved before Environmental Factors) */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Application Details</h3>
        <div className="grid grid-cols-1 gap-4">
          {/* Pulley surface type */}
          <div>
            <label htmlFor="pulley_surface_type" className="label">
              Pulley Surface Type
            </label>
            <select
              id="pulley_surface_type"
              className="input"
              value={inputs.pulley_surface_type}
              onChange={(e) => updateInput('pulley_surface_type', e.target.value)}
            >
              {Object.values(PulleySurfaceType).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {/* Direction mode */}
          <div>
            <label className="label">Direction Mode</label>
            <div className="flex gap-4">
              {Object.values(DirectionMode).map((option) => (
                <label key={option} className="inline-flex items-center">
                  <input
                    type="radio"
                    name="direction_mode"
                    checked={inputs.direction_mode === option}
                    onChange={() => updateInput('direction_mode', option)}
                    className="mr-2"
                  />
                  {option}
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Reversing affects pulleys, V-guides, and controls.
            </p>
          </div>

          {/* Start/stop application */}
          <div>
            <label className="label">Start/Stop Application</label>
            <div className="flex gap-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="start_stop_application"
                  checked={inputs.start_stop_application === false}
                  onChange={() => updateInput('start_stop_application', false)}
                  className="mr-2"
                />
                No
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="start_stop_application"
                  checked={inputs.start_stop_application === true}
                  onChange={() => updateInput('start_stop_application', true)}
                  className="mr-2"
                />
                Yes
              </label>
            </div>
          </div>

          {/* Cycle time - only show if start/stop = true */}
          {inputs.start_stop_application && (
            <div>
              <label htmlFor="cycle_time_seconds" className="label">
                Cycle Time (seconds)
              </label>
              <input
                type="number"
                id="cycle_time_seconds"
                className="input"
                value={inputs.cycle_time_seconds || ''}
                onChange={(e) =>
                  updateInput('cycle_time_seconds', e.target.value ? parseFloat(e.target.value) : undefined)
                }
                step="0.1"
                min="0"
                required
              />
            </div>
          )}

          {/* Side loading direction */}
          <div>
            <label htmlFor="side_loading_direction" className="label">Side Loading</label>
            <select
              id="side_loading_direction"
              className="input"
              value={inputs.side_loading_direction}
              onChange={(e) => updateInput('side_loading_direction', e.target.value)}
            >
              {Object.values(SideLoadingDirection).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {/* Side loading severity - only show if direction != None */}
          {inputs.side_loading_direction !== SideLoadingDirection.None && (
            <div>
              <label className="label">Side Loading Severity</label>
              <div className="flex gap-4">
                {Object.values(SideLoadingSeverity).map((option) => (
                  <label key={option} className="inline-flex items-center">
                    <input
                      type="radio"
                      name="side_loading_severity"
                      checked={inputs.side_loading_severity === option}
                      onChange={() => updateInput('side_loading_severity', option)}
                      className="mr-2"
                    />
                    {option}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Section D: Environmental Factors */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Environmental Factors
        </h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label htmlFor="environment_factors" className="label">
              Environment Factors
            </label>
            <CatalogSelect
              catalogKey="environment_factors"
              value={inputs.environment_factors}
              onChange={(value) => updateInput('environment_factors', value)}
              id="environment_factors"
              required
            />
          </div>

          <div>
            <label htmlFor="fluid_type" className="label">
              Fluid Type
            </label>
            <CatalogSelect
              catalogKey="fluid_type"
              value={inputs.fluid_type}
              onChange={(value) => updateInput('fluid_type', value)}
              id="fluid_type"
              required
            />
          </div>

          <div>
            <label htmlFor="part_temperature_class" className="label">
              Part Temperature
            </label>
            <CatalogSelect
              catalogKey="part_temperature_class"
              value={inputs.part_temperature_class}
              onChange={(value) => updateInput('part_temperature_class', value)}
              id="part_temperature_class"
              required
            />
          </div>

          <div>
            <label htmlFor="ambient_temperature" className="label">
              Ambient Temperature
            </label>
            <input
              type="text"
              id="ambient_temperature"
              className="input"
              value={inputs.ambient_temperature}
              onChange={(e) => updateInput('ambient_temperature', e.target.value)}
              placeholder="e.g., Normal (60-90°F)"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter temperature range or classification.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
