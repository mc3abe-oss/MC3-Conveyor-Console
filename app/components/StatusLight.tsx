/**
 * StatusLight - Stoplight-style status indicator
 *
 * Always visible indicator showing green/yellow/red based on issue counts.
 * - Red: errors present (shows count)
 * - Yellow: warnings present, no errors (shows count)
 * - Green: no issues (no count, just dot)
 */

'use client';

interface StatusLightProps {
  errorCount: number;
  warningCount: number;
  size?: 'sm' | 'md';
}

type LightColor = 'green' | 'yellow' | 'red';

function getLightColor(errorCount: number, warningCount: number): LightColor {
  if (errorCount > 0) return 'red';
  if (warningCount > 0) return 'yellow';
  return 'green';
}

function getCount(errorCount: number, warningCount: number): number | null {
  if (errorCount > 0) return errorCount;
  if (warningCount > 0) return warningCount;
  return null; // Green shows no count
}

const COLOR_CLASSES: Record<LightColor, string> = {
  red: 'bg-red-500 dark:bg-red-600',
  yellow: 'bg-yellow-400 dark:bg-yellow-500',
  green: 'bg-green-500 dark:bg-green-600',
};

const SIZE_CLASSES = {
  sm: {
    dot: 'w-5 h-5 text-[10px]',
    emptyDot: 'w-3 h-3',
  },
  md: {
    dot: 'w-6 h-6 text-xs',
    emptyDot: 'w-4 h-4',
  },
};

export default function StatusLight({
  errorCount,
  warningCount,
  size = 'sm',
}: StatusLightProps) {
  const color = getLightColor(errorCount, warningCount);
  const count = getCount(errorCount, warningCount);
  const sizeConfig = SIZE_CLASSES[size];

  // Green (no count) uses smaller dot
  const dotClass = count === null ? sizeConfig.emptyDot : sizeConfig.dot;

  return (
    <span
      className={`
        inline-flex items-center justify-center
        rounded-full font-semibold text-white
        ${COLOR_CLASSES[color]}
        ${dotClass}
      `}
      aria-label={
        color === 'green'
          ? 'No issues'
          : color === 'yellow'
            ? `${count} warning${count !== 1 ? 's' : ''}`
            : `${count} error${count !== 1 ? 's' : ''}`
      }
    >
      {count !== null && count}
    </span>
  );
}
