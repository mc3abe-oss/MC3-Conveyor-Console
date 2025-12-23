/**
 * Lane 3: Conveyor Design – Belt & Interface
 *
 * Belt interaction, friction, and wear decisions
 */

'use client';

import {
  SliderbedInputs,
  PulleySurfaceType,
} from '../../src/models/sliderbed_v1/schema';

interface TabBeltInterfaceProps {
  inputs: SliderbedInputs;
  updateInput: (field: keyof SliderbedInputs, value: any) => void;
}

export default function TabBeltInterface({ inputs, updateInput }: TabBeltInterfaceProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4">
        {/* Pulley Surface Type */}
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
      </div>
    </div>
  );
}
