/**
 * GET /api/quotes/[id]/output-permission
 *
 * Check if outputs are allowed for a quote.
 * Returns { allowed: boolean, status: 'draft'|'set', error?: { code, message } }
 *
 * Clients MUST call this before any output action (copy, download, export).
 * This is the authoritative server-side check.
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkOutputPermission } from '../../../../../src/lib/scope';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const result = await checkOutputPermission('quote', id);

    if (!result.allowed) {
      // Return 403 for OUTPUTS_REQUIRE_SET, 404 for ENTITY_NOT_FOUND
      const statusCode = result.error?.code === 'ENTITY_NOT_FOUND' ? 404 : 403;
      return NextResponse.json(result, { status: statusCode });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Quote output permission check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
