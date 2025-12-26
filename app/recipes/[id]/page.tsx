'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '../../components/Header';

interface Recipe {
  id: string;
  recipe_type: 'golden' | 'reference';
  recipe_tier: 'smoke' | 'regression' | 'edge' | 'longtail';
  recipe_status: 'draft' | 'active' | 'locked' | 'deprecated';
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

const TYPE_BADGE_COLORS = {
  golden: 'bg-yellow-100 text-yellow-800',
  reference: 'bg-blue-100 text-blue-800',
};

const TIER_BADGE_COLORS = {
  smoke: 'bg-red-100 text-red-800',
  regression: 'bg-orange-100 text-orange-800',
  edge: 'bg-purple-100 text-purple-800',
  longtail: 'bg-gray-100 text-gray-800',
};

const STATUS_BADGE_COLORS = {
  draft: 'bg-gray-100 text-gray-600',
  active: 'bg-green-100 text-green-800',
  locked: 'bg-blue-100 text-blue-800 font-semibold',
  deprecated: 'bg-red-100 text-red-600',
};

export default function RecipeDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [runs, setRuns] = useState<RecipeRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    async function fetchRecipe() {
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
    }

    fetchRecipe();
  }, [id]);

  if (loading) {
    return (
      <>
        <Header loadedConfigurationId={null} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12 text-gray-500">Loading recipe...</div>
        </main>
      </>
    );
  }

  if (error || !recipe) {
    return (
      <>
        <Header loadedConfigurationId={null} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700">
            {error || 'Recipe not found'}
          </div>
          <Link href="/recipes" className="mt-4 inline-block text-primary-600 hover:underline">
            Back to Recipes
          </Link>
        </main>
      </>
    );
  }

  return (
    <>
      <Header loadedConfigurationId={null} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-4">
          <Link href="/recipes" className="text-primary-600 hover:underline text-sm">
            Engineering Recipes
          </Link>
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-gray-600 text-sm">{recipe.name}</span>
        </div>

        {/* Header */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{recipe.name}</h1>
              {recipe.slug && (
                <p className="text-sm text-gray-500 mt-1 font-mono">{recipe.slug}</p>
              )}
            </div>
            <div className="flex gap-2">
              <span className={`inline-flex px-3 py-1 text-sm font-medium rounded ${TYPE_BADGE_COLORS[recipe.recipe_type]}`}>
                {recipe.recipe_type}
              </span>
              <span className={`inline-flex px-3 py-1 text-sm font-medium rounded ${TIER_BADGE_COLORS[recipe.recipe_tier]}`}>
                {recipe.recipe_tier}
              </span>
              <span className={`inline-flex px-3 py-1 text-sm font-medium rounded ${STATUS_BADGE_COLORS[recipe.recipe_status]}`}>
                {recipe.recipe_status}
              </span>
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
              <p className="text-gray-700 mt-1">{recipe.notes}</p>
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
                      <td className="py-2 pr-4 text-gray-600">{tol.rel ? `${(tol.rel * 100).toFixed(2)}%` : '-'}</td>
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
                  <span className={`px-2 py-0.5 text-xs rounded ${
                    issue.severity === 'error' ? 'bg-red-100 text-red-800' :
                    issue.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
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
      </main>
    </>
  );
}
