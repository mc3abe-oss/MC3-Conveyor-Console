/**
 * DerivedGeometryCard - Display-only panel showing derived geometry values
 * Extracted from TabConveyorPhysical.tsx (v1.41 slice 3)
 *
 * Uses the shared ConveyorGeometryDiagram for engineering-style visualization.
 */

'use client';

import { GeometryMode } from '../../../../src/models/sliderbed_v1/schema';
import ConveyorGeometryDiagram from '../../ConveyorGeometryDiagram';

interface DerivedGeometry {
  L_cc_in: number;
  H_cc_in: number;
  theta_deg: number;
  rise_in: number;
}

interface DerivedGeometryCardProps {
  derivedGeometry: DerivedGeometry;
  geometryMode: GeometryMode;
}

/**
 * Stat tile for derived geometry display
 */
function GeometryStat({
  label,
  value,
  subtext,
  derived,
}: {
  label: string;
  value: string;
  subtext?: string;
  derived?: boolean;
}) {
  return (
    <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
      <div className="text-[11px] font-medium text-gray-500">{label}</div>
      <div
        className={[
          'mt-1 text-lg font-semibold tabular-nums',
          derived ? 'text-blue-600' : 'text-gray-900',
        ].join(' ')}
      >
        {value}
      </div>
      {subtext && (
        <div className="text-xs text-gray-400">{subtext}</div>
      )}
    </div>
  );
}

/**
 * Map GeometryMode to inputMode for the diagram
 */
function mapGeometryModeToInputMode(
  mode: GeometryMode
): 'length-angle' | 'horizontal-angle' | 'horizontal-rise' {
  switch (mode) {
    case GeometryMode.LengthAngle:
      return 'length-angle';
    case GeometryMode.HorizontalAngle:
      return 'horizontal-angle';
    case GeometryMode.HorizontalRise:
    case GeometryMode.HorizontalTob: // Legacy mode, treated same as H_RISE
      return 'horizontal-rise';
    default:
      return 'length-angle';
  }
}

export default function DerivedGeometryCard({
  derivedGeometry,
  geometryMode,
}: DerivedGeometryCardProps) {
  const inputMode = mapGeometryModeToInputMode(geometryMode);

  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-xs font-semibold tracking-wide text-gray-600 uppercase">
          Derived Geometry
        </h4>
        <div className="text-xs text-gray-500">
          <span className="text-blue-600 font-medium">Blue</span> = derived
        </div>
      </div>

      {/* Diagram + Stats layout */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Geometry Diagram */}
        <div className="flex-shrink-0 flex items-center justify-center sm:justify-start w-full sm:w-[280px]">
          <ConveyorGeometryDiagram
            inputMode={inputMode}
            lengthCC={derivedGeometry.L_cc_in}
            horizontalRun={derivedGeometry.H_cc_in}
            inclineAngle={derivedGeometry.theta_deg}
            rise={derivedGeometry.rise_in}
          />
        </div>

        {/* Stats grid */}
        <div className="flex-1 grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <GeometryStat
            label="L (C-C)"
            value={`${derivedGeometry.L_cc_in.toFixed(1)}"`}
            derived={geometryMode !== GeometryMode.LengthAngle}
          />
          <GeometryStat
            label="H (Horizontal)"
            value={`${derivedGeometry.H_cc_in.toFixed(1)}"`}
            derived={geometryMode === GeometryMode.LengthAngle}
          />
          <GeometryStat
            label="Angle"
            value={Math.abs(derivedGeometry.theta_deg) < 0.01 ? '0.0°' : `${derivedGeometry.theta_deg.toFixed(1)}°`}
            subtext={Math.abs(derivedGeometry.theta_deg) < 0.01 ? 'Flat' : undefined}
            derived={false}
          />
          <GeometryStat
            label="Rise"
            value={`${derivedGeometry.rise_in.toFixed(1)}"`}
            derived={true}
          />
        </div>
      </div>
    </div>
  );
}
