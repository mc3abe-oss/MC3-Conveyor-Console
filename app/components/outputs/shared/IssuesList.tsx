'use client';

export interface Issue {
  severity: 'error' | 'warning' | 'info';
  code?: string;
  field?: string;
  message: string;
  recommendation?: string;
}

export interface IssuesListProps {
  issues: Issue[];
  className?: string;
  showEmpty?: boolean;
  emptyMessage?: string;
  groupBySeverity?: boolean;
}

export function IssuesList({
  issues,
  className = '',
  showEmpty = true,
  emptyMessage = 'No issues found',
}: IssuesListProps) {
  if (issues.length === 0) {
    if (!showEmpty) return null;
    return (
      <div className={'text-gray-500 text-sm py-4 text-center ' + className}>
        <span className="text-green-600">&#10003;</span> {emptyMessage}
      </div>
    );
  }

  const severityOrder = { error: 0, warning: 1, info: 2 };
  const sortedIssues = [...issues].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const severityConfig = {
    error: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', icon: '✗', label: 'Error' },
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', icon: '⚠', label: 'Warning' },
    info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', icon: 'ℹ', label: 'Info' },
  };

  return (
    <div className={'space-y-2 ' + className}>
      {sortedIssues.map((issue, index) => {
        const config = severityConfig[issue.severity];
        return (
          <div
            key={issue.code || index}
            className={'p-3 rounded border ' + config.bg + ' ' + config.border}
          >
            <div className={'flex items-start gap-2 ' + config.text}>
              <span className="flex-shrink-0">{config.icon}</span>
              <div className="flex-1">
                <div className="font-medium">{issue.message}</div>
                {issue.recommendation && (
                  <div className="text-sm mt-1 opacity-80">{issue.recommendation}</div>
                )}
                {issue.field && (
                  <div className="text-xs mt-1 opacity-60">Field: {issue.field}</div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default IssuesList;
