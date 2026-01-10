/**
 * ConveyorGeometryVisualization - Primary geometry visualization
 *
 * Clean, professional SVG diagram showing conveyor geometry.
 * Visual encoding:
 * - Inputs: Solid lines, dark text
 * - Derived: Blue text, dashed construction lines
 * - Belt: Two parallel edge lines tangent to pulleys
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
  input: '#1f2937',        // gray-800 - solid, authoritative
  derived: '#3b82f6',      // blue-500 - computed values
  construction: '#94a3b8', // slate-400 - construction lines (lighter)
  pulley: '#64748b',       // slate-500 - pulley stroke
  pulleyFill: '#f8fafc',   // slate-50 - pulley interior
  pulleyCenter: '#475569', // slate-600 - center dot
  belt: '#334155',         // slate-700 - belt edges
  background: '#f8fafc',   // slate-50 - clean background
};

export default function ConveyorGeometryVisualization({
  derivedGeometry,
  geometryMode,
}: ConveyorGeometryVisualizationProps) {
  const { L_cc_in, H_cc_in, theta_deg, rise_in } = derivedGeometry;

  // Determine which values are derived vs input based on geometry mode
  const isLDerived = geometryMode !== GeometryMode.LengthAngle;
  const isHDerived = geometryMode === GeometryMode.LengthAngle;

  // Check if flat (no incline)
  const isFlat = Math.abs(theta_deg) < 0.5;

  // SVG dimensions - compact but well-filled
  const svgWidth = 400;
  const svgHeight = 180;
  const padding = { top: 28, right: 50, bottom: 35, left: 35 };

  // Calculate diagram geometry
  const diagram = useMemo(() => {
    const availableWidth = svgWidth - padding.left - padding.right;
    const availableHeight = svgHeight - padding.top - padding.bottom;

    // Pulley visual radius - 25% smaller than before (was 18, now ~13.5)
    const pulleyRadius = 13;
    // Belt visual thickness (half-width from centerline)
    const beltHalfWidth = 3;

    // Scale to fit, maintaining proportions
    let displayH: number;
    let displayRise: number;

    if (isFlat) {
      displayH = availableWidth - pulleyRadius * 2 - 20;
      displayRise = 0;
    } else {
      const scaleByWidth = (availableWidth - pulleyRadius * 2 - 20) / H_cc_in;
      const scaleByHeight = (availableHeight - pulleyRadius * 2 - 10) / rise_in;
      const scale = Math.min(scaleByWidth, scaleByHeight);

      displayH = H_cc_in * scale;
      displayRise = rise_in * scale;

      // Ensure minimum visibility
      displayH = Math.max(displayH, 80);
      displayRise = Math.max(displayRise, 15);
    }

    // Position pulleys - center the diagram better
    const totalWidth = displayH + pulleyRadius * 2;
    const offsetX = (availableWidth - totalWidth) / 2;

    const tailX = padding.left + offsetX + pulleyRadius;
    const tailY = svgHeight - padding.bottom - pulleyRadius;
    const driveX = tailX + displayH;
    const driveY = tailY - displayRise;

    // Baseline corner (right angle point)
    const cornerX = driveX;
    const cornerY = tailY;

    // Calculate belt tangent points for realistic belt edges
    const angleRad = (theta_deg * Math.PI) / 180;
    const perpAngle = angleRad + Math.PI / 2; // Perpendicular to belt direction

    // Top belt edge tangent points
    const topTailX = tailX + beltHalfWidth * Math.cos(perpAngle);
    const topTailY = tailY - beltHalfWidth * Math.sin(perpAngle);
    const topDriveX = driveX + beltHalfWidth * Math.cos(perpAngle);
    const topDriveY = driveY - beltHalfWidth * Math.sin(perpAngle);

    // Bottom belt edge tangent points
    const bottomTailX = tailX - beltHalfWidth * Math.cos(perpAngle);
    const bottomTailY = tailY + beltHalfWidth * Math.sin(perpAngle);
    const bottomDriveX = driveX - beltHalfWidth * Math.cos(perpAngle);
    const bottomDriveY = driveY + beltHalfWidth * Math.sin(perpAngle);

    return {
      pulleyRadius,
      beltHalfWidth,
      tailX,
      tailY,
      driveX,
      driveY,
      cornerX,
      cornerY,
      displayH,
      displayRise,
      // Belt edge points
      topTailX, topTailY, topDriveX, topDriveY,
      bottomTailX, bottomTailY, bottomDriveX, bottomDriveY,
    };
  }, [H_cc_in, rise_in, isFlat, theta_deg, svgWidth, svgHeight, padding]);

  // Format values for display
  const formatLength = (val: number) => `${val.toFixed(1)}"`;
  const formatAngle = (val: number) => `${val.toFixed(1)}°`;

  // Calculate angle arc path
  const getAngleArcPath = () => {
    if (isFlat) return '';
    const arcRadius = 28;
    const angleRad = (theta_deg * Math.PI) / 180;
    const startX = diagram.tailX + arcRadius;
    const startY = diagram.tailY;
    const endX = diagram.tailX + arcRadius * Math.cos(angleRad);
    const endY = diagram.tailY - arcRadius * Math.sin(angleRad);
    const largeArc = theta_deg > 180 ? 1 : 0;
    return `M ${startX} ${startY} A ${arcRadius} ${arcRadius} 0 ${largeArc} 0 ${endX} ${endY}`;
  };

  // Label positions
  const labels = useMemo(() => {
    const midBeltX = (diagram.tailX + diagram.driveX) / 2;
    const midBeltY = (diagram.tailY + diagram.driveY) / 2;
    const midHorizontalX = (diagram.tailX + diagram.cornerX) / 2;

    // Calculate offset perpendicular to belt for L label
    const angleRad = (theta_deg * Math.PI) / 180;
    const labelOffset = 14;

    return {
      L: {
        x: midBeltX - labelOffset * Math.sin(angleRad),
        y: midBeltY - labelOffset * Math.cos(angleRad) - 2,
      },
      H: {
        x: midHorizontalX,
        y: diagram.tailY + 18,
      },
      Rise: {
        x: diagram.cornerX + 10,
        y: (diagram.cornerY + diagram.driveY) / 2 + 4,
      },
      Angle: {
        x: diagram.tailX + 38,
        y: diagram.tailY - 6,
      },
    };
  }, [diagram, theta_deg]);

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-auto"
        aria-label="Conveyor geometry diagram"
      >
        {/* Background */}
        <rect x="0" y="0" width={svgWidth} height={svgHeight} fill={COLORS.background} rx="6" />

        {/* === CONSTRUCTION LINES (dashed, lighter) === */}

        {/* Horizontal baseline reference */}
        <line
          x1={diagram.tailX}
          y1={diagram.tailY}
          x2={diagram.cornerX}
          y2={diagram.cornerY}
          stroke={COLORS.construction}
          strokeWidth="1.5"
          strokeDasharray="4,3"
        />

        {/* Rise - vertical line (always derived) */}
        {!isFlat && (
          <line
            x1={diagram.cornerX}
            y1={diagram.cornerY}
            x2={diagram.driveX}
            y2={diagram.driveY}
            stroke={COLORS.construction}
            strokeWidth="1.5"
            strokeDasharray="4,3"
          />
        )}

        {/* Right angle indicator */}
        {!isFlat && (
          <path
            d={`M ${diagram.cornerX - 8} ${diagram.cornerY} L ${diagram.cornerX - 8} ${diagram.cornerY - 8} L ${diagram.cornerX} ${diagram.cornerY - 8}`}
            fill="none"
            stroke={COLORS.construction}
            strokeWidth="1"
          />
        )}

        {/* Angle arc */}
        {!isFlat && (
          <path
            d={getAngleArcPath()}
            fill="none"
            stroke={COLORS.input}
            strokeWidth="1.5"
          />
        )}

        {/* Small arrowhead on angle arc */}
        {!isFlat && theta_deg > 3 && (
          <polygon
            points={(() => {
              const arcRadius = 28;
              const angleRad = (theta_deg * Math.PI) / 180;
              const tipX = diagram.tailX + arcRadius * Math.cos(angleRad);
              const tipY = diagram.tailY - arcRadius * Math.sin(angleRad);
              // Arrow pointing along the arc tangent
              const arrowAngle = angleRad + Math.PI / 2;
              const arrowLen = 5;
              const arrowWidth = 3;
              const baseX = tipX - arrowLen * Math.cos(arrowAngle);
              const baseY = tipY + arrowLen * Math.sin(arrowAngle);
              const leftX = baseX + arrowWidth * Math.cos(angleRad);
              const leftY = baseY - arrowWidth * Math.sin(angleRad);
              const rightX = baseX - arrowWidth * Math.cos(angleRad);
              const rightY = baseY + arrowWidth * Math.sin(angleRad);
              return `${tipX},${tipY} ${leftX},${leftY} ${rightX},${rightY}`;
            })()}
            fill={COLORS.input}
          />
        )}

        {/* === BELT EDGES (two parallel lines tangent to pulleys) === */}

        {/* Top belt edge */}
        <line
          x1={diagram.topTailX}
          y1={diagram.topTailY}
          x2={diagram.topDriveX}
          y2={diagram.topDriveY}
          stroke={COLORS.belt}
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Bottom belt edge */}
        <line
          x1={diagram.bottomTailX}
          y1={diagram.bottomTailY}
          x2={diagram.bottomDriveX}
          y2={diagram.bottomDriveY}
          stroke={COLORS.belt}
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* === PULLEYS === */}

        {/* Tail pulley */}
        <circle
          cx={diagram.tailX}
          cy={diagram.tailY}
          r={diagram.pulleyRadius}
          fill={COLORS.pulleyFill}
          stroke={COLORS.pulley}
          strokeWidth="1.5"
        />
        <circle
          cx={diagram.tailX}
          cy={diagram.tailY}
          r={2.5}
          fill={COLORS.pulleyCenter}
        />

        {/* Drive pulley */}
        <circle
          cx={diagram.driveX}
          cy={diagram.driveY}
          r={diagram.pulleyRadius}
          fill={COLORS.pulleyFill}
          stroke={COLORS.pulley}
          strokeWidth="1.5"
        />
        <circle
          cx={diagram.driveX}
          cy={diagram.driveY}
          r={2.5}
          fill={COLORS.pulleyCenter}
        />

        {/* Direction arrow on drive */}
        <path
          d={`M ${diagram.driveX + diagram.pulleyRadius + 4} ${diagram.driveY - 2} l 6 2 l -6 2`}
          fill={COLORS.pulley}
        />

        {/* === LABELS === */}

        {/* Pulley labels - positioned better */}
        <text
          x={diagram.tailX}
          y={diagram.tailY + diagram.pulleyRadius + 12}
          textAnchor="middle"
          fontSize="10"
          fontWeight="500"
          fill={COLORS.pulley}
        >
          TAIL
        </text>
        <text
          x={diagram.driveX}
          y={diagram.driveY - diagram.pulleyRadius - 6}
          textAnchor="middle"
          fontSize="10"
          fontWeight="500"
          fill={COLORS.pulley}
        >
          DRIVE
        </text>

        {/* L (C-C) label - on the belt line */}
        <text
          x={labels.L.x}
          y={labels.L.y}
          textAnchor="middle"
          fontSize="12"
          fontWeight="600"
          fill={isLDerived ? COLORS.derived : COLORS.input}
        >
          L = {formatLength(L_cc_in)}
        </text>

        {/* H label - on the horizontal line */}
        <text
          x={labels.H.x}
          y={labels.H.y}
          textAnchor="middle"
          fontSize="11"
          fontWeight="500"
          fill={isHDerived ? COLORS.derived : COLORS.input}
        >
          H = {formatLength(H_cc_in)}
        </text>

        {/* Rise label - on the vertical line */}
        {!isFlat && diagram.displayRise > 25 && (
          <text
            x={labels.Rise.x}
            y={labels.Rise.y}
            textAnchor="start"
            fontSize="11"
            fontWeight="500"
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
            textAnchor="start"
            fontSize="11"
            fontWeight="600"
            fill={COLORS.input}
          >
            {formatAngle(theta_deg)}
          </text>
        )}

        {/* Flat conveyor indicator */}
        {isFlat && (
          <text
            x={svgWidth / 2}
            y={svgHeight - 8}
            textAnchor="middle"
            fontSize="10"
            fill={COLORS.construction}
          >
            Horizontal (0°)
          </text>
        )}
      </svg>
    </div>
  );
}
