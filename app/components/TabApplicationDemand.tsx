/**
 * Tab 1: Application (v1.35)
 *
 * Two peer sections:
 * 1) Material to Be Conveyed - material context, form, presentation, material notes
 * 2) Operating Environment - environment factors, fluid type, ambient temp, application notes
 *
 * v1.35: Split Operating Environment into its Own Section
 * - Operating Environment is now a separate AccordionSection (peer to Material)
 * - Application notes moved to Operating Environment (makes more sense contextually)
 * - Material notes stays in Material to Be Conveyed
 *
 * v1.34: Explicit Mode Selection (No Defaults)
 * - Material form is NOT a default - it's a required explicit choice
 * - Modal-based configuration for both modes
 */

'use client';

import { useState } from 'react';
import {
  SliderbedInputs,
  SideLoadingDirection,
  SideLoadingSeverity,
  AmbientTemperatureClass,
  AMBIENT_TEMPERATURE_CLASS_LABELS,
  MaterialForm,
  BulkInputMethod,
} from '../../src/models/sliderbed_v1/schema';
import CatalogSelect from './CatalogSelect';
import EnvironmentFactorsSelect from './EnvironmentFactorsSelect';
import AccordionSection, { useAccordionState } from './AccordionSection';
import { Issue, SectionCounts, SectionKey } from './useConfigureIssues';
import BulkMaterialConfigModal, { getBulkMaterialSummary } from './BulkMaterialConfigModal';
import DiscretePartsConfigModal, { getDiscretePartsSummary } from './DiscretePartsConfigModal';

interface TabApplicationDemandProps {
  inputs: SliderbedInputs;
  updateInput: (field: keyof SliderbedInputs, value: any) => void;
  sectionCounts: Record<SectionKey, SectionCounts>;
  getIssuesForSection: (sectionKey: SectionKey) => Issue[];
}

export default function TabApplicationDemand({ inputs, updateInput, sectionCounts, getIssuesForSection }: TabApplicationDemandProps) {
  const { handleToggle, isExpanded } = useAccordionState();
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isDiscreteModalOpen, setIsDiscreteModalOpen] = useState(false);

  // Determine current material mode (if any)
  const isDiscreteMode = inputs.material_form === MaterialForm.Parts || inputs.material_form === 'PARTS';
  const isBulkMode = inputs.material_form === MaterialForm.Bulk || inputs.material_form === 'BULK';
  const hasNoMode = !isDiscreteMode && !isBulkMode;

  // Get summaries for configured modes
  const discreteSummary = isDiscreteMode ? getDiscretePartsSummary(inputs) : null;
  const bulkSummary = isBulkMode ? getBulkMaterialSummary(inputs) : null;

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

  // Handle opening discrete modal
  const handleOpenDiscrete = () => {
    updateInput('material_form', MaterialForm.Parts);
    setIsDiscreteModalOpen(true);
  };

  // Handle opening bulk modal
  const handleOpenBulk = () => {
    updateInput('material_form', MaterialForm.Bulk);
    if (!inputs.bulk_input_method) {
      updateInput('bulk_input_method', BulkInputMethod.WeightFlow);
    }
    setIsBulkModalOpen(true);
  };

  // Handle changing material type (with implicit clear of other mode)
  const handleChangeMaterialType = () => {
    updateInput('material_form', undefined);
  };

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
              <div className="hidden md:block" />
            </div>
          </div>

          {/* Material Form Selection */}
          <div>
            <p className="text-xs font-medium text-gray-400 mb-2">Material Form</p>

            {/* NO MODE SELECTED - Show two configure buttons */}
            {hasNoMode && (
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleOpenDiscrete}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors border border-gray-200"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Configure Discrete Parts
                </button>
                <button
                  type="button"
                  onClick={handleOpenBulk}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors border border-gray-200"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Configure Bulk Material
                </button>
              </div>
            )}

            {/* DISCRETE PARTS CONFIGURED - Green summary card */}
            {isDiscreteMode && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-semibold text-green-900">Discrete Parts Configured</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsDiscreteModalOpen(true)}
                      className="text-sm text-green-700 hover:text-green-800 font-medium"
                    >
                      Edit
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={handleChangeMaterialType}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Change Type
                    </button>
                  </div>
                </div>
                {discreteSummary && (
                  <p className="mt-2 text-sm text-green-800 ml-7">{discreteSummary}</p>
                )}
              </div>
            )}

            {/* BULK MATERIAL CONFIGURED - Green summary card */}
            {isBulkMode && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-semibold text-green-900">Bulk Material Configured</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsBulkModalOpen(true)}
                      className="text-sm text-green-700 hover:text-green-800 font-medium"
                    >
                      Edit
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={handleChangeMaterialType}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Change Type
                    </button>
                  </div>
                </div>
                {bulkSummary && (
                  <p className="mt-2 text-sm text-green-800 ml-7">{bulkSummary}</p>
                )}
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
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

      {/* Discrete Parts Configuration Modal */}
      <DiscretePartsConfigModal
        isOpen={isDiscreteModalOpen}
        onClose={() => setIsDiscreteModalOpen(false)}
        inputs={inputs}
        updateInput={updateInput}
      />

      {/* Bulk Material Configuration Modal */}
      <BulkMaterialConfigModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        inputs={inputs}
        updateInput={updateInput}
      />
    </div>
  );
}
