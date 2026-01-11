'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import RevisionDetailDrawer from '../../components/RevisionDetailDrawer';
import Header from '../../components/Header';

interface Revision {
  id: string;
  revision_number: number;
  created_at: string;
  created_by_user_id: string;
  change_note?: string;
  inputs_json?: any;
  application_json?: any;
  outputs_json?: any;
  diff_summary?: {
    inputs_changed?: Array<{ key: string; from: any; to: any }>;
    application_changed?: Array<{ key: string; from: any; to: any }>;
  };
}

interface Configuration {
  id: string;
  reference_type: string;
  reference_number: string;
  reference_line: number;
  model_key: string;
  title?: string;
  created_at: string;
  updated_at: string;
}

export default function HistoryPage() {
  const params = useParams();
  const configId = params.configId as string;

  const [configuration, setConfiguration] = useState<Configuration | null>(null);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Drawer state
  const [selectedRevision, setSelectedRevision] = useState<Revision | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    if (!configId) return;

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Load revisions with full data
        const response = await fetch(
          `/api/configurations/revisions?configuration_id=${configId}&include_data=true`
        );

        if (!response.ok) {
          throw new Error('Failed to load revision history');
        }

        const data = await response.json();
        setConfiguration(data.configuration);
        setRevisions(data.revisions || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [configId]);

  const handleViewDetails = (revision: Revision) => {
    setSelectedRevision(revision);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedRevision(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading history...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="text-red-600 text-center py-8">
          <p className="font-medium">Error loading history</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 btn btn-secondary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!configuration) {
    return (
      <div className="card">
        <div className="text-gray-500 text-center py-8">
          Configuration not found
        </div>
      </div>
    );
  }

  return (
    <>
      <Header loadedConfigurationId={configId} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Page Header */}
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Revision History</h1>
                <p className="text-gray-600 mt-1">
                  {configuration.reference_type} {configuration.reference_number}
                  {configuration.reference_line > 1 && ` (Line ${configuration.reference_line})`}
                  {configuration.title && ` - ${configuration.title}`}
                </p>
              </div>
              <div className="text-right text-sm text-gray-500">
                <p>Model: {configuration.model_key}</p>
                <p>{revisions.length} revision{revisions.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>

          {/* Revisions List */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">All Revisions</h2>

            {revisions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No revisions found</p>
            ) : (
              <div className="space-y-3">
                {revisions.map((revision, index) => {
                  const isLatest = index === 0;
                  // prevRevision used for diff display in drawer
                  void (index < revisions.length - 1 ? revisions[index + 1] : null);

                  return (
                    <div
                      key={revision.id}
                      className={`p-4 border rounded-lg ${
                        isLatest
                          ? 'bg-primary-50 border-primary-200'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">
                              Revision {revision.revision_number}
                            </span>
                            {isLatest && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">
                                Current
                              </span>
                            )}
                          </div>

                          {revision.change_note && (
                            <p className="text-gray-700 mt-1">{revision.change_note}</p>
                          )}

                          {/* Quick diff summary */}
                          {revision.diff_summary && (
                            <div className="mt-2 text-xs text-gray-500">
                              {revision.diff_summary.inputs_changed &&
                                revision.diff_summary.inputs_changed.length > 0 && (
                                  <span className="mr-3">
                                    {revision.diff_summary.inputs_changed.length} input
                                    {revision.diff_summary.inputs_changed.length !== 1 ? 's' : ''} changed
                                  </span>
                                )}
                              {revision.diff_summary.application_changed &&
                                revision.diff_summary.application_changed.length > 0 && (
                                  <span>
                                    {revision.diff_summary.application_changed.length} field
                                    {revision.diff_summary.application_changed.length !== 1 ? 's' : ''} changed
                                  </span>
                                )}
                            </div>
                          )}

                          <div className="mt-2 text-xs text-gray-500">
                            <span>{new Date(revision.created_at).toLocaleString()}</span>
                            <span className="mx-2">|</span>
                            <span>User {revision.created_by_user_id.substring(0, 8)}...</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewDetails(revision)}
                            className="btn btn-secondary text-sm"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Back link - preserves application context */}
          <div className="text-center">
            <Link
              href={`/console/belt?app=${configId}` as `/console/belt?app=${string}`}
              className="text-primary-600 hover:text-primary-700 text-sm"
            >
              ← Back to Application
            </Link>
          </div>

          {/* Detail Drawer */}
          <RevisionDetailDrawer
            revision={selectedRevision}
            isOpen={isDrawerOpen}
            onClose={handleCloseDrawer}
            prevRevision={
              selectedRevision
                ? revisions.find(
                    (r) => r.revision_number === selectedRevision.revision_number - 1
                  ) || null
                : null
            }
          />
        </div>
      </main>
    </>
  );
}
