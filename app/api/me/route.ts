/**
 * Current User API
 *
 * GET: Returns the current user's info and role
 *
 * Response:
 * - 200: { userId, email, role }
 * - 401: Not authenticated
 */

import { NextResponse } from 'next/server';
import { getSessionUser, getUserRole, Role } from '../../../src/lib/auth/rbac';

export interface MeResponse {
  userId: string;
  email: string;
  role: Role;
}

/**
 * GET /api/me
 * Returns current user info and role
 */
export async function GET() {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required.' },
        { status: 401 }
      );
    }

    const role = await getUserRole(user.userId);

    const response: MeResponse = {
      userId: user.userId,
      email: user.email,
      role,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in /api/me:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
