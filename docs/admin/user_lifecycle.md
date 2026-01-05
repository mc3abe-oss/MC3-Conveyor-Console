# User Lifecycle Admin + Self-Service Auth

This document describes the user lifecycle management features and self-service authentication flows.

## Overview

The system provides:
1. **Self-Service Auth** - Password reset, magic link sign-in, password change
2. **Admin User Lifecycle** - Invite, deactivate/reactivate, force sign-out, audit logging

## Self-Service Features (Any User)

### Forgot Password / Password Reset

1. User clicks "Forgot your password?" on login page
2. Enters email at `/forgot-password`
3. Receives email with reset link
4. Clicks link, redirected to `/reset-password`
5. Sets new password

**API**: `POST /api/auth/password-reset/request`
- Body: `{ email: string }`
- Always returns 200 (prevents email enumeration)

### Magic Link Sign-In

Users can request a magic link to sign in without a password.

**API**: `POST /api/auth/magic-link/request`
- Body: `{ email: string }`
- Always returns 200 (prevents email enumeration)

### Change Password (Logged In)

Users can change their password at `/console/profile/security`.

**API**: `POST /api/auth/password/change`
- Body: `{ currentPassword: string, newPassword: string }`
- Requires authentication
- Validates current password before changing

## Admin Features (SUPER_ADMIN Only)

All admin endpoints require `SUPER_ADMIN` role and are protected by `requireSuperAdmin()`.

### Invite User

Send an invitation email to a new user.

**API**: `POST /api/admin/users/invite`
- Body: `{ email: string, role?: 'SUPER_ADMIN' | 'BELT_ADMIN' | 'BELT_USER' }`
- Default role: `BELT_USER`
- Creates user in `invited` state
- Logs to audit

### Resend Invite

Resend invitation to a user who hasn't accepted yet.

**API**: `POST /api/admin/users/resend-invite`
- Body: `{ email: string }`
- Generates new invite link
- Logs to audit

### Send Magic Link (Admin)

Send a magic link to any user (useful for users having trouble signing in).

**API**: `POST /api/admin/users/send-magic-link`
- Body: `{ email: string }`
- Logs to audit

### Send Password Reset (Admin)

Send a password reset link to any user.

**API**: `POST /api/admin/users/send-password-reset`
- Body: `{ email: string }`
- Logs to audit

### Deactivate User

Deactivate a user account. Deactivated users:
- Cannot access any authenticated routes
- See "Account is deactivated" message
- Must contact admin to reactivate

**API**: `POST /api/admin/users/:userId/deactivate`
- Cannot deactivate yourself
- Sets `is_active = false` in `user_profiles`
- Records `deactivated_at` and `deactivated_by`
- Logs to audit

### Reactivate User

Restore a deactivated user account.

**API**: `POST /api/admin/users/:userId/reactivate`
- Sets `is_active = true`
- Clears deactivation fields
- Logs to audit

### Force Sign-Out

Invalidate all sessions for a user.

**API**: `POST /api/admin/users/:userId/force-signout`
- Cannot sign out yourself
- Updates user metadata to trigger session invalidation
- **Note**: Takes effect on next token refresh (Supabase limitation)
- Logs to audit

### Audit Log

View audit log of all admin actions.

**API**: `GET /api/admin/users/audit`
- Query params: `limit`, `offset`, `action`
- Valid actions: `INVITE`, `RESEND_INVITE`, `SEND_MAGIC_LINK`, `SEND_PASSWORD_RESET`, `DEACTIVATE`, `REACTIVATE`, `FORCE_SIGNOUT`, `ROLE_CHANGE`

## User Admin UI

The User Admin page (`/console/admin/users`) provides:

1. **User Table** with columns:
   - Email
   - Role
   - Status (Active/Deactivated)
   - Last Sign In
   - Actions

2. **Filters**:
   - Search by email
   - Filter by role
   - Filter by status (All/Active/Deactivated)

3. **Actions** (via dropdown menu):
   - Send Magic Link
   - Send Password Reset
   - Force Sign-Out
   - Deactivate / Reactivate

4. **Invite User** button opens modal to invite new users

## Database Schema

### user_profiles additions

```sql
is_active BOOLEAN NOT NULL DEFAULT TRUE
deactivated_at TIMESTAMPTZ NULL
deactivated_by UUID NULL REFERENCES auth.users(id)
```

### user_admin_audit table

```sql
CREATE TABLE user_admin_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NOT NULL REFERENCES auth.users(id),
  target_user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  details JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Deactivation Enforcement

Deactivation is enforced at the API layer in `requireAuth()`, `requireRole()`, `requireSuperAdmin()`, and `requireBeltAdminOrAbove()`. All authenticated requests check `is_active` and return:

```json
{
  "error": "DEACTIVATED",
  "message": "Account is deactivated. Contact an administrator."
}
```

Status: 403 Forbidden

## Known Limitations

1. **Force Sign-Out**: Supabase JS SDK v2 doesn't have a direct `admin.signOut(userId)` method. The implementation uses `updateUserById` to update metadata, which triggers session invalidation on the next token refresh (not immediate).

2. **Magic Link / Password Reset**: These flows use Supabase's built-in email templates. Custom email templates require Supabase dashboard configuration.

## Migration

The migration file is at `supabase/migrations/20260105200000_user_lifecycle.sql`.

**To apply**: Run the migration SQL in Supabase Dashboard > SQL Editor.
