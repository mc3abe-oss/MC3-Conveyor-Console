'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { PRODUCTS } from '../../src/lib/products';
import { createClient } from '../../src/lib/supabase/browser';
import { clearCachedRole } from '../hooks/useCurrentUserRole';
import MC3Logo from '../components/MC3Logo';
import MobileNavDrawer from '../components/MobileNavDrawer';
import UserAccountMenu from '../components/UserAccountMenu';

interface ConsoleLayoutProps {
  children: React.ReactNode;
}

export default function ConsoleLayout({ children }: ConsoleLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Determine current product from pathname
  const currentProduct = PRODUCTS.find((p) => pathname.startsWith(p.href));

  const handleLogout = async () => {
    clearCachedRole();
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const href = e.target.value;
    if (href) {
      router.push(href as '/console/belt');
    }
  };

  const handleMobileNavigate = (href: string) => {
    router.push(href as '/console/belt');
  };

  const handleMobileProductChange = () => {
    // For now, just close the drawer - product selection could be enhanced later
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Console Header */}
      <header className="bg-mc3-navy text-white shadow-md">
        {/* Desktop Header */}
        <div className="hidden md:block max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Left: Logo + Product Selector */}
            <div className="flex items-center gap-6">
              <Link href="/console" className="flex items-center">
                <MC3Logo size={90} />
              </Link>

              {/* Product Selector */}
              <div className="flex items-center gap-2">
                <span className="text-mc3-mist/70 text-sm">Product:</span>
                <select
                  value={currentProduct?.href || ''}
                  onChange={handleProductChange}
                  className="bg-mc3-ink/30 text-white text-sm rounded px-3 py-1.5 border border-mc3-mist/20 focus:outline-none focus:ring-2 focus:ring-mc3-gold"
                >
                  {PRODUCTS.map((product) => (
                    <option key={product.key} value={product.href}>
                      {product.name}
                      {product.status === 'beta' ? ' (Beta)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Right: Global Actions */}
            <nav className="flex items-center space-x-1">
              <Link
                href="/console/belt"
                className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                  pathname.startsWith('/console/belt')
                    ? 'bg-mc3-blue text-white'
                    : 'text-mc3-mist/80 hover:bg-mc3-blue/50 hover:text-white'
                }`}
              >
                Application
              </Link>
              <Link
                href="/console/quotes"
                className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                  pathname.startsWith('/console/quotes')
                    ? 'bg-mc3-blue text-white'
                    : 'text-mc3-mist/80 hover:bg-mc3-blue/50 hover:text-white'
                }`}
              >
                Quotes
              </Link>
              <Link
                href="/console/sales-orders"
                className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                  pathname.startsWith('/console/sales-orders')
                    ? 'bg-mc3-blue text-white'
                    : 'text-mc3-mist/80 hover:bg-mc3-blue/50 hover:text-white'
                }`}
              >
                Sales Orders
              </Link>
              <Link
                href="/console/recipes"
                className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                  pathname.startsWith('/console/recipes')
                    ? 'bg-mc3-blue text-white'
                    : 'text-mc3-mist/80 hover:bg-mc3-blue/50 hover:text-white'
                }`}
              >
                Recipes
              </Link>
              <Link
                href="/console/admin"
                className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                  pathname.startsWith('/console/admin')
                    ? 'bg-mc3-blue text-white'
                    : 'text-mc3-mist/80 hover:bg-mc3-blue/50 hover:text-white'
                }`}
              >
                Admin
              </Link>
              <div className="h-5 w-px bg-mc3-mist/30 mx-2" />
              <UserAccountMenu onSignOut={handleLogout} darkMode />
            </nav>
          </div>
        </div>

        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between h-14 px-4">
          {/* Hamburger Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 -ml-2 text-white/80 hover:text-white rounded-md min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Open menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Center: Product Name */}
          <span className="font-semibold text-white truncate max-w-[200px]">
            {currentProduct?.name || 'MC3'}
          </span>

          {/* Right: Spacer for balance */}
          <div className="w-10" />
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      <MobileNavDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        currentProduct={currentProduct}
        pathname={pathname}
        onNavigate={handleMobileNavigate}
        onProductChange={handleMobileProductChange}
        onSignOut={handleLogout}
      />

      {/* Product Context Bar - hidden on mobile */}
      {currentProduct && (
        <div className="hidden md:block bg-white border-b border-mc3-line">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-10">
              <h2 className="text-sm font-semibold text-mc3-navy">
                {currentProduct.name}
              </h2>
              {pathname.startsWith('/console/belt') && (
                <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                  Application
                </span>
              )}
              {currentProduct.description && (
                <>
                  <span className="mx-2 text-mc3-line">|</span>
                  <span className="text-sm text-gray-500">{currentProduct.description}</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
