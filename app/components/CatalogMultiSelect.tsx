/**
 * CatalogMultiSelect Component (v1.9)
 *
 * A multi-select checkbox list that loads options from the catalog API.
 * Supports:
 * - Multiple selection via checkboxes
 * - Display of inactive/legacy items that are still selected
 * - Chips summary with "Clear All" option
 */

'use client';

import { useCatalog } from '../hooks/useCatalog';
import { CATALOG_KEYS, CatalogKey } from '../../src/lib/catalogs';

interface CatalogMultiSelectProps {
  catalogKey: CatalogKey;
  value: string[];
  onChange: (value: string[]) => void;
  id: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
}

export default function CatalogMultiSelect({
  catalogKey,
  value,
  onChange,
  id,
  className = '',
  required = false,
  disabled = false,
}: CatalogMultiSelectProps) {
  // Map the field name to the actual catalog_key in the database
  const actualCatalogKey = CATALOG_KEYS[catalogKey];
  const { items, isLoading, error } = useCatalog(actualCatalogKey);

  // Ensure value is always an array
  const selectedValues = Array.isArray(value) ? value : [];

  // Find any selected values that are NOT in the active catalog (inactive/legacy)
  const activeItemKeys = new Set(items.map((item) => item.item_key));
  const inactiveSelectedValues = selectedValues.filter((v) => !activeItemKeys.has(v));

  const handleCheckboxChange = (itemKey: string, checked: boolean) => {
    if (disabled) return;

    if (checked) {
      // Add to selection
      const newValue = [...selectedValues, itemKey];
      onChange(Array.from(new Set(newValue)).sort());
    } else {
      // Remove from selection
      const newValue = selectedValues.filter((v) => v !== itemKey);
      onChange(newValue);
    }
  };

  const handleClearAll = () => {
    if (disabled) return;
    // If required, keep at least one item (don't allow empty)
    if (required && items.length > 0) {
      onChange([items[0].item_key]);
    } else {
      onChange([]);
    }
  };

  const handleRemoveInactive = (itemKey: string) => {
    if (disabled) return;
    const newValue = selectedValues.filter((v) => v !== itemKey);
    onChange(newValue);
  };

  if (error) {
    return (
      <div className={`p-3 bg-red-50 border border-red-200 rounded ${className}`}>
        <p className="text-sm text-red-600">Error loading options</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`p-3 bg-gray-50 border border-gray-200 rounded ${className}`}>
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  // Dev warning if no options found
  if (items.length === 0 && inactiveSelectedValues.length === 0) {
    return (
      <div className={className}>
        <div className="p-3 bg-gray-50 border border-gray-200 rounded">
          <p className="text-sm text-gray-500">No options available</p>
        </div>
        <p className="text-xs text-yellow-600 mt-1">
          Dev Warning: No options found for catalog_key={actualCatalogKey} (field: {catalogKey})
        </p>
      </div>
    );
  }

  // Get label for item (from catalog or fallback to key)
  const getLabel = (itemKey: string): string => {
    const item = items.find((i) => i.item_key === itemKey);
    return item?.label || itemKey;
  };

  return (
    <div id={id} className={className}>
      {/* Selected chips summary */}
      {selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selectedValues.map((itemKey) => {
            const isInactive = inactiveSelectedValues.includes(itemKey);
            return (
              <span
                key={itemKey}
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  isInactive
                    ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {getLabel(itemKey)}
                {isInactive && (
                  <span className="ml-1 text-yellow-600">(Inactive)</span>
                )}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleCheckboxChange(itemKey, false)}
                    className="ml-1 text-gray-500 hover:text-gray-700"
                    aria-label={`Remove ${getLabel(itemKey)}`}
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
            );
          })}
          {selectedValues.length > 1 && !disabled && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Clear All
            </button>
          )}
        </div>
      )}

      {/* Inactive items warning */}
      {inactiveSelectedValues.length > 0 && (
        <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
          <strong>Note:</strong> Some selected options are no longer active in the catalog.
          You can remove them or keep them for backward compatibility.
        </div>
      )}

      {/* Checkbox list */}
      <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded p-3 bg-white">
        {items.map((item) => (
          <label
            key={item.item_key}
            className={`flex items-center text-sm ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'} p-1 rounded`}
          >
            <input
              type="checkbox"
              checked={selectedValues.includes(item.item_key)}
              onChange={(e) => handleCheckboxChange(item.item_key, e.target.checked)}
              disabled={disabled}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-gray-700">{item.label}</span>
          </label>
        ))}

        {/* Show inactive selected items at the end */}
        {inactiveSelectedValues.map((itemKey) => (
          <label
            key={itemKey}
            className={`flex items-center text-sm ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-yellow-50'} p-1 rounded bg-yellow-50`}
          >
            <input
              type="checkbox"
              checked={true}
              onChange={() => handleRemoveInactive(itemKey)}
              disabled={disabled}
              className="h-4 w-4 text-yellow-600 border-yellow-300 rounded focus:ring-yellow-500"
            />
            <span className="ml-2 text-yellow-700">
              {itemKey} <span className="text-xs">(Inactive)</span>
            </span>
          </label>
        ))}
      </div>

      {/* Validation message */}
      {required && selectedValues.length === 0 && (
        <p className="mt-1 text-xs text-red-600">At least one option must be selected</p>
      )}
    </div>
  );
}
