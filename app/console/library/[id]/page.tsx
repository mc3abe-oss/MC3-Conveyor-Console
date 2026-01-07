'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCurrentUserRole } from '../../../hooks/useCurrentUserRole';

// ============================================================================
// TYPES
// ============================================================================

interface Tag {
  id: string;
  name: string;
  color: string;
  description: string | null;
}

interface Version {
  id: string;
  version_number: number;
  storage_path: string;
  original_filename: string;
  file_size_bytes: number;
  mime_type: string;
  sha256_hash: string;
  page_count: number | null;
  change_note: string | null;
  created_at: string;
  created_by: string | null;
}

interface PdfDocument {
  id: string;
  title: string;
  description: string | null;
  department: string | null;
  status: string;
  version_count: number;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  published_at: string | null;
  archived_at: string | null;
  current_version: Version | null;
  versions: Version[];
  tags: Tag[];
}

const STATUS_BADGE_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  published: 'bg-green-100 text-green-800',
  archived: 'bg-yellow-100 text-yellow-800',
};

interface PageProps {
  params: Promise<{ id: string }>;
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function LibraryDocumentPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { canBeltAdmin } = useCurrentUserRole();

  const [document, setDocument] = useState<PdfDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);

  // Fetch document
  useEffect(() => {
    const fetchDocument = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/library/documents/${id}`);

        if (!res.ok) {
          if (res.status === 404) {
            throw new Error('Document not found');
          }
          const data = await res.json();
          throw new Error(data.error || 'Failed to fetch document');
        }

        const doc: PdfDocument = await res.json();
        setDocument(doc);
        if (doc.current_version) {
          setSelectedVersion(doc.current_version.version_number);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [id]);

  // Fetch PDF URL for preview
  const fetchPdfUrl = async (versionNumber?: number) => {
    setLoadingPdf(true);
    try {
      const params = versionNumber ? `?version=${versionNumber}` : '';
      const res = await fetch(`/api/library/documents/${id}/download${params}`);

      if (!res.ok) {
        throw new Error('Failed to get PDF URL');
      }

      const data = await res.json();
      setPdfUrl(data.url);
    } catch (err) {
      console.error('Failed to fetch PDF URL:', err);
    } finally {
      setLoadingPdf(false);
    }
  };

  // Fetch PDF URL when version changes
  useEffect(() => {
    if (document && selectedVersion) {
      fetchPdfUrl(selectedVersion);
    }
  }, [document, selectedVersion, id]);

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Handle status change
  const handleStatusChange = async (newStatus: string) => {
    if (!document) return;

    try {
      const res = await fetch(`/api/library/documents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        throw new Error('Failed to update status');
      }

      const updated = await res.json();
      setDocument(prev => prev ? { ...prev, status: updated.status } : null);
    } catch (err) {
      console.error('Status update failed:', err);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!document) return;
    if (!confirm(`Are you sure you want to delete "${document.title}"?`)) return;

    try {
      const res = await fetch(`/api/library/documents/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete document');
      }

      router.push('/console/library');
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  // Download current version
  const handleDownload = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center py-12 text-gray-500">
          <svg className="animate-spin h-8 w-8 mx-auto mb-4 text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading document...
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h3 className="text-red-800 font-medium">{error || 'Document not found'}</h3>
              <Link
                href="/console/library"
                className="mt-3 inline-flex px-4 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-md transition-colors"
              >
                Back to Library
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentVersion = document.versions.find(v => v.version_number === selectedVersion) || document.current_version;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Breadcrumb */}
      <nav className="mb-4">
        <Link href="/console/library" className="text-sm text-gray-500 hover:text-gray-700">
          &larr; Back to Library
        </Link>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - PDF Viewer */}
        <div className="lg:col-span-2">
          {/* Document Header */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-xl font-bold text-gray-900">{document.title}</h1>
                {document.description && (
                  <p className="text-gray-600 mt-1">{document.description}</p>
                )}
                {/* Tags */}
                {document.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {document.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="px-2 py-0.5 text-xs rounded"
                        style={{
                          backgroundColor: `${tag.color}20`,
                          color: tag.color,
                        }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 ml-4">
                <span className={`px-2 py-1 text-xs rounded ${STATUS_BADGE_COLORS[document.status] || 'bg-gray-100 text-gray-600'}`}>
                  {document.status}
                </span>
              </div>
            </div>
          </div>

          {/* PDF Viewer */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
                </svg>
                <span className="text-sm font-medium text-gray-700">
                  {currentVersion?.original_filename || 'No file'}
                </span>
                {currentVersion && (
                  <span className="text-xs text-gray-500">
                    ({formatFileSize(currentVersion.file_size_bytes)})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {document.versions.length > 1 && (
                  <select
                    value={selectedVersion || ''}
                    onChange={(e) => setSelectedVersion(parseInt(e.target.value, 10))}
                    className="text-sm border-gray-300 rounded-md"
                  >
                    {document.versions.map((v) => (
                      <option key={v.id} value={v.version_number}>
                        Version {v.version_number}
                        {v.id === document.current_version?.id ? ' (current)' : ''}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  onClick={handleDownload}
                  disabled={!pdfUrl}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-mc3-blue hover:bg-mc3-navy rounded-md transition-colors disabled:opacity-50"
                >
                  Open PDF
                </button>
              </div>
            </div>

            {/* PDF iframe */}
            <div className="relative" style={{ height: '70vh' }}>
              {loadingPdf ? (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                  <svg className="animate-spin h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              ) : pdfUrl ? (
                <iframe
                  src={pdfUrl}
                  className="w-full h-full"
                  title={document.title}
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 text-gray-500">
                  <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p>No PDF available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Actions (Admin only) */}
          {canBeltAdmin && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Actions</h3>
              <div className="space-y-2">
                {document.status === 'draft' && (
                  <button
                    onClick={() => handleStatusChange('published')}
                    className="w-full px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
                  >
                    Publish
                  </button>
                )}
                {document.status === 'published' && (
                  <button
                    onClick={() => handleStatusChange('archived')}
                    className="w-full px-3 py-2 text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 rounded-md transition-colors"
                  >
                    Archive
                  </button>
                )}
                {document.status === 'archived' && (
                  <button
                    onClick={() => handleStatusChange('published')}
                    className="w-full px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
                  >
                    Republish
                  </button>
                )}
                <Link
                  href={`/console/library/upload?documentId=${id}`}
                  className="block w-full px-3 py-2 text-sm font-medium text-center text-mc3-blue border border-mc3-blue hover:bg-blue-50 rounded-md transition-colors"
                >
                  Upload New Version
                </Link>
                <button
                  onClick={handleDelete}
                  className="w-full px-3 py-2 text-sm font-medium text-red-600 border border-red-300 hover:bg-red-50 rounded-md transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          )}

          {/* Document Info */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Details</h3>
            <dl className="space-y-2 text-sm">
              {document.department && (
                <div>
                  <dt className="text-gray-500">Department</dt>
                  <dd className="font-medium text-gray-900 capitalize">{document.department}</dd>
                </div>
              )}
              <div>
                <dt className="text-gray-500">Created</dt>
                <dd className="font-medium text-gray-900">{formatDate(document.created_at)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Last Updated</dt>
                <dd className="font-medium text-gray-900">{formatDate(document.updated_at)}</dd>
              </div>
              {document.published_at && (
                <div>
                  <dt className="text-gray-500">Published</dt>
                  <dd className="font-medium text-gray-900">{formatDate(document.published_at)}</dd>
                </div>
              )}
              <div>
                <dt className="text-gray-500">Versions</dt>
                <dd className="font-medium text-gray-900">{document.version_count}</dd>
              </div>
            </dl>
          </div>

          {/* Version History */}
          {document.versions.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Version History</h3>
              <ul className="space-y-3">
                {document.versions.map((version) => (
                  <li
                    key={version.id}
                    className={`text-sm p-2 rounded-md cursor-pointer transition-colors ${
                      version.version_number === selectedVersion
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedVersion(version.version_number)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">
                        Version {version.version_number}
                        {version.id === document.current_version?.id && (
                          <span className="ml-1 text-xs text-green-600">(current)</span>
                        )}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatFileSize(version.file_size_bytes)}
                      </span>
                    </div>
                    {version.change_note && (
                      <p className="text-xs text-gray-600 mt-1">{version.change_note}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(version.created_at).toLocaleDateString()}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
