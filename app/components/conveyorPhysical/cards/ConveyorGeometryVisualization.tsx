/**
 * ConveyorGeometryVisualization - Primary geometry visualization
 *
 * Wrapper for the shared ConveyorGeometryDiagram component.
 * Maps GeometryMode to inputMode and passes derived geometry values.
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

interface ConveyorGeometryVisualizationProps {
  derivedGeometry: DerivedGeometry;
  geometryMode: GeometryMode;
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

export default function ConveyorGeometryVisualization({
  derivedGeometry,
  geometryMode,
}: ConveyorGeometryVisualizationProps) {
  const { L_cc_in, H_cc_in, theta_deg, rise_in } = derivedGeometry;
  const inputMode = mapGeometryModeToInputMode(geometryMode);

  return (
    <div className="w-full max-w-[90%]">
      <ConveyorGeometryDiagram
        inputMode={inputMode}
        lengthCC={L_cc_in}
        horizontalRun={H_cc_in}
        inclineAngle={theta_deg}
        rise={rise_in}
      />
    </div>
  );
}
