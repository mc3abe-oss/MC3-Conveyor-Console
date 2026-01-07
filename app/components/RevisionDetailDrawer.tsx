'use client';

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

interface RevisionDetailDrawerProps {
  revision: Revision | null;
  prevRevision: Revision | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function RevisionDetailDrawer({
  revision,
  prevRevision,
  isOpen,
  onClose,
}: RevisionDetailDrawerProps) {
  if (!isOpen || !revision) {
    return null;
  }

  // Compute diff if not already present
  const computeDiff = () => {
    if (revision.diff_summary) {
      return revision.diff_summary;
    }

    if (!prevRevision) {
      return { inputs_changed: [], application_changed: [] };
    }

    const inputsChanged: Array<{ key: string; from: any; to: any }> = [];
    const applicationChanged: Array<{ key: string; from: any; to: any }> = [];

    // Compare inputs
    const prevInputs = prevRevision.inputs_json || {};
    const currInputs = revision.inputs_json || {};
    const allInputKeys = new Set([...Object.keys(prevInputs), ...Object.keys(currInputs)]);

    allInputKeys.forEach((key) => {
      const from = prevInputs[key];
      const to = currInputs[key];
      if (JSON.stringify(from) !== JSON.stringify(to)) {
        inputsChanged.push({ key, from, to });
      }
    });

    // Compare application fields
    const prevApp = prevRevision.application_json || {};
    const currApp = revision.application_json || {};
    const allAppKeys = new Set([...Object.keys(prevApp), ...Object.keys(currApp)]);

    allAppKeys.forEach((key) => {
      const from = prevApp[key];
      const to = currApp[key];
      if (JSON.stringify(from) !== JSON.stringify(to)) {
        applicationChanged.push({ key, from, to });
      }
    });

    return { inputs_changed: inputsChanged, application_changed: applicationChanged };
  };

  const diff = computeDiff();
  const hasChanges =
    (diff.inputs_changed?.length || 0) > 0 ||
    (diff.application_changed?.length || 0) > 0;

  const formatValue = (value: any): string => {
    if (value === undefined) return '(not set)';
    if (value === null) return '(null)';
    if (typeof value === 'object') {
      // Handle catalog-style values
      if (value.item_key) return value.item_key;
      return JSON.stringify(value);
    }
    return String(value);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-30 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-xl bg-white shadow-xl z-50 overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Revision {revision.revision_number} Details
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Metadata */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
              Revision Info
            </h3>
            <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
              <p>
                <span className="text-gray-500">Created:</span>{' '}
                <span className="text-gray-900">
                  {new Date(revision.created_at).toLocaleString()}
                </span>
              </p>
              <p>
                <span className="text-gray-500">User:</span>{' '}
                <span className="text-gray-900">{revision.created_by_user_id}</span>
              </p>
              {revision.change_note && (
                <p>
                  <span className="text-gray-500">Note:</span>{' '}
                  <span className="text-gray-900">{revision.change_note}</span>
                </p>
              )}
            </div>
          </div>

          {/* Changes Diff */}
          {prevRevision && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                Changes from Rev {prevRevision.revision_number}
              </h3>

              {!hasChanges ? (
                <p className="text-gray-500 text-sm">No changes detected</p>
              ) : (
                <div className="space-y-4">
                  {/* Input changes */}
                  {diff.inputs_changed && diff.inputs_changed.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Calculator Inputs ({diff.inputs_changed.length})
                      </h4>
                      <div className="bg-gray-50 rounded-lg divide-y divide-gray-200">
                        {diff.inputs_changed.map((change, idx) => (
                          <div key={idx} className="p-2 text-sm">
                            <span className="font-mono text-gray-600">{change.key}</span>
                            <div className="mt-1 flex items-center gap-2">
                              <span className="text-red-600 line-through">
                                {formatValue(change.from)}
                              </span>
                              <span className="text-gray-400">→</span>
                              <span className="text-green-600">
                                {formatValue(change.to)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Application changes */}
                  {diff.application_changed && diff.application_changed.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Application Fields ({diff.application_changed.length})
                      </h4>
                      <div className="bg-gray-50 rounded-lg divide-y divide-gray-200">
                        {diff.application_changed.map((change, idx) => (
                          <div key={idx} className="p-2 text-sm">
                            <span className="font-mono text-gray-600">{change.key}</span>
                            <div className="mt-1 flex items-center gap-2">
                              <span className="text-red-600 line-through">
                                {formatValue(change.from)}
                              </span>
                              <span className="text-gray-400">→</span>
                              <span className="text-green-600">
                                {formatValue(change.to)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {!prevRevision && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                Initial Revision
              </h3>
              <p className="text-gray-500 text-sm">
                This is the first revision - no previous version to compare.
              </p>
            </div>
          )}

          {/* Key Outputs Summary */}
          {revision.outputs_json && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                Key Outputs
              </h3>
              <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                {revision.outputs_json.total_belt_pull_lbs && (
                  <p>
                    <span className="text-gray-500">Belt Pull:</span>{' '}
                    <span className="text-gray-900">
                      {revision.outputs_json.total_belt_pull_lbs.toFixed(2)} lbs
                    </span>
                  </p>
                )}
                {revision.outputs_json.torque_drive_shaft_in_lbs && (
                  <p>
                    <span className="text-gray-500">Torque:</span>{' '}
                    <span className="text-gray-900">
                      {revision.outputs_json.torque_drive_shaft_in_lbs.toFixed(2)} in-lbs
                    </span>
                  </p>
                )}
                {revision.outputs_json.belt_speed_fpm && (
                  <p>
                    <span className="text-gray-500">Belt Speed:</span>{' '}
                    <span className="text-gray-900">
                      {revision.outputs_json.belt_speed_fpm.toFixed(2)} FPM
                    </span>
                  </p>
                )}
                {/* v1.38: Actual Belt Speed from selected gearmotor */}
                {revision.outputs_json.actual_belt_speed_fpm && (
                  <p>
                    <span className={`text-gray-500 ${Math.abs(revision.outputs_json.actual_belt_speed_delta_pct ?? 0) > 5 ? 'text-amber-600' : ''}`}>
                      Actual Belt Speed:
                    </span>{' '}
                    <span className={Math.abs(revision.outputs_json.actual_belt_speed_delta_pct ?? 0) > 5 ? 'text-amber-600' : 'text-gray-900'}>
                      {revision.outputs_json.actual_belt_speed_fpm.toFixed(2)} FPM
                      {revision.outputs_json.actual_belt_speed_delta_pct !== null && revision.outputs_json.actual_belt_speed_delta_pct !== undefined && (
                        <span className="ml-1 text-xs">
                          ({revision.outputs_json.actual_belt_speed_delta_pct >= 0 ? '+' : ''}{revision.outputs_json.actual_belt_speed_delta_pct.toFixed(1)}%)
                        </span>
                      )}
                    </span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Conveyor Quantity */}
          {revision.application_json?.conveyor_qty && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                Quote/Order Details
              </h3>
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <p>
                  <span className="text-gray-500">Conveyor Quantity:</span>{' '}
                  <span className="text-gray-900 font-medium">
                    {revision.application_json.conveyor_qty}
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
