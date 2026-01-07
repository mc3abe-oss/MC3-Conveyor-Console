/**
 * POST /api/library/upload/finalize
 * Create document/version metadata after direct-to-storage upload
 *
 * This is called after the frontend uploads a file directly to Supabase
 * Storage using a signed URL from /api/library/upload-url.
 *
 * Request body:
 *   - storagePath: path where file was uploaded (required)
 *   - filename: original filename (required)
 *   - fileSize: file size in bytes (required)
 *   - title: document title (required for new documents)
 *   - description: document description (optional)
 *   - department: department (optional)
 *   - documentId: existing document ID (for new version)
 *   - changeNote: version change note (optional)
 *
 * Response: { document_id, version_id, version_number }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../src/lib/supabase/server';
import { requireBeltAdmin } from '../../../../../src/lib/auth/require';
import crypto from 'crypto';

const BUCKET_NAME = 'pdf-library';

export async function POST(request: NextRequest) {
  try {
    // Require admin access
    const authResult = await requireBeltAdmin();
    if (authResult.response) {
      return authResult.response;
    }

    const supabase = await createClient();
    const body = await request.json();

    const {
      storagePath,
      filename,
      fileSize,
      title,
      description,
      department,
      documentId,
      changeNote,
    } = body;

    // Validate required fields
    if (!storagePath || typeof storagePath !== 'string') {
      return NextResponse.json(
        { error: 'Storage path is required' },
        { status: 400 }
      );
    }

    if (!filename || typeof filename !== 'string') {
      return NextResponse.json(
        { error: 'Filename is required' },
        { status: 400 }
      );
    }

    if (!fileSize || typeof fileSize !== 'number') {
      return NextResponse.json(
        { error: 'File size is required' },
        { status: 400 }
      );
    }

    // Verify the file exists in storage
    const { data: fileData, error: fileError } = await supabase
      .storage
      .from(BUCKET_NAME)
      .download(storagePath);

    if (fileError || !fileData) {
      console.error('File verification error:', fileError);
      return NextResponse.json(
        { error: 'File not found in storage. Upload may have failed.' },
        { status: 400 }
      );
    }

    // Verify it's a PDF
    const buffer = Buffer.from(await fileData.arrayBuffer());
    const isPdf = buffer.slice(0, 5).toString() === '%PDF-';
    if (!isPdf) {
      // Delete the invalid file
      await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
      return NextResponse.json(
        { error: 'Uploaded file is not a valid PDF' },
        { status: 400 }
      );
    }

    // Compute SHA-256 hash for deduplication
    const sha256Hash = crypto.createHash('sha256').update(buffer).digest('hex');

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    let targetDocumentId = documentId;
    let versionNumber = 1;

    // If new version of existing document
    if (documentId) {
      const { data: existingDoc, error: docError } = await supabase
        .from('pdf_documents')
        .select('id, version_count')
        .eq('id', documentId)
        .is('deleted_at', null)
        .single();

      if (docError || !existingDoc) {
        // Clean up uploaded file
        await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        );
      }

      versionNumber = (existingDoc.version_count || 0) + 1;
    } else {
      // Create new document
      if (!title?.trim()) {
        // Clean up uploaded file
        await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
        return NextResponse.json(
          { error: 'Title is required for new documents' },
          { status: 400 }
        );
      }

      const { data: newDoc, error: createError } = await supabase
        .from('pdf_documents')
        .insert({
          title: title.trim(),
          description: description?.trim() || null,
          department: department?.trim() || null,
          status: 'draft',
          created_by: userId,
          updated_by: userId,
        })
        .select('id')
        .single();

      if (createError) {
        // Clean up uploaded file
        await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
        console.error('Document creation error:', createError);
        return NextResponse.json(
          { error: 'Failed to create document', details: createError.message },
          { status: 500 }
        );
      }

      targetDocumentId = newDoc.id;
    }

    // Create version record
    const { data: version, error: versionError } = await supabase
      .from('pdf_document_versions')
      .insert({
        document_id: targetDocumentId,
        version_number: versionNumber,
        storage_path: storagePath,
        original_filename: filename,
        file_size: fileSize,
        mime_type: 'application/pdf',
        sha256_hash: sha256Hash,
        change_note: changeNote?.trim() || null,
        uploaded_by: userId,
      })
      .select('id, version_number')
      .single();

    if (versionError) {
      console.error('Version creation error:', versionError);
      // Don't delete the file - it's already in storage
      return NextResponse.json(
        { error: 'Failed to create version record', details: versionError.message },
        { status: 500 }
      );
    }

    // Update document with current version
    const { error: updateError } = await supabase
      .from('pdf_documents')
      .update({
        current_version_id: version.id,
        version_count: versionNumber,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq('id', targetDocumentId);

    if (updateError) {
      console.error('Document update error:', updateError);
      // Non-fatal - version was created
    }

    return NextResponse.json({
      document_id: targetDocumentId,
      version_id: version.id,
      version_number: version.version_number,
      storage_path: storagePath,
    });
  } catch (error) {
    console.error('Upload finalize API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
