/**
 * Invite User API
 *
 * POST: Send an invite email to a new user (SUPER_ADMIN only)
 * - Creates auth user and sends invite email
 * - Creates user_profile with specified role (defaults to BELT_USER)
 * - Logs to audit
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '../../../../../src/lib/auth/require';
import { supabaseAdmin } from '../../../../../src/lib/supabase/client';
import { logAuditAction } from '../../../../../src/lib/auth/audit';
import { Role, DEFAULT_ROLE } from '../../../../../src/lib/auth/rbac';

interface RequestBody {
  email: string;
  role?: Role;
}

const VALID_ROLES: Role[] = ['SUPER_ADMIN', 'BELT_ADMIN', 'BELT_USER'];

export async function POST(request: NextRequest) {
  try {
    // Require super admin
    const authResult = await requireSuperAdmin();
    if (authResult.response) {
      return authResult.response;
    }
    const { user: actor } = authResult;

    // Check service role client
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error: service role not available' },
        { status: 500 }
      );
    }

    const body = await request.json() as RequestBody;

    if (!body.email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const email = body.email.trim().toLowerCase();
    const role = body.role && VALID_ROLES.includes(body.role) ? body.role : DEFAULT_ROLE;

    // Validate email format
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Get the base URL for the redirect
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000'
        : 'https://conveyor-console.vercel.app');

    // Invite user via Supabase admin
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo: `${baseUrl}/api/auth/callback`,
      }
    );

    if (inviteError) {
      console.error('[Admin] Invite user error:', inviteError);
      return NextResponse.json(
        { error: inviteError.message || 'Failed to invite user' },
        { status: 400 }
      );
    }

    const newUserId = inviteData.user?.id;

    if (newUserId) {
      // Create or update user profile with role
      const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .upsert({
          user_id: newUserId,
          role,
        }, {
          onConflict: 'user_id',
        });

      if (profileError) {
        console.error('[Admin] Create profile error:', profileError);
        // Don't fail the invite, just log the error
      }

      // Log to audit
      await logAuditAction(actor.userId, newUserId, 'INVITE', {
        email,
        role,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Invite sent to ${email}`,
      userId: newUserId,
    });
  } catch (error) {
    console.error('[Admin] Invite user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
