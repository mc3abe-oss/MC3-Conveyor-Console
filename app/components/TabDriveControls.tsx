/**
 * Lane 3: Conveyor Design – Drive & Controls
 *
 * Drive and controls definition:
 * - Speed Definition
 * - Electrical
 * - Drive Arrangement
 * - Advanced Parameters (collapsible)
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import {
  SliderbedInputs,
  DriveLocation,
  GearmotorOrientation,
  GearmotorMountingStyle,
  DriveHand,
  SpeedMode,
  DirectionMode,
  SensorOption,
} from '../../src/models/sliderbed_v1/schema';
import {
  calculateDriveShaftRpm,
  calculateBeltSpeed,
} from '../../src/models/sliderbed_v1/formulas';
import CatalogSelect from './CatalogSelect';
import AccordionSection, { useAccordionState } from './AccordionSection';
import { Issue, SectionCounts, SectionKey } from './useConfigureIssues';

interface TabDriveControlsProps {
  inputs: SliderbedInputs;
  updateInput: (field: keyof SliderbedInputs, value: any) => void;
  sectionCounts: Record<SectionKey, SectionCounts>;
  /** v1.28: Get issues for a specific section (for banner display) */
  getIssuesForSection: (sectionKey: SectionKey) => Issue[];
}

export default function TabDriveControls({ inputs, updateInput, sectionCounts, getIssuesForSection }: TabDriveControlsProps) {
  const { handleToggle, isExpanded } = useAccordionState();

  // Sensor dropdown state (moved from Build Options)
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
    <div className="space-y-4">
      {/* SECTION: Speed Definition */}
      <AccordionSection
        id="speed"
        title="Speed Definition"
        isExpanded={isExpanded('speed')}
        onToggle={handleToggle}
        issueCounts={sectionCounts.speed}
        issues={getIssuesForSection('speed')}
      >
        <div className="grid grid-cols-1 gap-4">
          {/* Speed Mode Selector */}
          <div>
            <label className="label">Speed Mode</label>
            <div className="flex gap-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="speed_mode"
                  checked={(inputs.speed_mode ?? SpeedMode.BeltSpeed) === SpeedMode.BeltSpeed}
                  onChange={() => updateInput('speed_mode', SpeedMode.BeltSpeed)}
                  className="mr-2"
                />
                Specify Belt Speed
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="speed_mode"
                  checked={inputs.speed_mode === SpeedMode.DriveRpm}
                  onChange={() => updateInput('speed_mode', SpeedMode.DriveRpm)}
                  className="mr-2"
                />
                Specify Drive RPM
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Primary workflow: specify Belt Speed and Motor RPM to calculate Drive RPM and Gear Ratio
            </p>
          </div>

          {/* Belt Speed Mode (default) */}
          {(inputs.speed_mode ?? SpeedMode.BeltSpeed) === SpeedMode.BeltSpeed && (
            <>
              <div>
                <label htmlFor="belt_speed_fpm" className="label">
                  Belt Speed (FPM) <span className="text-primary-600">*</span>
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

              {/* Calculated Drive RPM preview */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Calculated Drive RPM:</span>
                  <span className="font-mono font-semibold text-gray-900">
                    {inputs.belt_speed_fpm > 0 && (inputs.drive_pulley_diameter_in ?? inputs.pulley_diameter_in) > 0
                      ? calculateDriveShaftRpm(
                          inputs.belt_speed_fpm,
                          inputs.drive_pulley_diameter_in ?? inputs.pulley_diameter_in
                        ).toFixed(2)
                      : '—'}
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Drive RPM Mode (legacy) */}
          {inputs.speed_mode === SpeedMode.DriveRpm && (
            <>
              <div>
                <label htmlFor="drive_rpm_input" className="label">
                  Drive RPM <span className="text-primary-600">*</span>
                </label>
                <input
                  type="number"
                  id="drive_rpm_input"
                  className="input"
                  value={inputs.drive_rpm_input ?? inputs.drive_rpm}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    updateInput('drive_rpm_input', value);
                    updateInput('drive_rpm', value);
                  }}
                  step="1"
                  min="0"
                  required
                />
              </div>

              {/* Calculated Belt Speed preview */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Calculated Belt Speed:</span>
                  <span className="font-mono font-semibold text-gray-900">
                    {(inputs.drive_rpm_input ?? inputs.drive_rpm) > 0 && (inputs.drive_pulley_diameter_in ?? inputs.pulley_diameter_in) > 0
                      ? calculateBeltSpeed(
                          inputs.drive_rpm_input ?? inputs.drive_rpm,
                          inputs.drive_pulley_diameter_in ?? inputs.pulley_diameter_in
                        ).toFixed(2) + ' FPM'
                      : '—'}
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Motor RPM */}
          <div>
            <label htmlFor="motor_rpm" className="label">
              Motor RPM
            </label>
            <input
              type="number"
              id="motor_rpm"
              className="input"
              value={inputs.motor_rpm ?? 1750}
              onChange={(e) => updateInput('motor_rpm', parseFloat(e.target.value) || 1750)}
              step="1"
              min="800"
              max="3600"
            />
            <p className="text-xs text-gray-500 mt-1">
              Default: 1750 RPM. Range: 800–3600 RPM
            </p>
          </div>

          {/* Gear Ratio preview */}
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-primary-700 font-medium">Calculated Gear Ratio:</span>
              <span className="font-mono font-bold text-primary-900">
                {(() => {
                  const motorRpm = inputs.motor_rpm ?? 1750;
                  const pulleyDia = inputs.drive_pulley_diameter_in ?? inputs.pulley_diameter_in;
                  let driveRpm: number;

                  if ((inputs.speed_mode ?? SpeedMode.BeltSpeed) === SpeedMode.BeltSpeed) {
                    driveRpm = inputs.belt_speed_fpm > 0 && pulleyDia > 0
                      ? calculateDriveShaftRpm(inputs.belt_speed_fpm, pulleyDia)
                      : 0;
                  } else {
                    driveRpm = inputs.drive_rpm_input ?? inputs.drive_rpm;
                  }

                  return driveRpm > 0 ? (motorRpm / driveRpm).toFixed(2) : '—';
                })()}
              </span>
            </div>
          </div>
        </div>
      </AccordionSection>

      {/* SECTION: Electrical */}
      <AccordionSection
        id="electrical"
        title="Electrical"
        isExpanded={isExpanded('electrical')}
        onToggle={handleToggle}
        issueCounts={sectionCounts.electrical}
        issues={getIssuesForSection('electrical')}
      >
        <div className="grid grid-cols-1 gap-4">
          {/* Power Feed */}
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

          {/* Controls Package */}
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

          {/* Brake Motor */}
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

          {/* ===== SENSORS / CONTROLS SUBSECTION (moved from Build Options) ===== */}
          <h4 className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-2 mt-4">
            Sensors / Controls
          </h4>

          {/* Sensor Options */}
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

          {/* Field Wiring Required */}
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
      </AccordionSection>

      {/* SECTION: Drive Arrangement */}
      <AccordionSection
        id="drive"
        title="Drive Arrangement"
        isExpanded={isExpanded('drive')}
        onToggle={handleToggle}
        issueCounts={sectionCounts.drive}
        issues={getIssuesForSection('drive')}
      >
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

          {/* Drive Location */}
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

          {/* Gearmotor Mounting Style */}
          <div>
            <label className="label">Gearmotor Mounting Style</label>
            <div className="flex gap-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="gearmotor_mounting_style"
                  checked={(inputs.gearmotor_mounting_style ?? GearmotorMountingStyle.ShaftMounted) === GearmotorMountingStyle.ShaftMounted}
                  onChange={() => updateInput('gearmotor_mounting_style', GearmotorMountingStyle.ShaftMounted)}
                  className="mr-2"
                />
                Shaft Mounted
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="gearmotor_mounting_style"
                  checked={inputs.gearmotor_mounting_style === GearmotorMountingStyle.BottomMount}
                  onChange={() => {
                    updateInput('gearmotor_mounting_style', GearmotorMountingStyle.BottomMount);
                    if (inputs.gm_sprocket_teeth === undefined) {
                      updateInput('gm_sprocket_teeth', 18);
                    }
                    if (inputs.drive_shaft_sprocket_teeth === undefined) {
                      updateInput('drive_shaft_sprocket_teeth', 24);
                    }
                  }}
                  className="mr-2"
                />
                Bottom Mount (Chain Drive)
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Shaft mounted: direct coupling. Bottom mount: chain-coupled via sprockets.
            </p>
          </div>

          {/* Sprocket Configuration - only shown for bottom mount */}
          {inputs.gearmotor_mounting_style === GearmotorMountingStyle.BottomMount && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
              <h4 className="text-sm font-medium text-gray-700">Sprocket Configuration</h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="gm_sprocket_teeth" className="label">
                    Gearmotor Sprocket (Driver)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      id="gm_sprocket_teeth"
                      className="input"
                      value={inputs.gm_sprocket_teeth ?? 18}
                      onChange={(e) => updateInput('gm_sprocket_teeth', parseInt(e.target.value) || 18)}
                      step="1"
                      min="1"
                      required
                    />
                    <span className="text-sm text-gray-500">teeth</span>
                  </div>
                </div>

                <div>
                  <label htmlFor="drive_shaft_sprocket_teeth" className="label">
                    Drive Shaft Sprocket (Driven)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      id="drive_shaft_sprocket_teeth"
                      className="input"
                      value={inputs.drive_shaft_sprocket_teeth ?? 24}
                      onChange={(e) => updateInput('drive_shaft_sprocket_teeth', parseInt(e.target.value) || 24)}
                      step="1"
                      min="1"
                      required
                    />
                    <span className="text-sm text-gray-500">teeth</span>
                  </div>
                </div>
              </div>

              {/* Chain ratio preview */}
              <div className="bg-white border border-gray-200 rounded p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Chain Ratio:</span>
                  <span className="font-mono font-semibold text-gray-900">
                    {(() => {
                      const gmTeeth = inputs.gm_sprocket_teeth ?? 18;
                      const driveTeeth = inputs.drive_shaft_sprocket_teeth ?? 24;
                      if (gmTeeth > 0 && driveTeeth > 0) {
                        const ratio = driveTeeth / gmTeeth;
                        return `${ratio.toFixed(3)} (${driveTeeth}T / ${gmTeeth}T)`;
                      }
                      return '—';
                    })()}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {(() => {
                    const gmTeeth = inputs.gm_sprocket_teeth ?? 18;
                    const driveTeeth = inputs.drive_shaft_sprocket_teeth ?? 24;
                    if (gmTeeth > 0 && driveTeeth > 0) {
                      const ratio = driveTeeth / gmTeeth;
                      if (ratio > 1) {
                        return 'Speed reduction at chain stage (gearmotor output RPM > drive shaft RPM)';
                      } else if (ratio < 1) {
                        return 'Speed increase at chain stage (drive shaft spins faster)';
                      }
                      return 'No speed change at chain stage';
                    }
                    return '';
                  })()}
                </p>
              </div>
            </div>
          )}

          {/* Gearmotor Orientation */}
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

          {/* Drive Hand */}
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

          {/* Motor Brand */}
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
      </AccordionSection>

      {/* SECTION: Advanced Parameters */}
      <AccordionSection
        id="advanced"
        title="Advanced Parameters (Optional)"
        isExpanded={isExpanded('advanced')}
        onToggle={handleToggle}
        issueCounts={sectionCounts.advanced}
        issues={getIssuesForSection('advanced')}
      >
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

        </div>
      </AccordionSection>
    </div>
  );
}
