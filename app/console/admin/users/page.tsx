/**
 * User Admin Page
 *
 * SUPER_ADMIN only page for managing user roles and lifecycle.
 *
 * Features:
 * - List all users with their current roles and status
 * - Search by email or user ID
 * - Filter by status (Active/Deactivated)
 * - Pagination (25 per page)
 * - Copy full UUID to clipboard
 * - Change user roles (BELT_USER, BELT_ADMIN, SUPER_ADMIN)
 * - Send magic link / password reset
 * - Deactivate / Reactivate users
 * - Force sign-out
 * - Invite new users
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useCurrentUserRole, Role } from '../../../hooks/useCurrentUserRole';

interface UserListItem {
  userId: string;
  email: string;
  role: Role;
  isActive: boolean;
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

type StatusFilter = 'all' | 'active' | 'deactivated';

export default function UserAdminPage() {
  const { isSuperAdmin, userId: currentUserId, isLoading: isLoadingRole } = useCurrentUserRole();

  const [users, setUsers] = useState<UserListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Search, filter, and pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [toast, setToast] = useState<string | null>(null);

  // Modal states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('BELT_USER');
  const [isInviting, setIsInviting] = useState(false);

  const [confirmAction, setConfirmAction] = useState<{
    type: 'deactivate' | 'reactivate' | 'force-signout';
    user: UserListItem;
  } | null>(null);
  const [isPerformingAction, setIsPerformingAction] = useState(false);
  const [openMenuUserId, setOpenMenuUserId] = useState<string | null>(null);

  // Filter users based on search query and status
  const filteredUsers = useMemo(() => {
    let result = users;

    // Filter by status
    if (statusFilter === 'active') {
      result = result.filter((u) => u.isActive);
    } else if (statusFilter === 'deactivated') {
      result = result.filter((u) => !u.isActive);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (user) =>
          user.email.toLowerCase().includes(query) ||
          user.userId.toLowerCase().includes(query)
      );
    }

    return result;
  }, [users, searchQuery, statusFilter]);

  // Counts
  const activeCount = users.filter((u) => u.isActive).length;
  const deactivatedCount = users.filter((u) => !u.isActive).length;

  // Paginate filtered users
  const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE);
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [filteredUsers, currentPage]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // Load users on mount
  useEffect(() => {
    if (!isLoadingRole && isSuperAdmin) {
      loadUsers();
    }
  }, [isLoadingRole, isSuperAdmin]);

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Close menu when clicking outside
  useEffect(() => {
    if (!openMenuUserId) return;
    const handleClick = () => setOpenMenuUserId(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [openMenuUserId]);

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

  async function handleInviteUser() {
    if (!inviteEmail.trim()) return;

    setIsInviting(true);
    try {
      const response = await fetch('/api/admin/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim().toLowerCase(), role: inviteRole }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to invite user');
      }

      setToast(`Invite sent to ${inviteEmail}`);
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('BELT_USER');
      await loadUsers();
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Failed to invite user');
    } finally {
      setIsInviting(false);
    }
  }

  async function handleSendMagicLink(email: string) {
    try {
      const response = await fetch('/api/admin/users/send-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to send magic link');
      }

      setToast('Magic link sent!');
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Failed to send magic link');
    }
  }

  async function handleSendPasswordReset(email: string) {
    try {
      const response = await fetch('/api/admin/users/send-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to send password reset');
      }

      setToast('Password reset link sent!');
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Failed to send password reset');
    }
  }

  async function handleConfirmedAction() {
    if (!confirmAction) return;

    setIsPerformingAction(true);
    const { type, user } = confirmAction;

    try {
      let url = '';
      if (type === 'deactivate') {
        url = `/api/admin/users/${user.userId}/deactivate`;
      } else if (type === 'reactivate') {
        url = `/api/admin/users/${user.userId}/reactivate`;
      } else if (type === 'force-signout') {
        url = `/api/admin/users/${user.userId}/force-signout`;
      }

      const response = await fetch(url, { method: 'POST' });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || `Failed to ${type} user`);
      }

      const actionLabel = type === 'force-signout' ? 'signed out' : type === 'deactivate' ? 'deactivated' : 'reactivated';
      setToast(`User ${actionLabel} successfully`);
      setConfirmAction(null);
      await loadUsers();
    } catch (err) {
      setToast(err instanceof Error ? err.message : `Failed to ${type} user`);
    } finally {
      setIsPerformingAction(false);
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
        <div className="fixed top-4 right-4 bg-gray-900 text-white px-4 py-2 rounded shadow-lg z-50">
          {toast}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {confirmAction.type === 'deactivate' && 'Deactivate User'}
              {confirmAction.type === 'reactivate' && 'Reactivate User'}
              {confirmAction.type === 'force-signout' && 'Force Sign-Out'}
            </h3>
            <p className="text-gray-600 mb-4">
              {confirmAction.type === 'deactivate' && (
                <>Are you sure you want to deactivate <strong>{confirmAction.user.email}</strong>? They will be unable to access the application.</>
              )}
              {confirmAction.type === 'reactivate' && (
                <>Are you sure you want to reactivate <strong>{confirmAction.user.email}</strong>? They will regain access to the application.</>
              )}
              {confirmAction.type === 'force-signout' && (
                <>Are you sure you want to force sign-out <strong>{confirmAction.user.email}</strong>? They will need to sign in again.</>
              )}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmAction(null)}
                disabled={isPerformingAction}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmedAction}
                disabled={isPerformingAction}
                className={`px-4 py-2 text-white rounded ${
                  confirmAction.type === 'reactivate'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                } disabled:opacity-50`}
              >
                {isPerformingAction ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Invite New User</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as Role)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="BELT_USER">Belt User</option>
                  <option value="BELT_ADMIN">Belt Admin</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => { setShowInviteModal(false); setInviteEmail(''); }}
                disabled={isInviting}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleInviteUser}
                disabled={isInviting || !inviteEmail.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isInviting ? 'Sending...' : 'Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">User Admin</h1>
          <p className="text-gray-600 text-sm mt-1">
            {users.length} total ({activeCount} active, {deactivatedCount} deactivated)
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Invite User
        </button>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <input
          type="text"
          placeholder="Search by email or user ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          <option value="active">Active Only</option>
          <option value="deactivated">Deactivated Only</option>
        </select>
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
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedUsers.map((user) => (
                <tr
                  key={user.userId}
                  className={`${user.userId === currentUserId ? 'bg-blue-50' : ''} ${!user.isActive ? 'bg-red-50/50' : ''}`}
                >
                  <td className="px-4 py-3 whitespace-nowrap">
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
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{user.email || '(no email)'}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
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
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        user.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {user.isActive ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
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
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => startEditing(user)}
                          className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded text-xs"
                          title="Edit role"
                        >
                          Edit
                        </button>
                        <div className="relative">
                          <button
                            onClick={(e) => { e.stopPropagation(); setOpenMenuUserId(openMenuUserId === user.userId ? null : user.userId); }}
                            className="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded text-xs"
                          >
                            Actions ▾
                          </button>
                          {openMenuUserId === user.userId && (
                            <ul className="absolute right-0 mt-1 w-52 bg-white border border-gray-300 rounded-lg shadow-xl z-50 py-2 list-none">
                              <li>
                                <a href="#" onClick={(e) => { e.preventDefault(); handleSendMagicLink(user.email); setOpenMenuUserId(null); }} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                  Send Magic Link
                                </a>
                              </li>
                              <li>
                                <a href="#" onClick={(e) => { e.preventDefault(); handleSendPasswordReset(user.email); setOpenMenuUserId(null); }} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                  Send Password Reset
                                </a>
                              </li>
                              <li className="border-t border-gray-200 my-1"></li>
                              <li>
                                <a href="#" onClick={(e) => { e.preventDefault(); if (user.userId !== currentUserId) { setConfirmAction({ type: 'force-signout', user }); setOpenMenuUserId(null); }}} className={`block px-4 py-2 text-sm ${user.userId === currentUserId ? 'text-gray-400 cursor-not-allowed' : 'text-orange-600 hover:bg-orange-50'}`}>
                                  Force Sign-Out
                                </a>
                              </li>
                              <li>
                                <a href="#" onClick={(e) => { e.preventDefault(); if (user.userId !== currentUserId) { setConfirmAction({ type: user.isActive ? 'deactivate' : 'reactivate', user }); setOpenMenuUserId(null); }}} className={`block px-4 py-2 text-sm ${user.userId === currentUserId ? 'text-gray-400 cursor-not-allowed' : user.isActive ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}>
                                  {user.isActive ? 'Deactivate User' : 'Reactivate User'}
                                </a>
                              </li>
                            </ul>
                          )}
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {paginatedUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    {searchQuery || statusFilter !== 'all' ? 'No users match your filters' : 'No users found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800">Role Permissions</h3>
          <ul className="mt-2 text-sm text-blue-700 space-y-1">
            <li><strong>Belt User:</strong> Can use the belt calculator, cannot modify admin data</li>
            <li><strong>Belt Admin:</strong> Can modify belt catalog data (v-guides, cleats, pulleys, etc.)</li>
            <li><strong>Super Admin:</strong> Full access including user role management</li>
          </ul>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800">User Lifecycle Actions</h3>
          <ul className="mt-2 text-sm text-yellow-700 space-y-1">
            <li><strong>Deactivate:</strong> Block user from accessing the app</li>
            <li><strong>Reactivate:</strong> Restore access to a deactivated user</li>
            <li><strong>Force Sign-Out:</strong> Invalidate all user sessions</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
