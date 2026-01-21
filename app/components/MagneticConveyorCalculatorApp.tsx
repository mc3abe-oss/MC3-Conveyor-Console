'use client';

import BeltConveyorCalculatorApp from './BeltConveyorCalculatorApp';

/**
 * Magnetic Conveyor Calculator App
 *
 * Wrapper that renders the shared calculator with magnetic conveyor product key.
 * The Physical tab will render magnetic-specific components based on this key.
 */
export default function MagneticConveyorCalculatorApp() {
  return <BeltConveyorCalculatorApp productKey="magnetic_conveyor_v1" />;
}
