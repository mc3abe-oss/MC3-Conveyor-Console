/**
 * Lane 3: Conveyor Design – Drive & Controls
 *
 * Drive and controls definition:
 * - Drive & Motion Configuration
 *   - Speed Definition inputs (inline): Speed Mode, Belt Speed/Drive RPM
 *   - Motor Brand selector (inline)
 *   - Speed & Kinematics calculated display
 *   - Power Snapshot calculated display
 *   - Drive Arrangement summary card (edit via modal, includes Motor RPM)
 *   - Advanced Parameters card (edit via modal)
 * - Electrical
 */

'use client';

import { useState } from 'react';
import {
  SliderbedInputs,
  SliderbedOutputs,
  GearmotorMountingStyle,
  DirectionMode,
} from '../../src/models/sliderbed_v1/schema';
import {
  calculateDriveShaftRpm,
} from '../../src/models/sliderbed_v1/formulas';
import CatalogSelect from './CatalogSelect';
import CatalogMultiSelect from './CatalogMultiSelect';
import AccordionSection, { useAccordionState } from './AccordionSection';
import { Issue, SectionCounts, SectionKey } from './useConfigureIssues';
import DriveArrangementModal from './DriveArrangementModal';
import AdvancedParametersModal from './AdvancedParametersModal';
import DriveSelectorCard from './DriveSelectorCard';

interface TabDriveControlsProps {
  inputs: SliderbedInputs;
  updateInput: (field: keyof SliderbedInputs, value: any) => void;
  sectionCounts: Record<SectionKey, SectionCounts>;
  getIssuesForSection: (sectionKey: SectionKey) => Issue[];
  outputs?: SliderbedOutputs | null;
  applicationId?: string;
}

export default function TabDriveControls({ inputs, updateInput, sectionCounts, getIssuesForSection, outputs, applicationId }: TabDriveControlsProps) {
  const { handleToggle, isExpanded } = useAccordionState();

  // Modal states
  const [isDriveArrangementModalOpen, setIsDriveArrangementModalOpen] = useState(false);
  const [isAdvancedModalOpen, setIsAdvancedModalOpen] = useState(false);

  // Calculate display values
  const pulleyDia = inputs.drive_pulley_diameter_in ?? inputs.pulley_diameter_in;
  const motorRpm = inputs.motor_rpm ?? 1750;

  // Required Drive RPM from desired belt speed
  const displayDriveRpm = inputs.belt_speed_fpm > 0 && pulleyDia > 0
    ? calculateDriveShaftRpm(inputs.belt_speed_fpm, pulleyDia)
    : 0;

  // Desired belt speed (user input)
  const displayBeltSpeed = inputs.belt_speed_fpm;

  const displayGearRatio = displayDriveRpm > 0 ? motorRpm / displayDriveRpm : 0;

  const displayChainRatio = (() => {
    if (inputs.gearmotor_mounting_style === GearmotorMountingStyle.BottomMount) {
      const gmTeeth = inputs.gm_sprocket_teeth ?? 18;
      const driveTeeth = inputs.drive_shaft_sprocket_teeth ?? 24;
      if (gmTeeth > 0 && driveTeeth > 0) {
        return driveTeeth / gmTeeth;
      }
    }
    return 1;
  })();

  const hasOutputs = outputs !== null && outputs !== undefined;
  const hasAdvancedOverrides = inputs.friction_coeff !== undefined || inputs.safety_factor !== undefined || inputs.starting_belt_pull_lb !== undefined;

  // Helper to format direction mode for display
  const formatDirection = (mode: DirectionMode | string | undefined) => {
    if (mode === DirectionMode.OneDirection) return 'One direction';
    if (mode === DirectionMode.Reversing) return 'Reversing';
    return mode || '—';
  };

  // Helper to format drive hand for display
  const formatHand = (hand: string | undefined) => {
    if (hand === 'Right Hand') return 'RH';
    if (hand === 'Left Hand') return 'LH';
    return hand || '—';
  };

  return (
    <div className="space-y-4">
      {/* Modals */}
      <DriveArrangementModal
        isOpen={isDriveArrangementModalOpen}
        onClose={() => setIsDriveArrangementModalOpen(false)}
        inputs={inputs}
        updateInput={updateInput}
      />
      <AdvancedParametersModal
        isOpen={isAdvancedModalOpen}
        onClose={() => setIsAdvancedModalOpen(false)}
        inputs={inputs}
        updateInput={updateInput}
      />

      {/* SECTION: Drive & Motion Configuration */}
      <AccordionSection
        id="speed"
        title="Drive & Motion Configuration"
        isExpanded={isExpanded('speed')}
        onToggle={handleToggle}
        issueCounts={sectionCounts.speed}
        issues={getIssuesForSection('speed')}
      >
        <div className="space-y-4">
          {/* Speed Definition Inputs - Inline */}
          <div className="grid grid-cols-1 gap-4">
            {/* Desired Belt Speed - Single workflow (v1.39) */}
            <div>
              <label htmlFor="belt_speed_fpm" className="label">
                Desired Belt Speed (FPM) <span className="text-primary-600">*</span>
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
                Enter desired belt speed. Required Drive RPM and Gear Ratio are calculated automatically.
              </p>
            </div>

            {/* Motor Brand - Now in main section */}
            <div>
              <label htmlFor="motor_brand" className="label">
                Motor Brand
              </label>
              <CatalogSelect
                catalogKey="motor_brand"
                value={inputs.motor_brand}
                onChange={(value) => updateInput('motor_brand', value)}
                id="motor_brand"
              />
            </div>
          </div>

          {/* Speed & Kinematics Panel - Read-only */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Speed & Kinematics</h4>
            {/* Row 1: Desired/Required values */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <span className="text-xs text-gray-500 block">Desired Belt Speed</span>
                <span className="font-mono font-semibold text-gray-900">
                  {hasOutputs && outputs.belt_speed_fpm
                    ? `${outputs.belt_speed_fpm.toFixed(1)} FPM`
                    : displayBeltSpeed > 0
                    ? `${displayBeltSpeed.toFixed(1)} FPM`
                    : '—'}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Required Drive RPM</span>
                <span className="font-mono font-semibold text-gray-900">
                  {hasOutputs && outputs.drive_shaft_rpm
                    ? outputs.drive_shaft_rpm.toFixed(1)
                    : displayDriveRpm > 0
                    ? displayDriveRpm.toFixed(1)
                    : '—'}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Motor RPM</span>
                <span className="font-mono font-semibold text-gray-900">
                  {hasOutputs && outputs.motor_rpm_used ? outputs.motor_rpm_used : motorRpm}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Gear Ratio</span>
                <span className="font-mono font-semibold text-gray-900">
                  {hasOutputs && outputs.gear_ratio
                    ? outputs.gear_ratio.toFixed(2)
                    : displayGearRatio > 0
                    ? displayGearRatio.toFixed(2)
                    : '—'}
                </span>
              </div>
            </div>
            {/* Row 2: Actual values (only show when gearmotor is selected) */}
            {hasOutputs && outputs.actual_belt_speed_fpm != null && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="mb-2">
                  <span className="text-xs font-medium text-gray-600">From Selected Gearmotor</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <span className="text-xs text-gray-500 block">Actual Belt Speed</span>
                    <span className="font-mono font-semibold text-gray-900">
                      {outputs.actual_belt_speed_fpm.toFixed(1)} FPM
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">Actual Drive RPM</span>
                    <span className="font-mono font-semibold text-gray-900">
                      {outputs.actual_drive_shaft_rpm?.toFixed(1) ?? '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">Difference (FPM)</span>
                    <span className="font-mono font-semibold text-gray-900">
                      {outputs.speed_difference_fpm != null
                        ? `${outputs.speed_difference_fpm > 0 ? '+' : ''}${outputs.speed_difference_fpm.toFixed(1)}`
                        : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">Difference (%)</span>
                    <span className="font-mono font-semibold text-gray-900">
                      {outputs.actual_belt_speed_delta_pct != null
                        ? `${outputs.actual_belt_speed_delta_pct > 0 ? '+' : ''}${outputs.actual_belt_speed_delta_pct.toFixed(1)}%`
                        : '—'}
                    </span>
                  </div>
                </div>
              </div>
            )}
            {/* Row 3: Chain ratio info (bottom mount only) */}
            {displayChainRatio !== 1 && (
              <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <span className="text-xs text-gray-500 block">Chain Ratio</span>
                  <span className="font-mono font-semibold text-gray-900">
                    {hasOutputs && outputs.chain_ratio ? outputs.chain_ratio.toFixed(3) : displayChainRatio.toFixed(3)}
                  </span>
                </div>
                {hasOutputs && outputs.gearmotor_output_rpm && (
                  <div>
                    <span className="text-xs text-gray-500 block">Required GM Output RPM</span>
                    <span className="font-mono font-semibold text-gray-900">{outputs.gearmotor_output_rpm.toFixed(1)}</span>
                  </div>
                )}
                {hasOutputs && outputs.total_drive_ratio && (
                  <div>
                    <span className="text-xs text-gray-500 block">Total Drive Ratio</span>
                    <span className="font-mono font-semibold text-gray-900">{outputs.total_drive_ratio.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Power Snapshot Panel - Read-only (only show if outputs available) */}
          {hasOutputs && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Power Snapshot</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <span className="text-xs text-gray-500 block">Total Belt Pull</span>
                  <span className="font-mono font-semibold text-gray-900">
                    {outputs.total_belt_pull_lb?.toFixed(1) ?? '—'} lb
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Drive Torque</span>
                  <span className="font-mono font-semibold text-gray-900">
                    {outputs.torque_drive_shaft_inlbf?.toFixed(1) ?? '—'} in-lbf
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Required GM Output RPM</span>
                  <span className="font-mono font-semibold text-gray-900">
                    {outputs.gearmotor_output_rpm?.toFixed(1) ?? outputs.drive_shaft_rpm?.toFixed(1) ?? '—'}
                  </span>
                </div>
              </div>
              {/* Show selected RPM when gearmotor is selected */}
              {inputs.actual_gearmotor_output_rpm != null && (
                <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <span className="text-xs text-gray-500 block">Selected GM Output RPM</span>
                    <span className="font-mono font-semibold text-gray-900">
                      {inputs.actual_gearmotor_output_rpm.toFixed(1)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">Friction Coeff Used</span>
                    <span className="font-mono font-semibold text-gray-900">
                      {outputs.friction_coeff_used?.toFixed(2) ?? '—'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Drive Arrangement Summary Card - Green "Configured + Edit" pattern, compact grid */}
          {/* NOTE: Moved ABOVE Drive Selector so users define mounting method first */}
          <div className="border border-green-200 bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h5 className="font-medium text-gray-900">Drive Arrangement</h5>
              <div className="flex items-center gap-2">
                <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded">Configured</span>
                <button
                  type="button"
                  onClick={() => setIsDriveArrangementModalOpen(true)}
                  className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                >
                  Edit
                </button>
              </div>
            </div>
            {/* Compact 2-row grid layout */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-x-4 gap-y-2 text-sm">
              <div>
                <span className="text-gray-500 text-xs block">Location</span>
                <span className="font-medium text-gray-900">{inputs.drive_location}</span>
              </div>
              <div>
                <span className="text-gray-500 text-xs block">Direction</span>
                <span className="font-medium text-gray-900">{formatDirection(inputs.direction_mode)}</span>
              </div>
              <div>
                <span className="text-gray-500 text-xs block">Hand</span>
                <span className="font-medium text-gray-900">{formatHand(inputs.drive_hand)}</span>
              </div>
              <div>
                <span className="text-gray-500 text-xs block">Mounting</span>
                <span className="font-medium text-gray-900">
                  {inputs.gearmotor_mounting_style === GearmotorMountingStyle.BottomMount ? 'Bottom' : 'Shaft'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 text-xs block">Orientation</span>
                <span className="font-medium text-gray-900 truncate" title={inputs.gearmotor_orientation}>
                  {inputs.gearmotor_orientation?.split(' ')[0] || '—'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 text-xs block">Motor RPM</span>
                <span className="font-medium text-gray-900">{motorRpm}</span>
              </div>
            </div>
            {inputs.start_stop_application && (
              <div className="mt-2 pt-2 border-t border-green-200">
                <span className="text-xs text-gray-500">Start/Stop:</span>
                <span className="text-sm font-medium text-gray-900 ml-1">
                  Cycle {inputs.cycle_time_seconds ?? '—'}s
                </span>
              </div>
            )}
          </div>

          {/* Drive Selector Card - Opens modal for gearmotor selection */}
          <DriveSelectorCard
            requiredOutputRpm={outputs?.gearmotor_output_rpm ?? outputs?.drive_shaft_rpm ?? null}
            requiredOutputTorqueLbIn={outputs?.torque_drive_shaft_inlbf ?? null}
            applicationId={applicationId}
            gearmotorMountingStyle={inputs.gearmotor_mounting_style}
            outputShaftOption={inputs.output_shaft_option}
            outputShaftBoreIn={inputs.output_shaft_bore_in}
            sprocketShaftDiameterIn={inputs.sprocket_shaft_diameter_in}
            plugInShaftStyle={inputs.plug_in_shaft_style}
            hollowShaftBushingBoreIn={inputs.hollow_shaft_bushing_bore_in}
            onGearmotorOutputRpmChange={(outputRpm) => {
              // v1.38: Persist actual gearmotor output RPM for actual belt speed calculation
              updateInput('actual_gearmotor_output_rpm', outputRpm);
            }}
            onSprocketShaftDiameterChange={(diameter) => {
              // v1.42: Sprocket shaft diameter for output shaft kit PN lookup (deprecated)
              updateInput('sprocket_shaft_diameter_in', diameter);
            }}
            onPlugInShaftStyleChange={(style) => {
              // v1.43: Plug-in shaft style for output shaft kit PN lookup
              updateInput('plug_in_shaft_style', style);
            }}
            onHollowShaftBushingBoreChange={(bore) => {
              // v1.44: Hollow shaft bushing bore for BOM resolution
              updateInput('hollow_shaft_bushing_bore_in', bore);
            }}
          />

          {/* Advanced Parameters Card - Always show fields + values */}
          <div className="border border-gray-200 bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h5 className="text-sm font-medium text-gray-700">
                Advanced Parameters
                {!hasAdvancedOverrides && (
                  <span className="text-xs text-gray-400 font-normal ml-2">(defaults)</span>
                )}
              </h5>
              <button
                type="button"
                onClick={() => setIsAdvancedModalOpen(true)}
                className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
              >
                Edit
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500 text-xs block">Friction Coeff</span>
                <span className={`font-medium ${inputs.friction_coeff !== undefined ? 'text-gray-900' : 'text-gray-500'}`}>
                  {inputs.friction_coeff ?? 0.25}
                </span>
              </div>
              <div>
                <span className="text-gray-500 text-xs block">Safety Factor</span>
                <span className={`font-medium ${inputs.safety_factor !== undefined ? 'text-gray-900' : 'text-gray-500'}`}>
                  {inputs.safety_factor ?? 2.0}
                </span>
              </div>
              <div>
                <span className="text-gray-500 text-xs block">Starting Pull</span>
                <span className={`font-medium ${inputs.starting_belt_pull_lb !== undefined ? 'text-gray-900' : 'text-gray-500'}`}>
                  {inputs.starting_belt_pull_lb ?? 75} lb
                </span>
              </div>
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

          {/* ===== SENSORS SUBSECTION ===== */}
          <h4 className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-2 mt-4">
            Sensors
          </h4>

          {/* Sensor Options - Now catalog-driven */}
          <div>
            <label className="label">Sensor Options</label>
            <CatalogMultiSelect
              catalogKey="sensor_option"
              value={inputs.sensor_options || []}
              onChange={(value) => updateInput('sensor_options', value)}
              id="sensor_options"
            />
            <p className="text-xs text-gray-500 mt-1">
              Select sensors to include with the conveyor.
            </p>
          </div>
        </div>
      </AccordionSection>
    </div>
  );
}
