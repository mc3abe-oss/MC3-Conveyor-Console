'use client';

/**
 * Physical Tab Router
 *
 * Routes to product-specific Physical tab templates based on productKey.
 * This is the single entry point for the Physical tab in the configurator.
 */

import { ProductKey } from '../../../../src/lib/products';
import BeltConveyorPhysical, { BeltConveyorPhysicalProps } from './templates/BeltConveyorPhysical';
import MagneticConveyorPhysical from './templates/MagneticConveyorPhysical';

export interface PhysicalTabProps extends BeltConveyorPhysicalProps {
  productKey: ProductKey;
}

export default function PhysicalTab({ productKey, ...props }: PhysicalTabProps) {
  switch (productKey) {
    case 'magnetic_conveyor_v1':
      return <MagneticConveyorPhysical {...props} />;
    case 'belt_conveyor_v1':
    default:
      return <BeltConveyorPhysical {...props} />;
  }
}
