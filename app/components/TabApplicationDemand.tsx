/**
 * Tab 1: Material to Be Conveyed (v1.32)
 *
 * Consolidated single-section layout for material definition:
 * - Material form (Discrete Parts vs Bulk) - visually dominant
 * - Physical characteristics (mode-specific)
 * - Throughput/rate requirements (mode-specific)
 * - Presentation to belt
 * - Notes
 * - Operating Environment (collapsible advanced section)
 *
 * v1.32: UI Polish + Bulk feed behavior
 * - Softer headers (title case, lighter weight)
 * - Dominant material form toggle at top
 * - Always-visible density for bulk
 * - Feed behavior with surge fields
 */

'use client';

import { useState } from 'react';
import {
  SliderbedInputs,
  Orientation,
  SideLoadingDirection,
  SideLoadingSeverity,
  AmbientTemperatureClass,
  AMBIENT_TEMPERATURE_CLASS_LABELS,
  MaterialForm,
  BulkInputMethod,
  DensitySource,
  FeedBehavior,
  FEED_BEHAVIOR_LABELS,
} from '../../src/models/sliderbed_v1/schema';
import CatalogSelect from './CatalogSelect';
import EnvironmentFactorsSelect from './EnvironmentFactorsSelect';
import AccordionSection, { useAccordionState } from './AccordionSection';
import { Issue, SectionCounts, SectionKey } from './useConfigureIssues';

interface TabApplicationDemandProps {
  inputs: SliderbedInputs;
  updateInput: (field: keyof SliderbedInputs, value: any) => void;
  sectionCounts: Record<SectionKey, SectionCounts>;
  getIssuesForSection: (sectionKey: SectionKey) => Issue[];
}

export default function TabApplicationDemand({ inputs, updateInput, sectionCounts, getIssuesForSection }: TabApplicationDemandProps) {
  const { handleToggle, isExpanded } = useAccordionState();
  const [showEnvironment, setShowEnvironment] = useState(false);

  // Determine material form mode
  const materialForm = (inputs.material_form as MaterialForm | string) ?? MaterialForm.Parts;
  const isBulkMode = materialForm === MaterialForm.Bulk || materialForm === 'BULK';
  const bulkInputMethod = (inputs.bulk_input_method as BulkInputMethod | string) ?? BulkInputMethod.WeightFlow;
  const isVolumeFlow = bulkInputMethod === BulkInputMethod.VolumeFlow || bulkInputMethod === 'VOLUME_FLOW';
  const feedBehavior = (inputs.feed_behavior as FeedBehavior | string) ?? FeedBehavior.Continuous;
  const isSurge = feedBehavior === FeedBehavior.Surge || feedBehavior === 'SURGE';

  // Combine issue counts from all legacy sections
  const combinedIssueCounts: SectionCounts = {
    errors: (sectionCounts.product?.errors ?? 0) + (sectionCounts.throughput?.errors ?? 0) + (sectionCounts.environment?.errors ?? 0),
    warnings: (sectionCounts.product?.warnings ?? 0) + (sectionCounts.throughput?.warnings ?? 0) + (sectionCounts.environment?.warnings ?? 0),
  };

  const combinedIssues = [
    ...getIssuesForSection('product'),
    ...getIssuesForSection('throughput'),
    ...getIssuesForSection('environment'),
  ];

  return (
    <div className="space-y-4">
      <AccordionSection
        id="product"
        title="Material to Be Conveyed"
        isExpanded={isExpanded('product')}
        onToggle={handleToggle}
        issueCounts={combinedIssueCounts}
        issues={combinedIssues}
      >
        <div className="space-y-5">
          {/* ================================================================
              DOMINANT: Material Form Toggle
              ================================================================ */}
          <div className="flex items-center gap-6 pb-4 border-b border-gray-100">
            <span className="text-sm font-medium text-gray-700">Material Form</span>
            <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
              <button
                type="button"
                onClick={() => updateInput('material_form', MaterialForm.Parts)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  !isBulkMode
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Discrete Parts
              </button>
              <button
                type="button"
                onClick={() => {
                  updateInput('material_form', MaterialForm.Bulk);
                  if (!inputs.bulk_input_method) {
                    updateInput('bulk_input_method', BulkInputMethod.WeightFlow);
                  }
                }}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  isBulkMode
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Bulk Material
              </button>
            </div>
          </div>

          {/* ================================================================
              Material Context
              ================================================================ */}
          <div>
            <p className="text-xs font-medium text-gray-400 mb-2">Material Context</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label htmlFor="process_type" className="label">Process Type</label>
                <CatalogSelect
                  catalogKey="process_type"
                  value={inputs.process_type}
                  onChange={(value) => updateInput('process_type', value)}
                  id="process_type"
                  required
                />
              </div>
              <div>
                <label htmlFor="material_type" className="label">Material Type</label>
                <CatalogSelect
                  catalogKey="material_type"
                  value={inputs.material_type}
                  onChange={(value) => updateInput('material_type', value)}
                  id="material_type"
                  required
                />
              </div>
              <div>
                <label htmlFor="part_temperature_class" className="label">Part Temperature</label>
                <CatalogSelect
                  catalogKey="part_temperature_class"
                  value={inputs.part_temperature_class}
                  onChange={(value) => updateInput('part_temperature_class', value)}
                  id="part_temperature_class"
                  required
                />
              </div>
              {/* Empty slot maintains grid rhythm */}
              <div className="hidden md:block" />
            </div>
          </div>

          {/* ================================================================
              Physical Characteristics (mode-specific)
              ================================================================ */}
          <div>
            <p className="text-xs font-medium text-gray-400 mb-2">
              {isBulkMode ? 'Flow & Material Properties' : 'Part Dimensions'}
            </p>

            {/* PARTS Mode */}
            {!isBulkMode && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label htmlFor="part_length_in" className="label">Length (in)</label>
                  <input
                    type="number"
                    id="part_length_in"
                    className="input"
                    value={inputs.part_length_in}
                    onChange={(e) => updateInput('part_length_in', parseFloat(e.target.value) || 0)}
                    step="0.1"
                    min="0"
                  />
                </div>
                <div>
                  <label htmlFor="part_width_in" className="label">Width (in)</label>
                  <input
                    type="number"
                    id="part_width_in"
                    className="input"
                    value={inputs.part_width_in}
                    onChange={(e) => updateInput('part_width_in', parseFloat(e.target.value) || 0)}
                    step="0.1"
                    min="0"
                  />
                </div>
                <div>
                  <label htmlFor="part_weight_lbs" className="label">Weight (lbs)</label>
                  <input
                    type="number"
                    id="part_weight_lbs"
                    className="input"
                    value={inputs.part_weight_lbs}
                    onChange={(e) => updateInput('part_weight_lbs', parseFloat(e.target.value) || 0)}
                    step="0.1"
                    min="0"
                  />
                </div>
                <div>
                  <label htmlFor="orientation" className="label">Orientation</label>
                  <select
                    id="orientation"
                    className="input"
                    value={inputs.orientation}
                    onChange={(e) => updateInput('orientation', e.target.value as Orientation)}
                  >
                    <option value={Orientation.Lengthwise}>Lengthwise</option>
                    <option value={Orientation.Crosswise}>Crosswise</option>
                  </select>
                </div>
              </div>
            )}

            {/* BULK Mode */}
            {isBulkMode && (
              <div className="space-y-4">
                {/* Row 1: Input method, flow rate, density */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="label">Flow Input</label>
                    <div className="flex gap-3 mt-1.5">
                      <label className="inline-flex items-center text-sm">
                        <input
                          type="radio"
                          name="bulk_input_method"
                          checked={!isVolumeFlow}
                          onChange={() => updateInput('bulk_input_method', BulkInputMethod.WeightFlow)}
                          className="mr-1.5"
                        />
                        Weight
                      </label>
                      <label className="inline-flex items-center text-sm">
                        <input
                          type="radio"
                          name="bulk_input_method"
                          checked={isVolumeFlow}
                          onChange={() => updateInput('bulk_input_method', BulkInputMethod.VolumeFlow)}
                          className="mr-1.5"
                        />
                        Volume
                      </label>
                    </div>
                  </div>

                  {/* Flow rate - changes based on input method */}
                  {!isVolumeFlow ? (
                    <div>
                      <label htmlFor="mass_flow_lbs_per_hr" className="label">Mass Flow (lbs/hr)</label>
                      <input
                        type="number"
                        id="mass_flow_lbs_per_hr"
                        className="input"
                        value={inputs.mass_flow_lbs_per_hr ?? ''}
                        onChange={(e) => updateInput('mass_flow_lbs_per_hr', e.target.value ? parseFloat(e.target.value) : undefined)}
                        step="1"
                        min="0"
                      />
                    </div>
                  ) : (
                    <div>
                      <label htmlFor="volume_flow_ft3_per_hr" className="label">Volume Flow (ft³/hr)</label>
                      <input
                        type="number"
                        id="volume_flow_ft3_per_hr"
                        className="input"
                        value={inputs.volume_flow_ft3_per_hr ?? ''}
                        onChange={(e) => updateInput('volume_flow_ft3_per_hr', e.target.value ? parseFloat(e.target.value) : undefined)}
                        step="0.1"
                        min="0"
                      />
                    </div>
                  )}

                  {/* Density - ALWAYS visible for bulk (required for volume, optional for weight) */}
                  <div>
                    <label htmlFor="density_lbs_per_ft3" className="label">
                      Bulk Density (lbs/ft³)
                      {!isVolumeFlow && <span className="text-gray-400 font-normal ml-1">(opt)</span>}
                    </label>
                    <input
                      type="number"
                      id="density_lbs_per_ft3"
                      className="input"
                      value={inputs.density_lbs_per_ft3 ?? ''}
                      onChange={(e) => updateInput('density_lbs_per_ft3', e.target.value ? parseFloat(e.target.value) : undefined)}
                      step="0.1"
                      min="0"
                    />
                  </div>

                  {/* Density source - only for volume flow */}
                  {isVolumeFlow && (
                    <div>
                      <label className="label">Density Source</label>
                      <div className="flex gap-3 mt-1.5">
                        <label className="inline-flex items-center text-sm">
                          <input
                            type="radio"
                            name="density_source"
                            checked={(inputs.density_source ?? DensitySource.Known) === DensitySource.Known || inputs.density_source === 'KNOWN'}
                            onChange={() => updateInput('density_source', DensitySource.Known)}
                            className="mr-1.5"
                          />
                          Known
                        </label>
                        <label className="inline-flex items-center text-sm">
                          <input
                            type="radio"
                            name="density_source"
                            checked={inputs.density_source === DensitySource.AssumedClass || inputs.density_source === 'ASSUMED_CLASS'}
                            onChange={() => updateInput('density_source', DensitySource.AssumedClass)}
                            className="mr-1.5"
                          />
                          Assumed
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* Row 2: Lump sizes + feed behavior */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label htmlFor="smallest_lump_size_in" className="label">
                      Smallest Lump (in) <span className="text-gray-400 font-normal">(opt)</span>
                    </label>
                    <input
                      type="number"
                      id="smallest_lump_size_in"
                      className="input"
                      value={inputs.smallest_lump_size_in ?? ''}
                      onChange={(e) => updateInput('smallest_lump_size_in', e.target.value ? parseFloat(e.target.value) : undefined)}
                      step="0.5"
                      min="0"
                    />
                  </div>
                  <div>
                    <label htmlFor="largest_lump_size_in" className="label">
                      Largest Lump (in) <span className="text-gray-400 font-normal">(opt)</span>
                    </label>
                    <input
                      type="number"
                      id="largest_lump_size_in"
                      className="input"
                      value={inputs.largest_lump_size_in ?? inputs.max_lump_size_in ?? ''}
                      onChange={(e) => updateInput('largest_lump_size_in', e.target.value ? parseFloat(e.target.value) : undefined)}
                      step="0.5"
                      min="0"
                    />
                  </div>
                  <div>
                    <label htmlFor="feed_behavior" className="label">Feed Behavior</label>
                    <select
                      id="feed_behavior"
                      className="input"
                      value={feedBehavior}
                      onChange={(e) => updateInput('feed_behavior', e.target.value as FeedBehavior)}
                    >
                      {Object.values(FeedBehavior).map((fb) => (
                        <option key={fb} value={fb}>{FEED_BEHAVIOR_LABELS[fb]}</option>
                      ))}
                    </select>
                  </div>
                  {/* Surge multiplier - inline when surge selected */}
                  {isSurge ? (
                    <div>
                      <label htmlFor="surge_multiplier" className="label">
                        Surge Multiplier
                      </label>
                      <input
                        type="number"
                        id="surge_multiplier"
                        className="input"
                        value={inputs.surge_multiplier ?? 1.5}
                        onChange={(e) => updateInput('surge_multiplier', e.target.value ? parseFloat(e.target.value) : undefined)}
                        step="0.1"
                        min="1"
                        placeholder="1.5"
                      />
                      <p className="text-xs text-gray-400 mt-0.5">peak ÷ avg</p>
                    </div>
                  ) : (
                    <div className="hidden md:block" />
                  )}
                </div>

                {/* Surge duration - only when surge selected */}
                {isSurge && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label htmlFor="surge_duration_sec" className="label">
                        Surge Duration (sec) <span className="text-gray-400 font-normal">(opt)</span>
                      </label>
                      <input
                        type="number"
                        id="surge_duration_sec"
                        className="input"
                        value={inputs.surge_duration_sec ?? ''}
                        onChange={(e) => updateInput('surge_duration_sec', e.target.value ? parseFloat(e.target.value) : undefined)}
                        step="1"
                        min="0"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ================================================================
              Throughput (PARTS only)
              ================================================================ */}
          {!isBulkMode && (
            <div>
              <p className="text-xs font-medium text-gray-400 mb-2">Throughput</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label htmlFor="part_spacing_in" className="label">Part Spacing (in)</label>
                  <input
                    type="number"
                    id="part_spacing_in"
                    className="input"
                    value={inputs.part_spacing_in}
                    onChange={(e) => updateInput('part_spacing_in', parseFloat(e.target.value) || 0)}
                    step="0.1"
                    min="0"
                  />
                  <p className="text-xs text-gray-400 mt-0.5">center-to-center</p>
                </div>
                <div>
                  <label htmlFor="required_throughput_pph" className="label">
                    Required (pph) <span className="text-gray-400 font-normal">(opt)</span>
                  </label>
                  <input
                    type="number"
                    id="required_throughput_pph"
                    className="input"
                    value={inputs.required_throughput_pph || ''}
                    onChange={(e) => updateInput('required_throughput_pph', e.target.value ? parseFloat(e.target.value) : undefined)}
                    step="1"
                    min="0"
                  />
                </div>
                <div>
                  <label htmlFor="throughput_margin_pct" className="label">
                    Margin (%) <span className="text-gray-400 font-normal">(opt)</span>
                  </label>
                  <input
                    type="number"
                    id="throughput_margin_pct"
                    className="input"
                    value={inputs.throughput_margin_pct || ''}
                    onChange={(e) => updateInput('throughput_margin_pct', e.target.value ? parseFloat(e.target.value) : undefined)}
                    step="1"
                    min="0"
                  />
                </div>
                <div>
                  <label className="label">Parts Sharp</label>
                  <div className="flex gap-4 mt-1.5">
                    <label className="inline-flex items-center text-sm">
                      <input
                        type="radio"
                        name="parts_sharp"
                        checked={inputs.parts_sharp === 'No'}
                        onChange={() => updateInput('parts_sharp', 'No')}
                        className="mr-1.5"
                      />
                      No
                    </label>
                    <label className="inline-flex items-center text-sm">
                      <input
                        type="radio"
                        name="parts_sharp"
                        checked={inputs.parts_sharp === 'Yes'}
                        onChange={() => updateInput('parts_sharp', 'Yes')}
                        className="mr-1.5"
                      />
                      Yes
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
              Presentation to Belt
              ================================================================ */}
          <div>
            <p className="text-xs font-medium text-gray-400 mb-2">Presentation to Belt</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label htmlFor="drop_height_in" className="label">Drop Height (in)</label>
                <input
                  type="number"
                  id="drop_height_in"
                  className="input"
                  value={inputs.drop_height_in}
                  onChange={(e) => updateInput('drop_height_in', parseFloat(e.target.value) || 0)}
                  step="0.1"
                  min="0"
                />
              </div>
              <div>
                <label htmlFor="side_loading_direction" className="label">Side Loading</label>
                <select
                  id="side_loading_direction"
                  className="input"
                  value={inputs.side_loading_direction}
                  onChange={(e) => updateInput('side_loading_direction', e.target.value)}
                >
                  {Object.values(SideLoadingDirection).map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              {inputs.side_loading_direction !== SideLoadingDirection.None && (
                <div>
                  <label className="label">Severity</label>
                  <div className="flex gap-3 mt-1.5">
                    {Object.values(SideLoadingSeverity).map((option) => (
                      <label key={option} className="inline-flex items-center text-sm">
                        <input
                          type="radio"
                          name="side_loading_severity"
                          checked={inputs.side_loading_severity === option}
                          onChange={() => updateInput('side_loading_severity', option)}
                          className="mr-1.5"
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ================================================================
              Notes (secondary, but intentional)
              ================================================================ */}
          <div className="pt-2">
            <p className="text-xs font-medium text-gray-400 mb-2">Notes</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="application_notes" className="label">
                  Application <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  id="application_notes"
                  className="input min-h-[72px] text-sm"
                  value={inputs.application_notes ?? ''}
                  onChange={(e) => updateInput('application_notes', e.target.value || undefined)}
                  placeholder="General context and application info..."
                  rows={2}
                />
              </div>
              <div>
                <label htmlFor="material_notes" className="label">
                  Material <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  id="material_notes"
                  className="input min-h-[72px] text-sm"
                  value={inputs.material_notes ?? ''}
                  onChange={(e) => updateInput('material_notes', e.target.value || undefined)}
                  placeholder="Part/material-specific behavior..."
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* ================================================================
              Operating Environment (collapsible)
              ================================================================ */}
          <div className="border-t border-gray-100 pt-3">
            <button
              type="button"
              onClick={() => setShowEnvironment(!showEnvironment)}
              className="flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-700"
            >
              <svg
                className={`w-3.5 h-3.5 transition-transform ${showEnvironment ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Operating Environment
              <span className="text-gray-400 font-normal">(advanced)</span>
            </button>

            {showEnvironment && (
              <div className="mt-3 pl-5 border-l border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="environment_factors" className="label">Environment Factors</label>
                    <EnvironmentFactorsSelect
                      value={inputs.environment_factors}
                      onChange={(value) => updateInput('environment_factors', value)}
                      id="environment_factors"
                    />
                  </div>
                  <div>
                    <label htmlFor="fluid_type" className="label">Fluid Type</label>
                    <CatalogSelect
                      catalogKey="fluid_type"
                      value={inputs.fluid_type}
                      onChange={(value) => updateInput('fluid_type', value)}
                      id="fluid_type"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="ambient_temperature_class" className="label">Ambient Temperature</label>
                    <select
                      id="ambient_temperature_class"
                      className="input"
                      value={inputs.ambient_temperature_class ?? AmbientTemperatureClass.Normal}
                      onChange={(e) => updateInput('ambient_temperature_class', e.target.value)}
                    >
                      {Object.values(AmbientTemperatureClass).map((value) => (
                        <option key={value} value={value}>
                          {AMBIENT_TEMPERATURE_CLASS_LABELS[value]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </AccordionSection>
    </div>
  );
}
