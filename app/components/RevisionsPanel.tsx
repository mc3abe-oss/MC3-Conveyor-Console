'use client';

interface Revision {
  id: string;
  revision_number: number;
  created_at: string;
  created_by_user_id: string;
  change_note?: string;
}

interface RevisionsPanelProps {
  revisions: Revision[];
  currentRevisionNumber?: number;
  onLoadRevision: (revisionId: string) => void;
  isLoading: boolean;
}

export default function RevisionsPanel({
  revisions,
  currentRevisionNumber,
  onLoadRevision,
  isLoading,
}: RevisionsPanelProps) {
  if (revisions.length === 0) {
    return null;
  }

  return (
    <div className="card mt-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Revision History</h3>

      <div className="space-y-2">
        {revisions.map((revision) => (
          <div
            key={revision.id}
            className={`p-3 border rounded-md cursor-pointer transition-colors ${
              revision.revision_number === currentRevisionNumber
                ? 'bg-primary-50 border-primary-300'
                : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
            onClick={() => !isLoading && onLoadRevision(revision.id)}
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium text-gray-900">
                  Revision {revision.revision_number}
                  {revision.revision_number === currentRevisionNumber && (
                    <span className="ml-2 text-xs text-primary-600">(Current)</span>
                  )}
                </div>
                {revision.change_note && (
                  <div className="text-sm text-gray-600 mt-1">{revision.change_note}</div>
                )}
              </div>
              <div className="text-xs text-gray-500 text-right">
                <div>{new Date(revision.created_at).toLocaleString()}</div>
                <div>User {revision.created_by_user_id.substring(0, 8)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
