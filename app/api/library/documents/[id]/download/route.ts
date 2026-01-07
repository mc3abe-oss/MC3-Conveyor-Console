/**
 * GET /api/library/documents/[id]/download
 * Get a signed URL for downloading/viewing a PDF
 *
 * Query params:
 *   - version: specific version number (optional, defaults to current)
 *
 * Response: { url: string, filename: string, expiresIn: number }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../../src/lib/supabase/server';
import { requireAuth, requireBeltAdmin } from '../../../../../../src/lib/auth/require';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const SIGNED_URL_EXPIRY = 3600; // 1 hour

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Require authentication
    const authResult = await requireAuth();
    if (authResult.response) {
      return authResult.response;
    }

    const { id } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const versionParam = searchParams.get('version');

    // Check if user is admin
    const adminResult = await requireBeltAdmin();
    const isAdmin = !adminResult.response;

    // Fetch document to check access
    const { data: document, error: docError } = await supabase
      .from('pdf_documents')
      .select('id, status, current_version_id')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check access
    if (!isAdmin && document.status !== 'published') {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Find the requested version
    let versionQuery = supabase
      .from('pdf_document_versions')
      .select('id, version_number, storage_path, original_filename')
      .eq('document_id', id);

    if (versionParam) {
      const versionNum = parseInt(versionParam, 10);
      if (isNaN(versionNum)) {
        return NextResponse.json({ error: 'Invalid version number' }, { status: 400 });
      }
      versionQuery = versionQuery.eq('version_number', versionNum);
    } else if (document.current_version_id) {
      versionQuery = versionQuery.eq('id', document.current_version_id);
    } else {
      // Fall back to latest version
      versionQuery = versionQuery.order('version_number', { ascending: false }).limit(1);
    }

    const { data: version, error: versionError } = await versionQuery.single();

    if (versionError || !version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    // Generate signed URL
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('pdf-library')
      .createSignedUrl(version.storage_path, SIGNED_URL_EXPIRY);

    if (signedUrlError || !signedUrlData) {
      console.error('Signed URL error:', signedUrlError);
      return NextResponse.json(
        { error: 'Failed to generate download URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: signedUrlData.signedUrl,
      filename: version.original_filename,
      version: version.version_number,
      expiresIn: SIGNED_URL_EXPIRY,
    });
  } catch (error) {
    console.error('Download API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
