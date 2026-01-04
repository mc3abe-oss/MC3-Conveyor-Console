/**
 * Thickness Library Types
 *
 * Unified types for sheet metal gauge and pulley wall thickness options.
 *
 * NOTE: Frame and Pulley dropdowns use the SAME options list
 * with the SAME label format.
 */

/**
 * Thickness measurement system
 * - gauge: Sheet metal gauge (e.g., 10 ga, 12 ga)
 * - fraction: Fractional inches (e.g., 3/16", 1/4")
 */
export type ThicknessSystem = 'gauge' | 'fraction';

/**
 * Canonical thickness option
 *
 * Each option represents a specific thickness with display label.
 * Both frame and pulley dropdowns show ALL active options with the same label.
 */
export interface ThicknessOption {
  /** Stable unique identifier (e.g., "ga_10", "frac_3_16") */
  key: string;

  /** Measurement system for this thickness */
  system: ThicknessSystem;

  /** Actual thickness in inches (full precision) */
  thickness_in: number;

  /** Display label for dropdown (same everywhere) */
  label: string;

  /** Sort order (lower = first, typically thickest to thinnest) */
  sort_order: number;

  /** Whether this option is currently active/visible */
  is_active: boolean;

  /** Optional notes about this thickness */
  notes?: string;
}
