/**
 * POST /api/library/upload
 * Upload a PDF file to an existing document (admin only)
 *
 * NOTE: This endpoint buffers files in memory. For files larger than 50MB,
 * use the direct upload flow instead:
 *   1. POST /api/library/upload-url to get a signed URL
 *   2. PUT file directly to Supabase Storage using the signed URL
 *   3. POST /api/library/upload/finalize to create metadata
 *
 * Request: multipart/form-data with:
 *   - file: PDF file (required, max 50MB)
 *   - documentId: existing document ID OR...
 *   - title: title for new document (if no documentId)
 *   - description: optional description
 *   - department: optional department
 *   - changeNote: optional note about this version
 *
 * Features:
 *   - Validates PDF mime type
 *   - Enforces 50MB size limit (use direct upload for larger files)
 *   - Computes SHA-256 hash for deduplication
 *   - Creates new version or returns existing if hash matches
 *   - Sets as current version
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../src/lib/supabase/server';
import { requireBeltAdmin } from '../../../../src/lib/auth/require';
import crypto from 'crypto';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request: NextRequest) {
  try {
    // Require admin access
    const authResult = await requireBeltAdmin();
    if (authResult.response) {
      return authResult.response;
    }

    const supabase = await createClient();

    // Get current user ID
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    let documentId = formData.get('documentId') as string | null;
    const title = formData.get('title') as string | null;
    const description = formData.get('description') as string | null;
    const department = formData.get('department') as string | null;
    const changeNote = formData.get('changeNote') as string | null;

    // Validate file
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are allowed' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Compute SHA-256 hash
    const sha256Hash = crypto.createHash('sha256').update(buffer).digest('hex');

    // If no documentId, we need a title to create a new document
    if (!documentId && !title?.trim()) {
      return NextResponse.json(
        { error: 'Either documentId or title is required' },
        { status: 400 }
      );
    }

    // Create new document if needed
    if (!documentId) {
      const { data: newDoc, error: docError } = await supabase
        .from('pdf_documents')
        .insert({
          title: title!.trim(),
          description: description?.trim() || null,
          department: department?.trim() || null,
          status: 'draft',
          version_count: 0,
          created_by: userId,
          updated_by: userId,
        })
        .select()
        .single();

      if (docError) {
        console.error('Document creation error:', docError);
        return NextResponse.json(
          { error: 'Failed to create document', details: docError.message },
          { status: 500 }
        );
      }

      documentId = newDoc.id;
    }

    // Check if this hash already exists for this document (deduplication)
    const { data: existingVersion } = await supabase
      .from('pdf_document_versions')
      .select('id, version_number')
      .eq('document_id', documentId)
      .eq('sha256_hash', sha256Hash)
      .single();

    if (existingVersion) {
      // Return existing version without uploading again
      return NextResponse.json({
        message: 'File already exists as a previous version',
        version: existingVersion,
        deduplicated: true,
      });
    }

    // Get next version number
    const { data: nextVerData } = await supabase
      .rpc('get_next_pdf_version_number', { p_document_id: documentId });

    const versionNumber = nextVerData || 1;

    // Build storage path: {documentId}/{versionNumber}/{filename}
    const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${documentId}/${versionNumber}/${safeFilename}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('pdf-library')
      .upload(storagePath, buffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file', details: uploadError.message },
        { status: 500 }
      );
    }

    // Create version record
    const { data: version, error: versionError } = await supabase
      .from('pdf_document_versions')
      .insert({
        document_id: documentId,
        version_number: versionNumber,
        storage_path: storagePath,
        original_filename: file.name,
        file_size_bytes: file.size,
        mime_type: file.type,
        sha256_hash: sha256Hash,
        change_note: changeNote?.trim() || null,
        created_by: userId,
      })
      .select()
      .single();

    if (versionError) {
      console.error('Version creation error:', versionError);
      // Try to clean up uploaded file
      await supabase.storage.from('pdf-library').remove([storagePath]);
      return NextResponse.json(
        { error: 'Failed to create version record', details: versionError.message },
        { status: 500 }
      );
    }

    // Update document: set current_version_id and increment version_count
    const { error: updateError } = await supabase
      .from('pdf_documents')
      .update({
        current_version_id: version.id,
        version_count: versionNumber,
        updated_by: userId,
      })
      .eq('id', documentId);

    if (updateError) {
      console.error('Document update error:', updateError);
      // Version was created, so don't fail completely
    }

    return NextResponse.json({
      message: 'File uploaded successfully',
      document_id: documentId,
      version,
    }, { status: 201 });
  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
