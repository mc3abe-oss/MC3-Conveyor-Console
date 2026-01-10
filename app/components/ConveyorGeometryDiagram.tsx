/**
 * ConveyorGeometryDiagram - Shared engineering-style geometry visualization
 *
 * Technical drawing showing conveyor geometry with proper dimension lines,
 * extension lines, and drafting conventions.
 *
 * v2: Scaled up for better readability, responsive sizing, fills available panel.
 *
 * Props:
 *   inputMode: 'length-angle' | 'horizontal-angle' | 'horizontal-rise'
 *   lengthCC: center-to-center length (inches)
 *   horizontalRun: horizontal distance (inches)
 *   inclineAngle: angle in degrees
 *   rise: vertical rise (inches)
 *   className: optional CSS class for container sizing
 */

'use client';

import { useMemo } from 'react';

type InputMode = 'length-angle' | 'horizontal-angle' | 'horizontal-rise';

interface ConveyorGeometryDiagramProps {
  inputMode?: InputMode;
  lengthCC?: number;
  horizontalRun?: number;
  inclineAngle?: number;
  rise?: number;
  className?: string;
}

// Drawing constants - optimized for readability
const COLORS = {
  input: '#0066cc',
  calculated: '#666666',
  construction: '#9ca3af',
  belt: '#1f2937',
  pulley: '#374151',
  pulleyCenter: '#1f2937',
  background: '#f9fafb',
  grid: '#e5e7eb',
};

// Base dimensions for the viewBox (coordinate space)
const VIEW_WIDTH = 520;
const VIEW_HEIGHT = 280;

export default function ConveyorGeometryDiagram({
  inputMode = 'length-angle',
  lengthCC = 120,
  horizontalRun = 103.9,
  inclineAngle = 30,
  rise = 60,
  className = '',
}: ConveyorGeometryDiagramProps) {
  // Calculate all geometry values based on input mode
  const geometry = useMemo(() => {
    let L: number, H: number, R: number, angle: number;

    if (inputMode === 'length-angle') {
      L = lengthCC;
      angle = inclineAngle;
      const radians = (angle * Math.PI) / 180;
      H = L * Math.cos(radians);
      R = L * Math.sin(radians);
    } else if (inputMode === 'horizontal-angle') {
      H = horizontalRun;
      angle = inclineAngle;
      const radians = (angle * Math.PI) / 180;
      L = H / Math.cos(radians);
      R = H * Math.tan(radians);
    } else {
      // horizontal-rise
      H = horizontalRun;
      R = rise;
      L = Math.sqrt(H * H + R * R);
      angle = H > 0 ? (Math.atan(R / H) * 180) / Math.PI : 0;
    }

    return {
      length: L,
      horizontal: H,
      rise: R,
      angle: Math.max(0, angle),
    };
  }, [inputMode, lengthCC, horizontalRun, inclineAngle, rise]);

  // Drawing constants - scaled for readability
  const MARGIN = 60;
  const PULLEY_RADIUS = 16;
  const DIM_OFFSET = 38;
  const DIM_GAP = 6;
  const TICK_SIZE = 12;
  const EXT_OVERSHOOT = 12;

  // Calculate scale to fit drawing in viewport with proper padding
  const availableWidth = VIEW_WIDTH - MARGIN * 2 - 60;
  const availableHeight = VIEW_HEIGHT - MARGIN * 2 - 40;

  const scaleX = availableWidth / Math.max(geometry.horizontal, 60);
  const scaleY = availableHeight / Math.max(geometry.rise, 30);
  const drawScale = Math.min(scaleX, scaleY, 2.2);

  // Tail pulley position (bottom-left of conveyor)
  const tailX = MARGIN + 35;
  const tailY = VIEW_HEIGHT - MARGIN - 25;

  // Drive pulley position (top-right of conveyor)
  const driveX = tailX + geometry.horizontal * drawScale;
  const driveY = tailY - geometry.rise * drawScale;

  // Belt tangent points
  const angleRad = (geometry.angle * Math.PI) / 180;
  const tangentOffsetX = PULLEY_RADIUS * Math.sin(angleRad);
  const tangentOffsetY = PULLEY_RADIUS * Math.cos(angleRad);

  // Format number for display
  const fmt = (n: number): string => {
    if (isNaN(n) || !isFinite(n)) return '0';
    if (Math.abs(n - Math.round(n)) < 0.01) return Math.round(n).toString();
    return n.toFixed(1);
  };

  // Determine which values are inputs vs calculated
  const isLengthInput = inputMode === 'length-angle';
  const isHorizontalInput = inputMode === 'horizontal-angle' || inputMode === 'horizontal-rise';
  const isAngleInput = inputMode === 'length-angle' || inputMode === 'horizontal-angle';
  const isRiseInput = inputMode === 'horizontal-rise';

  // Font sizes - larger for readability
  const fontSize = {
    dimension: 14,
    angle: 15,
    pulleyLabel: 12,
    legend: 11,
  };

  // Stroke widths - proportional hierarchy
  const strokeWidth = {
    belt: 3,
    pulley: 2.5,
    dimensionInput: 1.8,
    dimensionCalc: 1.2,
    extension: 0.8,
    construction: 0.8,
  };

  // Dimension line component with proper engineering style
  const DimensionLine = ({
    x1,
    y1,
    x2,
    y2,
    label,
    offset = DIM_OFFSET,
    side = 'left',
    isInput = false,
  }: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    label: string;
    offset?: number;
    side?: 'left' | 'right' | 'above' | 'below';
    isInput?: boolean;
  }) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return null;

    const color = isInput ? COLORS.input : COLORS.calculated;
    const strokeW = isInput ? strokeWidth.dimensionInput : strokeWidth.dimensionCalc;
    const fontWeight = isInput ? 600 : 400;

    // Perpendicular direction for offset
    let perpX: number, perpY: number;
    if (side === 'left' || side === 'above') {
      perpX = dy / len;
      perpY = -dx / len;
    } else {
      perpX = -dy / len;
      perpY = dx / len;
    }

    // Extension line endpoints
    const ext1StartX = x1 + perpX * DIM_GAP;
    const ext1StartY = y1 + perpY * DIM_GAP;
    const ext1EndX = x1 + perpX * (offset + EXT_OVERSHOOT);
    const ext1EndY = y1 + perpY * (offset + EXT_OVERSHOOT);

    const ext2StartX = x2 + perpX * DIM_GAP;
    const ext2StartY = y2 + perpY * DIM_GAP;
    const ext2EndX = x2 + perpX * (offset + EXT_OVERSHOOT);
    const ext2EndY = y2 + perpY * (offset + EXT_OVERSHOOT);

    // Dimension line endpoints
    const dimX1 = x1 + perpX * offset;
    const dimY1 = y1 + perpY * offset;
    const dimX2 = x2 + perpX * offset;
    const dimY2 = y2 + perpY * offset;

    // Tick angle
    const tickAngle = Math.atan2(dy, dx);

    // Text position and rotation
    const textX = (dimX1 + dimX2) / 2;
    const textY = (dimY1 + dimY2) / 2;
    let textAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (textAngle > 90) textAngle -= 180;
    if (textAngle < -90) textAngle += 180;

    const textOffsetX = perpX * 16;
    const textOffsetY = perpY * 16;

    return (
      <g className="dimension-line">
        {/* Extension lines */}
        <line
          x1={ext1StartX}
          y1={ext1StartY}
          x2={ext1EndX}
          y2={ext1EndY}
          stroke={color}
          strokeWidth={strokeWidth.extension}
        />
        <line
          x1={ext2StartX}
          y1={ext2StartY}
          x2={ext2EndX}
          y2={ext2EndY}
          stroke={color}
          strokeWidth={strokeWidth.extension}
        />

        {/* Dimension line */}
        <line
          x1={dimX1}
          y1={dimY1}
          x2={dimX2}
          y2={dimY2}
          stroke={color}
          strokeWidth={strokeW}
        />

        {/* Tick marks (architectural style - 45° slashes) */}
        <line
          x1={dimX1 - (TICK_SIZE / 2) * Math.cos(tickAngle + Math.PI / 4)}
          y1={dimY1 - (TICK_SIZE / 2) * Math.sin(tickAngle + Math.PI / 4)}
          x2={dimX1 + (TICK_SIZE / 2) * Math.cos(tickAngle + Math.PI / 4)}
          y2={dimY1 + (TICK_SIZE / 2) * Math.sin(tickAngle + Math.PI / 4)}
          stroke={color}
          strokeWidth={strokeW}
        />
        <line
          x1={dimX2 - (TICK_SIZE / 2) * Math.cos(tickAngle + Math.PI / 4)}
          y1={dimY2 - (TICK_SIZE / 2) * Math.sin(tickAngle + Math.PI / 4)}
          x2={dimX2 + (TICK_SIZE / 2) * Math.cos(tickAngle + Math.PI / 4)}
          y2={dimY2 + (TICK_SIZE / 2) * Math.sin(tickAngle + Math.PI / 4)}
          stroke={color}
          strokeWidth={strokeW}
        />

        {/* Label */}
        <text
          x={textX + textOffsetX}
          y={textY + textOffsetY}
          transform={`rotate(${textAngle}, ${textX + textOffsetX}, ${textY + textOffsetY})`}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fontSize: `${fontSize.dimension}px`,
            fontFamily: "'SF Mono', 'Consolas', 'Monaco', monospace",
            fontWeight: fontWeight,
            fill: color,
          }}
        >
          {label}
        </text>
      </g>
    );
  };

  // Angle arc component
  const AngleArc = ({
    cx,
    cy,
    radius,
    startAngle,
    endAngle,
    label,
    isInput,
  }: {
    cx: number;
    cy: number;
    radius: number;
    startAngle: number;
    endAngle: number;
    label: string;
    isInput: boolean;
  }) => {
    const color = isInput ? COLORS.input : COLORS.calculated;
    const strokeW = isInput ? strokeWidth.dimensionInput : strokeWidth.dimensionCalc;
    const fontWeight = isInput ? 600 : 400;

    // Clamp angle for display
    const displayAngle = Math.max(3, Math.min(endAngle, 85));

    const start = (startAngle * Math.PI) / 180;
    const end = (displayAngle * Math.PI) / 180;

    const x1 = cx + radius * Math.cos(-start);
    const y1 = cy + radius * Math.sin(-start);
    const x2 = cx + radius * Math.cos(-end);
    const y2 = cy + radius * Math.sin(-end);

    const largeArc = Math.abs(displayAngle - startAngle) > 180 ? 1 : 0;

    // Position label outside the arc
    const labelX = cx + radius + 32;
    const labelY = cy + 20;

    const tickLen = 7;

    return (
      <g className="angle-arc">
        <path
          d={`M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 0 ${x2} ${y2}`}
          fill="none"
          stroke={color}
          strokeWidth={strokeW}
        />
        {/* Tick at start */}
        <line
          x1={x1}
          y1={y1}
          x2={x1 + tickLen}
          y2={y1}
          stroke={color}
          strokeWidth={strokeW}
        />
        {/* Tick at end */}
        <line
          x1={x2}
          y1={y2}
          x2={x2 + tickLen * Math.cos(-end + Math.PI / 2)}
          y2={y2 + tickLen * Math.sin(-end + Math.PI / 2)}
          stroke={color}
          strokeWidth={strokeW}
        />
        {/* Label background */}
        <rect
          x={labelX - 26}
          y={labelY - 11}
          width={52}
          height={22}
          fill={COLORS.background}
          rx={3}
        />
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fontSize: `${fontSize.angle}px`,
            fontFamily: "'SF Mono', 'Consolas', 'Monaco', monospace",
            fontWeight: fontWeight,
            fill: color,
          }}
        >
          {label}
        </text>
      </g>
    );
  };

  // Pulley component
  const Pulley = ({
    cx,
    cy,
    label,
    position,
  }: {
    cx: number;
    cy: number;
    label: string;
    position: 'tail' | 'drive';
  }) => {
    const labelY = position === 'tail' ? cy + PULLEY_RADIUS + 18 : cy - PULLEY_RADIUS - 10;

    return (
      <g className="pulley">
        <circle
          cx={cx}
          cy={cy}
          r={PULLEY_RADIUS}
          fill="none"
          stroke={COLORS.pulley}
          strokeWidth={strokeWidth.pulley}
        />
        <circle cx={cx} cy={cy} r={4} fill={COLORS.pulleyCenter} />
        <text
          x={cx}
          y={labelY}
          textAnchor="middle"
          style={{
            fontSize: `${fontSize.pulleyLabel}px`,
            fontFamily: "'SF Mono', 'Consolas', 'Monaco', monospace",
            fontWeight: 500,
            fill: '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {label}
        </text>
      </g>
    );
  };

  const isFlat = geometry.angle < 0.5;

  return (
    <svg
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      className={`w-full h-auto max-w-full ${className}`}
      style={{
        backgroundColor: COLORS.background,
        borderRadius: '6px',
      }}
      aria-label="Conveyor geometry diagram"
    >
      {/* Background grid pattern */}
      <defs>
        <pattern id="diagram-grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M 24 0 L 0 0 0 24" fill="none" stroke={COLORS.grid} strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill={COLORS.background} rx="6" />
      <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="url(#diagram-grid)" rx="6" />

      {/* Belt lines (centerline representation) */}
      <line
        x1={tailX - tangentOffsetX}
        y1={tailY - tangentOffsetY}
        x2={driveX - tangentOffsetX}
        y2={driveY - tangentOffsetY}
        stroke={COLORS.belt}
        strokeWidth={strokeWidth.belt}
      />
      <line
        x1={tailX + tangentOffsetX}
        y1={tailY + tangentOffsetY}
        x2={driveX + tangentOffsetX}
        y2={driveY + tangentOffsetY}
        stroke={COLORS.belt}
        strokeWidth={strokeWidth.belt}
      />

      {/* Reference lines (dashed) - horizontal datum and vertical datum */}
      <line
        x1={tailX}
        y1={tailY}
        x2={driveX + 25}
        y2={tailY}
        stroke={COLORS.construction}
        strokeWidth={strokeWidth.construction}
        strokeDasharray="6,4"
      />
      <line
        x1={driveX}
        y1={driveY}
        x2={driveX}
        y2={tailY + 25}
        stroke={COLORS.construction}
        strokeWidth={strokeWidth.construction}
        strokeDasharray="6,4"
      />

      {/* Centerline through pulley centers (for C-C dimension) */}
      <line
        x1={tailX - 18 * Math.cos(angleRad)}
        y1={tailY + 18 * Math.sin(angleRad)}
        x2={driveX + 18 * Math.cos(angleRad)}
        y2={driveY - 18 * Math.sin(angleRad)}
        stroke={COLORS.construction}
        strokeWidth={strokeWidth.construction}
        strokeDasharray="10,4,3,4"
      />

      {/* Pulleys */}
      <Pulley cx={tailX} cy={tailY} label="Tail" position="tail" />
      <Pulley cx={driveX} cy={driveY} label="Drive" position="drive" />

      {/* Length dimension (along centerline) */}
      <DimensionLine
        x1={tailX}
        y1={tailY}
        x2={driveX}
        y2={driveY}
        label={`L = ${fmt(geometry.length)}"`}
        offset={46}
        side="left"
        isInput={isLengthInput}
      />

      {/* Horizontal dimension */}
      <DimensionLine
        x1={tailX}
        y1={tailY}
        x2={driveX}
        y2={tailY}
        label={`H = ${fmt(geometry.horizontal)}"`}
        offset={48}
        side="right"
        isInput={isHorizontalInput}
      />

      {/* Rise dimension (vertical) */}
      {!isFlat && (
        <DimensionLine
          x1={driveX}
          y1={tailY}
          x2={driveX}
          y2={driveY}
          label={`Rise = ${fmt(geometry.rise)}"`}
          offset={44}
          side="right"
          isInput={isRiseInput}
        />
      )}

      {/* Angle arc */}
      {!isFlat && (
        <AngleArc
          cx={tailX}
          cy={tailY}
          radius={70}
          startAngle={0}
          endAngle={geometry.angle}
          label={`${fmt(geometry.angle)}°`}
          isInput={isAngleInput}
        />
      )}

      {/* Flat indicator */}
      {isFlat && (
        <text
          x={VIEW_WIDTH / 2}
          y={VIEW_HEIGHT - 12}
          textAnchor="middle"
          style={{
            fontSize: `${fontSize.legend}px`,
            fontFamily: 'system-ui, sans-serif',
            fill: COLORS.construction,
          }}
        >
          Horizontal (0°)
        </text>
      )}

      {/* Legend */}
      <g transform={`translate(${VIEW_WIDTH - 115}, 14)`}>
        <rect
          x={0}
          y={0}
          width={100}
          height={50}
          fill="white"
          stroke="#e5e7eb"
          strokeWidth={1}
          rx={4}
        />
        <line
          x1={10}
          y1={17}
          x2={30}
          y2={17}
          stroke={COLORS.input}
          strokeWidth={2.5}
        />
        <text
          x={38}
          y={21}
          style={{ fontSize: `${fontSize.legend}px`, fontFamily: 'system-ui', fill: '#374151' }}
        >
          Input
        </text>
        <line
          x1={10}
          y1={35}
          x2={30}
          y2={35}
          stroke={COLORS.calculated}
          strokeWidth={1.5}
        />
        <text
          x={38}
          y={39}
          style={{ fontSize: `${fontSize.legend}px`, fontFamily: 'system-ui', fill: '#374151' }}
        >
          Calculated
        </text>
      </g>
    </svg>
  );
}
