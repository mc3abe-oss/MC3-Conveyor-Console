/**
 * UserAccountMenu - Header user identity indicator with account dropdown
 *
 * Shows user initials + email, with a dropdown menu for account actions:
 * - View identity (name, email, role)
 * - Reset password
 * - Sign out
 */

'use client';

import { useState, useRef } from 'react';
import { useCurrentUserRole, Role } from '../hooks/useCurrentUserRole';
import DropdownPortal from './DropdownPortal';

interface UserAccountMenuProps {
  /** Callback when user clicks Sign out */
  onSignOut: () => void;
  /** Optional: dark mode styling for dark headers */
  darkMode?: boolean;
}

const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  BELT_ADMIN: 'Belt Admin',
  BELT_USER: 'Belt User',
};

const ROLE_COLORS: Record<Role, string> = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-800',
  BELT_ADMIN: 'bg-blue-100 text-blue-800',
  BELT_USER: 'bg-gray-100 text-gray-700',
};

/**
 * Get initials from email address
 */
function getInitials(email: string | null): string {
  if (!email) return '?';

  // Try to extract from email local part
  const localPart = email.split('@')[0];
  if (!localPart) return '?';

  // If local part has dots or underscores, use first letter of each part
  const parts = localPart.split(/[._-]/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  // Otherwise use first two characters
  return localPart.substring(0, 2).toUpperCase();
}

export default function UserAccountMenu({ onSignOut, darkMode = false }: UserAccountMenuProps) {
  const { email, role, isLoading } = useCurrentUserRole();
  const [isOpen, setIsOpen] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Handle password reset
  const handleResetPassword = async () => {
    if (!email) return;

    setIsResettingPassword(true);
    try {
      const response = await fetch('/api/auth/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send reset email');
      }

      setToast('Password reset email sent!');
      setIsOpen(false);
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Auto-hide toast
  if (toast) {
    setTimeout(() => setToast(null), 3000);
  }

  // Don't render if still loading or no email
  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${darkMode ? 'text-white/50' : 'text-gray-400'}`}>
        <div className="w-8 h-8 rounded-full bg-gray-300 animate-pulse" />
      </div>
    );
  }

  if (!email) {
    return null;
  }

  const initials = getInitials(email);

  return (
    <>
      {/* Toast notification */}
      {toast && (
        <div className="fixed top-4 right-4 bg-gray-900 text-white px-4 py-2 rounded shadow-lg z-[10000]">
          {toast}
        </div>
      )}

      {/* User identity trigger - compact, only initials shown */}
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1 px-1.5 py-1 rounded-md transition-colors ${
          darkMode
            ? 'hover:bg-white/10 text-white'
            : 'hover:bg-gray-100 text-gray-700'
        }`}
        title={email || 'Account'}
      >
        {/* Avatar with initials */}
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            darkMode
              ? 'bg-mc3-gold text-mc3-navy'
              : 'bg-blue-100 text-blue-700'
          }`}
        >
          {initials}
        </div>
        {/* Dropdown indicator */}
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''} ${
            darkMode ? 'text-white/60' : 'text-gray-400'
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown menu */}
      <DropdownPortal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        triggerRef={triggerRef}
        align="right"
        width={240}
      >
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {/* Identity section */}
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-medium">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{email}</p>
                {role && (
                  <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded ${ROLE_COLORS[role]}`}>
                    {ROLE_LABELS[role]}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="py-1">
            <button
              onClick={handleResetPassword}
              disabled={isResettingPassword}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              {isResettingPassword ? 'Sending...' : 'Reset password'}
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                onSignOut();
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      </DropdownPortal>
    </>
  );
}
