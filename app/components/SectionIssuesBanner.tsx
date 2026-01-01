/**
 * SectionIssuesBanner - Displays validation issues inline within accordion sections
 *
 * Shows error, warning, and info messages with appropriate styling.
 * Used by AccordionSection to display both pre-calc and post-calc issues.
 */

'use client';

import { Issue, IssueSeverity } from './useConfigureIssues';

interface SectionIssuesBannerProps {
  issues: Issue[];
  /** Only show issues with these severities (default: all) */
  filterSeverity?: IssueSeverity[];
  /** Compact mode reduces padding and font size */
  compact?: boolean;
}

/**
 * Icon component for each severity level
 */
function SeverityIcon({ severity }: { severity: IssueSeverity }) {
  switch (severity) {
    case 'error':
      return (
        <svg className="h-5 w-5 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
      );
    case 'warning':
      return (
        <svg className="h-5 w-5 text-yellow-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      );
    case 'info':
      return (
        <svg className="h-5 w-5 text-blue-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
      );
  }
}

/**
 * Get styling classes for each severity level
 */
function getSeverityStyles(severity: IssueSeverity): {
  container: string;
  text: string;
  detail: string;
} {
  switch (severity) {
    case 'error':
      return {
        container: 'bg-red-50 border-red-200',
        text: 'text-red-800',
        detail: 'text-red-700',
      };
    case 'warning':
      return {
        container: 'bg-yellow-50 border-yellow-200',
        text: 'text-yellow-800',
        detail: 'text-yellow-700',
      };
    case 'info':
      return {
        container: 'bg-blue-50 border-blue-200',
        text: 'text-blue-800',
        detail: 'text-blue-700',
      };
  }
}

/**
 * Single issue item display
 */
function IssueItem({ issue, compact }: { issue: Issue; compact?: boolean }) {
  const styles = getSeverityStyles(issue.severity);

  return (
    <div
      className={`
        flex items-start gap-2 rounded-md border
        ${styles.container}
        ${compact ? 'p-2' : 'p-3'}
      `}
    >
      <SeverityIcon severity={issue.severity} />
      <div className="flex-1 min-w-0">
        <p className={`${compact ? 'text-xs' : 'text-sm'} font-medium ${styles.text}`}>
          {issue.message}
        </p>
        {issue.detail && (
          <p className={`mt-1 ${compact ? 'text-xs' : 'text-sm'} ${styles.detail}`}>
            {issue.detail}
          </p>
        )}
      </div>
    </div>
  );
}

export default function SectionIssuesBanner({
  issues,
  filterSeverity,
  compact = false,
}: SectionIssuesBannerProps) {
  // Filter issues if severity filter is provided
  const filteredIssues = filterSeverity
    ? issues.filter((issue) => filterSeverity.includes(issue.severity))
    : issues;

  // Sort by severity: errors first, then warnings, then info
  const sortedIssues = [...filteredIssues].sort((a, b) => {
    const order: Record<IssueSeverity, number> = { error: 0, warning: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });

  if (sortedIssues.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-2 ${compact ? 'mb-3' : 'mb-4'}`}>
      {sortedIssues.map((issue, index) => (
        <IssueItem key={`${issue.code || issue.message}-${index}`} issue={issue} compact={compact} />
      ))}
    </div>
  );
}
