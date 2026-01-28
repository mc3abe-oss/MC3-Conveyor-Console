/**
 * Product Registry
 *
 * Central registry for product modules with fail-closed gating.
 *
 * Key Features:
 * - Register product modules by key
 * - Query product capabilities via outputsSchema
 * - FAIL-CLOSED canRenderCard() - returns false if ANY required key is missing
 * - Prevents belt-only results from appearing on magnetic conveyors
 */

import type { ProductModule, CardConfig, OutputFieldDef } from './types';

// Re-export types for convenience
export * from './types';

// =============================================================================
// REGISTRY STATE
// =============================================================================

/** Map of product key -> ProductModule (using any for storage flexibility) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const productModules = new Map<string, ProductModule<any, any, any>>();

// =============================================================================
// REGISTRATION
// =============================================================================

/**
 * Register a product module in the registry.
 *
 * @param product - The product module to register
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerProduct(product: ProductModule<any, any, any>): void {
  if (productModules.has(product.key)) {
    console.warn(`[ProductRegistry] Overwriting existing product: ${product.key}`);
  }
  console.log(`[ProductRegistry] Registered product: ${product.key} (${product.outputsSchema.length} output fields)`);
  productModules.set(product.key, product);
}

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get a product module by key.
 *
 * @param key - Product key
 * @returns The product module or undefined if not found
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getProduct(key: string): ProductModule<any, any, any> | undefined {
  return productModules.get(key);
}

/**
 * Get all registered product keys.
 *
 * @returns Array of product keys
 */
export function getProductKeys(): string[] {
  return Array.from(productModules.keys());
}

/**
 * Get all registered product modules.
 *
 * @returns Array of product modules
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getAllProducts(): ProductModule<any, any, any>[] {
  return Array.from(productModules.values());
}

/**
 * Check if a product has a specific output key in its schema.
 *
 * @param productKey - Product key to check
 * @param outputKey - Output field key to look for
 * @returns true if the product has this output, false otherwise
 */
export function hasOutputKey(productKey: string, outputKey: string): boolean {
  const product = productModules.get(productKey);
  if (!product) {
    console.debug(`[ProductRegistry] hasOutputKey: product not found: ${productKey}`);
    return false;
  }

  const hasKey = product.outputsSchema.some((field: OutputFieldDef) => field.key === outputKey);
  return hasKey;
}

/**
 * CRITICAL: Fail-closed gate for card rendering.
 *
 * Returns false if:
 * - Product is not found in registry
 * - ANY of the required output keys is missing from the product's outputsSchema
 *
 * This prevents belt-specific cards from rendering on magnetic conveyors
 * and vice versa.
 *
 * @param productKey - Product key to check
 * @param requiredKeys - Array of output keys the card requires
 * @returns true only if ALL required keys exist in the product's outputsSchema
 */
export function canRenderCard(productKey: string, requiredKeys: string[]): boolean {
  const product = productModules.get(productKey);

  // FAIL-CLOSED: Unknown product cannot render any cards
  if (!product) {
    console.debug(`[ProductRegistry] canRenderCard: DENIED - product not found: ${productKey}`);
    return false;
  }

  // Empty requirements = always render
  if (requiredKeys.length === 0) {
    return true;
  }

  // Build set of available output keys for fast lookup
  const availableKeys = new Set(product.outputsSchema.map((field: OutputFieldDef) => field.key));

  // Check each required key
  for (const requiredKey of requiredKeys) {
    if (!availableKeys.has(requiredKey)) {
      console.debug(
        `[ProductRegistry] canRenderCard: DENIED - product "${productKey}" missing output key: "${requiredKey}"`
      );
      return false;
    }
  }

  return true;
}

/**
 * Get visible cards for a specific tab, filtered by canRenderCard.
 *
 * @param productKey - Product key
 * @param tabId - Tab ID to get cards for
 * @returns Array of CardConfig that should be visible for this product/tab
 */
export function getVisibleCardsForTab(productKey: string, tabId: string): CardConfig[] {
  const product = productModules.get(productKey);
  if (!product) {
    console.debug(`[ProductRegistry] getVisibleCardsForTab: product not found: ${productKey}`);
    return [];
  }

  // Find the tab
  const tab = product.ui.tabs.find((t) => t.id === tabId);
  if (!tab) {
    console.debug(`[ProductRegistry] getVisibleCardsForTab: tab not found: ${tabId}`);
    return [];
  }

  // Get cards for this tab
  const tabCards = product.ui.cards.filter((card) => tab.cardIds.includes(card.id));

  // Filter by canRenderCard
  const visibleCards = tabCards.filter((card) => canRenderCard(productKey, card.requiresOutputKeys));

  console.debug(
    `[ProductRegistry] getVisibleCardsForTab: ${productKey}/${tabId} - ${visibleCards.length}/${tabCards.length} cards visible`
  );

  return visibleCards;
}

// =============================================================================
// DEBUG
// =============================================================================

/**
 * Get debug info about the registry state.
 */
export function getRegistryDebugInfo(): {
  productCount: number;
  products: Array<{ key: string; name: string; outputCount: number }>;
} {
  return {
    productCount: productModules.size,
    products: Array.from(productModules.values()).map((p) => ({
      key: p.key,
      name: p.name,
      outputCount: p.outputsSchema.length,
    })),
  };
}
