/**
 * GET /api/library/documents/[id]
 * Get a single PDF document with versions
 *
 * Response includes:
 * - Document metadata
 * - Current version details
 * - Version history
 * - Tags
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../src/lib/supabase/server';
import { requireAuth, requireBeltAdmin } from '../../../../../src/lib/auth/require';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    // Require authentication
    const authResult = await requireAuth();
    if (authResult.response) {
      return authResult.response;
    }

    const { id } = await params;
    const supabase = await createClient();

    // Check if user is admin
    const adminResult = await requireBeltAdmin();
    const isAdmin = !adminResult.response;

    // Fetch document with versions and tags
    let query = supabase
      .from('pdf_documents')
      .select(`
        *,
        pdf_document_versions (
          id,
          version_number,
          storage_path,
          original_filename,
          file_size_bytes,
          mime_type,
          sha256_hash,
          page_count,
          change_note,
          created_at,
          created_by
        ),
        pdf_document_tags (
          tag:pdf_tags (
            id,
            name,
            color,
            description
          )
        )
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    const { data: document, error } = await query;

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }
      console.error('Document fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch document', details: error.message },
        { status: 500 }
      );
    }

    // Check access: non-admins can only see published documents
    if (!isAdmin && document.status !== 'published') {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Sort versions by version_number descending
    const versions = (document.pdf_document_versions || [])
      .sort((a: { version_number: number }, b: { version_number: number }) =>
        b.version_number - a.version_number
      );

    // Extract current version
    const currentVersion = versions.find(
      (v: { id: string }) => v.id === document.current_version_id
    ) || versions[0] || null;

    // Extract and flatten tags
    const tags = (document.pdf_document_tags || [])
      .map((jt: { tag: { id: string; name: string; color: string; description: string | null } | null }) => jt.tag)
      .filter((t: { id: string; name: string; color: string; description: string | null } | null) => t !== null);

    return NextResponse.json({
      id: document.id,
      title: document.title,
      description: document.description,
      department: document.department,
      status: document.status,
      version_count: document.version_count,
      created_at: document.created_at,
      created_by: document.created_by,
      updated_at: document.updated_at,
      published_at: document.published_at,
      archived_at: document.archived_at,
      current_version: currentVersion,
      versions,
      tags,
    });
  } catch (error) {
    console.error('Document detail API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/library/documents/[id]
 * Update document metadata (admin only)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // Require admin access
    const authResult = await requireBeltAdmin();
    if (authResult.response) {
      return authResult.response;
    }

    const { id } = await params;
    const supabase = await createClient();
    const body = await request.json();

    // Get current user ID
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    // Extract update fields
    const { title, description, department, status, tagIds } = body;

    // Build update object
    const updates: Record<string, unknown> = {
      updated_by: userId,
    };

    if (title !== undefined) {
      if (!title.trim()) {
        return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
      }
      updates.title = title.trim();
    }

    if (description !== undefined) {
      updates.description = description?.trim() || null;
    }

    if (department !== undefined) {
      updates.department = department?.trim() || null;
    }

    if (status !== undefined) {
      const validStatuses = ['draft', 'published', 'archived'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updates.status = status;

      // Set published_at/archived_at timestamps
      if (status === 'published') {
        updates.published_at = new Date().toISOString();
        updates.published_by = userId;
      } else if (status === 'archived') {
        updates.archived_at = new Date().toISOString();
        updates.archived_by = userId;
      }
    }

    // Update document
    const { data: document, error: updateError } = await supabase
      .from('pdf_documents')
      .update(updates)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }
      console.error('Document update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update document', details: updateError.message },
        { status: 500 }
      );
    }

    // Update tags if provided
    if (tagIds !== undefined && Array.isArray(tagIds)) {
      // Remove existing tags
      await supabase
        .from('pdf_document_tags')
        .delete()
        .eq('document_id', id);

      // Add new tags
      if (tagIds.length > 0) {
        const tagInserts = tagIds.map((tagId: string) => ({
          document_id: id,
          tag_id: tagId,
          created_by: userId,
        }));

        await supabase
          .from('pdf_document_tags')
          .insert(tagInserts);
      }
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error('Update document API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/library/documents/[id]
 * Soft delete a document (admin only)
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    // Require admin access
    const authResult = await requireBeltAdmin();
    if (authResult.response) {
      return authResult.response;
    }

    const { id } = await params;
    const supabase = await createClient();

    // Get current user ID
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    // Soft delete by setting deleted_at
    const { error: deleteError } = await supabase
      .from('pdf_documents')
      .update({
        deleted_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq('id', id)
      .is('deleted_at', null);

    if (deleteError) {
      console.error('Document delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete document', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete document API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
