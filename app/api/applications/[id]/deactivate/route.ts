/**
 * POST /api/applications/:id/deactivate
 *
 * @deprecated Use DELETE /api/applications/:id instead.
 *
 * This endpoint is deprecated. All deletes are now hard deletes.
 * Keeping for backward compatibility but returns 410 Gone.
 */

import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  // Return 410 Gone with deprecation notice
  return NextResponse.json(
    {
      error: 'This endpoint is deprecated. Use DELETE /api/applications/:id instead.',
      deprecated: true,
      redirect: `/api/applications/${id}`,
      method: 'DELETE',
    },
    { status: 410 }
  );
}
