/**
 * SectionIssuesBanner - Displays validation issues for a section
 *
 * Shows a banner with errors/warnings when the section header shows red/yellow
 * but no inline field errors are visible. This ensures users always see a reason
 * for the section status.
 *
 * v1.28: Fixes "ghost red header" issue where validation errors exist but
 * are not displayed inline.
 */

'use client';

import { Issue, IssueSeverity } from './useConfigureIssues';

interface SectionIssuesBannerProps {
  /** Issues for this section from useConfigureIssues */
  issues: Issue[];
  /** Maximum number of issues to display (default: 5) */
  maxDisplay?: number;
}

/**
 * Get icon for issue severity
 */
function getSeverityIcon(severity: IssueSeverity) {
  switch (severity) {
    case 'error':
      return (
        <svg className="h-4 w-4 text-red-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      );
    case 'warning':
      return (
        <svg className="h-4 w-4 text-amber-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      );
    case 'info':
      return (
        <svg className="h-4 w-4 text-blue-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      );
  }
}

/**
 * Get text color for issue severity
 */
function getSeverityTextColor(severity: IssueSeverity) {
  switch (severity) {
    case 'error':
      return 'text-red-700';
    case 'warning':
      return 'text-amber-700';
    case 'info':
      return 'text-blue-700';
  }
}

export default function SectionIssuesBanner({
  issues,
  maxDisplay = 5,
}: SectionIssuesBannerProps) {
  // Filter out 'info' severity issues - only show errors and warnings
  const displayableIssues = issues.filter(i => i.severity === 'error' || i.severity === 'warning');

  if (displayableIssues.length === 0) {
    return null;
  }

  // Sort by severity (errors first, then warnings)
  const sortedIssues = [...displayableIssues].sort((a, b) => {
    if (a.severity === 'error' && b.severity !== 'error') return -1;
    if (a.severity !== 'error' && b.severity === 'error') return 1;
    return 0;
  });

  const displayIssues = sortedIssues.slice(0, maxDisplay);
  const remainingCount = sortedIssues.length - displayIssues.length;

  // Determine banner color based on highest severity
  const hasErrors = displayableIssues.some(i => i.severity === 'error');
  const bannerClasses = hasErrors
    ? 'bg-red-50 border-red-200'
    : 'bg-amber-50 border-amber-200';

  return (
    <div className={`rounded-md border p-3 mb-4 ${bannerClasses}`}>
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 mt-0.5">
          {hasErrors ? (
            <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-medium ${hasErrors ? 'text-red-800' : 'text-amber-800'}`}>
            {hasErrors ? 'Configuration Required' : 'Attention Needed'}
          </h4>
          <ul className="mt-1 space-y-1">
            {displayIssues.map((issue, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                {getSeverityIcon(issue.severity)}
                <span className={getSeverityTextColor(issue.severity)}>
                  {issue.message}
                  {issue.detail && (
                    <span className="text-gray-500 ml-1">— {issue.detail}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
          {remainingCount > 0 && (
            <p className="mt-1 text-xs text-gray-500">
              +{remainingCount} more issue{remainingCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
