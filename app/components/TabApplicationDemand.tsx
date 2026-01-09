/**
 * Tab 1: Application (v1.36)
 *
 * Two peer sections:
 * 1) Material to Be Conveyed - material context, form, presentation, fluids, material notes
 * 2) Operating Environment - environment factors, ambient temp, application notes
 *
 * v1.36: One-Pass Cleanup
 * - Part Temperature: numeric input + °F/°C toggle (replaces dropdown)
 * - Bulk Material: either/or flow input with derived field + min/max lump sizes
 * - Fluids: conditional pattern (fluids present? -> type + amount)
 * - Fluid Type removed from Operating Environment
 */

'use client';

import {
  SliderbedInputs,
  SideLoadingDirection,
  SideLoadingSeverity,
  AmbientTemperatureClass,
  AMBIENT_TEMPERATURE_CLASS_LABELS,
  MaterialForm,
  BulkInputMethod,
  Orientation,
  ORIENTATION_LABELS,
  TemperatureUnit,
  TEMPERATURE_UNIT_LABELS,
  FluidsOnMaterial,
  FLUIDS_ON_MATERIAL_LABELS,
  MaterialFluidType,
  MATERIAL_FLUID_TYPE_LABELS,
  FluidAmount,
  FLUID_AMOUNT_LABELS,
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

  // Determine current material mode (if any)
  const isDiscreteMode = inputs.material_form === MaterialForm.Parts || inputs.material_form === 'PARTS';
  const isBulkMode = inputs.material_form === MaterialForm.Bulk || inputs.material_form === 'BULK';

  // Bulk flow mode
  const isWeightFlowMode = inputs.bulk_input_method === BulkInputMethod.WeightFlow || inputs.bulk_input_method === 'WEIGHT_FLOW';
  const isVolumeFlowMode = inputs.bulk_input_method === BulkInputMethod.VolumeFlow || inputs.bulk_input_method === 'VOLUME_FLOW';

  // Derived flow calculations
  const derivedVolumeFlow = (inputs.mass_flow_lbs_per_hr && inputs.density_lbs_per_ft3)
    ? Math.round((inputs.mass_flow_lbs_per_hr / inputs.density_lbs_per_ft3) * 100) / 100
    : null;
  const derivedMassFlow = (inputs.volume_flow_ft3_per_hr && inputs.density_lbs_per_ft3)
    ? Math.round((inputs.volume_flow_ft3_per_hr * inputs.density_lbs_per_ft3) * 100) / 100
    : null;

  // Fluids conditional
  const showFluidDetails = inputs.fluids_on_material === FluidsOnMaterial.Yes || inputs.fluids_on_material === 'YES';

  // Issue counts for Material section (product + throughput)
  const materialIssueCounts: SectionCounts = {
    errors: (sectionCounts.product?.errors ?? 0) + (sectionCounts.throughput?.errors ?? 0),
    warnings: (sectionCounts.product?.warnings ?? 0) + (sectionCounts.throughput?.warnings ?? 0),
  };

  const materialIssues = [
    ...getIssuesForSection('product'),
    ...getIssuesForSection('throughput'),
  ];

  // Issue counts for Environment section
  const environmentIssueCounts: SectionCounts = {
    errors: sectionCounts.environment?.errors ?? 0,
    warnings: sectionCounts.environment?.warnings ?? 0,
  };

  const environmentIssues = getIssuesForSection('environment');

  return (
    <div className="space-y-4">
      {/* ================================================================
          SECTION 1: Material to Be Conveyed
          ================================================================ */}
      <AccordionSection
        id="product"
        title="Material to Be Conveyed"
        isExpanded={isExpanded('product')}
        onToggle={handleToggle}
        issueCounts={materialIssueCounts}
        issues={materialIssues}
      >
        <div className="space-y-5">
          {/* Material Context */}
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
              {/* Part Temperature - numeric + unit toggle */}
              <div>
                <label htmlFor="part_temperature_value" className="label">Part Temperature</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    id="part_temperature_value"
                    className="input flex-1"
                    value={inputs.part_temperature_value ?? ''}
                    onChange={(e) => updateInput('part_temperature_value', e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="e.g., 70"
                  />
                  <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                    {Object.values(TemperatureUnit).map((unit) => (
                      <button
                        key={unit}
                        type="button"
                        className={`px-3 py-2 text-sm font-medium transition-colors ${
                          (inputs.part_temperature_unit ?? TemperatureUnit.Fahrenheit) === unit
                            ? 'bg-blue-500 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                        onClick={() => updateInput('part_temperature_unit', unit)}
                      >
                        {TEMPERATURE_UNIT_LABELS[unit]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="hidden md:block" />
            </div>
          </div>

          {/* Fluids on Material - conditional pattern */}
          <div>
            <p className="text-xs font-medium text-gray-400 mb-2">Fluids on Material</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label htmlFor="fluids_on_material" className="label">Fluids present?</label>
                <select
                  id="fluids_on_material"
                  className="input"
                  value={inputs.fluids_on_material ?? FluidsOnMaterial.No}
                  onChange={(e) => {
                    updateInput('fluids_on_material', e.target.value);
                    // Clear fluid details if "No" selected
                    if (e.target.value === FluidsOnMaterial.No) {
                      updateInput('material_fluid_type', undefined);
                      updateInput('fluid_amount', undefined);
                    }
                  }}
                >
                  {Object.values(FluidsOnMaterial).map((value) => (
                    <option key={value} value={value}>
                      {FLUIDS_ON_MATERIAL_LABELS[value]}
                    </option>
                  ))}
                </select>
              </div>
              {showFluidDetails && (
                <>
                  <div>
                    <label htmlFor="material_fluid_type" className="label">Fluid type</label>
                    <select
                      id="material_fluid_type"
                      className="input"
                      value={inputs.material_fluid_type ?? ''}
                      onChange={(e) => updateInput('material_fluid_type', e.target.value || undefined)}
                    >
                      <option value="">Select...</option>
                      {Object.values(MaterialFluidType).map((value) => (
                        <option key={value} value={value}>
                          {MATERIAL_FLUID_TYPE_LABELS[value]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="fluid_amount" className="label">Amount</label>
                    <select
                      id="fluid_amount"
                      className="input"
                      value={inputs.fluid_amount ?? ''}
                      onChange={(e) => updateInput('fluid_amount', e.target.value || undefined)}
                    >
                      <option value="">Select...</option>
                      {Object.values(FluidAmount).map((value) => (
                        <option key={value} value={value}>
                          {FLUID_AMOUNT_LABELS[value]}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Material Form Selection - Selection-first pattern */}
          <div>
            <p className="text-xs font-medium text-gray-400 mb-2">Material Form <span className="text-red-500">*</span></p>

            {/* Material Type Selection - Always visible */}
            <div className="flex flex-wrap gap-3 mb-4">
              <label
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border cursor-pointer transition-colors ${
                  isDiscreteMode
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="material_form_type"
                  checked={isDiscreteMode}
                  onChange={() => {
                    updateInput('material_form', MaterialForm.Parts);
                  }}
                  className="sr-only"
                />
                <svg className={`w-5 h-5 ${isDiscreteMode ? 'text-blue-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                Discrete Parts
              </label>
              <label
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border cursor-pointer transition-colors ${
                  isBulkMode
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="material_form_type"
                  checked={isBulkMode}
                  onChange={() => {
                    updateInput('material_form', MaterialForm.Bulk);
                    if (!inputs.bulk_input_method) {
                      updateInput('bulk_input_method', BulkInputMethod.WeightFlow);
                    }
                  }}
                  className="sr-only"
                />
                <svg className={`w-5 h-5 ${isBulkMode ? 'text-blue-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Bulk Material
              </label>
            </div>

            {/* DISCRETE PARTS - Inline Configuration */}
            {isDiscreteMode && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
                {/* Part Dimensions */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Part Dimensions</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label htmlFor="part_length_in" className="label">Length (in)</label>
                      <input
                        type="number"
                        id="part_length_in"
                        className="input"
                        value={inputs.part_length_in || ''}
                        onChange={(e) => updateInput('part_length_in', e.target.value ? parseFloat(e.target.value) : 0)}
                        step="0.1"
                        min="0"
                        placeholder="e.g., 12"
                      />
                    </div>
                    <div>
                      <label htmlFor="part_width_in" className="label">Width (in)</label>
                      <input
                        type="number"
                        id="part_width_in"
                        className="input"
                        value={inputs.part_width_in || ''}
                        onChange={(e) => updateInput('part_width_in', e.target.value ? parseFloat(e.target.value) : 0)}
                        step="0.1"
                        min="0"
                        placeholder="e.g., 8"
                      />
                    </div>
                    <div>
                      <label htmlFor="part_weight_lbs" className="label">Weight (lbs)</label>
                      <input
                        type="number"
                        id="part_weight_lbs"
                        className="input"
                        value={inputs.part_weight_lbs || ''}
                        onChange={(e) => updateInput('part_weight_lbs', e.target.value ? parseFloat(e.target.value) : 0)}
                        step="0.1"
                        min="0"
                        placeholder="e.g., 5"
                      />
                    </div>
                    <div>
                      <label htmlFor="orientation" className="label">Orientation</label>
                      <select
                        id="orientation"
                        className="input"
                        value={inputs.orientation ?? Orientation.Lengthwise}
                        onChange={(e) => updateInput('orientation', e.target.value as Orientation)}
                      >
                        <option value={Orientation.Lengthwise}>{ORIENTATION_LABELS[Orientation.Lengthwise]}</option>
                        <option value={Orientation.Crosswise}>{ORIENTATION_LABELS[Orientation.Crosswise]}</option>
                      </select>
                    </div>
                  </div>
                </div>
                {/* Throughput */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Throughput</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="part_spacing_in" className="label">Space Between Parts (in)</label>
                      <input
                        type="number"
                        id="part_spacing_in"
                        className="input"
                        value={inputs.part_spacing_in || ''}
                        onChange={(e) => updateInput('part_spacing_in', e.target.value ? parseFloat(e.target.value) : 0)}
                        step="0.1"
                        min="0"
                        placeholder="e.g., 6"
                      />
                      <p className="text-xs text-gray-500 mt-1">Gap between consecutive parts</p>
                    </div>
                    {/* Derived Part Pitch (read-only) */}
                    {(inputs.part_length_in ?? 0) > 0 && (inputs.part_spacing_in ?? 0) > 0 && (
                      <div>
                        <label className="label">Part Pitch (in)</label>
                        <div className="input bg-gray-100 text-gray-700">
                          {((inputs.part_length_in ?? 0) + (inputs.part_spacing_in ?? 0)).toFixed(2)}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Center-to-center = length + gap</p>
                      </div>
                    )}
                    <div>
                      <label htmlFor="required_throughput_pph" className="label">Required Throughput (pph) <span className="text-gray-400 font-normal">(opt)</span></label>
                      <input
                        type="number"
                        id="required_throughput_pph"
                        className="input"
                        value={inputs.required_throughput_pph ?? ''}
                        onChange={(e) => updateInput('required_throughput_pph', e.target.value ? parseFloat(e.target.value) : undefined)}
                        step="1"
                        min="0"
                        placeholder="e.g., 500"
                      />
                    </div>
                    <div>
                      <label htmlFor="throughput_margin_pct" className="label">Throughput Margin (%) <span className="text-gray-400 font-normal">(opt)</span></label>
                      <input
                        type="number"
                        id="throughput_margin_pct"
                        className="input"
                        value={inputs.throughput_margin_pct ?? ''}
                        onChange={(e) => updateInput('throughput_margin_pct', e.target.value ? parseFloat(e.target.value) : undefined)}
                        step="1"
                        min="0"
                        placeholder="e.g., 10"
                      />
                    </div>
                  </div>
                </div>
                {/* Material Properties */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Material Properties</h4>
                  <div className="flex gap-4">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="parts_sharp"
                        checked={inputs.parts_sharp === 'No'}
                        onChange={() => updateInput('parts_sharp', 'No')}
                        className="mr-2"
                      />
                      Parts not sharp
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="parts_sharp"
                        checked={inputs.parts_sharp === 'Yes'}
                        onChange={() => updateInput('parts_sharp', 'Yes')}
                        className="mr-2"
                      />
                      Parts are sharp/abrasive
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* BULK MATERIAL - Inline Configuration */}
            {isBulkMode && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
                {/* Input Method */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Input Method</h4>
                  <div className="flex flex-wrap gap-3">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="bulk_input_method"
                        checked={isWeightFlowMode}
                        onChange={() => updateInput('bulk_input_method', BulkInputMethod.WeightFlow)}
                        className="mr-2"
                      />
                      Mass Flow Rate
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="bulk_input_method"
                        checked={isVolumeFlowMode}
                        onChange={() => updateInput('bulk_input_method', BulkInputMethod.VolumeFlow)}
                        className="mr-2"
                      />
                      Volume Flow Rate
                    </label>
                  </div>
                </div>

                {/* Flow Rates */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Flow Rate</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {/* Mass Flow - editable when WeightFlow, derived when VolumeFlow */}
                    <div>
                      <label htmlFor="mass_flow_lbs_per_hr" className="label">
                        Mass Flow (lb/hr)
                        {isVolumeFlowMode && <span className="text-gray-400 font-normal ml-1">(derived)</span>}
                      </label>
                      {isWeightFlowMode ? (
                        <input
                          type="number"
                          id="mass_flow_lbs_per_hr"
                          className="input"
                          value={inputs.mass_flow_lbs_per_hr ?? ''}
                          onChange={(e) => updateInput('mass_flow_lbs_per_hr', e.target.value ? parseFloat(e.target.value) : undefined)}
                          step="1"
                          min="0"
                          placeholder="e.g., 1000"
                        />
                      ) : (
                        <input
                          type="text"
                          className="input bg-gray-100 text-gray-600"
                          value={derivedMassFlow !== null ? derivedMassFlow.toLocaleString() : '—'}
                          readOnly
                          disabled
                        />
                      )}
                    </div>

                    {/* Volume Flow - editable when VolumeFlow, derived when WeightFlow */}
                    <div>
                      <label htmlFor="volume_flow_ft3_per_hr" className="label">
                        Volume Flow (ft³/hr)
                        {isWeightFlowMode && <span className="text-gray-400 font-normal ml-1">(derived)</span>}
                      </label>
                      {isVolumeFlowMode ? (
                        <input
                          type="number"
                          id="volume_flow_ft3_per_hr"
                          className="input"
                          value={inputs.volume_flow_ft3_per_hr ?? ''}
                          onChange={(e) => updateInput('volume_flow_ft3_per_hr', e.target.value ? parseFloat(e.target.value) : undefined)}
                          step="0.1"
                          min="0"
                          placeholder="e.g., 20"
                        />
                      ) : (
                        <input
                          type="text"
                          className="input bg-gray-100 text-gray-600"
                          value={derivedVolumeFlow !== null ? derivedVolumeFlow.toLocaleString() : '—'}
                          readOnly
                          disabled
                        />
                      )}
                    </div>

                    {/* Bulk Density - always editable */}
                    <div>
                      <label htmlFor="density_lbs_per_ft3" className="label">Bulk Density (lb/ft³)</label>
                      <input
                        type="number"
                        id="density_lbs_per_ft3"
                        className="input"
                        value={inputs.density_lbs_per_ft3 ?? ''}
                        onChange={(e) => updateInput('density_lbs_per_ft3', e.target.value ? parseFloat(e.target.value) : undefined)}
                        step="0.1"
                        min="0"
                        placeholder="e.g., 50"
                      />
                    </div>
                  </div>
                </div>

                {/* Lump Sizes */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Lump Size</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="smallest_lump_size_in" className="label">Min Lump Size (in)</label>
                      <input
                        type="number"
                        id="smallest_lump_size_in"
                        className="input"
                        value={inputs.smallest_lump_size_in ?? ''}
                        onChange={(e) => updateInput('smallest_lump_size_in', e.target.value ? parseFloat(e.target.value) : undefined)}
                        step="0.1"
                        min="0"
                        placeholder="e.g., 0.5"
                      />
                    </div>
                    <div>
                      <label htmlFor="largest_lump_size_in" className="label">Max Lump Size (in)</label>
                      <input
                        type="number"
                        id="largest_lump_size_in"
                        className="input"
                        value={inputs.largest_lump_size_in ?? ''}
                        onChange={(e) => updateInput('largest_lump_size_in', e.target.value ? parseFloat(e.target.value) : undefined)}
                        step="0.1"
                        min="0"
                        placeholder="e.g., 4"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Presentation to Belt */}
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

          {/* Material Notes (stays in Material section) */}
          <div>
            <label htmlFor="material_notes" className="label">
              Material Notes <span className="text-gray-400 font-normal">(optional)</span>
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
      </AccordionSection>

      {/* ================================================================
          SECTION 2: Operating Environment (peer section)
          ================================================================ */}
      <AccordionSection
        id="environment"
        title="Operating Environment"
        isExpanded={isExpanded('environment')}
        onToggle={handleToggle}
        issueCounts={environmentIssueCounts}
        issues={environmentIssues}
      >
        <div className="space-y-5">
          {/* Environment Factors */}
          <div>
            <p className="text-xs font-medium text-gray-400 mb-2">Conditions</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="environment_factors" className="label">Environment Factors</label>
                <EnvironmentFactorsSelect
                  value={inputs.environment_factors}
                  onChange={(value) => updateInput('environment_factors', value)}
                  id="environment_factors"
                />
                <p className="text-xs text-gray-500 mt-1">Select any applicable conditions. Leave blank if none apply.</p>
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

          {/* Application Notes (moved here from Material section) */}
          <div>
            <label htmlFor="application_notes" className="label">
              Application Notes <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="application_notes"
              className="input min-h-[72px] text-sm"
              value={inputs.application_notes ?? ''}
              onChange={(e) => updateInput('application_notes', e.target.value || undefined)}
              placeholder="General context, customer requirements, special considerations..."
              rows={2}
            />
          </div>
        </div>
      </AccordionSection>
    </div>
  );
}
