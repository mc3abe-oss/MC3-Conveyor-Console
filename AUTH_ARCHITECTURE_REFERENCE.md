# Authentication & User Management Architecture Reference

This document describes the authentication, user management, and security architecture for adaptation in other projects.

---

## Overview

- **Auth Provider**: Supabase Auth
- **Auth Methods**: Magic Link (OTP) and Password-based
- **Session Storage**: Cookie-based (via `@supabase/ssr`)
- **Authorization Model**: Three-tier RBAC (SUPER_ADMIN > BELT_ADMIN > BELT_USER)
- **Security Model**: Fail-closed (all routes protected by default)

---

## 1. Authentication Flow

### 1.1 Magic Link (OTP) Authentication

**Flow:**
1. User enters email on login/signup page
2. System calls `/api/auth/magic-link/request`
3. Supabase sends OTP email with magic link
4. User clicks link → redirects to `/api/auth/callback?token_hash=...&type=magiclink`
5. Callback verifies OTP and creates session

**Key Files:**
- `app/login/page.tsx` - Login form (magic link mode)
- `app/signup/page.tsx` - Signup form (magic link mode)
- `app/api/auth/magic-link/request/route.ts` - Request magic link
- `app/api/auth/callback/route.ts` - Verify OTP and create session

**Supabase Methods:**
```typescript
// Request magic link
await supabase.auth.signInWithOtp({
  email,
  options: {
    shouldCreateUser: true, // false for login-only
    emailRedirectTo: `${canonicalUrl}/api/auth/callback`
  }
})

// Verify in callback
await supabase.auth.verifyOtp({ token_hash, type: 'magiclink' })
```

### 1.2 Password Authentication

**Flow:**
1. User enters email + password
2. System calls `supabase.auth.signInWithPassword()` or `signUp()`
3. For signup: confirmation email sent, user must verify
4. Session created on successful auth

**Key Files:**
- `app/login/page.tsx` - Login form (password mode)
- `app/signup/page.tsx` - Signup form (password mode)
- `app/api/auth/password/change/route.ts` - Change password (authenticated)
- `app/api/auth/password-reset/request/route.ts` - Request reset (public)
- `app/forgot-password/page.tsx` - Forgot password form
- `app/reset-password/page.tsx` - Reset password form

**Password Requirements:**
- Minimum 8 characters (enforced server-side)

### 1.3 Auth Callback Handler

**File:** `app/api/auth/callback/route.ts`

Handles both auth flows:
```typescript
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  const supabase = await createClient()

  if (token_hash && type) {
    // Magic link verification
    await supabase.auth.verifyOtp({ token_hash, type })
  } else if (code) {
    // PKCE flow (OAuth)
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(new URL(next, request.url))
}
```

---

## 2. Session Management

### 2.1 Supabase Client Setup

**Three client types:**

**Server Client** (`src/lib/supabase/server.ts`):
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```

**Browser Client** (`src/lib/supabase/browser.ts`):
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Admin Client** (`src/lib/supabase/client.ts`) - Bypasses RLS:
```typescript
import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
```

### 2.2 Middleware Session Refresh

**File:** `src/lib/supabase/middleware.ts`

```typescript
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Use getUser(), not getSession()
  // getUser() validates with server, getSession() only reads local data
  const { data: { user } } = await supabase.auth.getUser()

  return { user, supabaseResponse }
}
```

---

## 3. Authorization / RBAC

### 3.1 Role Hierarchy

| Role | Level | Capabilities |
|------|-------|--------------|
| SUPER_ADMIN | Highest | Full access, user management, audit logs |
| BELT_ADMIN | Middle | Admin tables (catalog, settings), no user management |
| BELT_USER | Lowest | Read-only admin data, use main features |

### 3.2 Database Schema

**File:** `supabase/migrations/20260105100000_rbac_user_profiles.sql`

```sql
CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'BELT_USER'
    CHECK (role IN ('SUPER_ADMIN', 'BELT_ADMIN', 'BELT_USER')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  deactivated_at TIMESTAMPTZ,
  deactivated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, role)
  VALUES (NEW.id, 'BELT_USER');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### 3.3 RLS Helper Functions

```sql
-- Get current user's role
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM user_profiles WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if current user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT get_current_user_role() = 'SUPER_ADMIN';
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if current user has belt admin or higher access
CREATE OR REPLACE FUNCTION has_belt_admin_access()
RETURNS BOOLEAN AS $$
  SELECT get_current_user_role() IN ('BELT_ADMIN', 'SUPER_ADMIN');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if a user is active
CREATE OR REPLACE FUNCTION is_user_active(target_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_active FROM user_profiles WHERE user_id = target_user_id),
    TRUE -- Default to true if no profile exists
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

### 3.4 RLS Policies Example

```sql
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Super admins can view all profiles
CREATE POLICY "Super admins can view all profiles"
  ON user_profiles FOR SELECT
  USING (is_super_admin());

-- Only super admins can update profiles
CREATE POLICY "Super admins can update profiles"
  ON user_profiles FOR UPDATE
  USING (is_super_admin());
```

### 3.5 API Route Protection Helpers

**File:** `src/lib/auth/require.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type AuthResult =
  | { user: { id: string; email: string }; role: string; response?: never }
  | { response: NextResponse; user?: never; role?: never }

export async function requireAuth(): Promise<AuthResult> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      response: NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required.' },
        { status: 401 }
      )
    }
  }

  // Get user profile with role and active status
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single()

  const role = profile?.role ?? 'BELT_USER'
  const isActive = profile?.is_active ?? true

  if (!isActive) {
    return {
      response: NextResponse.json(
        { error: 'DEACTIVATED', message: 'Account is deactivated. Contact an administrator.' },
        { status: 403 }
      )
    }
  }

  return { user: { id: user.id, email: user.email! }, role }
}

export async function requireBeltAdmin(): Promise<AuthResult> {
  const result = await requireAuth()
  if (result.response) return result

  if (!['BELT_ADMIN', 'SUPER_ADMIN'].includes(result.role)) {
    return {
      response: NextResponse.json(
        { error: 'FORBIDDEN', message: 'Belt Admin access required.' },
        { status: 403 }
      )
    }
  }

  return result
}

export async function requireSuperAdmin(): Promise<AuthResult> {
  const result = await requireAuth()
  if (result.response) return result

  if (result.role !== 'SUPER_ADMIN') {
    return {
      response: NextResponse.json(
        { error: 'FORBIDDEN', message: 'Super Admin access required.' },
        { status: 403 }
      )
    }
  }

  return result
}
```

**Usage in API routes:**
```typescript
export async function POST(request: NextRequest) {
  const authResult = await requireSuperAdmin()
  if (authResult.response) return authResult.response
  const { user, role } = authResult

  // ... rest of handler
}
```

---

## 4. Middleware (Fail-Closed)

**File:** `middleware.ts`

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Allow API auth routes
  if (pathname.startsWith('/api/auth/')) {
    return NextResponse.next()
  }

  try {
    const { user, supabaseResponse } = await updateSession(request)

    if (!user) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
    }

    return supabaseResponse
  } catch (error) {
    // Fail closed - redirect to login on any error
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

---

## 5. User Management

### 5.1 User Lifecycle

**Invite User:** `POST /api/admin/users/invite`
- Creates auth user via admin API
- Creates user_profile with specified role
- Sends invitation email
- Logs to audit trail

**Update Role:** `PUT /api/admin/users`
- Updates role in user_profiles
- Prevents self-demotion
- Logs to audit trail

**Deactivate User:** `POST /api/admin/users/[userId]/deactivate`
- Sets `is_active = false`
- Records `deactivated_at` and `deactivated_by`
- Prevents self-deactivation
- Logs to audit trail

**Reactivate User:** `POST /api/admin/users/[userId]/reactivate`
- Sets `is_active = true`
- Clears deactivation fields
- Logs to audit trail

**Force Sign-Out:** `POST /api/admin/users/[userId]/force-signout`
- Invalidates all user sessions
- Logs to audit trail

### 5.2 Audit Logging

**File:** `src/lib/auth/audit.ts`

```typescript
import { supabaseAdmin } from '@/lib/supabase/client'

export type AuditAction =
  | 'INVITE'
  | 'RESEND_INVITE'
  | 'SEND_MAGIC_LINK'
  | 'SEND_PASSWORD_RESET'
  | 'DEACTIVATE'
  | 'REACTIVATE'
  | 'FORCE_SIGNOUT'
  | 'ROLE_CHANGE'

export async function logAuditAction(
  actorUserId: string,
  targetUserId: string,
  action: AuditAction,
  details?: Record<string, unknown>
) {
  try {
    await supabaseAdmin.from('user_admin_audit').insert({
      actor_user_id: actorUserId,
      target_user_id: targetUserId,
      action,
      details
    })
  } catch (error) {
    console.error('[Audit] Failed to log action:', error)
    // Don't throw - audit failure shouldn't block operations
  }
}
```

**Audit Table Schema:**
```sql
CREATE TABLE user_admin_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NOT NULL REFERENCES auth.users(id),
  target_user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Make audit log immutable
ALTER TABLE user_admin_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can read audit log"
  ON user_admin_audit FOR SELECT
  USING (is_super_admin());

CREATE POLICY "Super admins can insert audit log"
  ON user_admin_audit FOR INSERT
  WITH CHECK (is_super_admin());

-- No UPDATE or DELETE policies - audit is immutable
```

---

## 6. Domain Restriction

**File:** `supabase/functions/before-user-created/index.ts`

Supabase Auth Hook that runs before user creation:

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const ALLOWED_DOMAINS = ['mc3mfg.com', 'clearcode.ca']

serve(async (req) => {
  const payload = await req.json()
  const email = payload.user?.email

  if (!email) {
    return new Response(
      JSON.stringify({ decision: 'reject', message: 'Email is required' }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  }

  const domain = email.split('@')[1]?.toLowerCase()

  if (!ALLOWED_DOMAINS.includes(domain)) {
    return new Response(
      JSON.stringify({
        decision: 'reject',
        message: 'Signups are restricted to authorized domains'
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ decision: 'continue' }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

---

## 7. Canonical URL for Emails

**File:** `src/lib/auth/canonical-url.ts`

Ensures email links always use production domain:

```typescript
export function getCanonicalUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL

  if (!url) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('NEXT_PUBLIC_APP_URL must be set in production')
    }
    return 'http://localhost:3000'
  }

  return url.replace(/\/$/, '') // Remove trailing slash
}
```

---

## 8. Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App URL (for email links)
NEXT_PUBLIC_APP_URL=https://your-app.com

# Development only
AUTH_BYPASS_DEV=false  # Set to 'true' to bypass auth in dev
```

---

## 9. Key Design Patterns

### 9.1 Error Response Standardization

```typescript
// 401 - Not authenticated
{ error: 'UNAUTHORIZED', message: 'Authentication required.' }

// 403 - Authenticated but insufficient permissions
{ error: 'FORBIDDEN', message: '[role] access required.' }

// 403 - Account deactivated
{ error: 'DEACTIVATED', message: 'Account is deactivated. Contact an administrator.' }
```

### 9.2 Email Enumeration Prevention

All email-related endpoints return generic success messages:
```typescript
return NextResponse.json({
  success: true,
  message: 'If an account exists with this email, you will receive a link shortly.'
})
```

### 9.3 Deactivation vs. Deletion

- Users are **deactivated**, never deleted
- Preserves referential integrity and audit trail
- Can be reactivated by SUPER_ADMIN
- All require* helpers check `is_active` status

### 9.4 Protected API Route Pattern

```typescript
export async function POST(request: NextRequest) {
  try {
    // 1. Authorization guard (early return)
    const authResult = await requireSuperAdmin()
    if (authResult.response) return authResult.response
    const { user } = authResult

    // 2. Parse and validate input
    const body = await request.json()
    if (!body.requiredField) {
      return NextResponse.json({ error: 'Missing required field' }, { status: 400 })
    }

    // 3. Business logic
    const supabase = await createClient()
    const { data, error } = await supabase.from('table').insert(...)

    if (error) throw error

    // 4. Audit logging (non-blocking)
    await logAuditAction(user.id, targetId, 'ACTION_TYPE', { details })

    // 5. Success response
    return NextResponse.json({ success: true, data })

  } catch (error) {
    console.error('[Feature] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

---

## 10. File Structure Reference

```
src/
├── lib/
│   ├── auth/
│   │   ├── require.ts         # Auth guard helpers (requireAuth, requireBeltAdmin, etc.)
│   │   ├── audit.ts           # Audit logging helper
│   │   └── canonical-url.ts   # Email URL helper
│   └── supabase/
│       ├── server.ts          # Server-side Supabase client
│       ├── browser.ts         # Browser-side Supabase client
│       ├── client.ts          # Admin client (service role)
│       └── middleware.ts      # Session update helper
├── middleware.ts              # Next.js middleware (auth gate)
└── app/
    ├── login/page.tsx
    ├── signup/page.tsx
    ├── forgot-password/page.tsx
    ├── reset-password/page.tsx
    └── api/
        └── auth/
            ├── callback/route.ts
            ├── magic-link/request/route.ts
            ├── password/change/route.ts
            └── password-reset/request/route.ts
        └── admin/
            └── users/
                ├── route.ts           # List/update users
                ├── invite/route.ts
                ├── audit/route.ts
                ├── [userId]/
                │   ├── deactivate/route.ts
                │   ├── reactivate/route.ts
                │   └── force-signout/route.ts
                ├── send-password-reset/route.ts
                └── send-magic-link/route.ts

supabase/
├── migrations/
│   ├── 20260105100000_rbac_user_profiles.sql
│   └── 20260105200000_user_lifecycle.sql
└── functions/
    └── before-user-created/index.ts   # Domain restriction hook
```

---

## Summary

This architecture provides:

1. **Dual auth methods** - Magic link for convenience, password for users who prefer it
2. **Fail-closed security** - All routes protected by default via middleware
3. **Three-tier RBAC** - Flexible role-based access control
4. **Defense in depth** - Authorization at middleware, API, and database (RLS) layers
5. **Immutable audit trail** - All admin actions logged
6. **User deactivation** - Soft delete preserves data integrity
7. **Domain restriction** - Control who can sign up
8. **Email enumeration prevention** - Security best practice
9. **Standardized patterns** - Consistent error handling and API structure
