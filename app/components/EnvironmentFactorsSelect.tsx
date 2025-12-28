/**
 * EnvironmentFactorsSelect Component
 *
 * A multi-select dropdown for environmental factors with:
 * - Selected chips at the top with "x" to remove
 * - Dropdown button to add/remove factors
 * - Automatic normalization of legacy/invalid keys
 * - Search within dropdown (optional enhancement)
 *
 * This component replaces the checkbox-list CatalogMultiSelect for environment factors.
 */

'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useCatalog } from '../hooks/useCatalog';
import { CATALOG_KEYS } from '../../src/lib/catalogs';

/**
 * Legacy/blocked keys that should be automatically removed.
 * These are normalized out on load to clean up old saved configs.
 */
const LEGACY_BLOCKLIST = new Set([
  'indoor',
  'Indoor',
  'indoors',
  'Indoors',
  'indoor_inactive',
  'Indoor_Inactive',
]);

interface EnvironmentFactorsSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  id?: string;
  disabled?: boolean;
}

export default function EnvironmentFactorsSelect({
  value,
  onChange,
  id = 'environment_factors',
  disabled = false,
}: EnvironmentFactorsSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Load catalog items
  const actualCatalogKey = CATALOG_KEYS.environment_factors;
  const { items, isLoading, error } = useCatalog(actualCatalogKey);

  // Derive active options from catalog
  const activeOptions = useMemo(() => {
    return items.map((item) => ({
      value: item.item_key,
      label: item.label,
    }));
  }, [items]);

  const activeKeySet = useMemo(() => {
    return new Set(items.map((item) => item.item_key));
  }, [items]);

  // Ensure value is always an array
  const selectedValues = Array.isArray(value) ? value : [];

  /**
   * Normalize selected values by removing blocked and invalid keys.
   * This runs when catalog or inputs change.
   */
  useEffect(() => {
    if (isLoading || items.length === 0) return;

    const normalized = selectedValues.filter((key) => {
      // Remove blocked legacy keys
      if (LEGACY_BLOCKLIST.has(key)) return false;
      // Remove keys not in active catalog
      if (!activeKeySet.has(key)) return false;
      return true;
    });

    // Only update if changed to avoid render loops
    if (normalized.length !== selectedValues.length ||
        !normalized.every((v, i) => selectedValues[i] === v)) {
      onChange(normalized);
    }
  }, [items, isLoading, activeKeySet]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setSearchQuery('');
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleToggle = (optionValue: string) => {
    if (disabled) return;

    if (selectedValues.includes(optionValue)) {
      // Remove from selection
      onChange(selectedValues.filter((v) => v !== optionValue));
    } else {
      // Add to selection
      onChange([...selectedValues, optionValue]);
    }
  };

  const handleRemove = (optionValue: string) => {
    if (disabled) return;
    onChange(selectedValues.filter((v) => v !== optionValue));
  };

  const handleClearAll = () => {
    if (disabled) return;
    onChange([]);
  };

  // Get label for a value
  const getLabel = (val: string): string => {
    const option = activeOptions.find((o) => o.value === val);
    return option?.label || val;
  };

  // Filter options by search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return activeOptions;
    const query = searchQuery.toLowerCase();
    return activeOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(query) ||
        opt.value.toLowerCase().includes(query)
    );
  }, [activeOptions, searchQuery]);

  if (error) {
    return (
      <div className="p-3 bg-red-50 border border-red-200 rounded">
        <p className="text-sm text-red-600">Error loading environment factors</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-3 bg-gray-50 border border-gray-200 rounded">
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div id={id}>
      {/* Selected chips */}
      {selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selectedValues.map((val) => (
            <span
              key={val}
              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
            >
              {getLabel(val)}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(val)}
                  className="ml-1.5 text-blue-600 hover:text-blue-800 focus:outline-none"
                  aria-label={`Remove ${getLabel(val)}`}
                >
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              )}
            </span>
          ))}
          {selectedValues.length > 1 && !disabled && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Dropdown button */}
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`input w-full flex items-center justify-between text-left ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          }`}
        >
          <span className={selectedValues.length === 0 ? 'text-gray-500' : ''}>
            {selectedValues.length === 0
              ? 'Select environmental factors...'
              : `${selectedValues.length} selected`}
          </span>
          <svg
            className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown panel */}
        {isOpen && (
          <div
            ref={dropdownRef}
            className="absolute z-20 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg"
          >
            {/* Search input */}
            <div className="p-2 border-b border-gray-200">
              <input
                type="text"
                placeholder="Search factors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
            </div>

            {/* Options list */}
            <div className="max-h-48 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">No options found</div>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = selectedValues.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleToggle(option.value)}
                      className={`w-full flex items-center px-3 py-2 text-sm text-left hover:bg-gray-100 ${
                        isSelected ? 'bg-blue-50' : ''
                      }`}
                    >
                      <span
                        className={`flex-shrink-0 w-4 h-4 mr-2 rounded border ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600'
                            : 'border-gray-300'
                        } flex items-center justify-center`}
                      >
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </span>
                      <span className="text-gray-700">{option.label}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
