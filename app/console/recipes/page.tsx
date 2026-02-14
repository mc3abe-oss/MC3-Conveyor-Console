'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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
  created_at: string;
  updated_at: string;
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

/**
 * Derive role from legacy fields if role is not set.
 */
function getEffectiveRole(recipe: Recipe): RecipeRole {
  if (recipe.role) return recipe.role;
  // Legacy derivation
  if (recipe.recipe_type === 'golden') return 'golden';
  if (recipe.recipe_status === 'deprecated') return 'deprecated';
  if (recipe.recipe_status === 'active') return 'regression';
  return 'reference';
}

export default function ConsoleRecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>('');

  const fetchRecipes = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/recipes');

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch recipes');
      }

      const data = await res.json();
      // Add computed role to each recipe
      const recipesWithRole = data.map((r: Recipe) => ({
        ...r,
        role: getEffectiveRole(r),
      }));
      setRecipes(recipesWithRole);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRecipes();
  }, []);

  // Filter recipes by role
  const filteredRecipes = roleFilter
    ? recipes.filter((r) => r.role === roleFilter)
    : recipes;

  // Determine if we should show filters (only when recipes exist)
  const showFilters = recipes.length > 0 || roleFilter !== '';

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Engineering Recipes</h1>
        <p className="text-gray-600 mt-1">
          Reference recipes for CI validation and regression testing
        </p>
      </div>

      {/* Role filter */}
      {showFilters && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Role</label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="block w-48 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          >
            <option value="">All Roles</option>
            <option value="reference">Reference</option>
            <option value="regression">Regression</option>
            <option value="golden">Golden</option>
            <option value="deprecated">Deprecated</option>
          </select>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading recipes...</div>
      ) : error ? (
        /* Error state - red banner with retry */
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h3 className="text-red-800 font-medium">Failed to load recipes</h3>
              <p className="text-red-700 text-sm mt-1">{error}</p>
              <button
                onClick={fetchRecipes}
                className="mt-3 px-4 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-md transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      ) : filteredRecipes.length === 0 ? (
        /* Empty state - friendly with CTA */
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            {roleFilter ? `No ${roleFilter} recipes` : 'No CI fixtures yet'}
          </h3>
          <p className="mt-2 text-gray-500 max-w-md mx-auto">
            {roleFilter
              ? `No recipes with role "${roleFilter}" found.`
              : 'Promote an application snapshot to create a regression fixture, or create a new recipe from the calculator.'}
          </p>
          {roleFilter && (
            <button
              onClick={() => setRoleFilter('')}
              className="mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Clear filter
            </button>
          )}
          {!roleFilter && (
            <Link
              href="/console/belt"
              className="mt-6 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Go to Calculator
            </Link>
          )}
        </div>
      ) : (
        /* Recipe list */
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Model
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Updated
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRecipes.map((recipe) => (
                <tr key={recipe.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/console/recipes/${recipe.id}`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {recipe.name}
                    </Link>
                    {recipe.slug && (
                      <p className="text-xs text-gray-400 mt-0.5">{recipe.slug}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${ROLE_BADGE_COLORS[recipe.role]}`}>
                      {ROLE_LABELS[recipe.role]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-xs text-gray-600">{recipe.recipe_tier}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {recipe.model_key} @ {recipe.model_version_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(recipe.updated_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
