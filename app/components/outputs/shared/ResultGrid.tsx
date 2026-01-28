'use client';

import { ResultRow } from './ResultRow';

export interface ResultItem {
  key?: string;
  label: string;
  value: unknown;
  unit?: string;
  precision?: number;
  highlight?: boolean;
  status?: 'normal' | 'warning' | 'error' | 'success';
}

export interface ResultGridProps {
  results: ResultItem[];
  columns?: 1 | 2;
  className?: string;
  gap?: 'sm' | 'md' | 'lg';
}

export function ResultGrid({
  results,
  columns = 2,
  className = '',
  gap = 'md',
}: ResultGridProps) {
  const gapClasses = {
    sm: 'gap-x-2 gap-y-1',
    md: 'gap-x-4 gap-y-2',
    lg: 'gap-x-6 gap-y-3',
  };

  const gridCols = columns === 1 ? 'grid-cols-1' : 'grid-cols-2';

  // Filter out null/undefined results
  const validResults = results.filter(r => r.value !== undefined);

  return (
    <div className={'grid text-sm ' + gridCols + ' ' + gapClasses[gap] + ' ' + className}>
      {validResults.map((result, index) => (
        <ResultRow
          key={result.key || result.label + '-' + index}
          label={result.label}
          value={result.value}
          unit={result.unit}
          precision={result.precision}
          highlight={result.highlight}
          status={result.status}
        />
      ))}
    </div>
  );
}

export default ResultGrid;
