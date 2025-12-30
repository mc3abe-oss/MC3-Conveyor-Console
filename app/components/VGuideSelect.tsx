/**
 * VGuideSelect Component (v1.22.1)
 *
 * Dropdown for selecting a V-Guide profile from the admin-managed catalog.
 *
 * Display format: "O (K10)" if na_letter exists, else "K10"
 * Stores the canonical K-code in inputs.v_guide_key
 *
 * Handles backward compatibility:
 * - Old configs saved with NA letters (O, A, B, C) are translated to K-codes
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { VGuideItem, translateVGuideKey } from '../api/v-guides/route';

interface VGuideSelectProps {
  id?: string;
  value: string | undefined;
  onChange: (key: string | undefined, vguide: VGuideItem | undefined) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function VGuideSelect({
  id,
  value,
  onChange,
  required = false,
  disabled = false,
  className = '',
}: VGuideSelectProps) {
  const [vguides, setVguides] = useState<VGuideItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Translate legacy NA letter values to K-codes for display
  const translatedValue = useMemo(() => translateVGuideKey(value), [value]);

  // Fetch v-guides on mount
  useEffect(() => {
    async function fetchVGuides() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/v-guides');
        if (!response.ok) {
          throw new Error('Failed to fetch v-guides');
        }
        const data = await response.json();
        setVguides(data);
      } catch (err) {
        console.error('VGuideSelect fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load v-guides');
      } finally {
        setIsLoading(false);
      }
    }
    fetchVGuides();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedKey = e.target.value || undefined;
    const selectedVGuide = vguides.find((v) => v.key === selectedKey);
    // Always save the K-code (canonical key)
    onChange(selectedKey, selectedVGuide);
  };

  // Find the selected v-guide for display (using translated value)
  const selectedVGuide = vguides.find((v) => v.key === translatedValue);

  if (isLoading) {
    return (
      <select id={id} className={`input ${className}`} disabled>
        <option>Loading...</option>
      </select>
    );
  }

  if (error) {
    return (
      <select id={id} className={`input border-red-300 ${className}`} disabled>
        <option>Error loading v-guides</option>
      </select>
    );
  }

  return (
    <div>
      <select
        id={id}
        value={translatedValue || ''}
        onChange={handleChange}
        className={`input ${className}`}
        required={required}
        disabled={disabled}
      >
        <option value="">Select V-Guide...</option>
        {vguides.map((vguide) => (
          <option key={vguide.key} value={vguide.key}>
            {vguide.label}
          </option>
        ))}
      </select>
      {/* Show min pulley info when a v-guide is selected */}
      {selectedVGuide && (
        <p className="text-xs text-gray-500 mt-1">
          Min pulley: {selectedVGuide.min_pulley_dia_solid_in}" (solid) / {selectedVGuide.min_pulley_dia_notched_in}" (notched)
        </p>
      )}
    </div>
  );
}

/**
 * Get V-Guide data by key (for use in formulas/calculations)
 * Handles backward compatibility for legacy NA letter keys
 */
export async function fetchVGuideByKey(key: string): Promise<VGuideItem | null> {
  try {
    // Translate legacy NA letters to K-codes
    const translatedKey = translateVGuideKey(key);
    if (!translatedKey) return null;

    const response = await fetch('/api/v-guides');
    if (!response.ok) return null;
    const vguides = await response.json() as VGuideItem[];
    return vguides.find((v) => v.key === translatedKey) || null;
  } catch {
    return null;
  }
}

// Re-export the translation function for use elsewhere
export { translateVGuideKey } from '../api/v-guides/route';
