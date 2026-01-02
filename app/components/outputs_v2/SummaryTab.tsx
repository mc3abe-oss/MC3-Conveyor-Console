'use client';

import clsx from 'clsx';
import { OutputsV2 } from '../../../src/models/sliderbed_v1/outputs_v2';

interface SummaryTabProps {
  outputs: OutputsV2;
}

type ReadinessStatus = 'ready' | 'ready_with_warnings' | 'needs_attention';

/**
 * SummaryTab - High-level conveyor summary with readiness banner
 * Answers: "Is it ready?"
 */
export default function SummaryTab({ outputs }: SummaryTabProps) {
  const { summary, calc_results, support_system, warnings_and_notes } = outputs;

  // Determine readiness status
  const errorCount = warnings_and_notes.filter((w) => w.severity === 'error').length;
  const warningCount = warnings_and_notes.filter((w) => w.severity === 'warning').length;

  const readinessStatus: ReadinessStatus =
    errorCount > 0 ? 'needs_attention' : warningCount > 0 ? 'ready_with_warnings' : 'ready';

  const readinessConfig = {
    ready: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: (
        <svg className="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      ),
      title: 'Ready for Production',
      subtitle: 'All validations passed. This configuration is ready for ordering.',
      textColor: 'text-green-800',
    },
    ready_with_warnings: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      icon: (
        <svg className="w-8 h-8 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      ),
      title: 'Ready with Warnings',
      subtitle: `${warningCount} warning${warningCount !== 1 ? 's' : ''} to review before ordering.`,
      textColor: 'text-yellow-800',
    },
    needs_attention: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: (
        <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
      ),
      title: 'Needs Attention',
      subtitle: `${errorCount} error${errorCount !== 1 ? 's' : ''} must be resolved before ordering.`,
      textColor: 'text-red-800',
    },
  };

  const config = readinessConfig[readinessStatus];

  return (
    <div className="space-y-6">
      {/* Readiness Banner */}
      <div className={clsx('rounded-lg border p-6', config.bg, config.border)}>
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">{config.icon}</div>
          <div>
            <h2 className={clsx('text-xl font-semibold', config.textColor)}>{config.title}</h2>
            <p className={clsx('mt-1 text-sm', config.textColor, 'opacity-80')}>{config.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Conveyor Summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="font-semibold text-gray-900 text-lg mb-4">Conveyor Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <SummaryField label="Type" value={summary.conveyor_type} capitalize />
          <SummaryField label="Duty" value={summary.duty} capitalize />
          <SummaryField label="Belt Speed" value={summary.belt_speed_fpm} unit="FPM" decimals={1} />
          <SummaryField label="Center Distance" value={summary.center_distance_in} unit="in" decimals={1} />
          <SummaryField label="Overall Length" value={summary.overall_length_in} unit="in" decimals={1} />
          <SummaryField label="Incline" value={summary.incline_deg} unit="°" decimals={1} />
        </div>
        {summary.environment_tags.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <span className="text-sm text-gray-600">Environment: </span>
            <div className="inline-flex flex-wrap gap-1 ml-1">
              {summary.environment_tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Power & Torque Requirements */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="font-semibold text-gray-900 text-lg mb-4">Power Requirements</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <SummaryField
            label="Required Power"
            value={calc_results.required_power_hp}
            unit="HP"
            decimals={3}
            highlight
          />
          <SummaryField
            label="Required Torque"
            value={calc_results.required_torque_inlb}
            unit="in-lb"
            decimals={1}
            highlight
          />
          <SummaryField
            label="Service Factor"
            value={calc_results.service_factor}
            decimals={2}
            highlight
          />
          <SummaryField label="Effective Tension" value={calc_results.effective_tension_lbf} unit="lbf" decimals={1} />
          <SummaryField label="Drive RPM" value={calc_results.drive_rpm} decimals={1} />
          {calc_results.wrap_angle_deg != null && (
            <SummaryField label="Wrap Angle" value={calc_results.wrap_angle_deg} unit="°" decimals={0} />
          )}
        </div>
      </div>

      {/* Support System */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="font-semibold text-gray-900 text-lg mb-4">Support System</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryField label="Type" value={support_system.support_type.replace(/_/g, ' ')} capitalize />
          <SummaryField label="Floor Supported" value={support_system.is_floor_supported ? 'Yes' : 'No'} />
          <SummaryField label="Has Legs" value={support_system.has_legs ? 'Yes' : 'No'} />
          <SummaryField label="Has Casters" value={support_system.has_casters ? 'Yes' : 'No'} />
        </div>
        {support_system.tob_relevance !== 'not_applicable' && (
          <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-600">
            <span className="font-medium">TOB Relevance:</span>{' '}
            <span className="capitalize">{support_system.tob_relevance.replace(/_/g, ' ')}</span>
          </div>
        )}
        {support_system.notes && (
          <p className="mt-2 text-sm text-gray-500 italic">{support_system.notes}</p>
        )}
      </div>
    </div>
  );
}

function SummaryField({
  label,
  value,
  unit,
  decimals,
  capitalize,
  highlight,
}: {
  label: string;
  value: string | number | null | undefined;
  unit?: string;
  decimals?: number;
  capitalize?: boolean;
  highlight?: boolean;
}) {
  let displayValue: string;
  if (value == null) {
    displayValue = '—';
  } else if (typeof value === 'number') {
    displayValue = decimals !== undefined ? value.toFixed(decimals) : String(value);
    if (unit) displayValue += ` ${unit}`;
  } else {
    displayValue = capitalize ? value.charAt(0).toUpperCase() + value.slice(1) : value;
  }

  return (
    <div className={clsx(highlight && 'bg-blue-50 rounded-lg p-3 -m-1')}>
      <dt className="text-xs text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className={clsx('mt-1 font-mono text-lg', highlight ? 'font-semibold text-blue-900' : 'text-gray-900')}>
        {displayValue}
      </dd>
    </div>
  );
}
