/**
 * DerivedGeometryCard - Display-only panel showing derived geometry values
 * Extracted from TabConveyorPhysical.tsx (v1.41 slice 3)
 *
 * User Feedback 2: Added SVG diagram showing conveyor geometry triangle
 */

'use client';

import { GeometryMode } from '../../../../src/models/sliderbed_v1/schema';

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
 * SVG diagram showing conveyor geometry triangle
 * - L (C-C) = hypotenuse (axis length between pulley centers)
 * - H = horizontal run (base)
 * - Rise = vertical rise (height)
 * - Angle = incline angle
 *
 * Colors match the derived value convention: blue = derived, gray = input
 */
function GeometryDiagram({
  derivedGeometry,
  geometryMode,
}: {
  derivedGeometry: DerivedGeometry;
  geometryMode: GeometryMode;
}) {
  const { L_cc_in, H_cc_in, theta_deg, rise_in } = derivedGeometry;

  // Determine which values are derived (blue) vs input (dark gray)
  const isLDerived = geometryMode !== GeometryMode.LengthAngle;
  const isHDerived = geometryMode === GeometryMode.LengthAngle;

  // Colors for labels
  const derivedColor = '#2563eb'; // blue-600
  const inputColor = '#374151';   // gray-700

  // SVG dimensions
  const width = 200;
  const height = 100;
  const padding = 20;

  // Calculate triangle points based on angle
  // Handle flat angle (0°) gracefully
  const isFlat = Math.abs(theta_deg) < 0.5;

  // Scale factor to fit in SVG while maintaining aspect ratio
  const maxH = width - padding * 2 - 40; // Leave room for labels
  const maxRise = height - padding * 2 - 20;

  // Normalize dimensions for display
  const displayH = isFlat ? maxH : Math.min(maxH, (H_cc_in / Math.max(H_cc_in, rise_in || 1)) * maxH);
  const displayRise = isFlat ? 0 : Math.min(maxRise, (rise_in / Math.max(H_cc_in, rise_in || 1)) * maxH * 0.6);

  // Triangle vertices (tail at left, drive at right-top for incline)
  const tailX = padding + 10;
  const tailY = height - padding;
  const driveX = tailX + displayH;
  const driveY = tailY - displayRise;
  const cornerX = driveX;
  const cornerY = tailY;

  // Format values for display
  const formatValue = (val: number) => val.toFixed(1);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full max-w-[200px] h-auto"
      aria-label="Conveyor geometry diagram"
    >
      {/* Background */}
      <rect x="0" y="0" width={width} height={height} fill="transparent" />

      {/* Triangle lines */}
      {/* Horizontal (H) - base */}
      <line
        x1={tailX}
        y1={tailY}
        x2={cornerX}
        y2={cornerY}
        stroke={isHDerived ? derivedColor : inputColor}
        strokeWidth="2"
      />

      {/* Rise - vertical */}
      {!isFlat && (
        <line
          x1={cornerX}
          y1={cornerY}
          x2={driveX}
          y2={driveY}
          stroke={derivedColor}
          strokeWidth="2"
          strokeDasharray="4,2"
        />
      )}

      {/* L (C-C) - hypotenuse / axis */}
      <line
        x1={tailX}
        y1={tailY}
        x2={driveX}
        y2={driveY}
        stroke={isLDerived ? derivedColor : inputColor}
        strokeWidth="2.5"
      />

      {/* Pulley circles */}
      <circle cx={tailX} cy={tailY} r="4" fill="#6b7280" />
      <circle cx={driveX} cy={driveY} r="4" fill="#6b7280" />

      {/* Labels */}
      {/* Tail label */}
      <text x={tailX} y={tailY + 12} textAnchor="middle" className="text-[8px] fill-gray-500">
        Tail
      </text>

      {/* Drive label */}
      <text x={driveX} y={driveY - 8} textAnchor="middle" className="text-[8px] fill-gray-500">
        Drive
      </text>

      {/* L (C-C) label - along hypotenuse */}
      <text
        x={(tailX + driveX) / 2 - 8}
        y={(tailY + driveY) / 2 - 6}
        textAnchor="middle"
        className="text-[9px] font-medium"
        fill={isLDerived ? derivedColor : inputColor}
      >
        L={formatValue(L_cc_in)}"
      </text>

      {/* H label - below horizontal */}
      <text
        x={(tailX + cornerX) / 2}
        y={tailY + 12}
        textAnchor="middle"
        className="text-[9px] font-medium"
        fill={isHDerived ? derivedColor : inputColor}
      >
        H={formatValue(H_cc_in)}"
      </text>

      {/* Rise label - next to vertical (only if not flat) */}
      {!isFlat && displayRise > 10 && (
        <text
          x={cornerX + 8}
          y={(cornerY + driveY) / 2}
          textAnchor="start"
          className="text-[8px] font-medium"
          fill={derivedColor}
        >
          Rise={formatValue(rise_in)}"
        </text>
      )}

      {/* Angle arc (only if not flat) */}
      {!isFlat && (
        <>
          <path
            d={`M ${tailX + 15} ${tailY} A 15 15 0 0 0 ${tailX + 15 * Math.cos(theta_deg * Math.PI / 180)} ${tailY - 15 * Math.sin(theta_deg * Math.PI / 180)}`}
            fill="none"
            stroke="#9ca3af"
            strokeWidth="1"
          />
          <text
            x={tailX + 22}
            y={tailY - 3}
            textAnchor="start"
            className="text-[8px] fill-gray-600"
          >
            {formatValue(theta_deg)}°
          </text>
        </>
      )}

      {/* Flat indicator */}
      {isFlat && (
        <text
          x={width / 2}
          y={height - 8}
          textAnchor="middle"
          className="text-[8px] fill-gray-400 italic"
        >
          Horizontal (0°)
        </text>
      )}
    </svg>
  );
}

export default function DerivedGeometryCard({
  derivedGeometry,
  geometryMode,
}: DerivedGeometryCardProps) {
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
        <div className="flex-shrink-0 flex items-center justify-center sm:justify-start">
          <GeometryDiagram
            derivedGeometry={derivedGeometry}
            geometryMode={geometryMode}
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
