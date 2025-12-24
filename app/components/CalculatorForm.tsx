'use client';

import { useState, useEffect, useRef } from 'react';
import { runCalculation } from '../../src/lib/calculator';
import {
  SliderbedInputs,
  Orientation,
  CalculationResult,
  SideRails,
  EndGuards,
  LacingStyle,
  PulleySurfaceType,
  DirectionMode,
  SideLoadingDirection,
  DriveLocation,
  GearmotorOrientation,
  DriveHand,
  BeltTrackingMethod,
  ShaftDiameterMode,
  GearmotorMountingStyle,
  AmbientTemperatureClass,
} from '../../src/models/sliderbed_v1/schema';
import { BedType } from '../../src/models/belt_conveyor_v1/schema';
import TabApplicationDemand from './TabApplicationDemand';
import TabConveyorPhysical from './TabConveyorPhysical';
import TabDriveControls from './TabDriveControls';
import TabBuildOptions from './TabBuildOptions';
import { useConfigureIssues, ConfigureTabKey } from './useConfigureIssues';
import StatusLight from './StatusLight';

/**
 * Configure sub-tab type (alias to ConfigureTabKey for local use)
 */
type ConfigureTab = ConfigureTabKey;

/**
 * Tab configuration for the Configure sub-tabs
 */
const CONFIGURE_TABS: { id: ConfigureTab; label: string }[] = [
  { id: 'application', label: 'Application' },
  { id: 'physical', label: 'Physical' },
  { id: 'drive', label: 'Drive & Controls' },
  { id: 'build', label: 'Build Options' },
];

interface Props {
  onCalculate: (result: CalculationResult) => void;
  isCalculating: boolean;
  initialInputs?: SliderbedInputs | null;
  onInputsChange?: (inputs: SliderbedInputs) => void;
  loadedRevisionId?: string; // Key to track when to reload inputs
  triggerCalculate?: number; // Counter to trigger calculation from parent
  hideCalculateButton?: boolean; // Hide the form's Calculate button if calculation is triggered externally
}

export default function CalculatorForm({
  onCalculate,
  isCalculating,
  initialInputs,
  onInputsChange,
  loadedRevisionId,
  triggerCalculate,
  hideCalculateButton = false,
}: Props) {
  // Active sub-tab state
  const [activeTab, setActiveTab] = useState<ConfigureTab>('application');

  const [inputs, setInputs] = useState<SliderbedInputs>({
    // Bed type - determines friction coefficient preset
    bed_type: BedType.SliderBed,
    conveyor_length_cc_in: 120,
    conveyor_width_in: 24,
    pulley_diameter_in: 4,
    belt_speed_fpm: 104.72, // Calculated from drive_rpm=100 * (PI * 4/12) ≈ 104.72
    drive_rpm: 100,
    part_weight_lbs: 5,
    part_length_in: 12,
    part_width_in: 6,
    drop_height_in: 0,
    part_temperature_class: 'AMBIENT',
    fluid_type: 'NONE',
    orientation: Orientation.Lengthwise,
    part_spacing_in: 6,
    // Application fields - using catalog item_keys from database
    material_type: 'PARTS', // Catalog: CHIPS, PARTS, SCRAP
    process_type: 'MOLDING', // Catalog: MOLDING, WELDING, STAMPING, LASER_CUT, FOOD_PROC, PACKAGING
    parts_sharp: 'No', // Boolean checkbox
    environment_factors: ['Indoor'], // v1.9: Multi-select array, Catalog: Indoor, Outdoor, Washdown, Dusty, Other
    ambient_temperature: 'Normal (60-90°F)', // Deprecated - kept for backward compatibility
    ambient_temperature_class: AmbientTemperatureClass.Normal, // New classification-based dropdown
    power_feed: 'AC_480_3_60', // Catalog: AC_480_3_60, AC_230_3_60, AC_120_1_60, DC_24
    controls_package: 'NOT_SUPPLIED', // Catalog: NOT_SUPPLIED, VFD_ESTOP, VFD_ESTOP_DIR, CUSTOM
    spec_source: 'MC3_STD', // Catalog: MC3_STD, CUSTOMER_SPEC
    support_option: 'FLOOR_MOUNTED', // Catalog (to be seeded)
    field_wiring_required: 'No', // Boolean checkbox
    bearing_grade: 'STANDARD', // Catalog (to be seeded)
    documentation_package: 'BASIC', // Catalog (to be seeded)
    finish_paint_system: 'POWDER_COAT', // Catalog (to be seeded)
    labels_required: 'Yes', // Boolean checkbox
    send_to_estimating: 'No', // Boolean checkbox
    motor_brand: 'STANDARD', // Catalog (to be seeded)

    // Features & Options
    bottom_covers: false,
    side_rails: SideRails.None,
    end_guards: EndGuards.None,
    finger_safe: false,
    lacing_style: LacingStyle.Endless,
    side_skirts: false,
    sensor_options: [],

    // Application / Demand (extended)
    pulley_surface_type: PulleySurfaceType.Plain,
    start_stop_application: false,
    direction_mode: DirectionMode.OneDirection,
    side_loading_direction: SideLoadingDirection.None,

    // Specifications
    drive_location: DriveLocation.Head,
    brake_motor: false,
    gearmotor_orientation: GearmotorOrientation.SideMount,
    drive_hand: DriveHand.RightHand,

    // Gearmotor mounting style & sprockets (v1.7)
    gearmotor_mounting_style: GearmotorMountingStyle.ShaftMounted,
    gm_sprocket_teeth: 18,
    drive_shaft_sprocket_teeth: 24,

    // Belt tracking & pulley
    belt_tracking_method: BeltTrackingMethod.Crowned,
    shaft_diameter_mode: ShaftDiameterMode.Calculated,
  });

  // Track the last loaded revision ID to prevent infinite loops
  const lastLoadedRevisionIdRef = useRef<string | null>(null);

  // Load inputs from initialInputs ONLY when loadedRevisionId changes
  // This prevents infinite loops caused by object identity changes
  useEffect(() => {
    if (initialInputs && loadedRevisionId && loadedRevisionId !== lastLoadedRevisionIdRef.current) {
      lastLoadedRevisionIdRef.current = loadedRevisionId;
      setInputs(initialInputs);
    }
  }, [loadedRevisionId, initialInputs]);

  // Notify parent of input changes ONCE when inputs change
  // Use a ref to track if we've already notified for this exact input state
  const lastNotifiedInputsRef = useRef<string | null>(null);
  useEffect(() => {
    if (onInputsChange) {
      const serialized = JSON.stringify(inputs);
      if (serialized !== lastNotifiedInputsRef.current) {
        lastNotifiedInputsRef.current = serialized;
        onInputsChange(inputs);
      }
    }
  }, [inputs, onInputsChange]);

  // Trigger calculation when triggerCalculate counter changes
  const lastTriggerRef = useRef<number>(0);
  useEffect(() => {
    if (triggerCalculate !== undefined && triggerCalculate > 0 && triggerCalculate !== lastTriggerRef.current) {
      lastTriggerRef.current = triggerCalculate;
      const result = runCalculation({ inputs });
      onCalculate(result);
    }
  }, [triggerCalculate, inputs, onCalculate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = runCalculation({ inputs });
    onCalculate(result);
  };

  const updateInput = (field: keyof SliderbedInputs, value: any) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
  };

  // Compute validation issues
  const { sectionCounts, tabCounts } = useConfigureIssues(inputs);

  // Handle Enter key press to trigger recalculation
  const handleKeyPress = (e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (e.key === 'Enter' && target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      const result = runCalculation({ inputs });
      onCalculate(result);
    }
  };

  return (
    <form onSubmit={handleSubmit} onKeyPress={handleKeyPress} className="space-y-6">
      {/* Configure Sub-Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Sub-tab navigation */}
        <div className="border-b border-gray-200 bg-gray-50">
          <nav className="flex -mb-px" aria-label="Configure tabs">
            {CONFIGURE_TABS.map((tab) => {
              const counts = tabCounts[tab.id];

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex-1 py-3 px-4 text-center font-medium text-sm transition-colors
                    border-b-2 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500
                    ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600 bg-white'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-100'
                    }
                  `}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    {tab.label}
                    <StatusLight
                      errorCount={counts.errors}
                      warningCount={counts.warnings}
                      size="sm"
                    />
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab content */}
        <div className="p-6">
          {/* Application Tab */}
          {activeTab === 'application' && (
            <TabApplicationDemand inputs={inputs} updateInput={updateInput} sectionCounts={sectionCounts} />
          )}

          {/* Physical Tab */}
          {activeTab === 'physical' && (
            <TabConveyorPhysical inputs={inputs} updateInput={updateInput} sectionCounts={sectionCounts} />
          )}

          {/* Drive & Controls Tab */}
          {activeTab === 'drive' && (
            <TabDriveControls inputs={inputs} updateInput={updateInput} sectionCounts={sectionCounts} />
          )}

          {/* Build Options Tab */}
          {activeTab === 'build' && (
            <TabBuildOptions inputs={inputs} updateInput={updateInput} sectionCounts={sectionCounts} />
          )}
        </div>
      </div>

      {/* Calculate Button - hidden if triggered externally */}
      {!hideCalculateButton && (
        <div className="pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={isCalculating}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isCalculating ? 'Calculating...' : 'Calculate'}
          </button>
        </div>
      )}
    </form>
  );
}
