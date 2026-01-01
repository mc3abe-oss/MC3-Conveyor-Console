/**
 * Tab 1: Application & Demand
 *
 * Defines what and how much we are handling + environmental conditions
 */

'use client';

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
} from '../../src/models/sliderbed_v1/schema';
import CatalogSelect from './CatalogSelect';
import EnvironmentFactorsSelect from './EnvironmentFactorsSelect';
import AccordionSection, { useAccordionState } from './AccordionSection';
import { Issue, SectionCounts, SectionKey } from './useConfigureIssues';

interface TabApplicationDemandProps {
  inputs: SliderbedInputs;
  updateInput: (field: keyof SliderbedInputs, value: any) => void;
  sectionCounts: Record<SectionKey, SectionCounts>;
  /** v1.28: Get issues for a specific section (for banner display) */
  getIssuesForSection: (sectionKey: SectionKey) => Issue[];
}

export default function TabApplicationDemand({ inputs, updateInput, sectionCounts, getIssuesForSection }: TabApplicationDemandProps) {
  const { handleToggle, isExpanded } = useAccordionState();

  // Determine material form mode
  const materialForm = (inputs.material_form as MaterialForm | string) ?? MaterialForm.Parts;
  const isBulkMode = materialForm === MaterialForm.Bulk || materialForm === 'BULK';
  const bulkInputMethod = (inputs.bulk_input_method as BulkInputMethod | string) ?? BulkInputMethod.WeightFlow;
  const isVolumeFlow = bulkInputMethod === BulkInputMethod.VolumeFlow || bulkInputMethod === 'VOLUME_FLOW';

  return (
    <div className="space-y-4">
      {/* Section A: Product Definition */}
      <AccordionSection
        id="product"
        title="Product Definition"
        isExpanded={isExpanded('product')}
        onToggle={handleToggle}
        issueCounts={sectionCounts.product}
        issues={getIssuesForSection('product')}
      >
        <div className="grid grid-cols-1 gap-4">
          {/* 0. Material Form (PARTS vs BULK) */}
          <div>
            <label className="label">Material Form</label>
            <div className="flex gap-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="material_form"
                  checked={!isBulkMode}
                  onChange={() => updateInput('material_form', MaterialForm.Parts)}
                  className="mr-2"
                />
                Discrete Parts
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="material_form"
                  checked={isBulkMode}
                  onChange={() => updateInput('material_form', MaterialForm.Bulk)}
                  className="mr-2"
                />
                Bulk Material
              </label>
            </div>
          </div>

          {/* 1. Process Type */}
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

          {/* 2. Material Type */}
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

          {/* PARTS-only fields */}
          {!isBulkMode && (
            <>
              {/* 3. Part Length (in) */}
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

              {/* 4. Part Width (in) */}
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

              {/* 5. Part Weight (lbs) */}
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

              {/* 6. Orientation */}
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
            </>
          )}

          {/* BULK-only fields */}
          {isBulkMode && (
            <>
              {/* Bulk Input Method */}
              <div>
                <label className="label">Input Method</label>
                <div className="flex gap-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="bulk_input_method"
                      checked={!isVolumeFlow}
                      onChange={() => updateInput('bulk_input_method', BulkInputMethod.WeightFlow)}
                      className="mr-2"
                    />
                    Weight Flow (lbs/hr)
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="bulk_input_method"
                      checked={isVolumeFlow}
                      onChange={() => updateInput('bulk_input_method', BulkInputMethod.VolumeFlow)}
                      className="mr-2"
                    />
                    Volume Flow (ft³/hr)
                  </label>
                </div>
              </div>

              {/* Mass Flow (Weight Flow mode) */}
              {!isVolumeFlow && (
                <div>
                  <label htmlFor="mass_flow_lbs_per_hr" className="label">
                    Mass Flow Rate (lbs/hr)
                  </label>
                  <input
                    type="number"
                    id="mass_flow_lbs_per_hr"
                    className="input"
                    value={inputs.mass_flow_lbs_per_hr ?? ''}
                    onChange={(e) => updateInput('mass_flow_lbs_per_hr', e.target.value ? parseFloat(e.target.value) : undefined)}
                    step="1"
                    min="0"
                    required
                  />
                </div>
              )}

              {/* Volume Flow (Volume Flow mode) */}
              {isVolumeFlow && (
                <>
                  <div>
                    <label htmlFor="volume_flow_ft3_per_hr" className="label">
                      Volume Flow Rate (ft³/hr)
                    </label>
                    <input
                      type="number"
                      id="volume_flow_ft3_per_hr"
                      className="input"
                      value={inputs.volume_flow_ft3_per_hr ?? ''}
                      onChange={(e) => updateInput('volume_flow_ft3_per_hr', e.target.value ? parseFloat(e.target.value) : undefined)}
                      step="0.1"
                      min="0"
                      required
                    />
                  </div>

                  {/* Density Source */}
                  <div>
                    <label className="label">Density Source</label>
                    <div className="flex gap-4">
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          name="density_source"
                          checked={(inputs.density_source ?? DensitySource.Known) === DensitySource.Known || inputs.density_source === 'KNOWN'}
                          onChange={() => updateInput('density_source', DensitySource.Known)}
                          className="mr-2"
                        />
                        Known Value
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          name="density_source"
                          checked={inputs.density_source === DensitySource.AssumedClass || inputs.density_source === 'ASSUMED_CLASS'}
                          onChange={() => updateInput('density_source', DensitySource.AssumedClass)}
                          className="mr-2"
                        />
                        Assumed (by class)
                      </label>
                    </div>
                  </div>

                  {/* Density Value (Known) */}
                  {(inputs.density_source === DensitySource.Known || inputs.density_source === 'KNOWN' || !inputs.density_source) && (
                    <div>
                      <label htmlFor="density_lbs_per_ft3" className="label">
                        Bulk Density (lbs/ft³)
                      </label>
                      <input
                        type="number"
                        id="density_lbs_per_ft3"
                        className="input"
                        value={inputs.density_lbs_per_ft3 ?? ''}
                        onChange={(e) => updateInput('density_lbs_per_ft3', e.target.value ? parseFloat(e.target.value) : undefined)}
                        step="0.1"
                        min="0"
                        required
                      />
                    </div>
                  )}
                </>
              )}

              {/* Max Lump Size (optional) */}
              <div>
                <label htmlFor="max_lump_size_in" className="label">
                  Max Lump Size (in) <span className="text-gray-500">(optional)</span>
                </label>
                <input
                  type="number"
                  id="max_lump_size_in"
                  className="input"
                  value={inputs.max_lump_size_in ?? ''}
                  onChange={(e) => updateInput('max_lump_size_in', e.target.value ? parseFloat(e.target.value) : undefined)}
                  step="0.5"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Largest particle dimension for belt width validation.
                </p>
              </div>
            </>
          )}

          {/* 7. Parts Sharp (Yes / No) - PARTS only */}
          {!isBulkMode && (
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
          )}

          {/* 8. Part Temperature */}
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

          {/* 9. Drop Height (in) */}
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

          {/* 10. Side Loading */}
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
      </AccordionSection>

      {/* Section B: Throughput Requirements - PARTS only */}
      {!isBulkMode && (
        <AccordionSection
          id="throughput"
          title="Throughput Requirements"
          isExpanded={isExpanded('throughput')}
          onToggle={handleToggle}
          issueCounts={sectionCounts.throughput}
          issues={getIssuesForSection('throughput')}
        >
          <div className="grid grid-cols-1 gap-4">
            {/* 11. Part Spacing (in) */}
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

            {/* 12. Required Throughput (parts/hour) */}
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

            {/* 13. Throughput Margin (%) */}
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
        </AccordionSection>
      )}

      {/* Section C: Environmental Factors */}
      <AccordionSection
        id="environment"
        title="Environmental Factors"
        isExpanded={isExpanded('environment')}
        onToggle={handleToggle}
        issueCounts={sectionCounts.environment}
        issues={getIssuesForSection('environment')}
      >
        <div className="grid grid-cols-1 gap-4">
          {/* 14. Environment Factors (v1.9 - Multi-select dropdown) */}
          <div>
            <label htmlFor="environment_factors" className="label">
              Environment Factors
            </label>
            <EnvironmentFactorsSelect
              value={inputs.environment_factors}
              onChange={(value) => updateInput('environment_factors', value)}
              id="environment_factors"
            />
          </div>

          {/* 15. Fluid Type */}
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

          {/* 16. Ambient Temperature */}
          <div>
            <label htmlFor="ambient_temperature_class" className="label">
              Ambient Temperature
            </label>
            <select
              id="ambient_temperature_class"
              className="input"
              value={inputs.ambient_temperature_class ?? AmbientTemperatureClass.Normal}
              onChange={(e) => updateInput('ambient_temperature_class', e.target.value)}
              required
            >
              {Object.values(AmbientTemperatureClass).map((value) => (
                <option key={value} value={value}>
                  {AMBIENT_TEMPERATURE_CLASS_LABELS[value]}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Select the typical operating temperature range around the conveyor.
            </p>
          </div>
        </div>
      </AccordionSection>
    </div>
  );
}
