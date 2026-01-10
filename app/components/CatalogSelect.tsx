/**
 * CatalogSelect Component
 *
 * A select dropdown that loads options from the catalog API
 */

'use client';

import { useCatalog } from '../hooks/useCatalog';
import { CATALOG_KEYS, CatalogKey } from '../../src/lib/catalogs';

interface CatalogSelectProps {
  catalogKey: CatalogKey;
  value: string;
  onChange: (value: string) => void;
  id: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  /** Show description_long below the select when available */
  showDescriptionLong?: boolean;
}

export default function CatalogSelect({
  catalogKey,
  value,
  onChange,
  id,
  className = 'input',
  required = false,
  disabled = false,
  showDescriptionLong = false,
}: CatalogSelectProps) {
  // Map the field name to the actual catalog_key in the database
  const actualCatalogKey = CATALOG_KEYS[catalogKey];
  const { items, isLoading, error } = useCatalog(actualCatalogKey);

  if (error) {
    return (
      <select id={id} className={className} disabled>
        <option>Error loading options</option>
      </select>
    );
  }

  if (isLoading) {
    return (
      <select id={id} className={className} disabled>
        <option>Loading...</option>
      </select>
    );
  }

  // Dev warning if no options found
  if (items.length === 0) {
    return (
      <div>
        <select id={id} className={className} disabled>
          <option>No options available</option>
        </select>
        <p className="text-xs text-yellow-600 mt-1">
          ⚠️ Dev Warning: No options found for catalog_key={actualCatalogKey} (field: {catalogKey})
        </p>
      </div>
    );
  }

  // Find the selected item to show description_long
  const selectedItem = items.find((item) => item.item_key === value);
  const descriptionLong = showDescriptionLong && selectedItem?.description_long;

  return (
    <div>
      <select
        id={id}
        className={className}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
      >
        {/* Placeholder option - user must explicitly select */}
        {!value && (
          <option value="">Select...</option>
        )}
        {items.map((item) => (
          <option key={item.item_key} value={item.item_key}>
            {item.label}
          </option>
        ))}
      </select>
      {descriptionLong && (
        <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded text-sm text-gray-600">
          {descriptionLong}
        </div>
      )}
    </div>
  );
}
