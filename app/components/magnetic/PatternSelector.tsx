/**
 * Pattern Selector Component
 *
 * UI for selecting and configuring bar patterns along the conveyor.
 *
 * Pattern modes:
 * - All Same: Every bar uses the same template
 * - Alternating: Two templates alternate A-B-A-B
 * - Interval: Secondary template every N bars
 *
 * Usage:
 * <PatternSelector
 *   pattern={currentPattern}
 *   onChange={(pattern) => setPattern(pattern)}
 *   templates={availableTemplates}
 * />
 */

'use client';

import React, { useMemo } from 'react';
import {
  BarPatternMode,
  BAR_PATTERN_MODE_LABELS,
} from '../../../src/models/magnetic_conveyor_v1/magnet-bar/schema';
import {
  PatternConfig,
  previewPattern,
  calculateBarCounts,
} from '../../../src/models/magnetic_conveyor_v1/magnet-bar/patterns';

// ============================================================================
// TYPES
// ============================================================================

export interface TemplateOption {
  id: string;
  name: string;
  capacity: number;
}

export interface PatternSelectorProps {
  /** Current pattern configuration */
  pattern: PatternConfig;
  /** Callback when pattern changes */
  onChange: (pattern: PatternConfig) => void;
  /** Available templates to choose from */
  templates: TemplateOption[];
  /** Total number of bars (for preview) */
  totalBars?: number;
  /** Whether the selector is disabled */
  disabled?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MODE_DESCRIPTIONS = {
  [BarPatternMode.AllSame]: 'Every bar uses the same configuration',
  [BarPatternMode.Alternating]: 'Two configurations alternate along the conveyor',
  [BarPatternMode.Interval]: 'Secondary configuration every N bars (e.g., sweeper)',
};

// ============================================================================
// COMPONENT
// ============================================================================

export function PatternSelector({
  pattern,
  onChange,
  templates,
  totalBars = 12,
  disabled = false,
}: PatternSelectorProps) {
  // Preview data
  const preview = useMemo(() => previewPattern(pattern, 12), [pattern]);
  const barCounts = useMemo(
    () => calculateBarCounts(pattern, totalBars),
    [pattern, totalBars]
  );

  // Update handlers
  const handleModeChange = (mode: BarPatternMode) => {
    onChange({
      ...pattern,
      mode,
      // Clear secondary if switching to all-same
      secondary_template_id: mode === BarPatternMode.AllSame ? undefined : pattern.secondary_template_id,
    });
  };

  const handlePrimaryChange = (templateId: string) => {
    onChange({ ...pattern, primary_template_id: templateId });
  };

  const handleSecondaryChange = (templateId: string) => {
    onChange({ ...pattern, secondary_template_id: templateId || undefined });
  };

  const handleIntervalChange = (value: number) => {
    onChange({ ...pattern, interval_count: Math.max(2, value) });
  };

  return (
    <div className="space-y-4">
      {/* Mode selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Pattern Mode
        </label>
        <div className="space-y-2">
          {Object.values(BarPatternMode).map((mode) => (
            <label
              key={mode}
              className={`
                flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                ${pattern.mode === mode
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'}
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <input
                type="radio"
                name="patternMode"
                value={mode}
                checked={pattern.mode === mode}
                onChange={() => handleModeChange(mode)}
                disabled={disabled}
                className="mt-0.5"
              />
              <div className="flex-1">
                <div className="font-medium text-sm text-gray-900">
                  {BAR_PATTERN_MODE_LABELS[mode]}
                </div>
                <div className="text-xs text-gray-500">
                  {MODE_DESCRIPTIONS[mode]}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Template selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Primary template */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Primary Template
          </label>
          <select
            value={pattern.primary_template_id}
            onChange={(e) => handlePrimaryChange(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          >
            <option value="">Select template...</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.capacity.toFixed(3)} lb)
              </option>
            ))}
          </select>
        </div>

        {/* Secondary template (for alternating/interval modes) */}
        {pattern.mode !== BarPatternMode.AllSame && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Secondary Template
            </label>
            <select
              value={pattern.secondary_template_id || ''}
              onChange={(e) => handleSecondaryChange(e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            >
              <option value="">Select template...</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.capacity.toFixed(3)} lb)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Interval input (for interval mode) */}
      {pattern.mode === BarPatternMode.Interval && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Secondary Every N Bars
          </label>
          <input
            type="number"
            min={2}
            max={20}
            value={pattern.interval_count ?? 4}
            onChange={(e) => handleIntervalChange(parseInt(e.target.value) || 4)}
            disabled={disabled}
            className="w-24 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          />
          <span className="ml-2 text-sm text-gray-500">
            (e.g., every 4th bar is secondary)
          </span>
        </div>
      )}

      {/* Pattern preview */}
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <div className="text-xs font-medium text-gray-500 mb-2">
          Pattern Preview (first 12 bars)
        </div>
        <div className="flex gap-1 items-end">
          {preview.map((bar) => (
            <div
              key={bar.position}
              className={`
                w-6 h-8 rounded-sm flex items-center justify-center text-xs font-medium
                ${bar.isPrimary
                  ? 'bg-blue-500 text-white'
                  : 'bg-red-500 text-white'}
              `}
              title={bar.isPrimary ? 'Primary' : 'Secondary'}
            >
              {bar.isPrimary ? 'A' : 'B'}
            </div>
          ))}
        </div>

        {/* Bar count summary */}
        <div className="mt-3 flex gap-4 text-xs text-gray-600">
          <span>
            <span className="inline-block w-3 h-3 bg-blue-500 rounded-sm mr-1 align-middle" />
            Primary: {barCounts.primary} bars
          </span>
          {barCounts.secondary > 0 && (
            <span>
              <span className="inline-block w-3 h-3 bg-red-500 rounded-sm mr-1 align-middle" />
              Secondary: {barCounts.secondary} bars
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default PatternSelector;
