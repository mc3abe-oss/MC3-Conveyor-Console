/**
 * Product Registry - Main Entry Point
 *
 * Initializes and exports the product registry system.
 *
 * Usage:
 *   import { getProduct, canRenderCard } from '@/products';
 *
 *   const product = getProduct('magnetic_conveyor_v1');
 *   const canShow = canRenderCard('magnetic_conveyor_v1', ['total_torque_in_lb']);
 */

import { createLogger } from '../lib/logger';

const logger = createLogger().child({ module: 'products' });

// Import registry functions
import {
  registerProduct,
  getProduct,
  getProductKeys,
  getAllProducts,
  hasOutputKey,
  canRenderCard,
  getVisibleCardsForTab,
  getRegistryDebugInfo,
} from './registry';

// Import product modules
import magneticConveyorV1 from './magnetic_conveyor_v1';
import beltConveyorV1 from './belt_conveyor_v1';

// =============================================================================
// INITIALIZATION
// =============================================================================

let initialized = false;

/**
 * Initialize the product registry with all available products.
 * Safe to call multiple times - only initializes once.
 */
export function initializeProducts(): void {
  if (initialized) {
    logger.debug('product.registry.skip', { reason: 'already initialized' });
    return;
  }

  logger.info('product.registry.initializing');

  // Register all products
  registerProduct(magneticConveyorV1);
  registerProduct(beltConveyorV1);

  initialized = true;
  logger.info('product.registry.initialized', getRegistryDebugInfo());
}

// Auto-initialize on import
initializeProducts();

// =============================================================================
// RE-EXPORTS
// =============================================================================

// Registry functions
export {
  registerProduct,
  getProduct,
  getProductKeys,
  getAllProducts,
  hasOutputKey,
  canRenderCard,
  getVisibleCardsForTab,
  getRegistryDebugInfo,
};

// Types
export type {
  ProductModule,
  InputFieldDef,
  OutputFieldDef,
  TabConfig,
  CardConfig,
  ProductUIConfig,
  ValidationResult,
} from './types';

// Product modules
export { magneticConveyorV1, beltConveyorV1 };
