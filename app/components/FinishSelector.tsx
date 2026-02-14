/**
 * FinishSelector - Smart Paint and Color Selection Component
 *
 * Features:
 * - Coating method selection (Powder Coat recommended, Wet Paint non-standard)
 * - Admin-managed color dropdown for powder coat
 * - Stock colors sorted first, non-stock next, CUSTOM last
 * - Warning banner for wet paint
 * - Required custom note for non-stock/custom selections or wet paint
 * - Identical behavior for Conveyor and Guarding categories
 * - Single-line display: "NAME — DESCRIPTION"
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import { CoatingMethod, COATING_METHOD_LABELS } from '../../src/models/sliderbed_v1/schema';

// Powder color option from API
interface PowderColorOption {
  id: string;
  code: string;
  name: string;
  description: string;
  is_stock: boolean;
  is_default: boolean;
  sort_order: number;
}

export type FinishCategory = 'conveyor' | 'guarding';

interface FinishSelectorProps {
  /** Category: 'conveyor' or 'guarding' */
  category: FinishCategory;

  /** Current coating method value */
  coatingMethod: CoatingMethod | string | undefined;

  /** Current powder color code */
  colorCode: string | undefined;

  /** Current custom note value */
  customNote: string | undefined;

  /** Callback when coating method changes */
  onCoatingMethodChange: (value: CoatingMethod) => void;

  /** Callback when color code changes */
  onColorCodeChange: (value: string | undefined) => void;

  /** Callback when custom note changes */
  onCustomNoteChange: (value: string | undefined) => void;

  /** ID prefix for form elements */
  idPrefix: string;

  /** Optional className for container */
  className?: string;
}

/**
 * Format color option for display: "NAME — DESCRIPTION"
 */
function formatColorDisplay(opt: PowderColorOption): string {
  return `${opt.name} — ${opt.description}`;
}

export default function FinishSelector({
  category,
  coatingMethod,
  colorCode,
  customNote,
  onCoatingMethodChange,
  onColorCodeChange,
  onCustomNoteChange,
  idPrefix,
  className,
}: FinishSelectorProps) {
  // Local state for color options
  const [colorOptions, setColorOptions] = useState<PowderColorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Normalize coating method
  const currentMethod = coatingMethod || CoatingMethod.PowderCoat;
  const isPowderCoat = currentMethod === CoatingMethod.PowderCoat || currentMethod === 'powder_coat';
  const isWetPaint = currentMethod === CoatingMethod.WetPaint || currentMethod === 'wet_paint';

  // Fetch color options when category changes
  useEffect(() => {
    async function fetchColors() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/paint-colors?category=${category}`);
        if (!response.ok) {
          throw new Error('Failed to fetch color options');
        }
        const data = await response.json() as PowderColorOption[];
        setColorOptions(data);
        // NOTE: Default color tracking removed - user must explicitly select color
      } catch (err) {
        console.error('Error fetching powder colors:', err);
        setError('Failed to load color options');
      } finally {
        setLoading(false);
      }
    }

    void fetchColors();
  }, [category]);

  // NOTE: Auto-selection of default color has been removed (paint logic fix).
  // Color must be explicitly selected by the user.

  // Find selected color option
  const selectedColor = colorOptions.find((opt) => opt.code === colorCode);

  // Determine if custom note is required
  const customNoteRequired =
    isWetPaint ||
    (isPowderCoat && selectedColor && (!selectedColor.is_stock || selectedColor.code === 'CUSTOM'));

  // Handle coating method change
  const handleCoatingMethodChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newMethod = e.target.value as CoatingMethod;
      onCoatingMethodChange(newMethod);

      // Clear color selection when switching away from powder coat
      if (newMethod !== CoatingMethod.PowderCoat) {
        onColorCodeChange(undefined);
      }
      // NOTE: Auto-selection when switching to powder coat has been removed (paint logic fix).
      // User must explicitly select a color.
    },
    [onCoatingMethodChange, onColorCodeChange]
  );

  // Handle color selection change
  const handleColorChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value || undefined;
      onColorCodeChange(value);
    },
    [onColorCodeChange]
  );

  // Handle custom note change
  const handleNoteChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value || undefined;
      onCustomNoteChange(value);
    },
    [onCustomNoteChange]
  );

  // Group colors: stock first, non-stock next, CUSTOM last
  // API already sorts by is_stock desc, sort_order asc, name asc
  const stockColors = colorOptions.filter((opt) => opt.is_stock && opt.code !== 'CUSTOM');
  const nonStockColors = colorOptions.filter((opt) => !opt.is_stock && opt.code !== 'CUSTOM');
  const customOption = colorOptions.find((opt) => opt.code === 'CUSTOM');

  return (
    <div className={clsx('space-y-3', className)}>
      {/* Coating Method Dropdown */}
      <div>
        <label htmlFor={`${idPrefix}_coating_method`} className="label text-xs">
          Coating Method
        </label>
        <select
          id={`${idPrefix}_coating_method`}
          className="input text-sm py-1.5"
          value={currentMethod}
          onChange={handleCoatingMethodChange}
        >
          {Object.entries(COATING_METHOD_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Wet Paint Warning Banner */}
      {isWetPaint && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-2">
            <svg
              className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-amber-800">Wet Paint is non-standard</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Use Powder Coat when possible. Wet paint may increase lead time and cost.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Powder Coat Color Dropdown */}
      {isPowderCoat && (
        <div>
          <label htmlFor={`${idPrefix}_color`} className="label text-xs">
            Color <span className="text-red-500">*</span>
          </label>
          {loading ? (
            <div className="input text-sm py-1.5 bg-gray-50 text-gray-400">Loading colors...</div>
          ) : error ? (
            <div className="input text-sm py-1.5 bg-red-50 text-red-500 border-red-200">{error}</div>
          ) : (
            <select
              id={`${idPrefix}_color`}
              className="input text-sm py-1.5"
              value={colorCode || ''}
              onChange={handleColorChange}
              required
            >
              <option value="">Select a color...</option>

              {/* Stock Colors Group */}
              {stockColors.length > 0 && (
                <optgroup label="Stock Colors">
                  {stockColors.map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {formatColorDisplay(opt)}
                    </option>
                  ))}
                </optgroup>
              )}

              {/* Non-Stock Colors Group */}
              {nonStockColors.length > 0 && (
                <optgroup label="Non-Stock Colors">
                  {nonStockColors.map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {formatColorDisplay(opt)}
                    </option>
                  ))}
                </optgroup>
              )}

              {/* Custom Option */}
              {customOption && (
                <optgroup label="Other">
                  <option value={customOption.code}>{formatColorDisplay(customOption)}</option>
                </optgroup>
              )}
            </select>
          )}

          {/* Non-stock indicator */}
          {selectedColor && !selectedColor.is_stock && selectedColor.code !== 'CUSTOM' && (
            <p className="text-xs text-amber-600 mt-1">
              This is a non-stock color. Please provide details below.
            </p>
          )}
        </div>
      )}

      {/* Custom Note Field */}
      {customNoteRequired && (
        <div>
          <label htmlFor={`${idPrefix}_note`} className="label text-xs">
            {isWetPaint ? 'Paint Details' : 'Color Details'} <span className="text-red-500">*</span>
          </label>
          <textarea
            id={`${idPrefix}_note`}
            className="input text-sm py-1.5 min-h-[60px]"
            value={customNote || ''}
            onChange={handleNoteChange}
            placeholder={
              isWetPaint
                ? 'Specify paint color, finish type, and any special requirements...'
                : selectedColor?.code === 'CUSTOM'
                  ? 'Specify the exact color code and any special requirements...'
                  : 'Provide details about this non-stock color selection...'
            }
            required
          />
        </div>
      )}
    </div>
  );
}

/**
 * Helper function to check if custom note is required for given inputs
 */
export function isFinishCustomNoteRequired(
  coatingMethod: CoatingMethod | string | undefined,
  colorCode: string | undefined,
  colorOptions: PowderColorOption[]
): boolean {
  const method = coatingMethod || CoatingMethod.PowderCoat;
  const isWetPaint = method === CoatingMethod.WetPaint || method === 'wet_paint';

  if (isWetPaint) return true;

  const selectedColor = colorOptions.find((opt) => opt.code === colorCode);
  if (!selectedColor) return false;

  return !selectedColor.is_stock || selectedColor.code === 'CUSTOM';
}
