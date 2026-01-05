/**
 * AdminReadOnlyBanner Component
 *
 * Displays a warning banner when a user without admin permissions
 * views an admin page in read-only mode.
 */

'use client';

interface AdminReadOnlyBannerProps {
  email?: string | null;
}

export function AdminReadOnlyBanner({ email }: AdminReadOnlyBannerProps) {
  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-yellow-400"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm text-yellow-700">
            <strong>Read-Only Mode:</strong> You are viewing this admin page in read-only mode.
            {email && (
              <span className="block mt-1 text-yellow-600">
                Logged in as: {email}
              </span>
            )}
          </p>
          <p className="text-xs text-yellow-600 mt-1">
            Contact a Belt Admin or Super Admin if you need write access.
          </p>
        </div>
      </div>
    </div>
  );
}
