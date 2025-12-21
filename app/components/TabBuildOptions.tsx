/**
 * Tab: Build Options
 *
 * All build-related selections including:
 * - Guards & Safety (bottom covers, end guards, finger safe)
 * - Guides & Containment (side rails, side skirts)
 * - Belt & Pulley (lacing style, lacing material)
 * - Sensors / Controls (sensor options, field wiring)
 * - Drive & Gearmotor configuration (location, orientation, hand, motor brand)
 * - Documentation & Finish (specs, support, bearing, finish, labels, etc.)
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
  EndSupportType,
  HeightInputMode,
  derivedLegsRequired,
  FrameHeightMode,
} from '../../src/models/sliderbed_v1/schema';
import CatalogSelect from './CatalogSelect';

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
            <label htmlFor="end_guards" className="label">End Guards</label>
            <select
              id="end_guards"
              className="input"
              value={inputs.end_guards}
              onChange={(e) => updateInput('end_guards', e.target.value)}
            >
              {Object.values(EndGuards).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
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
            <p className="text-xs text-gray-500 mt-1">Design intent flag for finger-safe guarding. Not a certification or guarantee. Affects end guard and cover recommendations.</p>
          </div>
        </div>
      </div>

      {/* Guides & Containment */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Guides & Containment</h3>
        <div className="grid grid-cols-1 gap-4">
          {/* Side rails */}
          <div>
            <label htmlFor="side_rails" className="label">Side Rails</label>
            <select
              id="side_rails"
              className="input"
              value={inputs.side_rails}
              onChange={(e) => updateInput('side_rails', e.target.value)}
            >
              {Object.values(SideRails).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
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

          {/* v1.3: Belt Cleats */}
          <div className="border-t border-gray-200 pt-4 mt-2">
            <div>
              <label className="label">Belt Cleats</label>
              <div className="flex gap-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="cleats_enabled"
                    checked={inputs.cleats_enabled !== true}
                    onChange={() => updateInput('cleats_enabled', false)}
                    className="mr-2"
                  />
                  None
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="cleats_enabled"
                    checked={inputs.cleats_enabled === true}
                    onChange={() => updateInput('cleats_enabled', true)}
                    className="mr-2"
                  />
                  Add Cleats
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Cleats help retain product on inclines. Does not affect power/tension calculations.
              </p>
            </div>

            {/* Cleat configuration - only show if enabled */}
            {inputs.cleats_enabled && (
              <div className="ml-4 pl-4 border-l-2 border-gray-200 mt-4 space-y-4">
                <div>
                  <label htmlFor="cleat_height_in" className="label">
                    Cleat Height (in)
                  </label>
                  <input
                    type="number"
                    id="cleat_height_in"
                    className="input"
                    value={inputs.cleat_height_in ?? ''}
                    onChange={(e) =>
                      updateInput('cleat_height_in', e.target.value ? parseFloat(e.target.value) : undefined)
                    }
                    step="0.25"
                    min="0.5"
                    max="6"
                    required
                    placeholder="e.g., 1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Height of cleats (0.5" - 6")
                  </p>
                </div>

                <div>
                  <label htmlFor="cleat_spacing_in" className="label">
                    Cleat Spacing (in)
                  </label>
                  <input
                    type="number"
                    id="cleat_spacing_in"
                    className="input"
                    value={inputs.cleat_spacing_in ?? ''}
                    onChange={(e) =>
                      updateInput('cleat_spacing_in', e.target.value ? parseFloat(e.target.value) : undefined)
                    }
                    step="1"
                    min="2"
                    max="48"
                    required
                    placeholder="e.g., 12"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Center-to-center spacing between cleats (2" - 48")
                  </p>
                </div>

                <div>
                  <label htmlFor="cleat_edge_offset_in" className="label">
                    Cleat Edge Offset (in)
                  </label>
                  <input
                    type="number"
                    id="cleat_edge_offset_in"
                    className="input"
                    value={inputs.cleat_edge_offset_in ?? ''}
                    onChange={(e) =>
                      updateInput('cleat_edge_offset_in', e.target.value ? parseFloat(e.target.value) : undefined)
                    }
                    step="0.25"
                    min="0"
                    max="12"
                    required
                    placeholder="e.g., 0.5"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Distance from belt edge to cleat end (0" - 12")
                  </p>
                </div>
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

          {/* Field Wiring Required - moved from Documentation & Finish */}
          <div>
            <label className="label">Field Wiring Required</label>
            <div className="flex gap-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="field_wiring_required"
                  checked={inputs.field_wiring_required === 'No'}
                  onChange={() => updateInput('field_wiring_required', 'No')}
                  className="mr-2"
                />
                No
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="field_wiring_required"
                  checked={inputs.field_wiring_required === 'Yes'}
                  onChange={() => updateInput('field_wiring_required', 'Yes')}
                  className="mr-2"
                />
                Yes
              </label>
            </div>
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

          {/* Motor Brand - moved from Build Options section */}
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

      {/* v1.5: Frame Height */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Frame Height</h3>
        <div className="grid grid-cols-1 gap-4">
          {/* Frame Height Mode */}
          <div>
            <label htmlFor="frame_height_mode" className="label">
              Frame Height Mode
            </label>
            <select
              id="frame_height_mode"
              className="input"
              value={inputs.frame_height_mode ?? FrameHeightMode.Standard}
              onChange={(e) => {
                const mode = e.target.value as FrameHeightMode;
                updateInput('frame_height_mode', mode);
                // Clear custom frame height when switching away from Custom
                if (mode !== FrameHeightMode.Custom) {
                  updateInput('custom_frame_height_in', undefined);
                }
              }}
            >
              <option value={FrameHeightMode.Standard}>Standard (Pulley + 2.5&quot;)</option>
              <option value={FrameHeightMode.LowProfile}>Low Profile (Pulley + 0.5&quot;)</option>
              <option value={FrameHeightMode.Custom}>Custom</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Standard frame clears the drive pulley with 2.5&quot; margin. Low Profile and Custom are cost options.
            </p>
          </div>

          {/* Custom Frame Height - only show when Custom is selected */}
          {inputs.frame_height_mode === FrameHeightMode.Custom && (
            <div>
              <label htmlFor="custom_frame_height_in" className="label">
                Custom Frame Height (in) <span className="text-gray-500">(required)</span>
              </label>
              <input
                type="number"
                id="custom_frame_height_in"
                className="input"
                value={inputs.custom_frame_height_in ?? ''}
                onChange={(e) =>
                  updateInput('custom_frame_height_in', e.target.value ? parseFloat(e.target.value) : undefined)
                }
                step="0.25"
                min="3.0"
                max="24"
                required
                placeholder="e.g., 4.5"
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum: 3.0&quot;. Heights below 4.0&quot; require design review.
              </p>
            </div>
          )}

          {/* Info messages based on mode */}
          {inputs.frame_height_mode === FrameHeightMode.LowProfile && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Low Profile:</strong> Frame height will be pulley diameter + 0.5&quot;.
                This may require snub rollers for belt return path.
              </p>
            </div>
          )}

          {inputs.frame_height_mode === FrameHeightMode.Custom && inputs.custom_frame_height_in !== undefined && inputs.custom_frame_height_in < 4.0 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                <strong>Design Review Required:</strong> Frame height below 4.0&quot; requires engineering review.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Documentation & Finish */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Documentation & Finish</h3>
        <div className="grid grid-cols-1 gap-4">
          {/* Spec Source */}
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

          {/* Customer Spec Reference - only show if spec_source is Customer Specification */}
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

          {/* v1.4: Per-End Support Types */}
          <div>
            <label className="label">Tail End Support</label>
            <select
              id="tail_support_type"
              className="input"
              value={inputs.tail_support_type ?? EndSupportType.External}
              onChange={(e) => updateInput('tail_support_type', e.target.value as EndSupportType)}
            >
              <option value={EndSupportType.External}>External (Suspended/Framework)</option>
              <option value={EndSupportType.Legs}>Legs (Floor Mounted)</option>
              <option value={EndSupportType.Casters}>Casters (Floor Rolling)</option>
            </select>
          </div>

          <div>
            <label className="label">Drive End Support</label>
            <select
              id="drive_support_type"
              className="input"
              value={inputs.drive_support_type ?? EndSupportType.External}
              onChange={(e) => updateInput('drive_support_type', e.target.value as EndSupportType)}
            >
              <option value={EndSupportType.External}>External (Suspended/Framework)</option>
              <option value={EndSupportType.Legs}>Legs (Floor Mounted)</option>
              <option value={EndSupportType.Casters}>Casters (Floor Rolling)</option>
            </select>
          </div>

          {/* v1.4: Height Model (TOB) - Only show when legs_required=true */}
          {derivedLegsRequired(inputs.tail_support_type, inputs.drive_support_type) && (
            <div className="border-t border-gray-200 pt-4 mt-2 space-y-4">
              <h4 className="text-md font-medium text-gray-900">Height Configuration</h4>
              <p className="text-xs text-gray-500">
                Floor-standing support requires height specification (Top of Belt).
              </p>

              {/* Height Input Mode */}
              <div>
                <label className="label">Height Input Mode</label>
                <div className="flex gap-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="height_input_mode"
                      checked={(inputs.height_input_mode ?? HeightInputMode.ReferenceAndAngle) === HeightInputMode.ReferenceAndAngle}
                      onChange={() => {
                        // Mode switching clears TOB values to avoid ghost ownership
                        updateInput('tail_tob_in', undefined);
                        updateInput('drive_tob_in', undefined);
                        updateInput('height_input_mode', HeightInputMode.ReferenceAndAngle);
                      }}
                      className="mr-2"
                    />
                    Reference + Angle
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="height_input_mode"
                      checked={inputs.height_input_mode === HeightInputMode.BothEnds}
                      onChange={() => {
                        // Mode switching clears TOB values to avoid ghost ownership
                        updateInput('tail_tob_in', undefined);
                        updateInput('drive_tob_in', undefined);
                        updateInput('height_input_mode', HeightInputMode.BothEnds);
                      }}
                      className="mr-2"
                    />
                    Both Ends
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {(inputs.height_input_mode ?? HeightInputMode.ReferenceAndAngle) === HeightInputMode.ReferenceAndAngle
                    ? 'Specify one TOB + incline angle; system calculates the other.'
                    : 'Specify both TOBs; system calculates implied angle.'}
                </p>
              </div>

              {/* Mode A: Reference End + Reference TOB */}
              {(inputs.height_input_mode ?? HeightInputMode.ReferenceAndAngle) === HeightInputMode.ReferenceAndAngle && (
                <>
                  <div>
                    <label className="label">Reference End</label>
                    <div className="flex gap-4">
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          name="reference_end"
                          checked={(inputs.reference_end ?? 'tail') === 'tail'}
                          onChange={() => {
                            // Switching reference end clears TOB values
                            updateInput('tail_tob_in', undefined);
                            updateInput('drive_tob_in', undefined);
                            updateInput('reference_end', 'tail');
                          }}
                          className="mr-2"
                        />
                        Tail
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          name="reference_end"
                          checked={inputs.reference_end === 'drive'}
                          onChange={() => {
                            // Switching reference end clears TOB values
                            updateInput('tail_tob_in', undefined);
                            updateInput('drive_tob_in', undefined);
                            updateInput('reference_end', 'drive');
                          }}
                          className="mr-2"
                        />
                        Drive
                      </label>
                    </div>
                  </div>

                  {/* Reference TOB input */}
                  <div>
                    <label htmlFor="reference_tob" className="label">
                      {(inputs.reference_end ?? 'tail') === 'tail' ? 'Tail' : 'Drive'} TOB (in)
                    </label>
                    <input
                      type="number"
                      id="reference_tob"
                      className="input"
                      value={
                        (inputs.reference_end ?? 'tail') === 'tail'
                          ? (inputs.tail_tob_in ?? '')
                          : (inputs.drive_tob_in ?? '')
                      }
                      onChange={(e) => {
                        const value = e.target.value ? parseFloat(e.target.value) : undefined;
                        if ((inputs.reference_end ?? 'tail') === 'tail') {
                          updateInput('tail_tob_in', value);
                        } else {
                          updateInput('drive_tob_in', value);
                        }
                      }}
                      step="0.25"
                      min="0"
                      placeholder="e.g., 36"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Top of Belt height at {(inputs.reference_end ?? 'tail') === 'tail' ? 'tail' : 'drive'} end.
                      Opposite end calculated from incline angle.
                    </p>
                  </div>
                </>
              )}

              {/* Mode B: Both TOBs */}
              {inputs.height_input_mode === HeightInputMode.BothEnds && (
                <>
                  <div>
                    <label htmlFor="tail_tob_in" className="label">
                      Tail TOB (in)
                    </label>
                    <input
                      type="number"
                      id="tail_tob_in"
                      className="input"
                      value={inputs.tail_tob_in ?? ''}
                      onChange={(e) =>
                        updateInput('tail_tob_in', e.target.value ? parseFloat(e.target.value) : undefined)
                      }
                      step="0.25"
                      min="0"
                      placeholder="e.g., 36"
                    />
                  </div>

                  <div>
                    <label htmlFor="drive_tob_in" className="label">
                      Drive TOB (in)
                    </label>
                    <input
                      type="number"
                      id="drive_tob_in"
                      className="input"
                      value={inputs.drive_tob_in ?? ''}
                      onChange={(e) =>
                        updateInput('drive_tob_in', e.target.value ? parseFloat(e.target.value) : undefined)
                      }
                      step="0.25"
                      min="0"
                      placeholder="e.g., 42"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      System will calculate implied angle from these heights.
                    </p>
                  </div>
                </>
              )}

              {/* Adjustment Range */}
              <div>
                <label htmlFor="adjustment_required_in" className="label">
                  Leg Adjustment Range (in)
                </label>
                <input
                  type="number"
                  id="adjustment_required_in"
                  className="input"
                  value={inputs.adjustment_required_in ?? ''}
                  onChange={(e) =>
                    updateInput('adjustment_required_in', e.target.value ? parseFloat(e.target.value) : undefined)
                  }
                  step="0.5"
                  min="0"
                  max="24"
                  placeholder="e.g., 2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  ±adjustment for floor leveling. Default: 2". Large values may require special leg design.
                </p>
              </div>
            </div>
          )}

          {/* Bearing Grade */}
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

          {/* Documentation Package */}
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

          {/* Finish Paint System */}
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

          {/* Labels Required */}
          <div>
            <label className="label">Labels Required</label>
            <div className="flex gap-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="labels_required"
                  checked={inputs.labels_required === 'No'}
                  onChange={() => updateInput('labels_required', 'No')}
                  className="mr-2"
                />
                No
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="labels_required"
                  checked={inputs.labels_required === 'Yes'}
                  onChange={() => updateInput('labels_required', 'Yes')}
                  className="mr-2"
                />
                Yes
              </label>
            </div>
          </div>

          {/* Send to Estimating */}
          <div>
            <label className="label">Send to Estimating</label>
            <div className="flex gap-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="send_to_estimating"
                  checked={inputs.send_to_estimating === 'No'}
                  onChange={() => updateInput('send_to_estimating', 'No')}
                  className="mr-2"
                />
                No
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="send_to_estimating"
                  checked={inputs.send_to_estimating === 'Yes'}
                  onChange={() => updateInput('send_to_estimating', 'Yes')}
                  className="mr-2"
                />
                Yes
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
