/**
 * Tab: Build Options
 *
 * Merged from Features & Options + Specifications.
 * Covers guards, guides, belt/pulley, sensors, and drive configuration.
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import {
  SliderbedInputs,
  SideRails,
  EndGuards,
  LacingStyle,
  LacingMaterial,
  SensorOption,
  DriveLocation,
  GearmotorOrientation,
  DriveHand,
} from '../../src/models/sliderbed_v1/schema';

interface TabBuildOptionsProps {
  inputs: SliderbedInputs;
  updateInput: (field: keyof SliderbedInputs, value: any) => void;
}

export default function TabBuildOptions({ inputs, updateInput }: TabBuildOptionsProps) {
  const [sensorDropdownOpen, setSensorDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setSensorDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSensorToggle = (option: string) => {
    const current = inputs.sensor_options || [];
    if (current.includes(option)) {
      updateInput(
        'sensor_options',
        current.filter((o) => o !== option)
      );
    } else {
      updateInput('sensor_options', [...current, option]);
    }
  };

  const removeSensor = (option: string) => {
    const current = inputs.sensor_options || [];
    updateInput(
      'sensor_options',
      current.filter((o) => o !== option)
    );
  };

  return (
    <div className="space-y-6">
      {/* Guards & Safety */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Guards & Safety</h3>
        <div className="grid grid-cols-1 gap-4">
          {/* Bottom covers */}
          <div>
            <label className="label">Bottom Covers</label>
            <div className="flex gap-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="bottom_covers"
                  checked={inputs.bottom_covers === false}
                  onChange={() => updateInput('bottom_covers', false)}
                  className="mr-2"
                />
                No
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="bottom_covers"
                  checked={inputs.bottom_covers === true}
                  onChange={() => updateInput('bottom_covers', true)}
                  className="mr-2"
                />
                Yes
              </label>
            </div>
          </div>

          {/* End guards */}
          <div>
            <label className="label">End Guards</label>
            <div className="flex flex-wrap gap-4">
              {Object.values(EndGuards).map((option) => (
                <label key={option} className="inline-flex items-center">
                  <input
                    type="radio"
                    name="end_guards"
                    checked={inputs.end_guards === option}
                    onChange={() => updateInput('end_guards', option)}
                    className="mr-2"
                  />
                  {option}
                </label>
              ))}
            </div>
          </div>

          {/* Finger safe */}
          <div>
            <label className="label">Finger Safe (Intent)</label>
            <div className="flex gap-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="finger_safe"
                  checked={inputs.finger_safe === false}
                  onChange={() => updateInput('finger_safe', false)}
                  className="mr-2"
                />
                No
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="finger_safe"
                  checked={inputs.finger_safe === true}
                  onChange={() => updateInput('finger_safe', true)}
                  className="mr-2"
                />
                Yes
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-1">Design intent flag, not a guarantee.</p>
          </div>
        </div>
      </div>

      {/* Guides & Containment */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Guides & Containment</h3>
        <div className="grid grid-cols-1 gap-4">
          {/* Side rails */}
          <div>
            <label className="label">Side Rails</label>
            <div className="flex flex-wrap gap-4">
              {Object.values(SideRails).map((option) => (
                <label key={option} className="inline-flex items-center">
                  <input
                    type="radio"
                    name="side_rails"
                    checked={inputs.side_rails === option}
                    onChange={() => updateInput('side_rails', option)}
                    className="mr-2"
                  />
                  {option}
                </label>
              ))}
            </div>
          </div>

          {/* Side skirts */}
          <div>
            <label className="label">Side Skirts</label>
            <div className="flex gap-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="side_skirts"
                  checked={inputs.side_skirts === false}
                  onChange={() => updateInput('side_skirts', false)}
                  className="mr-2"
                />
                No
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="side_skirts"
                  checked={inputs.side_skirts === true}
                  onChange={() => updateInput('side_skirts', true)}
                  className="mr-2"
                />
                Yes
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Belt & Pulley */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Belt & Pulley</h3>
        <div className="grid grid-cols-1 gap-4">
          {/* Belt Lacing group */}
          <div className="space-y-3">
            <div>
              <label htmlFor="lacing_style" className="label">
                Lacing Style
              </label>
              <select
                id="lacing_style"
                className="input"
                value={inputs.lacing_style}
                onChange={(e) => updateInput('lacing_style', e.target.value)}
              >
                {Object.values(LacingStyle).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            {/* Lacing material - only show if not Endless */}
            {inputs.lacing_style !== LacingStyle.Endless && (
              <div>
                <label htmlFor="lacing_material" className="label">
                  Lacing Material
                </label>
                <select
                  id="lacing_material"
                  className="input"
                  value={inputs.lacing_material || ''}
                  onChange={(e) => updateInput('lacing_material', e.target.value)}
                  required
                >
                  <option value="">Select material...</option>
                  {Object.values(LacingMaterial).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sensors / Controls */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sensors / Controls</h3>
        <div className="grid grid-cols-1 gap-4">
          <div ref={dropdownRef} className="relative">
            <label className="label">Sensor Options</label>

            {/* Selected chips */}
            <div
              className="input min-h-[42px] flex flex-wrap gap-1 items-center cursor-pointer"
              onClick={() => setSensorDropdownOpen(!sensorDropdownOpen)}
            >
              {(inputs.sensor_options || []).length === 0 ? (
                <span className="text-gray-400">Select sensors...</span>
              ) : (
                (inputs.sensor_options || []).map((option) => (
                  <span
                    key={option}
                    className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                  >
                    {option}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSensor(option);
                      }}
                      className="ml-1 hover:text-blue-600"
                    >
                      &times;
                    </button>
                  </span>
                ))
              )}
            </div>

            {/* Dropdown */}
            {sensorDropdownOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                {Object.values(SensorOption).map((option) => {
                  const isSelected = (inputs.sensor_options || []).includes(option);
                  return (
                    <div
                      key={option}
                      className={`px-3 py-2 cursor-pointer hover:bg-gray-100 flex items-center ${
                        isSelected ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => handleSensorToggle(option)}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="mr-2 h-4 w-4"
                      />
                      {option}
                    </div>
                  );
                })}
              </div>
            )}

            <p className="text-xs text-gray-500 mt-1">Preference only. No logic applied yet.</p>
          </div>
        </div>
      </div>

      {/* Drive & Gearmotor */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Drive & Gearmotor</h3>
        <div className="grid grid-cols-1 gap-4">
          {/* Drive location */}
          <div>
            <label htmlFor="drive_location" className="label">
              Drive Location
            </label>
            <select
              id="drive_location"
              className="input"
              value={inputs.drive_location}
              onChange={(e) => updateInput('drive_location', e.target.value)}
            >
              {Object.values(DriveLocation).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {/* Brake motor */}
          <div>
            <label className="label">Brake Motor</label>
            <div className="flex gap-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="brake_motor"
                  checked={inputs.brake_motor === false}
                  onChange={() => updateInput('brake_motor', false)}
                  className="mr-2"
                />
                No
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="brake_motor"
                  checked={inputs.brake_motor === true}
                  onChange={() => updateInput('brake_motor', true)}
                  className="mr-2"
                />
                Yes
              </label>
            </div>
          </div>

          {/* Gearmotor orientation */}
          <div>
            <label htmlFor="gearmotor_orientation" className="label">
              Gearmotor Mounting Orientation
            </label>
            <select
              id="gearmotor_orientation"
              className="input"
              value={inputs.gearmotor_orientation}
              onChange={(e) => updateInput('gearmotor_orientation', e.target.value)}
            >
              {Object.values(GearmotorOrientation).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {/* Drive hand */}
          <div>
            <label className="label">Drive Hand</label>
            <div className="flex gap-4">
              {Object.values(DriveHand).map((option) => (
                <label key={option} className="inline-flex items-center">
                  <input
                    type="radio"
                    name="drive_hand"
                    checked={inputs.drive_hand === option}
                    onChange={() => updateInput('drive_hand', option)}
                    className="mr-2"
                  />
                  {option}
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">Reference: when facing the discharge end.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
