/**
 * Password Reset Request API
 *
 * POST: Send password reset email to user
 * - Always returns 200 to prevent email enumeration
 * - Uses Supabase's resetPasswordForEmail
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../src/lib/supabase/server';

interface RequestBody {
  email: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as RequestBody;

    if (!body.email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const email = body.email.trim().toLowerCase();

    // Validate email format
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get the base URL for the redirect
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000'
        : 'https://belt.mc3mfg.com');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${baseUrl}/reset-password`,
    });

    if (error) {
      // Log error but don't expose to client to prevent email enumeration
      console.error('[Auth] Password reset request error:', error);
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
    });
  } catch (error) {
    console.error('[Auth] Password reset request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
