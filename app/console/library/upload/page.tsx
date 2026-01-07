'use client';

import { Suspense, useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useCurrentUserRole } from '../../../hooks/useCurrentUserRole';

// ============================================================================
// TYPES
// ============================================================================

interface Tag {
  id: string;
  name: string;
  color: string;
}

const DEPARTMENT_OPTIONS = [
  { value: '', label: 'No Department' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'sales', label: 'Sales' },
  { value: 'operations', label: 'Operations' },
  { value: 'quality', label: 'Quality' },
];

const MAX_FILE_SIZE = 250 * 1024 * 1024; // 250MB
const MAX_FILE_SIZE_DISPLAY = '250MB';

// ============================================================================
// LOADING FALLBACK
// ============================================================================

function LoadingFallback() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="text-center py-12 text-gray-500">
        <svg className="animate-spin h-8 w-8 mx-auto mb-4 text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Loading...
      </div>
    </div>
  );
}

// ============================================================================
// INNER COMPONENT (uses useSearchParams)
// ============================================================================

function UploadPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canBeltAdmin, isLoading: roleLoading } = useCurrentUserRole();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [changeNote, setChangeNote] = useState('');
  const [file, setFile] = useState<File | null>(null);

  // UI state
  const [tags, setTags] = useState<Tag[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Existing document ID (for uploading new version)
  const documentId = searchParams.get('documentId');
  const isNewVersion = !!documentId;

  // Fetch tags
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const res = await fetch('/api/library/tags');
        if (res.ok) {
          const data = await res.json();
          setTags(data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch tags:', err);
      }
    };
    fetchTags();
  }, []);

  // Redirect non-admins
  useEffect(() => {
    if (!roleLoading && !canBeltAdmin) {
      router.push('/console/library');
    }
  }, [roleLoading, canBeltAdmin, router]);

  // Handle file drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    setError(null);

    const droppedFile = e.dataTransfer.files[0];
    if (!droppedFile) return;

    if (droppedFile.type !== 'application/pdf') {
      setError('Only PDF files are allowed');
      return;
    }

    if (droppedFile.size > MAX_FILE_SIZE) {
      setError(`File too large. Maximum size is ${MAX_FILE_SIZE_DISPLAY}`);
      return;
    }

    setFile(droppedFile);
    if (!title && !isNewVersion) {
      // Auto-fill title from filename
      const nameWithoutExt = droppedFile.name.replace(/\.pdf$/i, '');
      setTitle(nameWithoutExt);
    }
  };

  // Handle file select
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    setError(null);

    if (!selectedFile) return;

    if (selectedFile.type !== 'application/pdf') {
      setError('Only PDF files are allowed');
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(`File too large. Maximum size is ${MAX_FILE_SIZE_DISPLAY}`);
      return;
    }

    setFile(selectedFile);
    if (!title && !isNewVersion) {
      const nameWithoutExt = selectedFile.name.replace(/\.pdf$/i, '');
      setTitle(nameWithoutExt);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Toggle tag selection
  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(t => t !== tagId)
        : [...prev, tagId]
    );
  };

  // Handle upload using direct-to-Supabase flow
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setUploadProgress(0);
    setUploadStatus('');

    if (!file) {
      setError('Please select a PDF file');
      return;
    }

    if (!isNewVersion && !title.trim()) {
      setError('Title is required');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError(`File too large. Maximum size is ${MAX_FILE_SIZE_DISPLAY}`);
      return;
    }

    setUploading(true);

    try {
      // Step 1: Get signed upload URL
      setUploadStatus('Preparing upload...');
      const urlRes = await fetch('/api/library/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: 'application/pdf',
          documentId: isNewVersion ? documentId : undefined,
        }),
      });

      if (!urlRes.ok) {
        const urlData = await urlRes.json();
        throw new Error(urlData.error || 'Failed to prepare upload');
      }

      const { signedUrl, storagePath } = await urlRes.json();

      // Step 2: Upload directly to Supabase Storage with progress tracking
      setUploadStatus('Uploading file...');

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percentComplete);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            // Try to get error details from response
            let errorMsg = `Upload failed with status ${xhr.status}`;
            try {
              const response = JSON.parse(xhr.responseText);
              if (response.error || response.message) {
                errorMsg = response.error || response.message;
              }
            } catch {
              if (xhr.responseText) {
                errorMsg += `: ${xhr.responseText.substring(0, 200)}`;
              }
            }
            reject(new Error(errorMsg));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed - network error'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload was cancelled'));
        });

        xhr.open('PUT', signedUrl);
        // Don't set Content-Type - let Supabase handle it
        xhr.send(file);
      });

      // Step 3: Finalize - create document/version metadata
      setUploadStatus('Finalizing...');
      setUploadProgress(100);

      const finalizeRes = await fetch('/api/library/upload/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storagePath,
          filename: file.name,
          fileSize: file.size,
          title: isNewVersion ? undefined : title.trim(),
          description: isNewVersion ? undefined : description.trim() || undefined,
          department: isNewVersion ? undefined : department || undefined,
          documentId: isNewVersion ? documentId : undefined,
          changeNote: changeNote.trim() || undefined,
        }),
      });

      if (!finalizeRes.ok) {
        const finalizeData = await finalizeRes.json();
        throw new Error(finalizeData.error || 'Failed to save document');
      }

      const result = await finalizeRes.json();

      // If new document, add tags
      if (!isNewVersion && selectedTags.length > 0 && result.document_id) {
        await fetch(`/api/library/documents/${result.document_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tagIds: selectedTags }),
        });
      }

      // Redirect to the document page
      const targetId = isNewVersion ? documentId : result.document_id;
      router.push(`/console/library/${targetId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setUploadProgress(0);
      setUploadStatus('');
    } finally {
      setUploading(false);
    }
  };

  if (roleLoading) {
    return <LoadingFallback />;
  }

  if (!canBeltAdmin) {
    return null; // Will redirect
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Breadcrumb */}
      <nav className="mb-4">
        <Link href="/console/library" className="text-sm text-gray-500 hover:text-gray-700">
          &larr; Back to Library
        </Link>
      </nav>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {isNewVersion ? 'Upload New Version' : 'Upload PDF'}
        </h1>
        <p className="text-gray-600 mt-1">
          {isNewVersion
            ? 'Upload a new version of the document.'
            : 'Add a new document to the reference library.'}
        </p>
      </div>

      <form onSubmit={handleUpload} className="space-y-6">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-red-700">{error}</span>
            </div>
          </div>
        )}

        {/* File Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragOver
              ? 'border-blue-500 bg-blue-50'
              : file
              ? 'border-green-500 bg-green-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileSelect}
            className="hidden"
          />

          {file ? (
            <div className="space-y-2">
              <svg className="w-12 h-12 mx-auto text-green-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h6v6h6v10H6z" />
              </svg>
              <p className="font-medium text-gray-900">{file.name}</p>
              <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-gray-600">
                <span className="font-medium text-blue-600 cursor-pointer">Click to upload</span> or drag and drop
              </p>
              <p className="text-sm text-gray-500">PDF files only, up to {MAX_FILE_SIZE_DISPLAY}</p>
            </div>
          )}
        </div>

        {/* Document Metadata (only for new documents) */}
        {!isNewVersion && (
          <>
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                placeholder="Document title"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                placeholder="Brief description of the document"
              />
            </div>

            {/* Department */}
            <div>
              <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <select
                id="department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              >
                {DEPARTMENT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                        selectedTags.includes(tag.id)
                          ? 'ring-2 ring-offset-1 ring-blue-500'
                          : ''
                      }`}
                      style={{
                        backgroundColor: selectedTags.includes(tag.id) ? tag.color : `${tag.color}20`,
                        color: selectedTags.includes(tag.id) ? 'white' : tag.color,
                      }}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Change Note (for new versions) */}
        {isNewVersion && (
          <div>
            <label htmlFor="changeNote" className="block text-sm font-medium text-gray-700 mb-1">
              Change Note
            </label>
            <textarea
              id="changeNote"
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              rows={2}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              placeholder="What changed in this version?"
            />
          </div>
        )}

        {/* Upload Progress */}
        {uploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{uploadStatus}</span>
              <span className="font-medium text-gray-900">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <Link
            href="/console/library"
            className={`px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 ${uploading ? 'pointer-events-none opacity-50' : ''}`}
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={uploading || !file}
            className="px-4 py-2 text-sm font-medium text-white bg-mc3-blue hover:bg-mc3-navy rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {uploading && (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================================================================
// PAGE COMPONENT (wraps inner in Suspense)
// ============================================================================

export default function UploadPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <UploadPageInner />
    </Suspense>
  );
}
