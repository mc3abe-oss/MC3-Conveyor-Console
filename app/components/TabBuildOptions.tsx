/**
 * Tab: Build Options
 *
 * Build-related selections including:
 * - Options & Accessories (consolidated: Support, Guards, Guides)
 * - Documentation & Finish (specs, support, bearing, finish, labels, etc.)
 *
 * v1.41: UI Consolidation
 * - Combined Support, Guards, Guides into single "Options & Accessories" accordion
 * - Compact card-based layout with horizontal space utilization
 * - No logic changes - all validation and behavior preserved
 *
 * v1.40: Floor Support Logic Refactor
 * - Support Method is now binary: External vs Floor Supported
 * - TOB inputs shown when Floor Supported (independent of legs/casters)
 * - Legs and Casters are additive checkboxes (can both be enabled)
 */

'use client';

import { useMemo, useEffect, useRef } from 'react';
import {
  SliderbedInputs,
  SideRails,
  EndGuards,
  SupportMethod,
  isFloorSupported,
  HeightReferenceEnd,
} from '../../src/models/sliderbed_v1/schema';
import CatalogSelect from './CatalogSelect';
import FinishSelector from './FinishSelector';
import AccordionSection, { useAccordionState } from './AccordionSection';
import { Issue, SectionCounts, SectionKey } from './useConfigureIssues';

interface TabBuildOptionsProps {
  inputs: SliderbedInputs;
  updateInput: (field: keyof SliderbedInputs, value: any) => void;
  sectionCounts: Record<SectionKey, SectionCounts>;
  /** v1.28: Get issues for a specific section (for banner display) */
  getIssuesForSection: (sectionKey: SectionKey) => Issue[];
}

export default function TabBuildOptions({ inputs, updateInput, sectionCounts, getIssuesForSection }: TabBuildOptionsProps) {
  const { handleToggle, isExpanded, expandSection } = useAccordionState();
  const hasAutoExpandedRef = useRef(false);

  // v1.40: Derive support method state
  const floorSupported = isFloorSupported(inputs.support_method);
  const includeLegs = inputs.include_legs === true;
  const includeCasters = inputs.include_casters === true;

  // Reference end for TOB input (default: tail)
  const referenceEnd: HeightReferenceEnd = inputs.reference_end ?? 'tail';

  // Calculate derived TOB at opposite end based on geometry
  const derivedTob = useMemo(() => {
    if (!floorSupported) return null;

    const referenceTob = referenceEnd === 'tail' ? inputs.tail_tob_in : inputs.drive_tob_in;
    if (referenceTob === undefined) return null;

    const lengthIn = inputs.conveyor_length_cc_in;
    const angleDeg = inputs.conveyor_incline_deg ?? 0;

    if (!lengthIn || lengthIn <= 0) return null;

    const angleRad = (angleDeg * Math.PI) / 180;
    const riseIn = lengthIn * Math.sin(angleRad);

    return referenceEnd === 'tail' ? referenceTob + riseIn : referenceTob - riseIn;
  }, [floorSupported, referenceEnd, inputs.tail_tob_in, inputs.drive_tob_in, inputs.conveyor_length_cc_in, inputs.conveyor_incline_deg]);

  const geometryDefined = (inputs.conveyor_length_cc_in ?? 0) > 0;

  // Combine issue counts for the consolidated Options & Accessories section
  // Includes: support (floor mounting), guards, guides, beltpulley (lacing)
  const optionsCounts = useMemo(() => {
    const support = sectionCounts.support || { errors: 0, warnings: 0 };
    const guards = sectionCounts.guards || { errors: 0, warnings: 0 };
    const guides = sectionCounts.guides || { errors: 0, warnings: 0 };
    const beltpulley = sectionCounts.beltpulley || { errors: 0, warnings: 0 };
    return {
      errors: support.errors + guards.errors + guides.errors + beltpulley.errors,
      warnings: support.warnings + guards.warnings + guides.warnings + beltpulley.warnings,
    };
  }, [sectionCounts]);

  // Combine issues for the consolidated section
  const optionsIssues = useMemo(() => {
    return [
      ...getIssuesForSection('support'),
      ...getIssuesForSection('guards'),
      ...getIssuesForSection('guides'),
      ...getIssuesForSection('beltpulley'),
    ];
  }, [getIssuesForSection]);

  // Documentation section issues count
  const documentationCounts = sectionCounts.documentation || { errors: 0, warnings: 0 };

  // Auto-expand the first section with issues when tab opens
  useEffect(() => {
    // Only auto-expand once per mount
    if (hasAutoExpandedRef.current) return;

    // Check Options & Accessories first (combined section)
    if (optionsCounts.errors > 0 || optionsCounts.warnings > 0) {
      expandSection('options');
      hasAutoExpandedRef.current = true;
      return;
    }

    // Then check Documentation & Finish
    if (documentationCounts.errors > 0 || documentationCounts.warnings > 0) {
      expandSection('documentation');
      hasAutoExpandedRef.current = true;
      return;
    }
  }, [optionsCounts, documentationCounts, expandSection]);

  return (
    <div className="space-y-3">
      {/* Options & Accessories - Consolidated section (v1.41) */}
      <AccordionSection
        id="options"
        title="Options & Accessories"
        isExpanded={isExpanded('options')}
        onToggle={handleToggle}
        issueCounts={optionsCounts}
        issues={optionsIssues}
      >
        <div className="space-y-4">
          {/* ═══════════════════════════════════════════════════════════════════
              SUPPORT (Floor Mounting) Card
              ═══════════════════════════════════════════════════════════════════ */}
          <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
            <h4 className="text-sm font-semibold text-emerald-800 mb-3">Support (Floor Mounting)</h4>

            {/* Row 1: Support Method + Reference End */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label htmlFor="support_method" className="label text-xs">Support Method</label>
                <select
                  id="support_method"
                  className="input text-sm py-1.5"
                  value={floorSupported ? 'floor_supported' : 'external'}
                  onChange={(e) => {
                    const isFloor = e.target.value === 'floor_supported';
                    updateInput('support_method', isFloor ? SupportMethod.FloorSupported : SupportMethod.External);
                    if (!isFloor) {
                      updateInput('include_legs', undefined);
                      updateInput('include_casters', undefined);
                      updateInput('leg_model_key', undefined);
                      updateInput('caster_rigid_model_key', undefined);
                      updateInput('caster_rigid_qty', undefined);
                      updateInput('caster_swivel_model_key', undefined);
                      updateInput('caster_swivel_qty', undefined);
                      updateInput('tail_tob_in', undefined);
                      updateInput('drive_tob_in', undefined);
                      updateInput('reference_end', undefined);
                    }
                  }}
                >
                  <option value="external">External (Suspended / Framework)</option>
                  <option value="floor_supported">Floor Supported</option>
                </select>
              </div>

              {floorSupported && (
                <div>
                  <label htmlFor="reference_end" className="label text-xs">Reference End</label>
                  <select
                    id="reference_end"
                    className="input text-sm py-1.5"
                    value={referenceEnd}
                    onChange={(e) => updateInput('reference_end', e.target.value as HeightReferenceEnd)}
                  >
                    <option value="tail">Tail End</option>
                    <option value="drive">Drive End</option>
                  </select>
                </div>
              )}
            </div>

            {/* Row 2: TOB inputs (only when floor supported) */}
            {floorSupported && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                  <label htmlFor="reference_tob" className="label text-xs">
                    TOB at {referenceEnd === 'tail' ? 'Tail' : 'Drive'} <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      id="reference_tob"
                      className="input text-sm py-1.5 flex-1"
                      value={referenceEnd === 'tail' ? (inputs.tail_tob_in ?? '') : (inputs.drive_tob_in ?? '')}
                      onChange={(e) => {
                        const value = e.target.value ? Number(e.target.value) : undefined;
                        updateInput(referenceEnd === 'tail' ? 'tail_tob_in' : 'drive_tob_in', value);
                      }}
                      min={0}
                      step={0.25}
                    />
                    <span className="text-xs text-gray-500">in</span>
                  </div>
                </div>

                <div>
                  <label className="label text-xs">
                    TOB at {referenceEnd === 'tail' ? 'Drive' : 'Tail'} (Derived)
                  </label>
                  {geometryDefined && derivedTob !== null ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        className="input text-sm py-1.5 bg-gray-100 flex-1"
                        value={derivedTob.toFixed(2)}
                        readOnly
                        disabled
                      />
                      <span className="text-xs text-gray-500">in</span>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic py-1.5">
                      {!geometryDefined ? 'Set geometry first' : 'Enter TOB to calculate'}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Legs & Casters sub-panels (only when floor supported) */}
            {floorSupported && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Legs sub-panel */}
                <div className="p-2.5 bg-white rounded border border-emerald-100">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      id="include_legs"
                      checked={includeLegs}
                      onChange={(e) => {
                        updateInput('include_legs', e.target.checked || undefined);
                        if (!e.target.checked) updateInput('leg_model_key', undefined);
                      }}
                      className="w-3.5 h-3.5 text-emerald-600 rounded"
                    />
                    <label htmlFor="include_legs" className="text-xs font-medium text-gray-700 cursor-pointer">
                      Include Legs
                    </label>
                  </div>
                  {includeLegs && (
                    <div>
                      <label htmlFor="leg_model_key" className="label text-xs">
                        Model <span className="text-red-500">*</span>
                      </label>
                      <CatalogSelect
                        catalogKey="leg_model"
                        value={inputs.leg_model_key || ''}
                        onChange={(value) => updateInput('leg_model_key', value || undefined)}
                        id="leg_model_key"
                        required
                      />
                    </div>
                  )}
                </div>

                {/* Casters sub-panel */}
                <div className="p-2.5 bg-white rounded border border-emerald-100">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      id="include_casters"
                      checked={includeCasters}
                      onChange={(e) => {
                        updateInput('include_casters', e.target.checked || undefined);
                        if (!e.target.checked) {
                          updateInput('caster_rigid_model_key', undefined);
                          updateInput('caster_rigid_qty', undefined);
                          updateInput('caster_swivel_model_key', undefined);
                          updateInput('caster_swivel_qty', undefined);
                        }
                      }}
                      className="w-3.5 h-3.5 text-emerald-600 rounded"
                    />
                    <label htmlFor="include_casters" className="text-xs font-medium text-gray-700 cursor-pointer">
                      Include Casters
                    </label>
                  </div>
                  {includeCasters && (
                    <div className="space-y-2">
                      {/* Rigid row */}
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label htmlFor="caster_rigid_model_key" className="label text-xs">Rigid Model</label>
                          <CatalogSelect
                            catalogKey="caster_model"
                            value={inputs.caster_rigid_model_key || ''}
                            onChange={(value) => updateInput('caster_rigid_model_key', value || undefined)}
                            id="caster_rigid_model_key"
                          />
                        </div>
                        <div className="w-16">
                          <label htmlFor="caster_rigid_qty" className="label text-xs">Qty</label>
                          <input
                            type="number"
                            id="caster_rigid_qty"
                            className="input text-sm py-1.5"
                            value={inputs.caster_rigid_qty ?? ''}
                            onChange={(e) => updateInput('caster_rigid_qty', e.target.value ? Number(e.target.value) : undefined)}
                            min={0}
                            max={20}
                          />
                        </div>
                      </div>
                      {/* Swivel row */}
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label htmlFor="caster_swivel_model_key" className="label text-xs">Swivel Model</label>
                          <CatalogSelect
                            catalogKey="caster_model"
                            value={inputs.caster_swivel_model_key || ''}
                            onChange={(value) => updateInput('caster_swivel_model_key', value || undefined)}
                            id="caster_swivel_model_key"
                          />
                        </div>
                        <div className="w-16">
                          <label htmlFor="caster_swivel_qty" className="label text-xs">Qty</label>
                          <input
                            type="number"
                            id="caster_swivel_qty"
                            className="input text-sm py-1.5"
                            value={inputs.caster_swivel_qty ?? ''}
                            onChange={(e) => updateInput('caster_swivel_qty', e.target.value ? Number(e.target.value) : undefined)}
                            min={0}
                            max={20}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!floorSupported && (
              <p className="text-xs text-gray-500">Suspended or framework-mounted. No floor contact.</p>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              GUARDS & SAFETY Card
              ═══════════════════════════════════════════════════════════════════ */}
          <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
            <h4 className="text-sm font-semibold text-emerald-800 mb-3">Guards & Safety</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Bottom Covers */}
              <div>
                <label className="label text-xs">Bottom Covers</label>
                <div className="flex gap-3">
                  <label className="inline-flex items-center text-sm">
                    <input
                      type="radio"
                      name="bottom_covers"
                      checked={inputs.bottom_covers === false}
                      onChange={() => updateInput('bottom_covers', false)}
                      className="mr-1.5"
                    />
                    No
                  </label>
                  <label className="inline-flex items-center text-sm">
                    <input
                      type="radio"
                      name="bottom_covers"
                      checked={inputs.bottom_covers === true}
                      onChange={() => updateInput('bottom_covers', true)}
                      className="mr-1.5"
                    />
                    Yes
                  </label>
                </div>
              </div>

              {/* End Guards */}
              <div>
                <label htmlFor="end_guards" className="label text-xs">End Guards</label>
                <select
                  id="end_guards"
                  className="input text-sm py-1.5"
                  value={inputs.end_guards}
                  onChange={(e) => updateInput('end_guards', e.target.value)}
                >
                  {Object.values(EndGuards).map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              {/* Finger Safe */}
              <div>
                <label className="label text-xs">Finger Safe</label>
                <div className="flex gap-3">
                  <label className="inline-flex items-center text-sm">
                    <input
                      type="radio"
                      name="finger_safe"
                      checked={inputs.finger_safe === false}
                      onChange={() => updateInput('finger_safe', false)}
                      className="mr-1.5"
                    />
                    No
                  </label>
                  <label className="inline-flex items-center text-sm">
                    <input
                      type="radio"
                      name="finger_safe"
                      checked={inputs.finger_safe === true}
                      onChange={() => updateInput('finger_safe', true)}
                      className="mr-1.5"
                    />
                    Yes
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              GUIDES & CONTAINMENT Card
              ═══════════════════════════════════════════════════════════════════ */}
          <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
            <h4 className="text-sm font-semibold text-emerald-800 mb-3">Guides & Containment</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Side Rails */}
              <div>
                <label htmlFor="side_rails" className="label text-xs">Side Rails</label>
                <select
                  id="side_rails"
                  className="input text-sm py-1.5"
                  value={inputs.side_rails}
                  onChange={(e) => updateInput('side_rails', e.target.value)}
                >
                  {Object.values(SideRails).map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              {/* Side Skirts */}
              <div>
                <label className="label text-xs">Side Skirts</label>
                <div className="flex gap-3">
                  <label className="inline-flex items-center text-sm">
                    <input
                      type="radio"
                      name="side_skirts"
                      checked={inputs.side_skirts === false}
                      onChange={() => updateInput('side_skirts', false)}
                      className="mr-1.5"
                    />
                    No
                  </label>
                  <label className="inline-flex items-center text-sm">
                    <input
                      type="radio"
                      name="side_skirts"
                      checked={inputs.side_skirts === true}
                      onChange={() => updateInput('side_skirts', true)}
                      className="mr-1.5"
                    />
                    Yes
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AccordionSection>

      {/* Documentation & Finish */}
      <AccordionSection
        id="documentation"
        title="Documentation & Finish"
        isExpanded={isExpanded('documentation')}
        onToggle={handleToggle}
        issueCounts={sectionCounts.documentation}
        issues={getIssuesForSection('documentation')}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Spec Source */}
          <div>
            <label htmlFor="spec_source" className="label">Spec Source</label>
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

          {/* Bearing Grade */}
          <div>
            <label htmlFor="bearing_grade" className="label">Bearing Grade</label>
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
            <label htmlFor="documentation_package" className="label">Documentation Package</label>
            <CatalogSelect
              catalogKey="documentation_package"
              value={inputs.documentation_package}
              onChange={(value) => updateInput('documentation_package', value)}
              id="documentation_package"
              required
            />
          </div>

          {/* Conveyor Finish - Full width card */}
          <div className="md:col-span-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="text-sm font-semibold text-blue-800 mb-3">Conveyor Finish</h4>
            <FinishSelector
              category="conveyor"
              coatingMethod={inputs.finish_coating_method}
              colorCode={inputs.finish_powder_color_code}
              customNote={inputs.finish_custom_note}
              onCoatingMethodChange={(value) => updateInput('finish_coating_method', value)}
              onColorCodeChange={(value) => updateInput('finish_powder_color_code', value)}
              onCustomNoteChange={(value) => updateInput('finish_custom_note', value)}
              idPrefix="conveyor_finish"
            />
          </div>

          {/* Guarding Finish - Full width card */}
          <div className="md:col-span-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="text-sm font-semibold text-blue-800 mb-3">Guarding Finish</h4>
            <FinishSelector
              category="guarding"
              coatingMethod={inputs.guarding_coating_method}
              colorCode={inputs.guarding_powder_color_code}
              customNote={inputs.guarding_custom_note}
              onCoatingMethodChange={(value) => updateInput('guarding_coating_method', value)}
              onColorCodeChange={(value) => updateInput('guarding_powder_color_code', value)}
              onCustomNoteChange={(value) => updateInput('guarding_custom_note', value)}
              idPrefix="guarding_finish"
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

        </div>
      </AccordionSection>
    </div>
  );
}
