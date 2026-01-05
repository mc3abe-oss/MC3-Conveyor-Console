/**
 * Deactivate User API
 *
 * POST: Deactivate a user account (SUPER_ADMIN only)
 * - Sets is_active=false in user_profiles
 * - Records deactivation timestamp and actor
 * - Logs to audit
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '../../../../../../src/lib/auth/require';
import { supabaseAdmin } from '../../../../../../src/lib/supabase/client';
import { logAuditAction } from '../../../../../../src/lib/auth/audit';

interface RouteParams {
  params: Promise<{ userId: string }>;
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    // Require super admin
    const authResult = await requireSuperAdmin();
    if (authResult.response) {
      return authResult.response;
    }
    const { user: actor } = authResult;

    const { userId } = await params;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Prevent self-deactivation
    if (userId === actor.userId) {
      return NextResponse.json(
        { error: 'Cannot deactivate your own account' },
        { status: 400 }
      );
    }

    // Check service role client
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error: service role not available' },
        { status: 500 }
      );
    }

    // Verify user exists
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (userError || !userData.user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update user profile to deactivate
    const { error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        user_id: userId,
        is_active: false,
        deactivated_at: new Date().toISOString(),
        deactivated_by: actor.userId,
      }, {
        onConflict: 'user_id',
      });

    if (updateError) {
      console.error('[Admin] Deactivate user error:', updateError);
      return NextResponse.json(
        { error: 'Failed to deactivate user', details: updateError.message },
        { status: 500 }
      );
    }

    // Log to audit
    await logAuditAction(actor.userId, userId, 'DEACTIVATE', {
      email: userData.user.email,
    });

    return NextResponse.json({
      success: true,
      message: 'User has been deactivated',
      userId,
    });
  } catch (error) {
    console.error('[Admin] Deactivate user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
