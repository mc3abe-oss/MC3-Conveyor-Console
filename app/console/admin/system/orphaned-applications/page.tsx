'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface OrphanedApplication {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export default function OrphanedApplicationsPage() {
  const [applications, setApplications] = useState<OrphanedApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const fetchOrphaned = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/orphaned-applications');
      if (!res.ok) {
        throw new Error('Failed to fetch orphaned applications');
      }
      const data = await res.json();
      setApplications(data.applications || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchOrphaned();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Permanently delete "${name}"? This cannot be undone.`)) {
      return;
    }

    setDeletingIds(prev => new Set(prev).add(id));

    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }

      // Remove from list
      setApplications(prev => prev.filter(app => app.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Link href="/console" className="text-blue-600 hover:underline text-sm">
          &larr; Back to Console
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Orphaned Applications
      </h1>
      <p className="text-gray-600 mb-6">
        Applications not linked to any Quote or Sales Order. These can be safely deleted.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : applications.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No orphaned applications found.</p>
          <p className="text-sm text-gray-500 mt-1">All applications are properly linked.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-sm text-gray-500 mb-2">
            Found {applications.length} orphaned application{applications.length !== 1 ? 's' : ''}
          </div>

          {applications.map((app) => (
            <div
              key={app.id}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-white"
            >
              <div>
                <p className="font-medium text-gray-900">{app.name}</p>
                <p className="text-sm text-gray-500">
                  {app.slug} &middot; Updated {new Date(app.updated_at).toLocaleDateString()}
                </p>
                {!app.is_active && (
                  <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                    Inactive
                  </span>
                )}
              </div>
              <button
                onClick={() => handleDelete(app.id, app.name)}
                disabled={deletingIds.has(app.id)}
                className="px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
              >
                {deletingIds.has(app.id) ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          ))}

          <div className="mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={fetchOrphaned}
              className="text-sm text-blue-600 hover:underline"
            >
              Refresh list
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
