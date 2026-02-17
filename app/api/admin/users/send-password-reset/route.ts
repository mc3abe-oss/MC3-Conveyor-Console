/**
 * Admin Send Password Reset API
 *
 * POST: Send a password reset link to a user (SUPER_ADMIN only)
 * - Sends password reset email to the user
 * - Logs to audit
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '../../../../../src/lib/auth/require';
import { supabaseAdmin } from '../../../../../src/lib/supabase/client';
import { logAuditAction } from '../../../../../src/lib/auth/audit';
import { createLogger } from '../../../../../src/lib/logger';
import { ErrorCodes } from '../../../../../src/lib/logger/error-codes';

const logger = createLogger().child({ module: 'api.users-send-password-reset' });

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
      logger.error('api.users-send-password-reset.list-users.failed', { errorCode: ErrorCodes.DB_QUERY_FAILED, error: listError });
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
        message: 'If the user exists, a password reset link has been sent.',
      });
    }

    // Get the base URL for the redirect
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000'
        : 'https://conveyors.mc3mfg.com');

    // Send password reset email (actually sends the email)
    const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${baseUrl}/reset-password`,
      }
    );

    if (resetError) {
      logger.warn('api.users-send-password-reset.send.failed', { errorCode: ErrorCodes.API_INTERNAL_ERROR, error: resetError });
      // Don't reveal error details
    }

    // Log to audit
    await logAuditAction(actor.userId, targetUser.id, 'SEND_PASSWORD_RESET', {
      email,
    });

    return NextResponse.json({
      success: true,
      message: 'If the user exists, a password reset link has been sent.',
    });
  } catch (error) {
    logger.error('api.users-send-password-reset.post.failed', { errorCode: ErrorCodes.API_INTERNAL_ERROR, error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
