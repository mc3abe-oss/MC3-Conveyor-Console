'use client';

export interface StatusBadgeProps {
  status: 'ready' | 'warning' | 'error' | 'pending';
  label?: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, label, size = 'md' }: StatusBadgeProps) {
  const config = {
    ready: { bg: 'bg-green-100', text: 'text-green-700', defaultLabel: 'Ready' },
    warning: { bg: 'bg-amber-100', text: 'text-amber-700', defaultLabel: 'Warnings' },
    error: { bg: 'bg-red-100', text: 'text-red-700', defaultLabel: 'Errors' },
    pending: { bg: 'bg-gray-100', text: 'text-gray-600', defaultLabel: 'Pending' },
  };

  const { bg, text, defaultLabel } = config[status];
  const sizeClass = size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm';

  return (
    <span className={'rounded-full font-medium ' + bg + ' ' + text + ' ' + sizeClass}>
      {label || defaultLabel}
    </span>
  );
}

export default StatusBadge;
