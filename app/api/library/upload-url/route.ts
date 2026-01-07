/**
 * POST /api/library/upload-url
 * Generate a signed URL for direct-to-Supabase-Storage upload
 *
 * This enables large file uploads (up to 250MB) without buffering
 * the entire file in Next.js API memory.
 *
 * Request body:
 *   - filename: original filename (required)
 *   - contentType: MIME type (must be application/pdf)
 *   - documentId?: existing document ID (for new version)
 *
 * Response:
 *   - signedUrl: URL to PUT the file directly to Supabase Storage
 *   - storagePath: path in the bucket (needed for metadata creation)
 *   - expiresAt: when the signed URL expires
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../src/lib/supabase/server';
import { requireBeltAdmin } from '../../../../src/lib/auth/require';
import { randomUUID } from 'crypto';

const BUCKET_NAME = 'pdf-library';
const MAX_FILE_SIZE = 250 * 1024 * 1024; // 250MB
const SIGNED_URL_EXPIRES_IN = 3600; // 1 hour

export async function POST(request: NextRequest) {
  try {
    // Require admin access
    const authResult = await requireBeltAdmin();
    if (authResult.response) {
      return authResult.response;
    }

    const supabase = await createClient();
    const body = await request.json();

    const { filename, contentType, documentId } = body;

    // Validate content type
    if (contentType !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are allowed' },
        { status: 400 }
      );
    }

    // Validate filename
    if (!filename || typeof filename !== 'string') {
      return NextResponse.json(
        { error: 'Filename is required' },
        { status: 400 }
      );
    }

    // Sanitize filename - keep only safe characters
    const sanitizedFilename = filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .substring(0, 200);

    // Generate unique storage path
    const uuid = randomUUID();
    const storagePath = `${uuid}/${sanitizedFilename}`;

    // If this is a new version, verify the document exists
    if (documentId) {
      const { data: doc, error: docError } = await supabase
        .from('pdf_documents')
        .select('id')
        .eq('id', documentId)
        .is('deleted_at', null)
        .single();

      if (docError || !doc) {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        );
      }
    }

    // Create signed upload URL
    const { data: signedUrlData, error: signedUrlError } = await supabase
      .storage
      .from(BUCKET_NAME)
      .createSignedUploadUrl(storagePath);

    if (signedUrlError) {
      console.error('Signed URL creation error:', signedUrlError);
      return NextResponse.json(
        { error: 'Failed to create upload URL', details: signedUrlError.message },
        { status: 500 }
      );
    }

    const expiresAt = new Date(Date.now() + SIGNED_URL_EXPIRES_IN * 1000).toISOString();

    return NextResponse.json({
      signedUrl: signedUrlData.signedUrl,
      token: signedUrlData.token,
      storagePath,
      expiresAt,
      maxFileSize: MAX_FILE_SIZE,
      maxFileSizeMB: 250,
    });
  } catch (error) {
    console.error('Upload URL API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
