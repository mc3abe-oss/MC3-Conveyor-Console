/**
 * Tab 1: Application & Demand
 *
 * Defines what and how much we are handling + environmental conditions
 */

'use client';

import { SliderbedInputs, Orientation } from '../../src/models/sliderbed_v1/schema';
import CatalogSelect from './CatalogSelect';

interface TabApplicationDemandProps {
  inputs: SliderbedInputs;
  updateInput: (field: keyof SliderbedInputs, value: any) => void;
}

export default function TabApplicationDemand({ inputs, updateInput }: TabApplicationDemandProps) {
  return (
    <div className="space-y-6">
      {/* Section A: What and how much (Demand + Product) */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          What and How Much
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

          <div className="flex items-center">
            <input
              type="checkbox"
              id="parts_sharp"
              className="mr-2 h-4 w-4"
              checked={inputs.parts_sharp === 'Yes'}
              onChange={(e) => updateInput('parts_sharp', e.target.checked ? 'Yes' : 'No')}
            />
            <label htmlFor="parts_sharp" className="label mb-0">
              Parts Sharp
            </label>
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

      {/* Section B: Environmental factors */}
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
          </div>
        </div>
      </div>
    </div>
  );
}
