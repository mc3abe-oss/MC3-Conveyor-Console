/**
 * MC3 Conveyor Console - Product Registry
 *
 * Single source of truth for all products in the console.
 * Adding a new product:
 * 1. Add entry to PRODUCTS array
 * 2. Create /app/console/<product>/page.tsx
 */

export type ProductKey = 'belt_conveyor_v1';

export type ProductStatus = 'active' | 'beta' | 'deprecated';

export interface ProductDef {
  key: ProductKey;
  name: string;
  description?: string;
  href: string;
  status: ProductStatus;
}

/**
 * All registered products in the console
 */
export const PRODUCTS: ProductDef[] = [
  {
    key: 'belt_conveyor_v1',
    name: 'Belt Conveyor',
    description: 'Slider bed or roller bed configurations',
    href: '/console/belt',
    status: 'active',
  },
];

/**
 * Get the default product (first active product)
 */
export function getDefaultProduct(): ProductDef {
  const active = PRODUCTS.find((p) => p.status === 'active');
  return active || PRODUCTS[0];
}

/**
 * Get a product by its key
 */
export function getProductByKey(key: ProductKey): ProductDef | undefined {
  return PRODUCTS.find((p) => p.key === key);
}

/**
 * Get product by href path
 */
export function getProductByHref(href: string): ProductDef | undefined {
  return PRODUCTS.find((p) => p.href === href);
}

/**
 * Get all active products
 */
export function getActiveProducts(): ProductDef[] {
  return PRODUCTS.filter((p) => p.status === 'active');
}
