/**
 * BeltPiwPilCard - Display belt PIW/PIL values with optional override inputs
 * Extracted from TabConveyorPhysical.tsx (v1.41 slice 4)
 */

'use client';

interface BeltPiwPilCardProps {
  beltCatalogKey: string | undefined;
  beltPiw: number | undefined;
  beltPil: number | undefined;
  beltPiwOverride: number | undefined;
  beltPilOverride: number | undefined;
  onPiwOverrideChange: (value: number | undefined) => void;
  onPilOverrideChange: (value: number | undefined) => void;
}

export default function BeltPiwPilCard({
  beltCatalogKey,
  beltPiw,
  beltPil,
  beltPiwOverride,
  beltPilOverride,
  onPiwOverrideChange,
  onPilOverrideChange,
}: BeltPiwPilCardProps) {
  // Only show when a belt is selected
  if (!beltCatalogKey) {
    return null;
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded px-2.5 py-1.5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        {/* PIW */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500">PIW:</span>
          {beltPiwOverride !== undefined ? (
            <>
              <input
                type="number"
                id="belt_piw_override"
                className="w-16 px-1.5 py-0.5 text-xs border border-amber-300 bg-amber-50 rounded"
                value={beltPiwOverride}
                onChange={(e) => onPiwOverrideChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                step="0.001"
              />
              <span className="text-xs text-gray-400">({beltPiw ?? '—'})</span>
              <button type="button" onClick={() => onPiwOverrideChange(undefined)} className="text-xs text-gray-500 hover:text-gray-700">×</button>
            </>
          ) : (
            <>
              <span className="font-medium text-blue-600">{beltPiw ?? '—'}</span>
              <button type="button" onClick={() => onPiwOverrideChange(beltPiw ?? 0.109)} className="text-xs text-blue-500 hover:text-blue-700">✎</button>
            </>
          )}
        </div>
        <span className="text-gray-300">|</span>
        {/* PIL */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500">PIL:</span>
          {beltPilOverride !== undefined ? (
            <>
              <input
                type="number"
                id="belt_pil_override"
                className="w-16 px-1.5 py-0.5 text-xs border border-amber-300 bg-amber-50 rounded"
                value={beltPilOverride}
                onChange={(e) => onPilOverrideChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                step="0.001"
              />
              <span className="text-xs text-gray-400">({beltPil ?? '—'})</span>
              <button type="button" onClick={() => onPilOverrideChange(undefined)} className="text-xs text-gray-500 hover:text-gray-700">×</button>
            </>
          ) : (
            <>
              <span className="font-medium text-blue-600">{beltPil ?? '—'}</span>
              <button type="button" onClick={() => onPilOverrideChange(beltPil ?? 0.109)} className="text-xs text-blue-500 hover:text-blue-700">✎</button>
            </>
          )}
        </div>
        <span className="text-xs text-gray-400">lb/in</span>
      </div>
    </div>
  );
}
