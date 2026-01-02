'use client';

import clsx from 'clsx';
import { ComponentV2, ComponentStatus, OutputMessageV2 } from '../../../src/models/sliderbed_v1/outputs_v2';

interface ComponentCardProps {
  component: ComponentV2;
  warnings?: OutputMessageV2[];
  className?: string;
  children?: React.ReactNode;
}

/**
 * ComponentCard - Displays a component with its status and vendor packet info
 */
export default function ComponentCard({ component, warnings = [], className, children }: ComponentCardProps) {
  const statusColors: Record<ComponentStatus, string> = {
    ok: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    error: 'bg-red-100 text-red-800 border-red-200',
  };

  const statusIcons: Record<ComponentStatus, React.ReactNode> = {
    ok: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
    warning: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
    error: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    ),
  };

  // Get warnings related to this component
  const componentWarnings = warnings.filter(
    (w) => w.related_component_ids.includes(component.component_id as any)
  );

  return (
    <div className={clsx('bg-white border border-gray-200 rounded-lg overflow-hidden', className)}>
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h4 className="font-medium text-gray-900 capitalize">
            {component.role.replace(/_/g, ' ')}
          </h4>
          <p className="text-xs text-gray-500 font-mono">{component.component_id}</p>
        </div>
        <div
          className={clsx(
            'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border',
            statusColors[component.status]
          )}
        >
          {statusIcons[component.status]}
          <span className="capitalize">{component.status}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {children}

        {/* Validation Messages */}
        {component.validation.messages.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-600 mb-1">Validation Notes</p>
            <ul className="text-xs text-gray-600 space-y-0.5">
              {component.validation.messages.map((msg, i) => (
                <li key={i} className="flex items-start gap-1">
                  <span className="text-gray-400">-</span>
                  <span>{msg}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Related Warnings */}
        {componentWarnings.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            {componentWarnings.map((warning, i) => (
              <div
                key={i}
                className={clsx(
                  'p-2 rounded text-xs',
                  warning.severity === 'warning' && 'bg-yellow-50 text-yellow-800',
                  warning.severity === 'error' && 'bg-red-50 text-red-800',
                  warning.severity === 'info' && 'bg-blue-50 text-blue-800'
                )}
              >
                <div className="font-medium">{warning.code}</div>
                <p className="mt-0.5">{warning.message}</p>
                {warning.recommendation && (
                  <p className="mt-1 text-xs opacity-75">{warning.recommendation}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Assumptions */}
        {component.assumptions && component.assumptions.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-600 mb-1">Assumptions</p>
            <ul className="text-xs text-gray-500 space-y-0.5">
              {component.assumptions.map((assumption, i) => (
                <li key={i} className="italic">- {assumption}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Helper component for displaying key-value pairs within a ComponentCard
 */
export function ComponentField({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | number | null | undefined;
  unit?: string;
}) {
  return (
    <div className="flex justify-between items-center text-sm py-0.5">
      <span className="text-gray-600">{label}</span>
      <span className="font-mono text-gray-900">
        {value != null ? (typeof value === 'number' ? value.toFixed(2) : value) : '—'}
        {unit && value != null && <span className="text-xs text-gray-500 ml-1">{unit}</span>}
      </span>
    </div>
  );
}
