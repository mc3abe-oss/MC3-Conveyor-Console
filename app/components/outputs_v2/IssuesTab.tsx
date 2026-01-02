'use client';

import clsx from 'clsx';
import { OutputsV2, OutputMessageV2 } from '../../../src/models/sliderbed_v1/outputs_v2';

interface IssuesTabProps {
  outputs: OutputsV2;
}

/**
 * IssuesTab - Consolidated validation issues grouped by severity
 * Answers: "What needs fixing?"
 */
export default function IssuesTab({ outputs }: IssuesTabProps) {
  const { warnings_and_notes: issues } = outputs;

  // Group by severity
  const errors = issues.filter((w) => w.severity === 'error');
  const warnings = issues.filter((w) => w.severity === 'warning');
  const info = issues.filter((w) => w.severity === 'info');

  const hasErrors = errors.length > 0;
  const hasWarnings = warnings.length > 0;
  const hasInfo = info.length > 0;
  const hasAnyIssues = issues.length > 0;

  return (
    <div className="space-y-6">
      {/* Status Summary Banner */}
      <div
        className={clsx(
          'p-5 rounded-lg border',
          hasErrors && 'bg-red-50 border-red-200',
          !hasErrors && hasWarnings && 'bg-yellow-50 border-yellow-200',
          !hasErrors && !hasWarnings && 'bg-green-50 border-green-200'
        )}
      >
        <div className="flex items-center gap-3">
          {hasErrors ? (
            <>
              <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <span className="font-semibold text-red-800 text-lg">
                  {errors.length} Error{errors.length !== 1 ? 's' : ''} Found
                </span>
                <p className="text-sm text-red-700 mt-0.5">
                  These must be resolved before ordering components.
                </p>
              </div>
            </>
          ) : hasWarnings ? (
            <>
              <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <span className="font-semibold text-yellow-800 text-lg">
                  {warnings.length} Warning{warnings.length !== 1 ? 's' : ''} Found
                </span>
                <p className="text-sm text-yellow-700 mt-0.5">
                  Review these before finalizing your order.
                </p>
              </div>
            </>
          ) : (
            <>
              <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <span className="font-semibold text-green-800 text-lg">No Issues Found</span>
                <p className="text-sm text-green-700 mt-0.5">
                  All validations passed. Configuration is ready.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Errors Section */}
      {hasErrors && (
        <IssueSection
          title="Errors"
          subtitle="Must be resolved"
          severity="error"
          issues={errors}
        />
      )}

      {/* Warnings Section */}
      {hasWarnings && (
        <IssueSection
          title="Warnings"
          subtitle="Should be reviewed"
          severity="warning"
          issues={warnings}
        />
      )}

      {/* Info Section */}
      {hasInfo && (
        <IssueSection
          title="Information"
          subtitle="For your reference"
          severity="info"
          issues={info}
        />
      )}

      {/* Empty State */}
      {!hasAnyIssues && (
        <div className="text-center py-8">
          <svg
            className="w-12 h-12 mx-auto text-green-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="mt-3 text-gray-500">
            No issues to display. Your configuration passed all validations.
          </p>
        </div>
      )}
    </div>
  );
}

function IssueSection({
  title,
  subtitle,
  severity,
  issues,
}: {
  title: string;
  subtitle: string;
  severity: 'error' | 'warning' | 'info';
  issues: OutputMessageV2[];
}) {
  const headerColors = {
    error: 'text-red-800',
    warning: 'text-yellow-800',
    info: 'text-blue-800',
  };

  return (
    <div>
      <div className="flex items-baseline gap-2 mb-3">
        <h3 className={clsx('text-lg font-semibold', headerColors[severity])}>{title}</h3>
        <span className={clsx('text-sm', headerColors[severity], 'opacity-70')}>
          ({issues.length}) &middot; {subtitle}
        </span>
      </div>
      <div className="space-y-3">
        {issues.map((issue, i) => (
          <IssueCard key={`${issue.code}-${i}`} issue={issue} />
        ))}
      </div>
    </div>
  );
}

function IssueCard({ issue }: { issue: OutputMessageV2 }) {
  const severityStyles = {
    error: {
      card: 'bg-red-50 border-red-200',
      code: 'bg-red-100 text-red-700',
      text: 'text-red-800',
      light: 'text-red-700',
    },
    warning: {
      card: 'bg-yellow-50 border-yellow-200',
      code: 'bg-yellow-100 text-yellow-700',
      text: 'text-yellow-800',
      light: 'text-yellow-700',
    },
    info: {
      card: 'bg-blue-50 border-blue-200',
      code: 'bg-blue-100 text-blue-700',
      text: 'text-blue-800',
      light: 'text-blue-700',
    },
  };

  const styles = severityStyles[issue.severity];

  return (
    <div className={clsx('p-4 rounded-lg border', styles.card)}>
      {/* Header: Code + Impacts */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <span className={clsx('px-2 py-1 text-xs font-mono rounded', styles.code)}>
          {issue.code}
        </span>
        {issue.impacts.length > 0 && (
          <div className="flex gap-1.5 flex-wrap justify-end">
            {issue.impacts.map((impact) => (
              <span
                key={impact}
                className="px-2 py-0.5 bg-white bg-opacity-60 text-xs rounded capitalize text-gray-700"
              >
                {impact}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Message */}
      <p className={clsx('text-sm font-medium', styles.text)}>{issue.message}</p>

      {/* Recommendation */}
      {issue.recommendation && (
        <div className={clsx('mt-3 text-sm', styles.light)}>
          <span className="font-semibold">Recommendation:</span>{' '}
          <span className="opacity-90">{issue.recommendation}</span>
        </div>
      )}

      {/* Affected Components */}
      {issue.related_component_ids.length > 0 && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500">Affected:</span>
          {issue.related_component_ids.map((id) => (
            <span
              key={id}
              className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded font-mono"
            >
              {id}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
