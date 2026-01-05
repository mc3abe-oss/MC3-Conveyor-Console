/**
 * Admin Users API
 *
 * GET: List all users with their roles (SUPER_ADMIN only)
 * PUT: Update a user's role (SUPER_ADMIN only, no self-demotion)
 *
 * Security:
 * - Only SUPER_ADMIN can access this endpoint
 * - Cannot demote yourself (prevents lockout)
 *
 * Note: Uses service role to access auth.users for email lookup
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../src/lib/supabase/server';
import { supabaseAdmin } from '../../../../src/lib/supabase/client';
import { requireSuperAdmin } from '../../../../src/lib/auth/require';
import { Role, DEFAULT_ROLE } from '../../../../src/lib/auth/rbac';
import { logAuditAction } from '../../../../src/lib/auth/audit';

interface UserListItem {
  userId: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

interface UpdateRolePayload {
  userId: string;
  role: Role;
}

const VALID_ROLES: Role[] = ['SUPER_ADMIN', 'BELT_ADMIN', 'BELT_USER'];

/**
 * GET /api/admin/users
 * List all users with their roles
 * Returns ALL auth users, even those without profiles (defaults to BELT_USER)
 */
export async function GET() {
  try {
    // Require super admin role
    const authResult = await requireSuperAdmin();
    if (authResult.response) {
      return authResult.response;
    }

    // Check if service role client is available
    if (!supabaseAdmin) {
      console.error('Service role client not configured');
      return NextResponse.json(
        { error: 'Server configuration error: service role not available' },
        { status: 500 }
      );
    }

    // Get all auth users using service role
    const { data: authUsersResponse, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      console.error('Error fetching auth users:', authError);
      return NextResponse.json(
        { error: 'Failed to fetch users', details: authError.message },
        { status: 500 }
      );
    }

    const authUsers = authUsersResponse.users || [];

    // Get all user profiles (handle pre-migration state where is_active may not exist)
    let { data: profiles, error: profilesError } = await supabaseAdmin
      .from('user_profiles')
      .select('user_id, role, is_active, created_at');

    // If is_active column doesn't exist (pre-migration), fall back to without it
    if (profilesError && profilesError.code === '42703') {
      const fallback = await supabaseAdmin
        .from('user_profiles')
        .select('user_id, role, created_at');

      if (fallback.error) {
        console.error('Error fetching user profiles:', fallback.error);
        return NextResponse.json(
          { error: 'Failed to fetch user profiles', details: fallback.error.message },
          { status: 500 }
        );
      }

      // Add is_active: true to all profiles (pre-migration default)
      profiles = (fallback.data || []).map(p => ({ ...p, is_active: true }));
      profilesError = null;
    }

    if (profilesError) {
      console.error('Error fetching user profiles:', profilesError);
      return NextResponse.json(
        { error: 'Failed to fetch user profiles', details: profilesError.message },
        { status: 500 }
      );
    }

    // Create a map of user_id -> profile for quick lookup
    const profileMap = new Map<string, { role: Role; is_active: boolean; created_at: string }>();
    for (const profile of profiles || []) {
      profileMap.set(profile.user_id, {
        role: profile.role as Role,
        is_active: profile.is_active ?? true,
        created_at: profile.created_at,
      });
    }

    // Build the user list: all auth users with their roles (default to BELT_USER if no profile)
    const users: UserListItem[] = authUsers.map((authUser) => {
      const profile = profileMap.get(authUser.id);
      return {
        userId: authUser.id,
        email: authUser.email || '',
        role: profile?.role || DEFAULT_ROLE,
        isActive: profile?.is_active ?? true,
        createdAt: profile?.created_at || authUser.created_at,
      };
    });

    // Sort by created date (newest first)
    users.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error in /api/admin/users GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/users
 * Update a user's role
 * Creates profile if it doesn't exist (upsert behavior)
 */
export async function PUT(request: NextRequest) {
  try {
    // Require super admin role
    const authResult = await requireSuperAdmin();
    if (authResult.response) {
      return authResult.response;
    }
    const { user: currentUser } = authResult;

    const supabase = await createClient();
    const body = await request.json() as UpdateRolePayload;

    // Validate required fields
    if (!body.userId) {
      return NextResponse.json(
        { error: 'Missing required field: userId' },
        { status: 400 }
      );
    }

    if (!body.role || !VALID_ROLES.includes(body.role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` },
        { status: 400 }
      );
    }

    // Prevent self-demotion
    if (body.userId === currentUser.userId && body.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Cannot demote yourself. Another SUPER_ADMIN must change your role.' },
        { status: 400 }
      );
    }

    // Check if user profile exists
    const { data: existing, error: findError } = await supabase
      .from('user_profiles')
      .select('user_id, role')
      .eq('user_id', body.userId)
      .maybeSingle();

    if (findError) {
      console.error('Error finding user profile:', findError);
      return NextResponse.json(
        { error: 'Failed to find user', details: findError.message },
        { status: 500 }
      );
    }

    const previousRole = existing?.role || DEFAULT_ROLE;

    if (existing) {
      // Update existing profile
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ role: body.role })
        .eq('user_id', body.userId);

      if (updateError) {
        console.error('Error updating user role:', updateError);
        return NextResponse.json(
          { error: 'Failed to update role', details: updateError.message },
          { status: 500 }
        );
      }
    } else {
      // Create new profile (user existed in auth but not in profiles)
      const { error: insertError } = await supabase
        .from('user_profiles')
        .insert({ user_id: body.userId, role: body.role });

      if (insertError) {
        console.error('Error creating user profile:', insertError);
        return NextResponse.json(
          { error: 'Failed to create profile', details: insertError.message },
          { status: 500 }
        );
      }
    }

    console.log(`[RBAC] Role changed: ${body.userId} from ${previousRole} to ${body.role} by ${currentUser.userId}`);

    // Log to audit
    await logAuditAction(currentUser.userId, body.userId, 'ROLE_CHANGE', {
      previousRole,
      newRole: body.role,
    });

    return NextResponse.json({
      success: true,
      userId: body.userId,
      previousRole,
      newRole: body.role,
    });
  } catch (error) {
    console.error('Error in /api/admin/users PUT:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
