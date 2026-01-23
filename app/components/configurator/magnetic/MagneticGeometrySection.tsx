/**
 * Magnetic Conveyor Geometry Section
 *
 * Style & dimension configurator for magnetic conveyors.
 * Renders profile and cross-section views with interactive inputs.
 */

'use client';

import { useMemo, useState } from 'react';
import {
  MagneticConveyorInputs,
  MagneticConveyorStyle,
  MagneticBodyHeight,
  MAGNETIC_STYLES,
  calculateMagneticDerived,
} from '../../../../src/models/magnetic_conveyor_v1/schema';

// MC3 Brand Colors
const MC3 = {
  navy: '#2E364E',
  blue: '#2B5D85',
  gold: '#F3D273',
  ink: '#181924',
  mist: '#DFE6F3',
  line: '#D2DAE6',
  primary: '#0ea5e9',
};

// ============================================================================
// Props Interface
// ============================================================================

export interface MagneticGeometrySectionProps {
  inputs: MagneticConveyorInputs;
  updateInput: <K extends keyof MagneticConveyorInputs>(
    field: K,
    value: MagneticConveyorInputs[K]
  ) => void;
}

// ============================================================================
// Profile SVG Component
// ============================================================================

interface ConveyorProfileProps {
  style: MagneticConveyorStyle;
  dimensions: MagneticConveyorInputs;
}

function ConveyorProfile({ style, dimensions }: ConveyorProfileProps) {
  const scale = 3.5;
  const padding = 60;
  const strokeWidth = 6;

  const renderStyleA = () => {
    const infeed = (dimensions.infeedLength || 52) * scale;
    const incline = (dimensions.inclineLength || 50) * scale;
    const angle = dimensions.inclineAngle || 60;
    const angleRad = (angle * Math.PI) / 180;

    const riseHeight = incline * Math.sin(angleRad);
    const inclineRun = incline * Math.cos(angleRad);

    const startX = padding;
    const floorY = padding + riseHeight + 30;

    const width = startX + infeed + inclineRun + padding;
    const height = floorY + padding + 60;

    const oal =
      (dimensions.infeedLength || 52) +
      (dimensions.inclineLength || 50) * Math.cos(angleRad);

    return (
      <svg
        viewBox={`0 0 ${Math.max(width, 400)} ${Math.max(height, 320)}`}
        className="w-full h-full"
      >
        <rect width="100%" height="100%" fill="white" />
        <defs>
          <pattern
            id="grid"
            width="30"
            height="30"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 30 0 L 0 0 0 30"
              fill="none"
              stroke={MC3.mist}
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        <path
          d={`M ${startX} ${floorY} L ${startX + infeed} ${floorY} L ${startX + infeed + inclineRun} ${floorY - riseHeight}`}
          fill="none"
          stroke={MC3.blue}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Infeed length dimension */}
        <g>
          <line
            x1={startX}
            y1={floorY + 30}
            x2={startX + infeed}
            y2={floorY + 30}
            stroke={MC3.navy}
            strokeWidth="1"
          />
          <line
            x1={startX}
            y1={floorY + 23}
            x2={startX}
            y2={floorY + 37}
            stroke={MC3.navy}
            strokeWidth="1"
          />
          <line
            x1={startX + infeed}
            y1={floorY + 23}
            x2={startX + infeed}
            y2={floorY + 37}
            stroke={MC3.navy}
            strokeWidth="1"
          />
          <text
            x={(startX * 2 + infeed) / 2}
            y={floorY + 48}
            fill={MC3.ink}
            fontSize="11"
            textAnchor="middle"
            fontFamily="system-ui, sans-serif"
            fontWeight="500"
          >
            {dimensions.infeedLength || 52}&quot;
          </text>
        </g>

        {/* Rise dimension */}
        <g>
          <line
            x1={startX + infeed + inclineRun + 30}
            y1={floorY}
            x2={startX + infeed + inclineRun + 30}
            y2={floorY - riseHeight}
            stroke={MC3.navy}
            strokeWidth="1"
          />
          <line
            x1={startX + infeed + inclineRun + 23}
            y1={floorY}
            x2={startX + infeed + inclineRun + 37}
            y2={floorY}
            stroke={MC3.navy}
            strokeWidth="1"
          />
          <line
            x1={startX + infeed + inclineRun + 23}
            y1={floorY - riseHeight}
            x2={startX + infeed + inclineRun + 37}
            y2={floorY - riseHeight}
            stroke={MC3.navy}
            strokeWidth="1"
          />
          <text
            x={startX + infeed + inclineRun + 48}
            y={floorY - riseHeight / 2 + 4}
            fill={MC3.ink}
            fontSize="11"
            fontFamily="system-ui, sans-serif"
            fontWeight="500"
          >
            {Math.round((dimensions.inclineLength || 50) * Math.sin(angleRad))}
            &quot;
          </text>
        </g>

        {/* Angle arc */}
        <path
          d={`M ${startX + infeed + 35} ${floorY} A 35 35 0 0 0 ${startX + infeed + 35 * Math.cos(angleRad)} ${floorY - 35 * Math.sin(angleRad)}`}
          fill="none"
          stroke={MC3.primary}
          strokeWidth="1.5"
        />
        <text
          x={startX + infeed + 50}
          y={floorY - 18}
          fill={MC3.primary}
          fontSize="11"
          fontFamily="system-ui, sans-serif"
          fontWeight="600"
        >
          {angle}°
        </text>

        {/* Overall length dimension */}
        <g>
          <line
            x1={startX}
            y1={floorY + 65}
            x2={startX + infeed + inclineRun}
            y2={floorY + 65}
            stroke={MC3.blue}
            strokeWidth="1.5"
          />
          <line
            x1={startX}
            y1={floorY + 58}
            x2={startX}
            y2={floorY + 72}
            stroke={MC3.blue}
            strokeWidth="1.5"
          />
          <line
            x1={startX + infeed + inclineRun}
            y1={floorY + 58}
            x2={startX + infeed + inclineRun}
            y2={floorY + 72}
            stroke={MC3.blue}
            strokeWidth="1.5"
          />
          <text
            x={(startX * 2 + infeed + inclineRun) / 2}
            y={floorY + 88}
            fill={MC3.blue}
            fontSize="12"
            textAnchor="middle"
            fontFamily="system-ui, sans-serif"
            fontWeight="600"
          >
            {oal.toFixed(1)}&quot; OAL
          </text>
        </g>

        <text
          x="20"
          y="28"
          fill={MC3.navy}
          fontSize="14"
          fontFamily="system-ui, sans-serif"
          fontWeight="600"
        >
          STYLE A
        </text>
      </svg>
    );
  };

  const renderStyleB = () => {
    const infeed = (dimensions.infeedLength || 52) * scale;
    const incline = (dimensions.inclineLength || 50) * scale;
    const discharge = (dimensions.dischargeLength || 24) * scale;
    const angle = dimensions.inclineAngle || 60;
    const angleRad = (angle * Math.PI) / 180;

    const riseHeight = incline * Math.sin(angleRad);
    const inclineRun = incline * Math.cos(angleRad);

    const startX = padding;
    const floorY = padding + riseHeight + 30;

    const width = startX + infeed + inclineRun + discharge + padding;
    const height = floorY + padding + 60;

    const oal =
      (dimensions.infeedLength || 52) +
      (dimensions.inclineLength || 50) * Math.cos(angleRad) +
      (dimensions.dischargeLength || 24);

    return (
      <svg
        viewBox={`0 0 ${Math.max(width, 500)} ${Math.max(height, 340)}`}
        className="w-full h-full"
      >
        <rect width="100%" height="100%" fill="white" />
        <defs>
          <pattern
            id="grid-b"
            width="30"
            height="30"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 30 0 L 0 0 0 30"
              fill="none"
              stroke={MC3.mist}
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-b)" />

        <path
          d={`M ${startX} ${floorY} L ${startX + infeed} ${floorY} L ${startX + infeed + inclineRun} ${floorY - riseHeight} L ${startX + infeed + inclineRun + discharge} ${floorY - riseHeight}`}
          fill="none"
          stroke={MC3.blue}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Infeed length dimension */}
        <g>
          <line
            x1={startX}
            y1={floorY + 30}
            x2={startX + infeed}
            y2={floorY + 30}
            stroke={MC3.navy}
            strokeWidth="1"
          />
          <line
            x1={startX}
            y1={floorY + 23}
            x2={startX}
            y2={floorY + 37}
            stroke={MC3.navy}
            strokeWidth="1"
          />
          <line
            x1={startX + infeed}
            y1={floorY + 23}
            x2={startX + infeed}
            y2={floorY + 37}
            stroke={MC3.navy}
            strokeWidth="1"
          />
          <text
            x={(startX * 2 + infeed) / 2}
            y={floorY + 48}
            fill={MC3.ink}
            fontSize="11"
            textAnchor="middle"
            fontFamily="system-ui, sans-serif"
            fontWeight="500"
          >
            {dimensions.infeedLength || 52}&quot;
          </text>
        </g>

        {/* Discharge length dimension */}
        <g>
          <line
            x1={startX + infeed + inclineRun}
            y1={floorY - riseHeight - 25}
            x2={startX + infeed + inclineRun + discharge}
            y2={floorY - riseHeight - 25}
            stroke={MC3.navy}
            strokeWidth="1"
          />
          <line
            x1={startX + infeed + inclineRun}
            y1={floorY - riseHeight - 32}
            x2={startX + infeed + inclineRun}
            y2={floorY - riseHeight - 18}
            stroke={MC3.navy}
            strokeWidth="1"
          />
          <line
            x1={startX + infeed + inclineRun + discharge}
            y1={floorY - riseHeight - 32}
            x2={startX + infeed + inclineRun + discharge}
            y2={floorY - riseHeight - 18}
            stroke={MC3.navy}
            strokeWidth="1"
          />
          <text
            x={startX + infeed + inclineRun + discharge / 2}
            y={floorY - riseHeight - 38}
            fill={MC3.ink}
            fontSize="11"
            textAnchor="middle"
            fontFamily="system-ui, sans-serif"
            fontWeight="500"
          >
            {dimensions.dischargeLength || 24}&quot;
          </text>
        </g>

        {/* Angle arc */}
        <path
          d={`M ${startX + infeed + 35} ${floorY} A 35 35 0 0 0 ${startX + infeed + 35 * Math.cos(angleRad)} ${floorY - 35 * Math.sin(angleRad)}`}
          fill="none"
          stroke={MC3.primary}
          strokeWidth="1.5"
        />
        <text
          x={startX + infeed + 50}
          y={floorY - 18}
          fill={MC3.primary}
          fontSize="11"
          fontFamily="system-ui, sans-serif"
          fontWeight="600"
        >
          {angle}°
        </text>

        {/* Overall length dimension */}
        <g>
          <line
            x1={startX}
            y1={floorY + 65}
            x2={startX + infeed + inclineRun + discharge}
            y2={floorY + 65}
            stroke={MC3.blue}
            strokeWidth="1.5"
          />
          <line
            x1={startX}
            y1={floorY + 58}
            x2={startX}
            y2={floorY + 72}
            stroke={MC3.blue}
            strokeWidth="1.5"
          />
          <line
            x1={startX + infeed + inclineRun + discharge}
            y1={floorY + 58}
            x2={startX + infeed + inclineRun + discharge}
            y2={floorY + 72}
            stroke={MC3.blue}
            strokeWidth="1.5"
          />
          <text
            x={(startX * 2 + infeed + inclineRun + discharge) / 2}
            y={floorY + 88}
            fill={MC3.blue}
            fontSize="12"
            textAnchor="middle"
            fontFamily="system-ui, sans-serif"
            fontWeight="600"
          >
            {oal.toFixed(1)}&quot; OAL
          </text>
        </g>

        <text
          x="20"
          y="28"
          fill={MC3.navy}
          fontSize="14"
          fontFamily="system-ui, sans-serif"
          fontWeight="600"
        >
          STYLE B
        </text>
      </svg>
    );
  };

  const renderStyleC = () => {
    const overall = (dimensions.overallLength || 65) * scale;
    const startX = padding;
    const floorY = padding + 60;
    const width = startX + overall + padding;
    const height = floorY + padding + 40;

    return (
      <svg
        viewBox={`0 0 ${Math.max(width, 400)} ${Math.max(height, 180)}`}
        className="w-full h-full"
      >
        <rect width="100%" height="100%" fill="white" />
        <defs>
          <pattern
            id="grid-c"
            width="30"
            height="30"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 30 0 L 0 0 0 30"
              fill="none"
              stroke={MC3.mist}
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-c)" />

        <line
          x1={startX}
          y1={floorY}
          x2={startX + overall}
          y2={floorY}
          stroke={MC3.blue}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        <g>
          <line
            x1={startX}
            y1={floorY + 30}
            x2={startX + overall}
            y2={floorY + 30}
            stroke={MC3.blue}
            strokeWidth="1.5"
          />
          <line
            x1={startX}
            y1={floorY + 23}
            x2={startX}
            y2={floorY + 37}
            stroke={MC3.blue}
            strokeWidth="1.5"
          />
          <line
            x1={startX + overall}
            y1={floorY + 23}
            x2={startX + overall}
            y2={floorY + 37}
            stroke={MC3.blue}
            strokeWidth="1.5"
          />
          <text
            x={startX + overall / 2}
            y={floorY + 52}
            fill={MC3.blue}
            fontSize="12"
            textAnchor="middle"
            fontFamily="system-ui, sans-serif"
            fontWeight="600"
          >
            {dimensions.overallLength || 65}&quot; OAL
          </text>
        </g>

        <text
          x="20"
          y="28"
          fill={MC3.navy}
          fontSize="14"
          fontFamily="system-ui, sans-serif"
          fontWeight="600"
        >
          STYLE C
        </text>
      </svg>
    );
  };

  const renderStyleD = () => {
    const incline = (dimensions.inclineLength || 50) * scale;
    const angle = dimensions.inclineAngle || 60;
    const angleRad = (angle * Math.PI) / 180;

    const riseHeight = incline * Math.sin(angleRad);
    const inclineRun = incline * Math.cos(angleRad);

    const startX = padding;
    const floorY = padding + riseHeight + 30;
    const width = startX + inclineRun + padding + 60;
    const height = floorY + padding + 40;

    const oal = (dimensions.inclineLength || 50) * Math.cos(angleRad);

    return (
      <svg
        viewBox={`0 0 ${Math.max(width, 350)} ${Math.max(height, 320)}`}
        className="w-full h-full"
      >
        <rect width="100%" height="100%" fill="white" />
        <defs>
          <pattern
            id="grid-d"
            width="30"
            height="30"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 30 0 L 0 0 0 30"
              fill="none"
              stroke={MC3.mist}
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-d)" />

        <line
          x1={startX}
          y1={floorY}
          x2={startX + inclineRun}
          y2={floorY - riseHeight}
          stroke={MC3.blue}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Rise dimension */}
        <g>
          <line
            x1={startX + inclineRun + 30}
            y1={floorY}
            x2={startX + inclineRun + 30}
            y2={floorY - riseHeight}
            stroke={MC3.navy}
            strokeWidth="1"
          />
          <line
            x1={startX + inclineRun + 23}
            y1={floorY}
            x2={startX + inclineRun + 37}
            y2={floorY}
            stroke={MC3.navy}
            strokeWidth="1"
          />
          <line
            x1={startX + inclineRun + 23}
            y1={floorY - riseHeight}
            x2={startX + inclineRun + 37}
            y2={floorY - riseHeight}
            stroke={MC3.navy}
            strokeWidth="1"
          />
          <text
            x={startX + inclineRun + 48}
            y={floorY - riseHeight / 2 + 4}
            fill={MC3.ink}
            fontSize="11"
            fontFamily="system-ui, sans-serif"
            fontWeight="500"
          >
            {Math.round((dimensions.inclineLength || 50) * Math.sin(angleRad))}
            &quot;
          </text>
        </g>

        {/* Angle arc */}
        <path
          d={`M ${startX + 35} ${floorY} A 35 35 0 0 0 ${startX + 35 * Math.cos(angleRad)} ${floorY - 35 * Math.sin(angleRad)}`}
          fill="none"
          stroke={MC3.primary}
          strokeWidth="1.5"
        />
        <text
          x={startX + 50}
          y={floorY - 18}
          fill={MC3.primary}
          fontSize="11"
          fontFamily="system-ui, sans-serif"
          fontWeight="600"
        >
          {angle}°
        </text>

        {/* Overall length dimension */}
        <g>
          <line
            x1={startX}
            y1={floorY + 30}
            x2={startX + inclineRun}
            y2={floorY + 30}
            stroke={MC3.blue}
            strokeWidth="1.5"
          />
          <line
            x1={startX}
            y1={floorY + 23}
            x2={startX}
            y2={floorY + 37}
            stroke={MC3.blue}
            strokeWidth="1.5"
          />
          <line
            x1={startX + inclineRun}
            y1={floorY + 23}
            x2={startX + inclineRun}
            y2={floorY + 37}
            stroke={MC3.blue}
            strokeWidth="1.5"
          />
          <text
            x={(startX * 2 + inclineRun) / 2}
            y={floorY + 50}
            fill={MC3.blue}
            fontSize="12"
            textAnchor="middle"
            fontFamily="system-ui, sans-serif"
            fontWeight="600"
          >
            {oal.toFixed(1)}&quot; OAL
          </text>
        </g>

        <text
          x="20"
          y="28"
          fill={MC3.navy}
          fontSize="14"
          fontFamily="system-ui, sans-serif"
          fontWeight="600"
        >
          STYLE D
        </text>
      </svg>
    );
  };

  switch (style) {
    case 'A':
      return renderStyleA();
    case 'B':
      return renderStyleB();
    case 'C':
      return renderStyleC();
    case 'D':
      return renderStyleD();
    default:
      return null;
  }
}

// ============================================================================
// Cross-Section SVG Component
// ============================================================================

interface CrossSectionProps {
  dimensions: MagneticConveyorInputs;
}

// Body height enum to numeric value mapping (inches)
const BODY_HEIGHT_VALUES: Record<MagneticBodyHeight, number> = {
  [MagneticBodyHeight.Standard]: 5,
  [MagneticBodyHeight.Low]: 3.5,
  [MagneticBodyHeight.High]: 7,
};

function CrossSection({ dimensions }: CrossSectionProps) {
  const effectiveWidth = dimensions.effectiveWidth || 10;
  const bodyHeightEnum = dimensions.bodyHeight || MagneticBodyHeight.Standard;
  const bodyHeight = BODY_HEIGHT_VALUES[bodyHeightEnum] || 5;
  const guideHeight = dimensions.infeedGuideHeight || 4;
  const guideAngle = dimensions.infeedGuideAngle || 0;
  const guideAngleRad = (guideAngle * Math.PI) / 180;

  const bodyWidth = effectiveWidth + 1.5;
  const coverWidth = bodyWidth + 1.5;

  const guideSpreadAtTop = guideHeight * Math.tan(guideAngleRad);

  const scale = 12;
  const padding = 50;

  const viewWidth =
    Math.max(coverWidth, effectiveWidth + 2 * guideSpreadAtTop) * scale +
    padding * 2;
  const viewHeight = (bodyHeight + guideHeight) * scale + padding * 2 + 30;

  const centerX = viewWidth / 2;
  const coverY = padding + guideHeight * scale;
  const bodyBottom = coverY + bodyHeight * scale;

  const coverLeft = centerX - (coverWidth * scale) / 2;
  const coverRight = centerX + (coverWidth * scale) / 2;

  const bodyLeft = centerX - (bodyWidth * scale) / 2;
  const bodyRight = centerX + (bodyWidth * scale) / 2;

  const guideBottomLeft = centerX - (effectiveWidth * scale) / 2;
  const guideBottomRight = centerX + (effectiveWidth * scale) / 2;
  const guideTopLeft = guideBottomLeft - guideSpreadAtTop * scale;
  const guideTopRight = guideBottomRight + guideSpreadAtTop * scale;

  const magnetWidth = effectiveWidth - 1.5;
  const magnetLeft = centerX - (magnetWidth * scale) / 2;
  const magnetRight = centerX + (magnetWidth * scale) / 2;
  const magnetTop = coverY + 6;
  const magnetHeight = 12;

  return (
    <svg viewBox={`0 0 ${viewWidth} ${viewHeight}`} className="w-full h-full">
      <rect width="100%" height="100%" fill="white" />
      <defs>
        <pattern
          id="grid-cross"
          width="15"
          height="15"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 15 0 L 0 0 0 15"
            fill="none"
            stroke={MC3.mist}
            strokeWidth="0.5"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid-cross)" />

      {/* Infeed guides */}
      <line
        x1={guideBottomLeft}
        y1={coverY}
        x2={guideTopLeft}
        y2={coverY - guideHeight * scale}
        stroke={MC3.blue}
        strokeWidth="2.5"
      />
      <line
        x1={guideBottomRight}
        y1={coverY}
        x2={guideTopRight}
        y2={coverY - guideHeight * scale}
        stroke={MC3.blue}
        strokeWidth="2.5"
      />

      {/* Cover */}
      <line
        x1={coverLeft}
        y1={coverY}
        x2={coverRight}
        y2={coverY}
        stroke={MC3.navy}
        strokeWidth="3"
      />

      {/* Magnets */}
      <rect
        x={magnetLeft}
        y={magnetTop}
        width={magnetRight - magnetLeft}
        height={magnetHeight}
        fill={MC3.gold}
        opacity="0.8"
      />

      {/* Body frame */}
      <path
        d={`M ${bodyLeft} ${coverY} L ${bodyLeft} ${bodyBottom} L ${bodyRight} ${bodyBottom} L ${bodyRight} ${coverY}`}
        fill="none"
        stroke={MC3.navy}
        strokeWidth="2"
      />

      {/* Effective width */}
      <g>
        <line
          x1={guideBottomLeft}
          y1={coverY - 8}
          x2={guideBottomRight}
          y2={coverY - 8}
          stroke={MC3.primary}
          strokeWidth="1"
        />
        <line
          x1={guideBottomLeft}
          y1={coverY - 14}
          x2={guideBottomLeft}
          y2={coverY - 2}
          stroke={MC3.primary}
          strokeWidth="1"
        />
        <line
          x1={guideBottomRight}
          y1={coverY - 14}
          x2={guideBottomRight}
          y2={coverY - 2}
          stroke={MC3.primary}
          strokeWidth="1"
        />
        <text
          x={centerX}
          y={coverY - 18}
          fill={MC3.primary}
          fontSize="9"
          textAnchor="middle"
          fontFamily="system-ui, sans-serif"
          fontWeight="600"
        >
          {effectiveWidth}&quot; EFF
        </text>
      </g>

      {/* Body width */}
      <g>
        <line
          x1={bodyLeft}
          y1={bodyBottom + 15}
          x2={bodyRight}
          y2={bodyBottom + 15}
          stroke={MC3.navy}
          strokeWidth="1"
        />
        <line
          x1={bodyLeft}
          y1={bodyBottom + 9}
          x2={bodyLeft}
          y2={bodyBottom + 21}
          stroke={MC3.navy}
          strokeWidth="1"
        />
        <line
          x1={bodyRight}
          y1={bodyBottom + 9}
          x2={bodyRight}
          y2={bodyBottom + 21}
          stroke={MC3.navy}
          strokeWidth="1"
        />
        <text
          x={centerX}
          y={bodyBottom + 30}
          fill={MC3.ink}
          fontSize="9"
          textAnchor="middle"
          fontFamily="system-ui, sans-serif"
          fontWeight="500"
        >
          {bodyWidth.toFixed(1)}&quot; BODY
        </text>
      </g>

      {/* Cover width */}
      <g>
        <line
          x1={coverLeft}
          y1={bodyBottom + 40}
          x2={coverRight}
          y2={bodyBottom + 40}
          stroke={MC3.navy}
          strokeWidth="1"
        />
        <line
          x1={coverLeft}
          y1={bodyBottom + 34}
          x2={coverLeft}
          y2={bodyBottom + 46}
          stroke={MC3.navy}
          strokeWidth="1"
        />
        <line
          x1={coverRight}
          y1={bodyBottom + 34}
          x2={coverRight}
          y2={bodyBottom + 46}
          stroke={MC3.navy}
          strokeWidth="1"
        />
        <text
          x={centerX}
          y={bodyBottom + 55}
          fill={MC3.ink}
          fontSize="9"
          textAnchor="middle"
          fontFamily="system-ui, sans-serif"
          fontWeight="500"
        >
          {coverWidth.toFixed(1)}&quot; COVER
        </text>
      </g>

      {/* Body height */}
      <g>
        <line
          x1={bodyRight + 15}
          y1={coverY}
          x2={bodyRight + 15}
          y2={bodyBottom}
          stroke={MC3.navy}
          strokeWidth="1"
        />
        <line
          x1={bodyRight + 9}
          y1={coverY}
          x2={bodyRight + 21}
          y2={coverY}
          stroke={MC3.navy}
          strokeWidth="1"
        />
        <line
          x1={bodyRight + 9}
          y1={bodyBottom}
          x2={bodyRight + 21}
          y2={bodyBottom}
          stroke={MC3.navy}
          strokeWidth="1"
        />
        <text
          x={bodyRight + 28}
          y={(coverY + bodyBottom) / 2 + 3}
          fill={MC3.ink}
          fontSize="9"
          fontFamily="system-ui, sans-serif"
          fontWeight="500"
        >
          {bodyHeight}&quot;
        </text>
      </g>

      {/* Guide height */}
      <g>
        <line
          x1={guideTopLeft - 15}
          y1={coverY - guideHeight * scale}
          x2={guideTopLeft - 15}
          y2={coverY}
          stroke={MC3.navy}
          strokeWidth="1"
        />
        <line
          x1={guideTopLeft - 21}
          y1={coverY - guideHeight * scale}
          x2={guideTopLeft - 9}
          y2={coverY - guideHeight * scale}
          stroke={MC3.navy}
          strokeWidth="1"
        />
        <line
          x1={guideTopLeft - 21}
          y1={coverY}
          x2={guideTopLeft - 9}
          y2={coverY}
          stroke={MC3.navy}
          strokeWidth="1"
        />
        <text
          x={guideTopLeft - 28}
          y={coverY - (guideHeight * scale) / 2 + 3}
          fill={MC3.ink}
          fontSize="9"
          fontFamily="system-ui, sans-serif"
          fontWeight="500"
          textAnchor="end"
        >
          {guideHeight}&quot;
        </text>
      </g>

      <text
        x="12"
        y="18"
        fill={MC3.navy}
        fontSize="11"
        fontFamily="system-ui, sans-serif"
        fontWeight="600"
      >
        SECTION
      </text>
    </svg>
  );
}

// ============================================================================
// Style Thumbnail Component
// ============================================================================

interface StyleThumbProps {
  styleKey: MagneticConveyorStyle;
  isSelected: boolean;
  onClick: () => void;
}

function StyleThumb({ styleKey, isSelected, onClick }: StyleThumbProps) {
  const style = MAGNETIC_STYLES[styleKey];

  const getThumbnailPath = () => {
    switch (styleKey) {
      case 'A':
        return 'M 8 32 L 28 32 L 52 12';
      case 'B':
        return 'M 6 32 L 20 32 L 38 14 L 54 14';
      case 'C':
        return 'M 8 22 L 52 22';
      case 'D':
        return 'M 12 38 L 48 10';
      default:
        return '';
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full p-2.5 rounded-md border transition-colors ${
        isSelected
          ? 'border-[#2B5D85] bg-[#DFE6F3]'
          : 'border-[#D2DAE6] bg-white hover:bg-gray-50'
      }`}
    >
      <svg viewBox="0 0 60 44" className="w-full h-8 mb-1">
        <path
          d={getThumbnailPath()}
          fill="none"
          stroke={isSelected ? MC3.blue : '#9CA3AF'}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div
        className={`text-xs font-medium ${isSelected ? 'text-[#2B5D85]' : 'text-gray-600'}`}
      >
        {style.name}
      </div>
    </button>
  );
}

// ============================================================================
// Input Components
// ============================================================================

interface DimensionInputProps {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  unit?: string;
}

function DimensionInput({
  label,
  value,
  onChange,
  unit = 'in',
}: DimensionInputProps) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-medium text-gray-600 w-20 flex-shrink-0">
        {label}
      </label>
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) =>
          onChange(e.target.value ? Number(e.target.value) : null)
        }
        className="w-20 px-2.5 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-right"
      />
      <span className="text-xs text-gray-500">{unit}</span>
    </div>
  );
}

interface AngleInputProps {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  includeZero?: boolean;
}

function AngleInput({
  label,
  value,
  onChange,
  includeZero = false,
}: AngleInputProps) {
  const options = includeZero ? [0, 45, 60, 90] : [45, 60, 90];
  const isCustom = value !== null && !options.includes(value);
  const [showCustomInput, setShowCustomInput] = useState(isCustom);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    if (selected === 'custom') {
      setShowCustomInput(true);
    } else {
      setShowCustomInput(false);
      onChange(Number(selected));
    }
  };

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-medium text-gray-600 w-20 flex-shrink-0">
        {label}
      </label>
      <select
        value={showCustomInput ? 'custom' : (value ?? '')}
        onChange={handleSelectChange}
        className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      >
        {options.map((angle) => (
          <option key={angle} value={angle}>
            {angle}°
          </option>
        ))}
        <option value="custom">Custom</option>
      </select>
      {showCustomInput && (
        <input
          type="number"
          value={value ?? ''}
          onChange={(e) =>
            onChange(e.target.value ? Number(e.target.value) : null)
          }
          className="w-16 px-2.5 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-right"
          placeholder="°"
          autoFocus
        />
      )}
    </div>
  );
}

interface BodyHeightInputProps {
  value: MagneticBodyHeight;
  onChange: (value: MagneticBodyHeight) => void;
}

function BodyHeightInput({ value, onChange }: BodyHeightInputProps) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-medium text-gray-600 w-20 flex-shrink-0">
        Body Ht
      </label>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value) as MagneticBodyHeight)}
        className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      >
        <option value={5}>5&quot;</option>
        <option value={7.5}>7.5&quot;</option>
      </select>
    </div>
  );
}

// ============================================================================
// Spec Display Component
// ============================================================================

interface SpecValueProps {
  label: string;
  value: string | number;
  unit?: string;
  highlight?: boolean;
}

function SpecValue({
  label,
  value,
  unit = '"',
  highlight = false,
}: SpecValueProps) {
  return (
    <div className="text-center">
      <div className="text-xs text-gray-500">{label}</div>
      <div
        className={`text-sm font-medium ${highlight ? 'text-[#2B5D85]' : 'text-gray-900'}`}
      >
        {value}
        {unit}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function MagneticGeometrySection({
  inputs,
  updateInput,
}: MagneticGeometrySectionProps) {
  const styleConfig = MAGNETIC_STYLES[inputs.style];
  const activeDimensions = styleConfig?.dimensions || [];

  const derived = useMemo(() => calculateMagneticDerived(inputs), [inputs]);

  return (
    <div className="flex flex-col h-full">
      {/* Header with style info and specs */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-4">
        <div>
          <h4 className="text-sm font-semibold text-[#2E364E]">
            {styleConfig.code} — {styleConfig.description}
          </h4>
        </div>
        <div className="flex gap-6">
          {derived.calculatedOverallLength && (
            <SpecValue
              label="OAL"
              value={derived.calculatedOverallLength.toFixed(1)}
              highlight
            />
          )}
          {derived.calculatedRise && (
            <SpecValue label="Rise" value={derived.calculatedRise} highlight />
          )}
          <SpecValue label="Effective" value={inputs.effectiveWidth ?? 10} />
          <SpecValue label="Body" value={derived.bodyWidth.toFixed(1)} />
          <SpecValue label="Cover" value={derived.coverWidth.toFixed(1)} />
        </div>
      </div>

      {/* Main content: Style selector + diagrams */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Style Selector - Sidebar */}
        <div className="w-24 flex-shrink-0 space-y-2">
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide text-center mb-1">
            Style
          </div>
          {(Object.keys(MAGNETIC_STYLES) as MagneticConveyorStyle[]).map(
            (key) => (
              <StyleThumb
                key={key}
                styleKey={key}
                isSelected={inputs.style === key}
                onClick={() => updateInput('style', key)}
              />
            )
          )}
        </div>

        {/* Diagrams: Profile (left) | Cross-section (right) - stack on mobile */}
        <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
          {/* Profile View */}
          <div className="flex-1 bg-white rounded-lg border border-[#D2DAE6] overflow-hidden flex flex-col">
            <div className="flex-1 p-2 min-h-[200px]">
              <ConveyorProfile style={inputs.style} dimensions={inputs} />
            </div>
            {/* Profile inputs */}
            <div className="px-4 py-3 border-t border-[#D2DAE6] bg-gray-50">
              <div className="flex flex-wrap gap-4 items-center">
                {activeDimensions.includes('infeedLength') && (
                  <DimensionInput
                    label="Infeed"
                    value={inputs.infeedLength}
                    onChange={(val) => updateInput('infeedLength', val)}
                  />
                )}
                {activeDimensions.includes('inclineLength') && (
                  <DimensionInput
                    label="Incline"
                    value={inputs.inclineLength}
                    onChange={(val) => updateInput('inclineLength', val)}
                  />
                )}
                {activeDimensions.includes('dischargeLength') && (
                  <DimensionInput
                    label="Discharge"
                    value={inputs.dischargeLength}
                    onChange={(val) => updateInput('dischargeLength', val)}
                  />
                )}
                {activeDimensions.includes('overallLength') && (
                  <DimensionInput
                    label="Length"
                    value={inputs.overallLength}
                    onChange={(val) => updateInput('overallLength', val)}
                  />
                )}
                {activeDimensions.includes('inclineAngle') && (
                  <AngleInput
                    label="Angle"
                    value={inputs.inclineAngle}
                    onChange={(val) => updateInput('inclineAngle', val)}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Cross Section View */}
          <div className="lg:w-80 bg-white rounded-lg border border-[#D2DAE6] overflow-hidden flex flex-col">
            <div className="flex-1 p-2 min-h-[180px]">
              <CrossSection dimensions={inputs} />
            </div>
            {/* Cross-section inputs */}
            <div className="px-4 py-3 border-t border-[#D2DAE6] bg-gray-50 space-y-2">
              <DimensionInput
                label="Eff Width"
                value={inputs.effectiveWidth}
                onChange={(val) => updateInput('effectiveWidth', val)}
              />
              <BodyHeightInput
                value={inputs.bodyHeight}
                onChange={(val) => updateInput('bodyHeight', val)}
              />
              <DimensionInput
                label="Guide Ht"
                value={inputs.infeedGuideHeight}
                onChange={(val) => updateInput('infeedGuideHeight', val)}
              />
              <AngleInput
                label="Guide Angle"
                value={inputs.infeedGuideAngle}
                onChange={(val) => updateInput('infeedGuideAngle', val)}
                includeZero
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
