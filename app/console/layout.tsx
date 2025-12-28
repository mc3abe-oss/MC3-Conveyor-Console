'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { PRODUCTS } from '../../src/lib/products';
import { createClient } from '../../src/lib/supabase/browser';

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
      <header className="bg-slate-800 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Left: Console Title */}
            <div className="flex items-center gap-6">
              <Link href="/console" className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight">MC3 Conveyor Console</span>
              </Link>

              {/* Product Selector */}
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-sm">Product:</span>
                <select
                  value={currentProduct?.href || ''}
                  onChange={handleProductChange}
                  className="bg-slate-700 text-white text-sm rounded px-3 py-1.5 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                Calculator
              </Link>
              <Link
                href="/recipes"
                className="px-3 py-2 rounded text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                Recipes
              </Link>
              <Link
                href="/admin"
                className="px-3 py-2 rounded text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                Admin
              </Link>
              <div className="h-5 w-px bg-slate-600 mx-2" />
              <button
                onClick={handleLogout}
                className="px-3 py-2 rounded text-sm font-medium text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
              >
                Sign out
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Product Context Bar */}
      {currentProduct && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-10">
              <h2 className="text-sm font-semibold text-gray-900">
                {currentProduct.name}
              </h2>
              {currentProduct.description && (
                <>
                  <span className="mx-2 text-gray-300">|</span>
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
