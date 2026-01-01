/**
 * AccordionSection - Collapsible section for form tabs
 *
 * CRITICAL: Content is hidden via CSS (display:none), NOT unmounted.
 * This preserves input state when sections are collapsed.
 *
 * v1.28: Added issues prop and SectionIssuesBanner to ensure red/yellow
 * headers always have a visible explanation.
 */

'use client';

import { useState } from 'react';
import { SectionCounts, Issue } from './useConfigureIssues';
import StatusLight from './StatusLight';
import SectionIssuesBanner from './SectionIssuesBanner';

interface AccordionSectionProps {
  id: string;
  title: string;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
  /** Issue counts for displaying indicator chips */
  issueCounts?: SectionCounts;
  /** Issues to display inline when section is expanded */
  issues?: Issue[];
}

export default function AccordionSection({
  id,
  title,
  isExpanded,
  onToggle,
  children,
  issueCounts,
  issues,
}: AccordionSectionProps) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header - clickable */}
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
        aria-expanded={isExpanded}
        aria-controls={`accordion-content-${id}`}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {/* Status light indicator */}
          {issueCounts && (
            <StatusLight
              errorCount={issueCounts.errors}
              warningCount={issueCounts.warnings}
              size="md"
            />
          )}
        </div>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Content - always mounted, hidden via CSS when collapsed */}
      <div
        id={`accordion-content-${id}`}
        className={`transition-all duration-200 ${
          isExpanded ? 'block' : 'hidden'
        }`}
      >
        <div className="p-4">
          {/* Inline issues banner (errors/warnings from pre-calc and post-calc) */}
          {issues && issues.length > 0 && (
            <SectionIssuesBanner issues={issues} />
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * Hook for managing accordion state with single-section-expanded behavior.
 * All sections start collapsed by default.
 */
export function useAccordionState() {
  const [expandedSection, setExpandedSection] = useState<string>('');

  const handleToggle = (sectionId: string) => {
    // Toggle: if already expanded, collapse it; otherwise expand it (and collapse others)
    setExpandedSection((current) => (current === sectionId ? '' : sectionId));
  };

  const isExpanded = (sectionId: string) => expandedSection === sectionId;

  return { expandedSection, handleToggle, isExpanded };
}
