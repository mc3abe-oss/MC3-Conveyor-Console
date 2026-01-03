/**
 * Lagging Pattern Types and Constants
 *
 * Lagging pattern describes the surface pattern of the lagging material on a pulley.
 */

export type LaggingPattern =
  | 'none'
  | 'smooth'
  | 'herringbone_clockwise'
  | 'herringbone_counterclockwise'
  | 'straight_grooves'
  | 'diamond'
  | 'custom';

export const LAGGING_PATTERN_LABELS: Record<LaggingPattern, string> = {
  none: 'None',
  smooth: 'Smooth',
  herringbone_clockwise: 'Herringbone (Clockwise)',
  herringbone_counterclockwise: 'Herringbone (Counter-Clockwise)',
  straight_grooves: 'Straight Grooves',
  diamond: 'Diamond',
  custom: 'Custom',
};

export const VALID_LAGGING_PATTERNS: LaggingPattern[] = [
  'none',
  'smooth',
  'herringbone_clockwise',
  'herringbone_counterclockwise',
  'straight_grooves',
  'diamond',
  'custom',
];

/**
 * Validate a lagging pattern value
 */
export function isValidLaggingPattern(value: string): value is LaggingPattern {
  return VALID_LAGGING_PATTERNS.includes(value as LaggingPattern);
}
