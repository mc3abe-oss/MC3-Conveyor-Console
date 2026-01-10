/**
 * SegmentedControl - Pill-style toggle for mutually exclusive options
 *
 * Accessible segmented control with keyboard navigation and proper ARIA roles.
 * Follows the same styling patterns as the app's existing inputs and buttons.
 */

'use client';

import { useId, useCallback, KeyboardEvent } from 'react';

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  /** Unique name for the control (used for accessibility) */
  name: string;
  /** Currently selected value */
  value: T;
  /** Available options */
  options: SegmentedControlOption<T>[];
  /** Callback when selection changes */
  onChange: (value: T) => void;
  /** Optional className for the container */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

export default function SegmentedControl<T extends string>({
  name,
  value,
  options,
  onChange,
  className = '',
  disabled = false,
}: SegmentedControlProps<T>) {
  const groupId = useId();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
      let newIndex: number | null = null;

      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          newIndex = currentIndex === 0 ? options.length - 1 : currentIndex - 1;
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          newIndex = currentIndex === options.length - 1 ? 0 : currentIndex + 1;
          break;
        case 'Home':
          e.preventDefault();
          newIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          newIndex = options.length - 1;
          break;
      }

      if (newIndex !== null) {
        onChange(options[newIndex].value);
        // Focus the new button after state update
        const container = e.currentTarget.parentElement;
        if (container) {
          const buttons = container.querySelectorAll('button');
          buttons[newIndex]?.focus();
        }
      }
    },
    [options, onChange]
  );

  return (
    <div
      role="radiogroup"
      aria-label={name}
      className={`inline-flex rounded-md border border-gray-300 bg-gray-100 p-0.5 ${className}`}
    >
      {options.map((option, index) => {
        const isSelected = value === option.value;
        const buttonId = `${groupId}-${option.value}`;

        return (
          <button
            key={option.value}
            id={buttonId}
            type="button"
            role="radio"
            aria-checked={isSelected}
            tabIndex={isSelected ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`
              px-3 py-1.5 text-xs font-medium rounded transition-all
              focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1
              ${
                isSelected
                  ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                  : 'bg-transparent text-gray-600 hover:text-gray-900 border border-transparent'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
