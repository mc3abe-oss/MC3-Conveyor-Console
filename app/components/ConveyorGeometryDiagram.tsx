/**
 * ConveyorGeometryDiagram - Shared engineering-style geometry visualization
 *
 * Technical drawing showing conveyor geometry with proper dimension lines,
 * extension lines, and drafting conventions.
 *
 * Props:
 *   inputMode: 'length-angle' | 'horizontal-angle' | 'horizontal-rise'
 *   lengthCC: center-to-center length (inches)
 *   horizontalRun: horizontal distance (inches)
 *   inclineAngle: angle in degrees
 *   rise: vertical rise (inches)
 *   width: SVG width (default 600)
 *   height: SVG height (default 380)
 *   compact: boolean - use compact sizing for cards (default false)
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
  width?: number;
  height?: number;
  compact?: boolean;
}

// Drawing constants
const COLORS = {
  input: '#0066cc',
  calculated: '#666666',
  construction: '#999999',
  belt: '#1a1a1a',
  pulley: '#1a1a1a',
  pulleyCenter: '#1a1a1a',
  background: '#fafafa',
  grid: '#e8e8e8',
};

export default function ConveyorGeometryDiagram({
  inputMode = 'length-angle',
  lengthCC = 120,
  horizontalRun = 103.9,
  inclineAngle = 30,
  rise = 60,
  width: propWidth,
  height: propHeight,
  compact = false,
}: ConveyorGeometryDiagramProps) {
  // Use compact dimensions if specified
  const width = propWidth ?? (compact ? 320 : 600);
  const height = propHeight ?? (compact ? 200 : 380);

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
      angle = (Math.atan(R / H) * 180) / Math.PI;
    }

    return {
      length: L,
      horizontal: H,
      rise: R,
      angle: angle,
    };
  }, [inputMode, lengthCC, horizontalRun, inclineAngle, rise]);

  // Drawing constants - scale for compact mode
  const scale = compact ? 0.6 : 1;
  const MARGIN = 70 * scale;
  const PULLEY_RADIUS = 14 * scale;
  const DIM_OFFSET = 40 * scale;
  const DIM_GAP = 5 * scale;
  const TICK_SIZE = 10 * scale;
  const EXT_OVERSHOOT = 10 * scale;

  // Calculate scale to fit drawing in viewport
  const availableWidth = width - MARGIN * 2 - 80 * scale;
  const availableHeight = height - MARGIN * 2 - 60 * scale;

  const scaleX = availableWidth / Math.max(geometry.horizontal, 80);
  const scaleY = availableHeight / Math.max(geometry.rise, 40);
  const drawScale = Math.min(scaleX, scaleY, compact ? 1.8 : 2.8);

  // Tail pulley position (bottom-left of conveyor)
  const tailX = MARGIN + 40 * scale;
  const tailY = height - MARGIN - 30 * scale;

  // Drive pulley position (top-right of conveyor)
  const driveX = tailX + geometry.horizontal * drawScale;
  const driveY = tailY - geometry.rise * drawScale;

  // Belt tangent points
  const angleRad = (geometry.angle * Math.PI) / 180;
  const tangentOffsetX = PULLEY_RADIUS * Math.sin(angleRad);
  const tangentOffsetY = PULLEY_RADIUS * Math.cos(angleRad);

  // Format number for display
  const fmt = (n: number): string => {
    if (Math.abs(n - Math.round(n)) < 0.01) return Math.round(n).toString();
    return n.toFixed(1);
  };

  // Determine which values are inputs vs calculated
  const isLengthInput = inputMode === 'length-angle';
  const isHorizontalInput = inputMode === 'horizontal-angle' || inputMode === 'horizontal-rise';
  const isAngleInput = inputMode === 'length-angle' || inputMode === 'horizontal-angle';
  const isRiseInput = inputMode === 'horizontal-rise';

  // Font sizes for compact mode
  const fontSize = {
    dimension: compact ? 10 : 13,
    angle: compact ? 11 : 14,
    pulleyLabel: compact ? 9 : 11,
    legend: compact ? 9 : 11,
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
    const strokeW = isInput ? 1.5 : 1;
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

    const textOffsetX = perpX * 14 * scale;
    const textOffsetY = perpY * 14 * scale;

    return (
      <g className="dimension-line">
        {/* Extension lines */}
        <line
          x1={ext1StartX}
          y1={ext1StartY}
          x2={ext1EndX}
          y2={ext1EndY}
          stroke={color}
          strokeWidth={0.75}
        />
        <line
          x1={ext2StartX}
          y1={ext2StartY}
          x2={ext2EndX}
          y2={ext2EndY}
          stroke={color}
          strokeWidth={0.75}
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
            fontFamily: "'JetBrains Mono', 'SF Mono', 'Consolas', monospace",
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
    const strokeW = isInput ? 1.5 : 1;
    const fontWeight = isInput ? 600 : 400;

    // Clamp angle for display
    const displayAngle = Math.max(5, Math.min(endAngle, 85));

    const start = (startAngle * Math.PI) / 180;
    const end = (displayAngle * Math.PI) / 180;

    const x1 = cx + radius * Math.cos(-start);
    const y1 = cy + radius * Math.sin(-start);
    const x2 = cx + radius * Math.cos(-end);
    const y2 = cy + radius * Math.sin(-end);

    const largeArc = Math.abs(displayAngle - startAngle) > 180 ? 1 : 0;

    // Position label BELOW the horizontal line
    const labelX = cx + radius + 30 * scale;
    const labelY = cy + 22 * scale;

    const tickLen = 6 * scale;

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
          x={labelX - 24 * scale}
          y={labelY - 10 * scale}
          width={48 * scale}
          height={20 * scale}
          fill={COLORS.background}
          rx={2}
        />
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fontSize: `${fontSize.angle}px`,
            fontFamily: "'JetBrains Mono', 'SF Mono', 'Consolas', monospace",
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
    const labelY = position === 'tail' ? cy + PULLEY_RADIUS + 18 * scale : cy - PULLEY_RADIUS - 10 * scale;

    return (
      <g className="pulley">
        <circle
          cx={cx}
          cy={cy}
          r={PULLEY_RADIUS}
          fill="none"
          stroke={COLORS.pulley}
          strokeWidth={2.5}
        />
        <circle cx={cx} cy={cy} r={4 * scale} fill={COLORS.pulleyCenter} />
        <text
          x={cx}
          y={labelY}
          textAnchor="middle"
          style={{
            fontSize: `${fontSize.pulleyLabel}px`,
            fontFamily: "'JetBrains Mono', 'SF Mono', 'Consolas', monospace",
            fontWeight: 500,
            fill: '#555',
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
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{
        backgroundColor: COLORS.background,
        borderRadius: '4px',
      }}
      aria-label="Conveyor geometry diagram"
    >
      {/* Background grid pattern */}
      <defs>
        <pattern id="diagram-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke={COLORS.grid} strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width={width} height={height} fill={COLORS.background} />
      <rect width={width} height={height} fill="url(#diagram-grid)" />

      {/* Belt lines */}
      <line
        x1={tailX - tangentOffsetX}
        y1={tailY - tangentOffsetY}
        x2={driveX - tangentOffsetX}
        y2={driveY - tangentOffsetY}
        stroke={COLORS.belt}
        strokeWidth={2.5}
      />
      <line
        x1={tailX + tangentOffsetX}
        y1={tailY + tangentOffsetY}
        x2={driveX + tangentOffsetX}
        y2={driveY + tangentOffsetY}
        stroke={COLORS.belt}
        strokeWidth={2.5}
      />

      {/* Reference lines (dashed) */}
      <line
        x1={tailX}
        y1={tailY}
        x2={driveX + 20 * scale}
        y2={tailY}
        stroke={COLORS.construction}
        strokeWidth={0.75}
        strokeDasharray="5,4"
      />
      <line
        x1={driveX}
        y1={driveY}
        x2={driveX}
        y2={tailY + 20 * scale}
        stroke={COLORS.construction}
        strokeWidth={0.75}
        strokeDasharray="5,4"
      />

      {/* Centerline through pulley centers (for C-C dimension) */}
      <line
        x1={tailX - 15 * scale * Math.cos(angleRad)}
        y1={tailY + 15 * scale * Math.sin(angleRad)}
        x2={driveX + 15 * scale * Math.cos(angleRad)}
        y2={driveY - 15 * scale * Math.sin(angleRad)}
        stroke={COLORS.construction}
        strokeWidth={0.75}
        strokeDasharray="8,3,2,3"
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
        offset={48 * scale}
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
        offset={50 * scale}
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
          offset={45 * scale}
          side="right"
          isInput={isRiseInput}
        />
      )}

      {/* Angle arc */}
      {!isFlat && (
        <AngleArc
          cx={tailX}
          cy={tailY}
          radius={75 * scale}
          startAngle={0}
          endAngle={geometry.angle}
          label={`${fmt(geometry.angle)}°`}
          isInput={isAngleInput}
        />
      )}

      {/* Flat indicator */}
      {isFlat && (
        <text
          x={width / 2}
          y={height - 10}
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
      <g transform={`translate(${width - 125 * scale}, ${15 * scale})`}>
        <rect
          x={0}
          y={0}
          width={110 * scale}
          height={52 * scale}
          fill="white"
          stroke="#ddd"
          strokeWidth={1}
          rx={3}
        />
        <line
          x1={12 * scale}
          y1={18 * scale}
          x2={32 * scale}
          y2={18 * scale}
          stroke={COLORS.input}
          strokeWidth={2}
        />
        <text
          x={40 * scale}
          y={22 * scale}
          style={{ fontSize: `${fontSize.legend}px`, fontFamily: 'system-ui', fill: '#333' }}
        >
          Input
        </text>
        <line
          x1={12 * scale}
          y1={38 * scale}
          x2={32 * scale}
          y2={38 * scale}
          stroke={COLORS.calculated}
          strokeWidth={1}
        />
        <text
          x={40 * scale}
          y={42 * scale}
          style={{ fontSize: `${fontSize.legend}px`, fontFamily: 'system-ui', fill: '#333' }}
        >
          Calculated
        </text>
      </g>
    </svg>
  );
}
