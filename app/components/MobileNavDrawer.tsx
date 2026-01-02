'use client';

import { useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ProductDef, PRODUCTS } from '../../src/lib/products';
import MC3Logo from './MC3Logo';

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentProduct: ProductDef | undefined;
  pathname: string;
  onNavigate: (href: string) => void;
  onProductChange: () => void;
  onSignOut: () => void;
}

const NAV_ITEMS = [
  { href: '/console/belt', label: 'Application' },
  { href: '/console/quotes', label: 'Quotes' },
  { href: '/console/sales-orders', label: 'Sales Orders' },
  { href: '/console/recipes', label: 'Recipes' },
  { href: '/console/admin', label: 'Admin' },
];

export default function MobileNavDrawer({
  isOpen,
  onClose,
  currentProduct,
  pathname,
  onNavigate,
  onProductChange,
  onSignOut,
}: MobileNavDrawerProps) {
  // Handle Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when drawer is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) {
    return null;
  }

  const handleNavClick = (href: string) => {
    onNavigate(href);
    onClose();
  };

  const handleSignOutClick = () => {
    onSignOut();
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-30 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className="fixed left-0 top-0 h-full w-72 bg-white shadow-xl z-50 flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-mc3-navy">
          <MC3Logo size={80} />
          <button
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white rounded-md"
            aria-label="Close menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Current Product */}
          <div className="p-4 border-b border-gray-200">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Current Product
            </p>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">
                {currentProduct?.name || 'No product selected'}
              </span>
              {currentProduct?.status === 'beta' && (
                <span className="px-1.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded">
                  Beta
                </span>
              )}
            </div>
            {PRODUCTS.length > 1 && (
              <button
                onClick={onProductChange}
                className="mt-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Change Product
              </button>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="p-2">
            <p className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
              Navigation
            </p>
            {NAV_ITEMS.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <button
                  key={item.href}
                  onClick={() => handleNavClick(item.href)}
                  className={`
                    w-full flex items-center px-3 py-3 rounded-lg text-left text-sm font-medium
                    min-h-[44px] transition-colors
                    ${isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4">
          <button
            onClick={handleSignOutClick}
            className="w-full flex items-center justify-center px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 min-h-[44px] transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </>
  );
}
