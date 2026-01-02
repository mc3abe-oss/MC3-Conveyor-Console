'use client';

import clsx from 'clsx';
import { OutputsV2, OutputMessageV2 } from '../../../src/models/sliderbed_v1/outputs_v2';

interface ValidationTabProps {
  outputs: OutputsV2;
}

/**
 * ValidationTab - Warnings and validation messages list
 */
export default function ValidationTab({ outputs }: ValidationTabProps) {
  const { warnings_and_notes: warnings } = outputs;

  // Group by severity
  const errors = warnings.filter((w) => w.severity === 'error');
  const warningList = warnings.filter((w) => w.severity === 'warning');
  const info = warnings.filter((w) => w.severity === 'info');

  // Overall status
  const hasErrors = errors.length > 0;
  const hasWarnings = warningList.length > 0;

  return (
    <div className="space-y-4">
      {/* Status Summary */}
      <div
        className={clsx(
          'p-4 rounded-lg border',
          hasErrors && 'bg-red-50 border-red-200',
          !hasErrors && hasWarnings && 'bg-yellow-50 border-yellow-200',
          !hasErrors && !hasWarnings && 'bg-green-50 border-green-200'
        )}
      >
        <div className="flex items-center gap-2">
          {hasErrors ? (
            <>
              <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-semibold text-red-800">
                {errors.length} Error{errors.length !== 1 ? 's' : ''} Found
              </span>
            </>
          ) : hasWarnings ? (
            <>
              <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-semibold text-yellow-800">
                {warningList.length} Warning{warningList.length !== 1 ? 's' : ''} Found
              </span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-semibold text-green-800">All Validations Passed</span>
            </>
          )}
        </div>
        <p className="mt-1 text-sm opacity-75">
          {warnings.length === 0
            ? 'No issues detected'
            : `${warnings.length} total message${warnings.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-red-800 mb-2">Errors</h3>
          <div className="space-y-2">
            {errors.map((msg, i) => (
              <MessageCard key={i} message={msg} />
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {warningList.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-yellow-800 mb-2">Warnings</h3>
          <div className="space-y-2">
            {warningList.map((msg, i) => (
              <MessageCard key={i} message={msg} />
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      {info.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-blue-800 mb-2">Information</h3>
          <div className="space-y-2">
            {info.map((msg, i) => (
              <MessageCard key={i} message={msg} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MessageCard({ message }: { message: OutputMessageV2 }) {
  const severityStyles = {
    error: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200',
    info: 'bg-blue-50 border-blue-200',
  };

  const textStyles = {
    error: 'text-red-800',
    warning: 'text-yellow-800',
    info: 'text-blue-800',
  };

  return (
    <div className={clsx('p-3 rounded-lg border', severityStyles[message.severity])}>
      <div className="flex items-start justify-between gap-2">
        <div className={clsx('font-mono text-xs', textStyles[message.severity])}>
          {message.code}
        </div>
        <div className="flex gap-1">
          {message.impacts.map((impact) => (
            <span
              key={impact}
              className="px-1.5 py-0.5 bg-white bg-opacity-50 text-xs rounded capitalize"
            >
              {impact}
            </span>
          ))}
        </div>
      </div>
      <p className={clsx('mt-1 text-sm', textStyles[message.severity])}>{message.message}</p>
      {message.recommendation && (
        <p className={clsx('mt-2 text-xs opacity-75', textStyles[message.severity])}>
          <span className="font-medium">Recommendation:</span> {message.recommendation}
        </p>
      )}
      {message.related_component_ids.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {message.related_component_ids.map((id) => (
            <span
              key={id}
              className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded font-mono"
            >
              {id}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
