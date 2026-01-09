/**
 * Admin Send Magic Link API
 *
 * POST: Send a magic link to a user (SUPER_ADMIN only)
 * - Sends OTP email to the user
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

    // Find user by email to get userId for audit
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
        message: 'If the user exists, a magic link has been sent.',
      });
    }

    // Get the base URL for the redirect
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000'
        : 'https://mc3abe-oss-belt-conveyor-ninja.vercel.app');

    // Generate magic link using admin API
    const { error: otpError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${baseUrl}/api/auth/callback`,
      },
    });

    if (otpError) {
      console.error('[Admin] Send magic link error:', otpError);
      // Don't reveal error details
    }

    // Log to audit
    await logAuditAction(actor.userId, targetUser.id, 'SEND_MAGIC_LINK', {
      email,
    });

    return NextResponse.json({
      success: true,
      message: 'If the user exists, a magic link has been sent.',
    });
  } catch (error) {
    console.error('[Admin] Send magic link error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
