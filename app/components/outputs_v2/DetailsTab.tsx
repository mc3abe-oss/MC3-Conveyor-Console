'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { OutputsV2 } from '../../../src/models/sliderbed_v1/outputs_v2';
import BeltTab from './BeltTab';
import PulleysRollersTab from './PulleysRollersTab';
import DriveTab from './DriveTab';
import SupportsTab from './SupportsTab';

interface DetailsTabProps {
  outputs: OutputsV2;
}

type SectionId = 'belt' | 'pulleys_rollers' | 'drive' | 'supports' | 'geometry';

interface Section {
  id: SectionId;
  label: string;
  description: string;
}

/**
 * DetailsTab - Advanced view with all component details
 * Collapsible sections for deep inspection
 */
export default function DetailsTab({ outputs }: DetailsTabProps) {
  const [expandedSections, setExpandedSections] = useState<Set<SectionId>>(new Set());

  const sections: Section[] = [
    { id: 'belt', label: 'Belt', description: 'Belt component specifications and vendor packet' },
    { id: 'pulleys_rollers', label: 'Pulleys & Rollers', description: 'Pulley and roller specifications' },
    { id: 'drive', label: 'Drive', description: 'Gearmotor requirements and configuration' },
    { id: 'supports', label: 'Supports', description: 'Legs and casters specifications' },
    { id: 'geometry', label: 'Geometry', description: 'Design geometry and pulley locations' },
  ];

  const toggleSection = (id: SectionId) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedSections(new Set(sections.map((s) => s.id)));
  };

  const collapseAll = () => {
    setExpandedSections(new Set());
  };

  const renderSectionContent = (id: SectionId) => {
    switch (id) {
      case 'belt':
        return <BeltTab outputs={outputs} />;
      case 'pulleys_rollers':
        return <PulleysRollersTab outputs={outputs} />;
      case 'drive':
        return <DriveTab outputs={outputs} />;
      case 'supports':
        return <SupportsTab outputs={outputs} />;
      case 'geometry':
        return <GeometryContent outputs={outputs} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Component Details</h3>
          <p className="text-sm text-gray-500">
            Advanced view with full component specifications and internal calculation data.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Collapsible Sections */}
      <div className="space-y-2">
        {sections.map((section) => {
          const isExpanded = expandedSections.has(section.id);
          return (
            <div
              key={section.id}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  <svg
                    className={clsx(
                      'w-4 h-4 text-gray-500 transition-transform',
                      isExpanded && 'rotate-90'
                    )}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                  <div className="text-left">
                    <span className="font-medium text-gray-900">{section.label}</span>
                    <p className="text-xs text-gray-500">{section.description}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-400">
                  {isExpanded ? 'Click to collapse' : 'Click to expand'}
                </span>
              </button>

              {/* Section Content */}
              {isExpanded && (
                <div className="p-4 bg-white border-t border-gray-200">
                  {renderSectionContent(section.id)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Raw Data Notice */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
        <p>
          <span className="font-medium">Note:</span> This view includes internal calculation
          fields and component validation data. For vendor-ready specifications, use the
          &ldquo;Vendor Specs&rdquo; tab.
        </p>
      </div>
    </div>
  );
}

function GeometryContent({ outputs }: { outputs: OutputsV2 }) {
  const { design_geometry } = outputs;

  return (
    <div className="space-y-4">
      {/* Main Geometry Values */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-3">Design Geometry</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {design_geometry.top_of_belt_in.applicable && (
            <div className="flex justify-between">
              <span className="text-gray-600">Top of Belt:</span>
              <span className="font-mono">
                {design_geometry.top_of_belt_in.value?.toFixed(2) ?? '—'}&quot;
                {design_geometry.top_of_belt_in.reference_only && (
                  <span className="text-xs text-gray-500 ml-1">(ref only)</span>
                )}
              </span>
            </div>
          )}
          {design_geometry.top_of_belt_in.note && (
            <p className="col-span-2 text-xs text-gray-500 italic">
              {design_geometry.top_of_belt_in.note}
            </p>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600">Frame Height:</span>
            <span className="font-mono">
              {design_geometry.frame_height_in.value?.toFixed(2) ?? '—'}&quot;
              {design_geometry.frame_height_in.reference_only && (
                <span className="text-xs text-gray-500 ml-1">(ref only)</span>
              )}
            </span>
          </div>
          {design_geometry.roller_spacing_in.carry != null && (
            <div className="flex justify-between">
              <span className="text-gray-600">Carry Roller Spacing:</span>
              <span className="font-mono">{design_geometry.roller_spacing_in.carry.toFixed(1)}&quot;</span>
            </div>
          )}
          {design_geometry.roller_spacing_in.return != null && (
            <div className="flex justify-between">
              <span className="text-gray-600">Return Roller Spacing:</span>
              <span className="font-mono">{design_geometry.roller_spacing_in.return.toFixed(1)}&quot;</span>
            </div>
          )}
        </div>
      </div>

      {/* Pulley Locations */}
      {design_geometry.pulley_locations.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Pulley Locations</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-gray-600 font-medium">Component ID</th>
                  <th className="text-right py-2 text-gray-600 font-medium">Station (in)</th>
                </tr>
              </thead>
              <tbody>
                {design_geometry.pulley_locations.map((loc) => (
                  <tr key={loc.component_id} className="border-b border-gray-100 last:border-0">
                    <td className="py-2 font-mono text-gray-900">{loc.component_id}</td>
                    <td className="py-2 text-right font-mono text-gray-900">
                      {loc.station_in?.toFixed(2) ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
