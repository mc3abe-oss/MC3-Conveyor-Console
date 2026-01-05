/**
 * Change Password API
 *
 * POST: Change password for currently logged-in user
 * - Requires authentication
 * - Validates new password meets requirements
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../src/lib/supabase/server';
import { requireAuth } from '../../../../../src/lib/auth/require';

interface RequestBody {
  newPassword: string;
}

const MIN_PASSWORD_LENGTH = 8;

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuth();
    if (authResult.response) {
      return authResult.response;
    }

    const body = await request.json() as RequestBody;

    if (!body.newPassword) {
      return NextResponse.json(
        { error: 'New password is required' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (body.newPassword.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { error } = await supabase.auth.updateUser({
      password: body.newPassword,
    });

    if (error) {
      console.error('[Auth] Password change error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to change password' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('[Auth] Password change error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
