'use client';

import Link from 'next/link';
import Header from '../components/Header';

export default function HistoryIndexPage() {
  return (
    <>
      <Header loadedConfigurationId={null} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="card">
            <h1 className="text-2xl font-bold text-gray-900">Revision History</h1>
          </div>

          {/* No Configuration Message */}
          <div className="card">
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                No Configuration Loaded
              </h3>
              <p className="mt-2 text-gray-500 max-w-md mx-auto">
                To view revision history, first load a configuration from the Calculator page.
                Enter a Quote or Sales Order number and click Load, then click the History link
                to see all revisions for that configuration.
              </p>
              <div className="mt-6">
                <Link
                  href="/"
                  className="btn btn-primary"
                >
                  Go to Calculator
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
