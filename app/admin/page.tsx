'use client';

import Link from 'next/link';
import Header from '../components/Header';

export default function AdminPage() {
  return (
    <>
      <Header loadedConfigurationId={null} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin</h1>
        <p className="text-gray-600 mb-8">Admin tools and configuration</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link
            href="/admin/belts"
            className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Belt Catalog Admin</h2>
            <p className="text-sm text-gray-600">
              Manage belt catalog entries and revisions
            </p>
          </Link>

          <Link
            href="/admin/pulleys"
            className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Pulley Catalog Admin</h2>
            <p className="text-sm text-gray-600">
              Manage pulley catalog entries (internal bearings = tail only)
            </p>
          </Link>

          <Link
            href="/admin/environment-factors"
            className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Environment Factors</h2>
            <p className="text-sm text-gray-600">
              Manage environment factor options (Indoor, Outdoor, Washdown, etc.)
            </p>
          </Link>
        </div>
      </main>
    </>
  );
}
