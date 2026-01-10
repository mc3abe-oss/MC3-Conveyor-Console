'use client';

import Link from 'next/link';
import { useCurrentUserRole } from '../../hooks/useCurrentUserRole';

export default function ConsoleAdminPage() {
  const { isSuperAdmin } = useCurrentUserRole();

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin</h1>
      <p className="text-gray-600 mb-8">Admin tools and configuration</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link
          href="/console/admin/belts"
          className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Belt Catalog Admin</h2>
          <p className="text-sm text-gray-600">
            Manage belt catalog entries and revisions
          </p>
        </Link>

        <Link
          href="/console/admin/pulley-library"
          className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-blue-300 bg-blue-50"
        >
          <h2 className="text-lg font-semibold text-blue-900 mb-2">Pulley Library</h2>
          <p className="text-sm text-blue-700">
            Manage pulley styles (Drum, Wing) with PCI-aligned stress limits
          </p>
        </Link>

        <Link
          href="/console/admin/environment-factors"
          className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Environment Factors</h2>
          <p className="text-sm text-gray-600">
            Manage environment factor options (Indoor, Outdoor, Washdown, etc.)
          </p>
        </Link>

        <Link
          href="/console/admin/process-types"
          className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Process Types</h2>
          <p className="text-sm text-gray-600">
            Manage process type options for applications (Molding, Stamping, etc.)
          </p>
        </Link>

        <Link
          href="/console/admin/v-guides"
          className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-2">V-Guides</h2>
          <p className="text-sm text-gray-600">
            Manage V-Guide profiles with EU/NA codes and minimum pulley diameters
          </p>
        </Link>

        <Link
          href="/console/admin/cleats"
          className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Cleats Admin</h2>
          <p className="text-sm text-gray-600">
            Manage cleat catalog entries and center spacing factors
          </p>
        </Link>

        <Link
          href="/console/admin/leg-models"
          className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Leg Models</h2>
          <p className="text-sm text-gray-600">
            Manage floor-mounted leg models for conveyor supports
          </p>
        </Link>

        <Link
          href="/console/admin/caster-models"
          className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Caster Models</h2>
          <p className="text-sm text-gray-600">
            Manage caster models for rolling conveyor supports
          </p>
        </Link>

        {/* Electrical & Controls Dropdowns */}
        <Link
          href="/console/admin/power-feed"
          className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-green-300 bg-green-50"
        >
          <h2 className="text-lg font-semibold text-green-900 mb-2">Power Feed Options</h2>
          <p className="text-sm text-green-700">
            Manage electrical power feed dropdown options (120V, 240V, 480V, 600V)
          </p>
        </Link>

        <Link
          href="/console/admin/controls-package"
          className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-green-300 bg-green-50"
        >
          <h2 className="text-lg font-semibold text-green-900 mb-2">Controls Package Options</h2>
          <p className="text-sm text-green-700">
            Manage controls package options (None, Start/Stop, VFD, Full Automation)
          </p>
        </Link>

        <Link
          href="/console/admin/sensor-models"
          className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-green-300 bg-green-50"
        >
          <h2 className="text-lg font-semibold text-green-900 mb-2">Sensor Models</h2>
          <p className="text-sm text-green-700">
            Manage sensor model catalog with quantity selection support
          </p>
        </Link>

        <Link
          href="/console/admin/documentation-package"
          className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-green-300 bg-green-50"
        >
          <h2 className="text-lg font-semibold text-green-900 mb-2">Documentation Package Options</h2>
          <p className="text-sm text-green-700">
            Manage documentation deliverable options (Basic, Full, As-Built)
          </p>
        </Link>

        <Link
          href="/console/admin/powder-colors"
          className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-amber-300 bg-amber-50"
        >
          <h2 className="text-lg font-semibold text-amber-900 mb-2">Powder Colors</h2>
          <p className="text-sm text-amber-700">
            Manage powder coat color options for conveyor and guarding finish
          </p>
        </Link>

        {isSuperAdmin && (
          <Link
            href="/console/admin/users"
            className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-purple-300 bg-purple-50"
          >
            <h2 className="text-lg font-semibold text-purple-900 mb-2">User Admin</h2>
            <p className="text-sm text-purple-700">
              Manage user roles and permissions (Super Admin only)
            </p>
          </Link>
        )}
      </div>
    </main>
  );
}
