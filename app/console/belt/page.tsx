import { Suspense } from 'react';
import BeltConveyorCalculatorApp from '../../components/BeltConveyorCalculatorApp';

/**
 * Belt Conveyor Page
 *
 * Renders the belt conveyor calculator within the MC3 Conveyor Console.
 * Supports both slider bed and roller bed configurations.
 */
export default function BeltConveyorPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-500">Loading calculator...</div>}>
      <BeltConveyorCalculatorApp />
    </Suspense>
  );
}
