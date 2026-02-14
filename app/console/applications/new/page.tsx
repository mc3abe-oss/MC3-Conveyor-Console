'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/**
 * Product Picker Page
 *
 * This page is the required first step when creating a new application.
 * Users must explicitly select a product before proceeding.
 * No product is selected by default.
 */

interface ProductFamily {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  model_key: string | null;
  is_active: boolean;
  sort_order: number;
}

// Map product family slugs to their calculator routes
const PRODUCT_ROUTES: Record<string, string> = {
  'belt-conveyor': '/console/belt',
  'magnetic-conveyor': '/console/magnetic',
};

export default function NewApplicationPage() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductFamily[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Fetch product families from API
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/product-families');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch products');
      }

      const data: ProductFamily[] = await res.json();
      setProducts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  // Handle product selection
  const handleProductSelect = (productId: string, isActive: boolean) => {
    if (!isActive) return; // Deprecated products are not selectable
    setSelectedProductId(productId);
  };

  // Handle keyboard navigation
  const handleKeyDown = (
    e: React.KeyboardEvent,
    productId: string,
    isActive: boolean
  ) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleProductSelect(productId, isActive);
    }
  };

  // Handle form submission
  const handleSubmit = () => {
    if (!selectedProductId) return;

    const selectedProduct = products.find((p) => p.id === selectedProductId);
    if (!selectedProduct) return;

    setIsCreating(true);

    // Navigate to the product's calculator page with new=true param
    // The calculator will start in draft mode without a linked Quote/SO
    const productRoute = PRODUCT_ROUTES[selectedProduct.slug] || '/console/belt';
    router.push(`${productRoute}?new=true` as '/console/belt');
  };

  // Get selected product for button text
  const selectedProduct = products.find((p) => p.id === selectedProductId);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back link */}
      <div className="mb-6">
        <Link
          href="/console"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <svg
            className="w-4 h-4 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Console
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Set Product</h1>
        <p className="mt-2 text-gray-600">
          The product defines the calculations, rules, and options available.
          This cannot be changed later.
        </p>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12">
          <svg
            className="animate-spin h-8 w-8 mx-auto mb-4 text-mc3-blue"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="text-gray-500">Loading products...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <svg
              className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <h3 className="text-red-800 font-medium">
                Failed to load products
              </h3>
              <p className="text-red-700 text-sm mt-1">{error}</p>
              <button
                onClick={fetchProducts}
                className="mt-3 px-4 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-md transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <svg
            className="mx-auto h-16 w-16 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No products available
          </h3>
          <p className="mt-2 text-gray-500">
            Contact your administrator to set up product families.
          </p>
        </div>
      ) : (
        <>
          {/* Product Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {products.map((product) => {
              const isSelected = selectedProductId === product.id;
              const isDeprecated = !product.is_active;

              return (
                <div
                  key={product.id}
                  role="button"
                  tabIndex={isDeprecated ? -1 : 0}
                  onClick={() => handleProductSelect(product.id, product.is_active)}
                  onKeyDown={(e) => handleKeyDown(e, product.id, product.is_active)}
                  className={`
                    relative p-6 rounded-lg border-2 transition-all
                    ${
                      isDeprecated
                        ? 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-60'
                        : isSelected
                        ? 'bg-mc3-blue/5 border-mc3-blue ring-2 ring-mc3-blue/20 cursor-pointer'
                        : 'bg-white border-gray-200 hover:border-mc3-blue/50 hover:shadow-md cursor-pointer'
                    }
                    focus:outline-none focus:ring-2 focus:ring-mc3-blue focus:ring-offset-2
                  `}
                  aria-selected={isSelected}
                  aria-disabled={isDeprecated}
                >
                  {/* Deprecated badge */}
                  {isDeprecated && (
                    <span className="absolute top-3 right-3 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-600">
                      Deprecated
                    </span>
                  )}

                  {/* Selection indicator */}
                  {isSelected && !isDeprecated && (
                    <span className="absolute top-3 right-3 inline-flex items-center justify-center w-6 h-6 rounded-full bg-mc3-blue text-white">
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                  )}

                  {/* Product info */}
                  <h3
                    className={`text-lg font-semibold ${
                      isDeprecated ? 'text-gray-500' : 'text-gray-900'
                    }`}
                  >
                    {product.name}
                  </h3>
                  <p
                    className={`mt-2 text-sm ${
                      isDeprecated ? 'text-gray-400' : 'text-gray-600'
                    }`}
                  >
                    {product.short_description || 'No description available'}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200">
            <Link
              href="/console"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Cancel
            </Link>
            <button
              onClick={handleSubmit}
              disabled={!selectedProductId || isCreating}
              className={`
                px-6 py-2 text-sm font-medium rounded-md transition-colors
                ${
                  selectedProductId && !isCreating
                    ? 'bg-mc3-blue text-white hover:bg-mc3-navy'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              {isCreating ? (
                <span className="inline-flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Creating...
                </span>
              ) : selectedProduct ? (
                `Set Product & Create Application`
              ) : (
                'Set Product & Create Application'
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
