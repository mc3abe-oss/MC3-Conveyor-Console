/**
 * Tab: Build Options
 *
 * Build-related selections including:
 * - Guards & Safety (bottom covers, end guards, finger safe)
 * - Guides & Containment (side rails, side skirts)
 * - Documentation & Finish (specs, support, bearing, finish, labels, etc.)
 *
 * NOTE: Sensors/Controls moved to Drive & Controls → Electrical
 * NOTE: Belt Lacing moved to Physical → Belt & Pulleys
 */

'use client';

import {
  SliderbedInputs,
  SideRails,
  EndGuards,
} from '../../src/models/sliderbed_v1/schema';
import CatalogSelect from './CatalogSelect';
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
  const { handleToggle, isExpanded } = useAccordionState();

  return (
    <div className="space-y-4">
      {/* Guards & Safety */}
      <AccordionSection
        id="guards"
        title="Guards & Safety"
        isExpanded={isExpanded('guards')}
        onToggle={handleToggle}
        issueCounts={sectionCounts.guards}
        issues={getIssuesForSection('guards')}
      >
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
      </AccordionSection>

      {/* Guides & Containment */}
      <AccordionSection
        id="guides"
        title="Guides & Containment"
        isExpanded={isExpanded('guides')}
        onToggle={handleToggle}
        issueCounts={sectionCounts.guides}
        issues={getIssuesForSection('guides')}
      >
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
      </AccordionSection>

      {/* NOTE: Belt & Pulley (Lacing) moved to Physical → Belt & Pulleys */}
      {/* NOTE: Sensors / Controls moved to Drive & Controls → Electrical */}

      {/* Documentation & Finish */}
      <AccordionSection
        id="documentation"
        title="Documentation & Finish"
        isExpanded={isExpanded('documentation')}
        onToggle={handleToggle}
        issueCounts={sectionCounts.documentation}
        issues={getIssuesForSection('documentation')}
      >
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
      </AccordionSection>
    </div>
  );
}
