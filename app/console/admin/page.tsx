'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Route } from 'next';
import { useCurrentUserRole } from '../../hooks/useCurrentUserRole';

interface ProductFamily {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  sort_order: number;
}

interface AdminPage {
  id: string;
  name: string;
  slug: string;
  href: string;
  category: 'system' | 'catalog';
  sort_order: number;
  is_active: boolean;
  productFamilies: { id: string; slug: string }[];
}

export default function ConsoleAdminPage() {
  const { isSuperAdmin, isLoading: isLoadingRole } = useCurrentUserRole();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [pages, setPages] = useState<AdminPage[]>([]);
  const [productFamilies, setProductFamilies] = useState<ProductFamily[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get current filter from URL
  const currentFilter = searchParams.get('product') || '';

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/admin-pages');
      if (!response.ok) throw new Error('Failed to fetch admin pages');
      const data = await response.json();
      setPages(data.pages || []);
      setProductFamilies(data.productFamilies || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setIsLoading(false);
    }
  }

  function handleFilterChange(slug: string) {
    if (slug) {
      router.push(`/console/admin?product=${slug}`);
    } else {
      router.push('/console/admin');
    }
  }

  // Separate pages by category
  const systemPages = pages.filter((p) => p.category === 'system');
  const catalogPages = pages.filter((p) => p.category === 'catalog');

  // Filter catalog pages by product family if a filter is selected
  const filteredCatalogPages = currentFilter
    ? catalogPages.filter((p) => p.productFamilies.some((pf) => pf.slug === currentFilter))
    : catalogPages;

  // Filter system pages to show only Users and Product Families if user is super admin
  const visibleSystemPages = systemPages.filter((p) => {
    if (p.slug === 'users' || p.slug === 'product-families') {
      return isSuperAdmin;
    }
    return true;
  });

  if (isLoading || isLoadingRole) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin</h1>
        <p className="text-gray-600 mb-8">Admin tools and configuration</p>
        <p className="text-gray-500">Loading...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin</h1>
        <p className="text-gray-600 mb-8">Admin tools and configuration</p>
        <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">
          <p>{error}</p>
          <button
            onClick={loadData}
            className="mt-2 px-4 py-2 bg-red-100 text-red-800 rounded hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin</h1>
      <p className="text-gray-600 mb-6">Admin tools and configuration</p>

      {/* Product Family Filter */}
      {productFamilies.length > 0 && (
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Product
          </label>
          <select
            value={currentFilter}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="w-48 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Products</option>
            {productFamilies.map((pf) => (
              <option key={pf.id} value={pf.slug}>
                {pf.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* System Section */}
      {visibleSystemPages.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-4 uppercase tracking-wide">
            System
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleSystemPages.map((page) => (
              <AdminCard
                key={page.id}
                name={page.name}
                href={page.href}
                variant={getCardVariant(page.slug)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Catalog Section */}
      {filteredCatalogPages.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-4 uppercase tracking-wide">
            Catalog
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCatalogPages.map((page) => (
              <AdminCard
                key={page.id}
                name={page.name}
                href={page.href}
                variant={getCardVariant(page.slug)}
              />
            ))}
          </div>
        </section>
      )}

      {filteredCatalogPages.length === 0 && currentFilter && (
        <div className="text-center py-8 text-gray-500">
          <p>No catalog pages match the selected product filter.</p>
        </div>
      )}
    </main>
  );
}

// Card variant styles based on page slug
type CardVariant = 'default' | 'purple' | 'blue' | 'green' | 'amber' | 'indigo';

function getCardVariant(slug: string): CardVariant {
  switch (slug) {
    case 'users':
    case 'product-families':
      return 'purple';
    case 'pulley-library':
      return 'blue';
    case 'power-feed':
    case 'controls-package':
    case 'sensor-models':
    case 'documentation-package':
      return 'green';
    case 'powder-colors':
      return 'amber';
    case 'gearmotors':
      return 'indigo';
    default:
      return 'default';
  }
}

interface AdminCardProps {
  name: string;
  href: string;
  variant: CardVariant;
}

function AdminCard({ name, href, variant }: AdminCardProps) {
  const variantClasses: Record<CardVariant, string> = {
    default: 'border-gray-200 bg-white hover:shadow-md',
    purple: 'border-purple-300 bg-purple-50 hover:bg-purple-100',
    blue: 'border-blue-300 bg-blue-50 hover:bg-blue-100',
    green: 'border-green-300 bg-green-50 hover:bg-green-100',
    amber: 'border-amber-300 bg-amber-50 hover:bg-amber-100',
    indigo: 'border-indigo-300 bg-indigo-50 hover:bg-indigo-100',
  };

  const textClasses: Record<CardVariant, { title: string; description: string }> = {
    default: { title: 'text-gray-900', description: 'text-gray-600' },
    purple: { title: 'text-purple-900', description: 'text-purple-700' },
    blue: { title: 'text-blue-900', description: 'text-blue-700' },
    green: { title: 'text-green-900', description: 'text-green-700' },
    amber: { title: 'text-amber-900', description: 'text-amber-700' },
    indigo: { title: 'text-indigo-900', description: 'text-indigo-700' },
  };

  const description = getPageDescription(name);

  return (
    <Link
      href={href as Route<string>}
      className={`block p-6 rounded-lg shadow border transition-shadow ${variantClasses[variant]}`}
    >
      <h3 className={`text-lg font-semibold mb-2 ${textClasses[variant].title}`}>
        {name}
      </h3>
      {description && (
        <p className={`text-sm ${textClasses[variant].description}`}>
          {description}
        </p>
      )}
    </Link>
  );
}

function getPageDescription(name: string): string {
  const descriptions: Record<string, string> = {
    'Users': 'Manage user roles and permissions (Super Admin only)',
    'Product Families': 'Manage product families for multi-product architecture',
    'Orphaned Applications': 'View and clean up applications not linked to quotes',
    'Gearmotors': 'View NORD FLEXBLOC vendor components (read-only)',
    'Belts': 'Manage belt catalog entries and revisions',
    'Pulley Library': 'Manage pulley styles with PCI-aligned stress limits',
    'V-Guides': 'Manage V-Guide profiles with EU/NA codes',
    'Cleats': 'Manage cleat catalog entries and center spacing factors',
    'Caster Models': 'Manage caster models for rolling conveyor supports',
    'Leg Models': 'Manage floor-mounted leg models for conveyor supports',
    'Power Feed': 'Manage electrical power feed dropdown options',
    'Controls Package': 'Manage controls package options',
    'Sensor Models': 'Manage sensor model catalog with quantity selection',
    'Documentation Package': 'Manage documentation deliverable options',
    'Powder Colors': 'Manage powder coat color options',
    'Environment Factors': 'Manage environment factor options',
    'Process Types': 'Manage process type options for applications',
  };
  return descriptions[name] || '';
}
