'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCurrentUserRole } from '../../../hooks/useCurrentUserRole';

type RecipeRole = 'reference' | 'regression' | 'golden' | 'deprecated';

interface Recipe {
  id: string;
  recipe_type: 'golden' | 'reference';
  recipe_tier: 'smoke' | 'regression' | 'edge' | 'longtail';
  recipe_status: 'draft' | 'active' | 'locked' | 'deprecated';
  role: RecipeRole;
  name: string;
  slug: string | null;
  model_key: string;
  model_version_id: string;
  model_build_id: string | null;
  model_snapshot_hash: string | null;
  inputs: Record<string, unknown>;
  inputs_hash: string;
  expected_outputs: Record<string, unknown> | null;
  expected_issues: Array<{ code: string; severity: string; required: boolean }> | null;
  tolerances: Record<string, { abs?: number; rel?: number; round?: number }> | null;
  tolerance_policy: 'explicit' | 'default_fallback';
  legacy_outputs: Record<string, unknown> | null;
  locked_at: string | null;
  locked_by: string | null;
  lock_reason: string | null;
  source: string | null;
  source_ref: string | null;
  tags: string[] | null;
  notes: string | null;
  belt_catalog_version: string | null;
  created_at: string;
  updated_at: string;
}

interface RecipeRun {
  id: string;
  recipe_id: string;
  model_version_id: string;
  passed: boolean | null;
  max_drift_rel: number | null;
  max_drift_field: string | null;
  run_context: string;
  run_at: string;
  duration_ms: number | null;
}

const ROLE_BADGE_COLORS: Record<RecipeRole, string> = {
  reference: 'bg-blue-100 text-blue-800',
  regression: 'bg-orange-100 text-orange-800',
  golden: 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-400',
  deprecated: 'bg-gray-100 text-gray-600',
};

const ROLE_LABELS: Record<RecipeRole, string> = {
  reference: 'Reference',
  regression: 'Regression',
  golden: 'Golden',
  deprecated: 'Deprecated',
};

const TIER_BADGE_COLORS = {
  smoke: 'bg-red-100 text-red-800',
  regression: 'bg-orange-100 text-orange-800',
  edge: 'bg-purple-100 text-purple-800',
  longtail: 'bg-gray-100 text-gray-800',
};

export default function ConsoleRecipeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  // User role for admin-only features
  const { canBeltAdmin, isLoading: roleLoading } = useCurrentUserRole();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [runs, setRuns] = useState<RecipeRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Actions menu state
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  // Modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Form states
  const [editName, setEditName] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editTags, setEditTags] = useState('');
  const [selectedRole, setSelectedRole] = useState<RecipeRole>('reference');
  const [roleReason, setRoleReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Delete confirmation - type "DELETE" to confirm
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Close actions menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
        setActionsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchRecipe = async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/recipes/${id}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch recipe');
      }
      const data = await res.json();
      setRecipe(data.recipe);
      setRuns(data.runs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecipe();
  }, [id]);

  // Open edit modal
  const openEditModal = () => {
    if (!recipe) return;
    setEditName(recipe.name);
    setEditNotes(recipe.notes || '');
    setEditTags(recipe.tags?.join(', ') || '');
    setActionError(null);
    setEditModalOpen(true);
    setActionsOpen(false);
  };

  // Open role modal
  const openRoleModal = () => {
    if (!recipe) return;
    setSelectedRole(recipe.role);
    setRoleReason('');
    setActionError(null);
    setRoleModalOpen(true);
    setActionsOpen(false);
  };

  // Open delete modal (admin only)
  const openDeleteModal = () => {
    setActionError(null);
    setDeleteConfirmText('');
    setDeleteModalOpen(true);
    setActionsOpen(false);
  };

  // Handle duplicate
  const handleDuplicate = async () => {
    if (!recipe) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/recipes/${recipe.id}/duplicate`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to duplicate recipe');
      }
      const newRecipe = await res.json();
      router.push(`/console/recipes/${newRecipe.id}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setActionLoading(false);
      setActionsOpen(false);
    }
  };

  // Save edit
  const handleSaveEdit = async () => {
    if (!recipe) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const tags = editTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const res = await fetch(`/api/recipes/${recipe.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          notes: editNotes || null,
          tags: tags.length > 0 ? tags : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update recipe');
      }
      const updatedRecipe = await res.json();
      setRecipe(updatedRecipe);
      setEditModalOpen(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setActionLoading(false);
    }
  };

  // Save role change
  const handleSaveRole = async () => {
    if (!recipe) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const body: Record<string, unknown> = { role: selectedRole };
      if (selectedRole === 'golden' && recipe.role !== 'golden') {
        if (!roleReason.trim()) {
          setActionError('Reason is required when upgrading to golden');
          setActionLoading(false);
          return;
        }
        body.role_change_reason = roleReason;
      }
      const res = await fetch(`/api/recipes/${recipe.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || data.message || 'Failed to change role');
      }
      const updatedRecipe = await res.json();
      setRecipe(updatedRecipe);
      setRoleModalOpen(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!recipe) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/recipes/${recipe.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || data.message || 'Failed to delete recipe');
      }
      router.push('/console/recipes');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12 text-gray-500">Loading recipe...</div>
      </main>
    );
  }

  if (error || !recipe) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700">
          {error || 'Recipe not found'}
        </div>
        <Link href="/console/recipes" className="mt-4 inline-block text-primary-600 hover:underline">
          Back to Recipes
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <div className="mb-4">
        <Link href="/console/recipes" className="text-primary-600 hover:underline text-sm">
          Engineering Recipes
        </Link>
        <span className="mx-2 text-gray-400">/</span>
        <span className="text-gray-600 text-sm">{recipe.name}</span>
      </div>

      {/* Header with Actions */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{recipe.name}</h1>
            {recipe.slug && (
              <p className="text-sm text-gray-500 mt-1 font-mono">{recipe.slug}</p>
            )}
          </div>

          {/* Badges + Actions */}
          <div className="flex items-center gap-3">
            {/* Role Badge */}
            <span
              className={`inline-flex px-3 py-1 text-sm font-medium rounded ${ROLE_BADGE_COLORS[recipe.role]}`}
            >
              {ROLE_LABELS[recipe.role]}
            </span>
            <span
              className={`inline-flex px-3 py-1 text-sm font-medium rounded ${TIER_BADGE_COLORS[recipe.recipe_tier]}`}
            >
              {recipe.recipe_tier}
            </span>

            {/* Actions Dropdown */}
            <div className="relative" ref={actionsRef}>
              <button
                onClick={() => setActionsOpen(!actionsOpen)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Actions
                <svg
                  className="ml-2 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {actionsOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                  <div className="py-1">
                    <button
                      onClick={openEditModal}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Edit metadata
                    </button>
                    <button
                      onClick={openRoleModal}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Change role
                    </button>
                    <button
                      onClick={handleDuplicate}
                      disabled={actionLoading}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                    >
                      Duplicate
                    </button>
                    {/* Delete - admin only */}
                    {canBeltAdmin && !roleLoading && (
                      <>
                        <hr className="my-1" />
                        <button
                          onClick={openDeleteModal}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Model:</span>
            <p className="font-medium">{recipe.model_key}</p>
          </div>
          <div>
            <span className="text-gray-500">Version:</span>
            <p className="font-medium">{recipe.model_version_id}</p>
          </div>
          <div>
            <span className="text-gray-500">Created:</span>
            <p className="font-medium">{new Date(recipe.created_at).toLocaleString()}</p>
          </div>
          <div>
            <span className="text-gray-500">Updated:</span>
            <p className="font-medium">{new Date(recipe.updated_at).toLocaleString()}</p>
          </div>
        </div>

        {recipe.recipe_status === 'locked' && recipe.locked_at && (
          <div className="mt-4 p-3 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Locked</strong> on {new Date(recipe.locked_at).toLocaleString()}
              {recipe.lock_reason && <span> - {recipe.lock_reason}</span>}
            </p>
          </div>
        )}

        {recipe.notes && (
          <div className="mt-4">
            <span className="text-gray-500 text-sm">Notes:</span>
            <p className="text-gray-700 mt-1 whitespace-pre-wrap">{recipe.notes}</p>
          </div>
        )}

        {recipe.tags && recipe.tags.length > 0 && (
          <div className="mt-4 flex gap-2">
            {recipe.tags.map((tag) => (
              <span key={tag} className="inline-flex px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Inputs */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Inputs</h2>
        <pre className="bg-gray-50 p-4 rounded-md text-sm overflow-auto max-h-64">
          {JSON.stringify(recipe.inputs, null, 2)}
        </pre>
        <p className="text-xs text-gray-400 mt-2 font-mono">Hash: {recipe.inputs_hash}</p>
      </div>

      {/* Expected Outputs (Golden only) */}
      {recipe.expected_outputs && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Expected Outputs</h2>
          <pre className="bg-gray-50 p-4 rounded-md text-sm overflow-auto max-h-64">
            {JSON.stringify(recipe.expected_outputs, null, 2)}
          </pre>
        </div>
      )}

      {/* Tolerances (Golden only) */}
      {recipe.tolerances && Object.keys(recipe.tolerances).length > 0 && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tolerances</h2>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-medium text-gray-600">Field</th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-600">Absolute</th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-600">Relative</th>
                  <th className="text-left py-2 font-medium text-gray-600">Round</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(recipe.tolerances).map(([field, tol]) => (
                  <tr key={field} className="border-b border-gray-100">
                    <td className="py-2 pr-4 font-mono text-gray-800">{field}</td>
                    <td className="py-2 pr-4 text-gray-600">{tol.abs ?? '-'}</td>
                    <td className="py-2 pr-4 text-gray-600">
                      {tol.rel ? `${(tol.rel * 100).toFixed(2)}%` : '-'}
                    </td>
                    <td className="py-2 text-gray-600">{tol.round ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-2">Policy: {recipe.tolerance_policy}</p>
        </div>
      )}

      {/* Expected Issues */}
      {recipe.expected_issues && recipe.expected_issues.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Expected Issues</h2>
          <ul className="space-y-2">
            {recipe.expected_issues.map((issue, i) => (
              <li key={i} className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 text-xs rounded ${
                    issue.severity === 'error'
                      ? 'bg-red-100 text-red-800'
                      : issue.severity === 'warning'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {issue.severity}
                </span>
                <code className="text-sm">{issue.code}</code>
                {issue.required && <span className="text-xs text-gray-500">(required)</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recent Runs */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Runs</h2>
        {runs.length === 0 ? (
          <p className="text-gray-500 text-sm">No runs recorded yet.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4 font-medium text-gray-600">Result</th>
                <th className="text-left py-2 pr-4 font-medium text-gray-600">Version</th>
                <th className="text-left py-2 pr-4 font-medium text-gray-600">Max Drift</th>
                <th className="text-left py-2 pr-4 font-medium text-gray-600">Context</th>
                <th className="text-left py-2 pr-4 font-medium text-gray-600">Duration</th>
                <th className="text-left py-2 font-medium text-gray-600">Run At</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} className="border-b border-gray-100">
                  <td className="py-2 pr-4">
                    {run.passed === true && <span className="text-green-600 font-medium">PASS</span>}
                    {run.passed === false && <span className="text-red-600 font-medium">FAIL</span>}
                    {run.passed === null && <span className="text-gray-400">N/A</span>}
                  </td>
                  <td className="py-2 pr-4 text-gray-600">{run.model_version_id}</td>
                  <td className="py-2 pr-4 text-gray-600">
                    {run.max_drift_rel !== null
                      ? `${(run.max_drift_rel * 100).toFixed(2)}% (${run.max_drift_field})`
                      : '-'}
                  </td>
                  <td className="py-2 pr-4 text-gray-600">{run.run_context}</td>
                  <td className="py-2 pr-4 text-gray-600">
                    {run.duration_ms !== null ? `${run.duration_ms}ms` : '-'}
                  </td>
                  <td className="py-2 text-gray-600">{new Date(run.run_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit Metadata Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Edit Metadata</h2>
              {actionError && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm">{actionError}</div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={3}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    className="input w-full"
                    placeholder="tag1, tag2, tag3"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={actionLoading}
                  className="btn btn-primary"
                >
                  {actionLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Role Modal */}
      {roleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Role</h2>
              {actionError && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm">{actionError}</div>
              )}

              {recipe.role === 'golden' && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                  <strong>Protected:</strong> Golden recipes cannot be downgraded. Contact admin.
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                  <div className="space-y-2">
                    {(['reference', 'regression', 'golden', 'deprecated'] as RecipeRole[]).map(
                      (role) => (
                        <label
                          key={role}
                          className={`flex items-center gap-3 p-3 border rounded cursor-pointer transition-colors ${
                            selectedRole === role
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:bg-gray-50'
                          } ${
                            recipe.role === 'golden' && role !== 'golden'
                              ? 'opacity-50 cursor-not-allowed'
                              : ''
                          }`}
                        >
                          <input
                            type="radio"
                            name="role"
                            value={role}
                            checked={selectedRole === role}
                            onChange={(e) => setSelectedRole(e.target.value as RecipeRole)}
                            disabled={recipe.role === 'golden' && role !== 'golden'}
                            className="text-blue-600"
                          />
                          <div>
                            <span className="font-medium">{ROLE_LABELS[role]}</span>
                            <p className="text-xs text-gray-500">
                              {role === 'reference' && 'Exploratory/informational'}
                              {role === 'regression' && 'Included in regression tests'}
                              {role === 'golden' && 'Canonical, protected reference'}
                              {role === 'deprecated' && 'Historical, excluded from tests'}
                            </p>
                          </div>
                        </label>
                      )
                    )}
                  </div>
                </div>

                {selectedRole === 'golden' && recipe.role !== 'golden' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reason for golden status <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={roleReason}
                      onChange={(e) => setRoleReason(e.target.value)}
                      rows={2}
                      className="input w-full"
                      placeholder="Why should this be a golden reference?"
                    />
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setRoleModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveRole}
                  disabled={actionLoading || (recipe.role === 'golden' && selectedRole !== 'golden')}
                  className="btn btn-primary"
                >
                  {actionLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (admin only, type-to-confirm) */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-red-600 mb-4">Permanently Delete Recipe</h2>
              {actionError && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm">{actionError}</div>
              )}

              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded">
                <p className="text-red-800 text-sm">
                  <strong>Warning:</strong> This permanently deletes this recipe. This cannot be undone.
                </p>
              </div>

              <div className="mb-4 p-3 bg-gray-50 rounded text-sm">
                <p>
                  <span className="text-gray-500">Name:</span>{' '}
                  <strong>{recipe.name}</strong>
                </p>
                <p className="mt-1">
                  <span className="text-gray-500">Role:</span>{' '}
                  <span className={`font-medium ${ROLE_BADGE_COLORS[recipe.role]?.split(' ')[1]}`}>
                    {ROLE_LABELS[recipe.role]}
                  </span>
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type <span className="font-mono font-bold text-red-600">DELETE</span> to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="input w-full font-mono"
                  placeholder="DELETE"
                  autoComplete="off"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={actionLoading || deleteConfirmText !== 'DELETE'}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? 'Deleting...' : 'Delete Forever'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
