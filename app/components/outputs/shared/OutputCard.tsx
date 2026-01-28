'use client';

import { ReactNode } from 'react';

export interface OutputCardProps {
  title: string;
  children: ReactNode;
  className?: string;
  headerRight?: ReactNode;
  status?: 'normal' | 'warning' | 'error' | 'success';
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export function OutputCard({
  title,
  children,
  className = '',
  headerRight,
  status = 'normal',
}: OutputCardProps) {
  const statusBorders = {
    normal: 'border-gray-200',
    warning: 'border-amber-300',
    error: 'border-red-300',
    success: 'border-green-300',
  };

  return (
    <div className={'bg-white border rounded-lg p-4 ' + statusBorders[status] + ' ' + className}>
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        {headerRight && <div>{headerRight}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

export default OutputCard;
