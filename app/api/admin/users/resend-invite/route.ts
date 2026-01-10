/**
 * Resend Invite API
 *
 * POST: Resend invite email to a user (SUPER_ADMIN only)
 * - Re-invites the user by email
 * - Logs to audit
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '../../../../../src/lib/auth/require';
import { supabaseAdmin } from '../../../../../src/lib/supabase/client';
import { logAuditAction } from '../../../../../src/lib/auth/audit';

interface RequestBody {
  email: string;
}

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

    // Find user by email
    const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error('[Admin] List users error:', listError);
      return NextResponse.json(
        { error: 'Failed to find user' },
        { status: 500 }
      );
    }

    const targetUser = usersData.users.find(
      (u) => u.email?.toLowerCase() === email
    );

    if (!targetUser) {
      // Don't reveal if user exists
      return NextResponse.json({
        success: true,
        message: 'If the user exists, a new invite has been sent.',
      });
    }

    // Get the base URL for the redirect
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000'
        : 'https://conveyor-console.vercel.app');

    // Re-invite user (Supabase allows re-inviting)
    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo: `${baseUrl}/api/auth/callback`,
      }
    );

    if (inviteError) {
      console.error('[Admin] Resend invite error:', inviteError);
      // Don't reveal error details
    }

    // Log to audit
    await logAuditAction(actor.userId, targetUser.id, 'RESEND_INVITE', {
      email,
    });

    return NextResponse.json({
      success: true,
      message: 'If the user exists, a new invite has been sent.',
    });
  } catch (error) {
    console.error('[Admin] Resend invite error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
