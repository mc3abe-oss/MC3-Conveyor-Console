import { Suspense } from 'react';
import MagneticConveyorCalculatorApp from '../../components/MagneticConveyorCalculatorApp';

/**
 * Magnetic Conveyor Page
 *
 * Renders the magnetic conveyor calculator within the MC3 Conveyor Console.
 * Supports magnetic slider bed configurations.
 */
export default function MagneticConveyorPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-500">Loading calculator...</div>}>
      <MagneticConveyorCalculatorApp />
    </Suspense>
  );
}
