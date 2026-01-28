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
    console.debug('[Products] Already initialized, skipping');
    return;
  }

  console.log('[Products] Initializing product registry...');

  // Register all products
  registerProduct(magneticConveyorV1);
  registerProduct(beltConveyorV1);

  initialized = true;
  console.log('[Products] Product registry initialized:', getRegistryDebugInfo());
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
