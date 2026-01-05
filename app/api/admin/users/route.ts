/**
 * Admin Users API
 *
 * GET: List all users with their roles (SUPER_ADMIN only)
 * PUT: Update a user's role (SUPER_ADMIN only, no self-demotion)
 *
 * Security:
 * - Only SUPER_ADMIN can access this endpoint
 * - Cannot demote yourself (prevents lockout)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../src/lib/supabase/server';
import { requireSuperAdmin } from '../../../../src/lib/auth/require';
import { Role } from '../../../../src/lib/auth/rbac';

interface UserListItem {
  userId: string;
  email: string;
  role: Role;
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
 */
export async function GET() {
  try {
    // Require super admin role
    const authResult = await requireSuperAdmin();
    if (authResult.response) {
      return authResult.response;
    }

    const supabase = await createClient();

    // Get all user profiles with role info
    // Note: We join with auth.users to get email, but Supabase RLS may limit this
    // If auth.users access is restricted, we'd need a service role client
    const { data: profiles, error } = await supabase
      .from('user_profiles')
      .select('user_id, role, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user profiles:', error);
      return NextResponse.json(
        { error: 'Failed to fetch users', details: error.message },
        { status: 500 }
      );
    }

    // Get emails for each user (this requires a separate query)
    // In production, you might want to create a view or function for this
    const users: UserListItem[] = [];
    for (const profile of profiles || []) {
      // Get user email from auth.users (via admin function or service role)
      // For now, we'll return user_id and role, email can be added later
      users.push({
        userId: profile.user_id,
        email: '', // Would need service role to get from auth.users
        role: profile.role as Role,
        createdAt: profile.created_at,
      });
    }

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

    if (!existing) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Update the role
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ role: body.role })
      .eq('user_id', body.userId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating user role:', updateError);
      return NextResponse.json(
        { error: 'Failed to update role', details: updateError.message },
        { status: 500 }
      );
    }

    console.log(`[RBAC] Role changed: ${body.userId} from ${existing.role} to ${body.role} by ${currentUser.userId}`);

    return NextResponse.json({
      success: true,
      userId: body.userId,
      previousRole: existing.role,
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
