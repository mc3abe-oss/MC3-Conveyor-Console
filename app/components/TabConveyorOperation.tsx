/**
 * Lane 2: Conveyor Design – Operation
 *
 * Behavioral and control-related design decisions
 */

'use client';

import {
  SliderbedInputs,
  DirectionMode,
} from '../../src/models/sliderbed_v1/schema';

interface TabConveyorOperationProps {
  inputs: SliderbedInputs;
  updateInput: (field: keyof SliderbedInputs, value: any) => void;
}

export default function TabConveyorOperation({ inputs, updateInput }: TabConveyorOperationProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4">
        {/* Direction Mode */}
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

        {/* Start/Stop Application */}
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
      </div>
    </div>
  );
}
