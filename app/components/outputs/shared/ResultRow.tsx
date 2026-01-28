'use client';

import { formatValue } from './formatValue';

export interface ResultRowProps {
  label: string;
  value: unknown;
  unit?: string;
  precision?: number;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
  highlight?: boolean;
  status?: 'normal' | 'warning' | 'error' | 'success';
}

export function ResultRow({
  label,
  value,
  unit,
  precision,
  className = '',
  labelClassName = '',
  valueClassName = '',
  highlight = false,
  status = 'normal',
}: ResultRowProps) {
  const statusColors = {
    normal: '',
    warning: 'text-amber-600',
    error: 'text-red-600',
    success: 'text-green-600',
  };

  const statusColor = statusColors[status];
  const highlightClass = highlight ? 'font-semibold' : '';

  return (
    <div className={'flex justify-between items-center ' + className}>
      <span className={'text-gray-600 ' + labelClassName}>{label}:</span>
      <span className={'font-mono ' + highlightClass + ' ' + statusColor + ' ' + valueClassName}>
        {formatValue(value, { precision, unit })}
      </span>
    </div>
  );
}

export default ResultRow;
