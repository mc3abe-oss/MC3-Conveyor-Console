'use client';

import Link from 'next/link';

interface HeaderProps {
  loadedConfigurationId: string | null;
}

export default function Header({ loadedConfigurationId }: HeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Belt Conveyor Calculator
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Model v1 - Factory Default
            </p>
          </div>
          <nav className="flex space-x-4">
            <Link
              href="/"
              className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
            >
              Calculator
            </Link>
            <Link
              href="/admin/belts"
              className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
            >
              Belt Admin
            </Link>
            {loadedConfigurationId && (
              <Link
                href={`/history/${loadedConfigurationId}`}
                className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                History
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
