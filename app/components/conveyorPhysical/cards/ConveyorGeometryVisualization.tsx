/**
 * ConveyorGeometryVisualization - Primary geometry visualization
 *
 * Replaces DerivedGeometryCard with a dominant, intuitive SVG diagram.
 * The diagram IS the UI - numbers support it, not the other way around.
 *
 * Visual encoding (self-evident, no legend needed):
 * - Inputs: Solid lines, dark text, heavier stroke
 * - Derived: Blue text, dashed lines, lighter stroke
 */

'use client';

import { useMemo } from 'react';
import { GeometryMode } from '../../../../src/models/sliderbed_v1/schema';

interface DerivedGeometry {
  L_cc_in: number;
  H_cc_in: number;
  theta_deg: number;
  rise_in: number;
}

interface ConveyorGeometryVisualizationProps {
  derivedGeometry: DerivedGeometry;
  geometryMode: GeometryMode;
}

// Visual constants
const COLORS = {
  input: '#1f2937',      // gray-800 - solid, authoritative
  derived: '#2563eb',    // blue-600 - computed values
  structure: '#6b7280',  // gray-500 - pulleys, structural elements
  baseline: '#d1d5db',   // gray-300 - reference lines
  belt: '#374151',       // gray-700 - belt surface
  pulleyFill: '#f3f4f6', // gray-100 - pulley interior
};

const STROKES = {
  inputWeight: 3,
  derivedWeight: 2,
  dashedPattern: '6,4',
};

export default function ConveyorGeometryVisualization({
  derivedGeometry,
  geometryMode,
}: ConveyorGeometryVisualizationProps) {
  const { L_cc_in, H_cc_in, theta_deg, rise_in } = derivedGeometry;

  // Determine which values are derived vs input based on geometry mode
  const isLDerived = geometryMode !== GeometryMode.LengthAngle;
  const isHDerived = geometryMode === GeometryMode.LengthAngle;
  // Rise is always derived, Angle is always input

  // Check if flat (no incline)
  const isFlat = Math.abs(theta_deg) < 0.5;

  // SVG dimensions - significantly larger than before
  const svgWidth = 480;
  const svgHeight = 240;
  const padding = { top: 40, right: 60, bottom: 50, left: 40 };

  // Calculate diagram geometry
  const diagram = useMemo(() => {
    const availableWidth = svgWidth - padding.left - padding.right;
    const availableHeight = svgHeight - padding.top - padding.bottom;

    // Pulley visual radius (for display, not to scale)
    const pulleyRadius = 18;

    // Scale to fit, maintaining proportions
    let displayH: number;
    let displayRise: number;

    if (isFlat) {
      displayH = availableWidth - pulleyRadius * 2;
      displayRise = 0;
    } else {
      // Fit within available space while maintaining aspect ratio
      const scaleByWidth = (availableWidth - pulleyRadius * 2) / H_cc_in;
      const scaleByHeight = (availableHeight - pulleyRadius * 2) / rise_in;
      const scale = Math.min(scaleByWidth, scaleByHeight);

      displayH = H_cc_in * scale;
      displayRise = rise_in * scale;

      // Ensure minimum visibility
      displayH = Math.max(displayH, 100);
      displayRise = Math.max(displayRise, 20);
    }

    // Position pulleys
    const tailX = padding.left + pulleyRadius;
    const tailY = svgHeight - padding.bottom - pulleyRadius;
    const driveX = tailX + displayH;
    const driveY = tailY - displayRise;

    // Baseline corner (right angle point)
    const cornerX = driveX;
    const cornerY = tailY;

    return {
      pulleyRadius,
      tailX,
      tailY,
      driveX,
      driveY,
      cornerX,
      cornerY,
      displayH,
      displayRise,
    };
  }, [H_cc_in, rise_in, isFlat, svgWidth, svgHeight, padding]);

  // Format values for display
  const formatLength = (val: number) => `${val.toFixed(1)}"`;
  const formatAngle = (val: number) => `${val.toFixed(1)}°`;

  // Calculate angle arc path
  const getAngleArcPath = () => {
    if (isFlat) return '';
    const arcRadius = 35;
    const angleRad = (theta_deg * Math.PI) / 180;
    const endX = diagram.tailX + arcRadius * Math.cos(angleRad);
    const endY = diagram.tailY - arcRadius * Math.sin(angleRad);
    return `M ${diagram.tailX + arcRadius} ${diagram.tailY} A ${arcRadius} ${arcRadius} 0 0 0 ${endX} ${endY}`;
  };

  // Label positions with smart offsets
  const labels = useMemo(() => {
    const midBeltX = (diagram.tailX + diagram.driveX) / 2;
    const midBeltY = (diagram.tailY + diagram.driveY) / 2;
    const midHorizontalX = (diagram.tailX + diagram.cornerX) / 2;

    return {
      // L label - along the belt (hypotenuse), offset above
      L: {
        x: midBeltX - 15,
        y: midBeltY - 12,
        anchor: 'middle' as const,
      },
      // H label - below the horizontal baseline
      H: {
        x: midHorizontalX,
        y: diagram.tailY + 25,
        anchor: 'middle' as const,
      },
      // Rise label - to the right of the vertical line
      Rise: {
        x: diagram.cornerX + 12,
        y: (diagram.cornerY + diagram.driveY) / 2 + 4,
        anchor: 'start' as const,
      },
      // Angle label - near the arc
      Angle: {
        x: diagram.tailX + 48,
        y: diagram.tailY - 8,
        anchor: 'start' as const,
      },
    };
  }, [diagram]);

  return (
    <div className="mt-4 w-full">
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-auto"
        style={{ minHeight: '200px', maxHeight: '280px' }}
        aria-label="Conveyor geometry visualization showing length, horizontal run, rise, and angle"
      >
        {/* Background */}
        <rect x="0" y="0" width={svgWidth} height={svgHeight} fill="#fafafa" rx="8" />

        {/* Ground/baseline reference (light gray, always shown) */}
        <line
          x1={padding.left}
          y1={diagram.tailY}
          x2={svgWidth - padding.right}
          y2={diagram.tailY}
          stroke={COLORS.baseline}
          strokeWidth="1"
          strokeDasharray="2,2"
        />

        {/* === GEOMETRY LINES === */}

        {/* Horizontal run (H) - base of triangle */}
        <line
          x1={diagram.tailX}
          y1={diagram.tailY}
          x2={diagram.cornerX}
          y2={diagram.cornerY}
          stroke={isHDerived ? COLORS.derived : COLORS.input}
          strokeWidth={isHDerived ? STROKES.derivedWeight : STROKES.inputWeight}
          strokeDasharray={isHDerived ? STROKES.dashedPattern : 'none'}
        />

        {/* Rise - vertical line (always derived, dashed) */}
        {!isFlat && (
          <line
            x1={diagram.cornerX}
            y1={diagram.cornerY}
            x2={diagram.driveX}
            y2={diagram.driveY}
            stroke={COLORS.derived}
            strokeWidth={STROKES.derivedWeight}
            strokeDasharray={STROKES.dashedPattern}
          />
        )}

        {/* Right angle indicator */}
        {!isFlat && (
          <path
            d={`M ${diagram.cornerX - 10} ${diagram.cornerY} L ${diagram.cornerX - 10} ${diagram.cornerY - 10} L ${diagram.cornerX} ${diagram.cornerY - 10}`}
            fill="none"
            stroke={COLORS.baseline}
            strokeWidth="1"
          />
        )}

        {/* L (C-C) - Belt/axis connecting pulleys (hypotenuse) */}
        <line
          x1={diagram.tailX}
          y1={diagram.tailY}
          x2={diagram.driveX}
          y2={diagram.driveY}
          stroke={isLDerived ? COLORS.derived : COLORS.input}
          strokeWidth={isLDerived ? STROKES.derivedWeight + 1 : STROKES.inputWeight + 1}
          strokeDasharray={isLDerived ? STROKES.dashedPattern : 'none'}
        />

        {/* Angle arc at tail pulley */}
        {!isFlat && (
          <path
            d={getAngleArcPath()}
            fill="none"
            stroke={COLORS.input}
            strokeWidth="2"
          />
        )}

        {/* === PULLEYS === */}

        {/* Tail pulley (left) */}
        <circle
          cx={diagram.tailX}
          cy={diagram.tailY}
          r={diagram.pulleyRadius}
          fill={COLORS.pulleyFill}
          stroke={COLORS.structure}
          strokeWidth="2"
        />
        <circle
          cx={diagram.tailX}
          cy={diagram.tailY}
          r={4}
          fill={COLORS.structure}
        />

        {/* Drive pulley (right) */}
        <circle
          cx={diagram.driveX}
          cy={diagram.driveY}
          r={diagram.pulleyRadius}
          fill={COLORS.pulleyFill}
          stroke={COLORS.structure}
          strokeWidth="2"
        />
        <circle
          cx={diagram.driveX}
          cy={diagram.driveY}
          r={4}
          fill={COLORS.structure}
        />

        {/* Direction arrow on drive pulley */}
        <path
          d={`M ${diagram.driveX + diagram.pulleyRadius + 5} ${diagram.driveY - 3} l 8 3 l -8 3`}
          fill={COLORS.structure}
        />

        {/* === LABELS === */}

        {/* Pulley labels */}
        <text
          x={diagram.tailX}
          y={diagram.tailY + diagram.pulleyRadius + 16}
          textAnchor="middle"
          className="text-xs font-medium"
          fill={COLORS.structure}
        >
          TAIL
        </text>
        <text
          x={diagram.driveX}
          y={diagram.driveY - diagram.pulleyRadius - 8}
          textAnchor="middle"
          className="text-xs font-medium"
          fill={COLORS.structure}
        >
          DRIVE
        </text>

        {/* L (C-C) label - along belt */}
        <text
          x={labels.L.x}
          y={labels.L.y}
          textAnchor={labels.L.anchor}
          className="text-sm font-semibold"
          fill={isLDerived ? COLORS.derived : COLORS.input}
        >
          L = {formatLength(L_cc_in)}
        </text>

        {/* H (Horizontal) label - below baseline */}
        <text
          x={labels.H.x}
          y={labels.H.y}
          textAnchor={labels.H.anchor}
          className="text-sm font-semibold"
          fill={isHDerived ? COLORS.derived : COLORS.input}
        >
          H = {formatLength(H_cc_in)}
        </text>

        {/* Rise label - beside vertical */}
        {!isFlat && diagram.displayRise > 30 && (
          <text
            x={labels.Rise.x}
            y={labels.Rise.y}
            textAnchor={labels.Rise.anchor}
            className="text-sm font-semibold"
            fill={COLORS.derived}
          >
            Rise = {formatLength(rise_in)}
          </text>
        )}

        {/* Angle label - near arc */}
        {!isFlat && (
          <text
            x={labels.Angle.x}
            y={labels.Angle.y}
            textAnchor={labels.Angle.anchor}
            className="text-sm font-semibold"
            fill={COLORS.input}
          >
            {formatAngle(theta_deg)}
          </text>
        )}

        {/* Flat conveyor indicator */}
        {isFlat && (
          <text
            x={svgWidth / 2}
            y={svgHeight - 15}
            textAnchor="middle"
            className="text-xs"
            fill={COLORS.structure}
          >
            Horizontal Conveyor (0° incline)
          </text>
        )}

        {/* Mode indicator - subtle, bottom right */}
        <text
          x={svgWidth - padding.right}
          y={svgHeight - 10}
          textAnchor="end"
          className="text-[10px]"
          fill="#9ca3af"
        >
          {geometryMode === GeometryMode.LengthAngle ? 'L+Angle mode' : 'H+Angle mode'}
        </text>
      </svg>
    </div>
  );
}
