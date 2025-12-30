'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../src/lib/supabase/browser';
import { APP_NAME } from '../../src/lib/brand';

interface HeaderProps {
  loadedConfigurationId: string | null;
}

export default function Header({ loadedConfigurationId }: HeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {APP_NAME}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Model v1 - Factory Default
            </p>
          </div>
          <nav className="flex items-center space-x-4">
            <Link
              href="/"
              className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
            >
              Application
            </Link>
            <Link
              href="/quotes"
              className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
            >
              Quotes
            </Link>
            <Link
              href="/sales-orders"
              className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
            >
              Sales Orders
            </Link>
            <Link
              href="/recipes"
              className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
            >
              Recipes
            </Link>
            <Link
              href="/admin"
              className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
            >
              Admin
            </Link>
            {loadedConfigurationId && (
              <Link
                href={`/history/${loadedConfigurationId}`}
                className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                History
              </Link>
            )}
            <div className="h-5 w-px bg-gray-300" />
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
            >
              Sign out
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
