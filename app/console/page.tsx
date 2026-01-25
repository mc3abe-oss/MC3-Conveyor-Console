'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const LAST_APP_KEY = 'belt_lastApplicationId';

/**
 * Console Home Page
 *
 * Landing page for the console with navigation cards to:
 * - Quotes
 * - Sales Orders
 * - New Application
 * - Optional: Resume last application
 */
export default function ConsolePage() {
  const router = useRouter();
  const [lastAppId, setLastAppId] = useState<string | null>(null);

  // Check for last used application in localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(LAST_APP_KEY);
      if (stored) {
        setLastAppId(stored);
      }
    }
  }, []);

  const handleResumeLastApp = () => {
    if (lastAppId) {
      router.push(`/console/belt?app=${encodeURIComponent(lastAppId)}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-900">Conveyor Console</h1>
        <p className="mt-3 text-lg text-gray-600">
          Configure and manage conveyor applications
        </p>
      </div>

      {/* Primary Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Quotes Card */}
        <Link
          href="/console/quotes"
          className="group relative bg-white rounded-xl border-2 border-gray-200 p-6 hover:border-mc3-blue hover:shadow-lg transition-all"
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
              <svg
                className="w-7 h-7 text-mc3-blue"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Quotes</h2>
            <p className="text-sm text-gray-500">
              View and manage quote applications
            </p>
          </div>
        </Link>

        {/* Sales Orders Card */}
        <Link
          href="/console/sales-orders"
          className="group relative bg-white rounded-xl border-2 border-gray-200 p-6 hover:border-mc3-blue hover:shadow-lg transition-all"
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors">
              <svg
                className="w-7 h-7 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Sales Orders
            </h2>
            <p className="text-sm text-gray-500">
              View and manage sales order applications
            </p>
          </div>
        </Link>

        {/* New Application Card */}
        <Link
          href="/console/applications/new"
          className="group relative bg-white rounded-xl border-2 border-gray-200 p-6 hover:border-mc3-gold hover:shadow-lg transition-all"
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-amber-200 transition-colors">
              <svg
                className="w-7 h-7 text-amber-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              New Application
            </h2>
            <p className="text-sm text-gray-500">
              Create a new conveyor application
            </p>
          </div>
        </Link>
      </div>

      {/* Resume Last Application - Only show if there's a stored app */}
      {lastAppId && (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Resume Last Application
                </p>
                <p className="text-xs text-gray-500">
                  Continue where you left off
                </p>
              </div>
            </div>
            <button
              onClick={handleResumeLastApp}
              className="px-4 py-2 text-sm font-medium text-mc3-blue hover:text-mc3-navy hover:bg-gray-100 rounded-md transition-colors"
            >
              Resume
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
