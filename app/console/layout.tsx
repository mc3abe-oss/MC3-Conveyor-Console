'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { PRODUCTS } from '../../src/lib/products';
import { createClient } from '../../src/lib/supabase/browser';
import MC3Logo from '../components/MC3Logo';

interface ConsoleLayoutProps {
  children: React.ReactNode;
}

export default function ConsoleLayout({ children }: ConsoleLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Determine current product from pathname
  const currentProduct = PRODUCTS.find((p) => pathname.startsWith(p.href));

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const href = e.target.value;
    if (href) {
      router.push(href as '/console/sliderbed');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Console Header */}
      <header className="bg-mc3-navy text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Left: Logo + Product Selector */}
            <div className="flex items-center gap-6">
              <Link href="/console" className="flex items-center">
                <MC3Logo variant="white" size={90} />
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
                href="/console/sliderbed"
                className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                  pathname.startsWith('/console/sliderbed')
                    ? 'bg-mc3-blue text-white'
                    : 'text-mc3-mist/80 hover:bg-mc3-blue/50 hover:text-white'
                }`}
              >
                Calculator
              </Link>
              <Link
                href="/recipes"
                className="px-3 py-2 rounded text-sm font-medium text-mc3-mist/80 hover:bg-mc3-blue/50 hover:text-white transition-colors"
              >
                Recipes
              </Link>
              <Link
                href="/admin"
                className="px-3 py-2 rounded text-sm font-medium text-mc3-mist/80 hover:bg-mc3-blue/50 hover:text-white transition-colors"
              >
                Admin
              </Link>
              <div className="h-5 w-px bg-mc3-mist/30 mx-2" />
              <button
                onClick={handleLogout}
                className="px-3 py-2 rounded text-sm font-medium text-mc3-mist/60 hover:bg-mc3-blue/50 hover:text-white transition-colors"
              >
                Sign out
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Product Context Bar */}
      {currentProduct && (
        <div className="bg-white border-b border-mc3-line">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-10">
              <h2 className="text-sm font-semibold text-mc3-navy">
                {currentProduct.name}
              </h2>
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
