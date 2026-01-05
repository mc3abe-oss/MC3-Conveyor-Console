/**
 * User Admin Page
 *
 * SUPER_ADMIN only page for managing user roles.
 *
 * Features:
 * - List all users with their current roles
 * - Search by email or user ID
 * - Pagination (25 per page)
 * - Copy full UUID to clipboard
 * - Change user roles (BELT_USER, BELT_ADMIN, SUPER_ADMIN)
 * - Self-demotion prevention (backend enforced)
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useCurrentUserRole, Role } from '../../../hooks/useCurrentUserRole';

interface UserListItem {
  userId: string;
  email: string;
  role: Role;
  createdAt: string;
}

const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  BELT_ADMIN: 'Belt Admin',
  BELT_USER: 'Belt User',
};

const ROLE_COLORS: Record<Role, string> = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-800 border-purple-200',
  BELT_ADMIN: 'bg-blue-100 text-blue-800 border-blue-200',
  BELT_USER: 'bg-gray-100 text-gray-800 border-gray-200',
};

const PAGE_SIZE = 25;

export default function UserAdminPage() {
  const { isSuperAdmin, userId: currentUserId, isLoading: isLoadingRole } = useCurrentUserRole();

  const [users, setUsers] = useState<UserListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Search and pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [toast, setToast] = useState<string | null>(null);

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(
      (user) =>
        user.email.toLowerCase().includes(query) ||
        user.userId.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  // Paginate filtered users
  const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE);
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [filteredUsers, currentPage]);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Load users on mount
  useEffect(() => {
    if (!isLoadingRole && isSuperAdmin) {
      loadUsers();
    }
  }, [isLoadingRole, isSuperAdmin]);

  // Auto-hide toast after 2 seconds
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(timer);
  }, [toast]);

  async function loadUsers() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/users');
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied. Super Admin permissions required.');
        }
        const err = await response.json();
        throw new Error(err.error || 'Failed to fetch users');
      }
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }

  function startEditing(user: UserListItem) {
    setEditingUserId(user.userId);
    setSelectedRole(user.role);
    setSaveMessage(null);
  }

  function cancelEditing() {
    setEditingUserId(null);
    setSelectedRole(null);
    setSaveMessage(null);
  }

  async function copyUserId(userId: string) {
    try {
      await navigator.clipboard.writeText(userId);
      setToast('User ID copied!');
    } catch {
      setToast('Failed to copy');
    }
  }

  async function handleSaveRole(userId: string) {
    if (!selectedRole) return;

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: selectedRole }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to update role');
      }

      await loadUsers();
      setSaveMessage({ type: 'success', text: 'Role updated successfully!' });
      setEditingUserId(null);
      setSelectedRole(null);
    } catch (err) {
      setSaveMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update role' });
    } finally {
      setIsSaving(false);
    }
  }

  // Access denied for non-super admins
  if (!isLoadingRole && !isSuperAdmin) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-4">User Admin</h1>
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                <strong>Access Denied:</strong> This page is only accessible to Super Admins.
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (isLoading || isLoadingRole) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-4">User Admin</h1>
        <p>Loading users...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-4">User Admin</h1>
        <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">
          <p>{error}</p>
          <button
            onClick={loadUsers}
            className="mt-2 px-4 py-2 bg-red-100 text-red-800 rounded hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Toast notification */}
      {toast && (
        <div className="fixed top-4 right-4 bg-gray-900 text-white px-4 py-2 rounded shadow-lg z-50 animate-fade-in">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">User Admin</h1>
          <p className="text-gray-600 text-sm mt-1">
            {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
            {searchQuery && ` matching "${searchQuery}"`}
            {!searchQuery && users.length > 0 && ` total`}
          </p>
        </div>
      </div>

      {/* Search box */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by email or user ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {saveMessage && (
        <div
          className={`mb-4 p-3 rounded ${
            saveMessage.type === 'success'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {saveMessage.text}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedUsers.map((user) => (
              <tr key={user.userId} className={user.userId === currentUserId ? 'bg-blue-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-gray-900">
                      {user.userId.substring(0, 8)}...
                    </span>
                    <button
                      onClick={() => copyUserId(user.userId)}
                      title="Copy full User ID"
                      className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    {user.userId === currentUserId && (
                      <span className="text-xs text-blue-600 font-medium">(you)</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900">{user.email || '(no email)'}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingUserId === user.userId ? (
                    <select
                      value={selectedRole || user.role}
                      onChange={(e) => setSelectedRole(e.target.value as Role)}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                      disabled={isSaving}
                    >
                      <option value="BELT_USER">Belt User</option>
                      <option value="BELT_ADMIN">Belt Admin</option>
                      <option value="SUPER_ADMIN">Super Admin</option>
                    </select>
                  ) : (
                    <span className={`px-2 py-1 text-xs font-medium rounded border ${ROLE_COLORS[user.role]}`}>
                      {ROLE_LABELS[user.role]}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {editingUserId === user.userId ? (
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleSaveRole(user.userId)}
                        disabled={isSaving || selectedRole === user.role}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                      >
                        {isSaving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={cancelEditing}
                        disabled={isSaving}
                        className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEditing(user)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Edit Role
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {paginatedUsers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  {searchQuery ? 'No users match your search' : 'No users found'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {(currentPage - 1) * PAGE_SIZE + 1} to{' '}
            {Math.min(currentPage * PAGE_SIZE, filteredUsers.length)} of {filteredUsers.length}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800">Role Permissions</h3>
        <ul className="mt-2 text-sm text-blue-700 space-y-1">
          <li><strong>Belt User:</strong> Can use the belt calculator, cannot modify admin data</li>
          <li><strong>Belt Admin:</strong> Can modify belt catalog data (v-guides, cleats, pulleys, etc.)</li>
          <li><strong>Super Admin:</strong> Full access including user role management</li>
        </ul>
      </div>

      <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-semibold text-yellow-800">Self-Demotion Protection</h3>
        <p className="mt-1 text-sm text-yellow-700">
          You cannot change your own role to a lower permission level. Another Super Admin
          must make that change to prevent accidental lockout.
        </p>
      </div>
    </main>
  );
}
