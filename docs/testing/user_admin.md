# User Admin Page Testing Guide

## Overview

The User Admin page (`/console/admin/users`) allows SUPER_ADMIN users to manage user roles across the application. This page displays all authenticated users from `auth.users` and allows role assignment.

## Access

- **URL**: `/console/admin/users`
- **Required Role**: SUPER_ADMIN only
- **Link Location**: Admin page → "User Admin" card (only visible to SUPER_ADMIN)

## Features

### User List
- Displays all users from `auth.users` table
- Shows: User ID (truncated), Email, Role, Created Date
- Users without a `user_profiles` record default to BELT_USER role
- Current user's row is highlighted in blue

### Search
- Filter by email or user ID (partial match, case-insensitive)
- Real-time filtering as you type
- Shows count of matching users

### Pagination
- 25 users per page
- Previous/Next navigation
- Shows "Showing X to Y of Z" count

### Copy User ID
- Click the copy icon next to any User ID
- Copies the full UUID to clipboard
- Toast notification confirms copy

### Role Management
- Click "Edit Role" to change a user's role
- Available roles:
  - **BELT_USER**: Can use belt calculator, no admin access
  - **BELT_ADMIN**: Can modify catalog data (belts, v-guides, cleats, etc.)
  - **SUPER_ADMIN**: Full access including user management
- Self-demotion is prevented (backend enforced)

## API Endpoints

### GET /api/admin/users
Returns all users with their roles.

**Response:**
```json
[
  {
    "userId": "uuid",
    "email": "user@example.com",
    "role": "BELT_USER",
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

### PUT /api/admin/users
Updates a user's role.

**Request:**
```json
{
  "userId": "uuid",
  "role": "BELT_ADMIN"
}
```

**Response:**
```json
{
  "success": true,
  "userId": "uuid",
  "previousRole": "BELT_USER",
  "newRole": "BELT_ADMIN"
}
```

## Backfill Script

If users exist in `auth.users` but not in `user_profiles`, run the backfill script:

```bash
source .env.local
node scripts/backfill-user-profiles.mjs
```

This creates BELT_USER profiles for any missing users. The script is idempotent and safe to run multiple times.

## Testing Checklist

### Access Control
- [ ] Non-authenticated users redirected to login
- [ ] BELT_USER sees "Access Denied" message
- [ ] BELT_ADMIN sees "Access Denied" message
- [ ] SUPER_ADMIN can access the page
- [ ] User Admin card only visible on Admin page for SUPER_ADMIN

### User List
- [ ] All auth users are displayed
- [ ] Users without profiles show as BELT_USER
- [ ] Email addresses are visible
- [ ] Current user row is highlighted
- [ ] "(you)" label appears next to current user

### Search & Pagination
- [ ] Search filters by email
- [ ] Search filters by user ID
- [ ] Pagination appears when > 25 users
- [ ] Page resets to 1 when search changes
- [ ] User count updates with search

### Copy Functionality
- [ ] Copy button appears next to each User ID
- [ ] Clicking copy shows toast notification
- [ ] Full UUID is copied to clipboard

### Role Changes
- [ ] Can change BELT_USER to BELT_ADMIN
- [ ] Can change BELT_ADMIN to SUPER_ADMIN
- [ ] Can demote other users
- [ ] Cannot demote yourself (error message shown)
- [ ] Success message appears after role change
- [ ] List refreshes after role change

## Security Notes

1. **Backend Validation**: All role checks are enforced server-side via `requireSuperAdmin()`
2. **Service Role**: The API uses Supabase service role to access `auth.users`
3. **Self-Demotion**: Prevented server-side to avoid admin lockout
4. **RLS Bypass**: Service role bypasses RLS for admin operations
