/**
 * GET /api/library/documents
 * List PDF documents with filters
 *
 * Query params:
 *   - q: text search on title, description (optional)
 *   - department: filter by department (optional)
 *   - tags: comma-separated tag IDs (optional)
 *   - status: 'draft' | 'published' | 'archived' (optional, admin only sees all)
 *   - page: page number, 1-based (default: 1)
 *   - pageSize: items per page (default: 50, max: 100)
 *
 * Response: { data: PdfDocument[], total: number, page: number, pageSize: number }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../src/lib/supabase/server';
import { requireAuth, requireBeltAdmin } from '../../../../src/lib/auth/require';

interface PdfDocumentRow {
  id: string;
  title: string;
  description: string | null;
  department: string | null;
  status: string;
  version_count: number;
  current_version_id: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  published_at: string | null;
  tags?: { id: string; name: string; color: string }[];
}

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuth();
    if (authResult.response) {
      return authResult.response;
    }

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Parse query params
    const searchQuery = searchParams.get('q')?.trim() || '';
    const department = searchParams.get('department') || '';
    const tagsParam = searchParams.get('tags') || '';
    const statusFilter = searchParams.get('status') || '';

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '50', 10)));
    const offset = (page - 1) * pageSize;

    // Check if user is admin (determines what statuses they can see)
    const adminResult = await requireBeltAdmin();
    const isAdmin = !adminResult.response;

    // Build query
    let query = supabase
      .from('pdf_documents')
      .select(`
        id,
        title,
        description,
        department,
        status,
        version_count,
        current_version_id,
        created_at,
        created_by,
        updated_at,
        published_at,
        pdf_document_tags!left (
          tag:pdf_tags (
            id,
            name,
            color
          )
        )
      `, { count: 'exact' })
      .is('deleted_at', null)
      .order('updated_at', { ascending: false });

    // Non-admins can only see published documents
    if (!isAdmin) {
      query = query.eq('status', 'published');
    } else if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    // Department filter
    if (department) {
      query = query.eq('department', department);
    }

    // Search filter (title and description)
    if (searchQuery) {
      query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
    }

    // Pagination
    query = query.range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('PDF documents fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch documents', details: error.message },
        { status: 500 }
      );
    }

    // Transform data to flatten tags
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const documents: PdfDocumentRow[] = (data || []).map((doc: any) => {
      // Extract tags from junction table
      const tags = (doc.pdf_document_tags || [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((jt: any) => jt.tag)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((t: any): t is { id: string; name: string; color: string } => t !== null);

      return {
        id: doc.id,
        title: doc.title,
        description: doc.description,
        department: doc.department,
        status: doc.status,
        version_count: doc.version_count,
        current_version_id: doc.current_version_id,
        created_at: doc.created_at,
        created_by: doc.created_by,
        updated_at: doc.updated_at,
        published_at: doc.published_at,
        tags,
      };
    });

    // Filter by tags if specified (post-query filter for simplicity)
    let filteredDocs = documents;
    if (tagsParam) {
      const tagIds = tagsParam.split(',').map(t => t.trim()).filter(Boolean);
      if (tagIds.length > 0) {
        filteredDocs = documents.filter(doc =>
          doc.tags?.some(tag => tagIds.includes(tag.id))
        );
      }
    }

    return NextResponse.json({
      data: filteredDocs,
      total: count || 0,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('Library documents API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/library/documents
 * Create a new PDF document (metadata only, upload handled separately)
 * Admin only
 */
export async function POST(request: NextRequest) {
  try {
    // Require admin access
    const authResult = await requireBeltAdmin();
    if (authResult.response) {
      return authResult.response;
    }

    const supabase = await createClient();
    const body = await request.json();

    // Validate required fields
    const { title, description, department, status, tagIds } = body;

    if (!title?.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Get current user ID
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    // Create document
    const { data: document, error: docError } = await supabase
      .from('pdf_documents')
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        department: department?.trim() || null,
        status: status || 'draft',
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

    // Add tags if provided
    if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
      const tagInserts = tagIds.map((tagId: string) => ({
        document_id: document.id,
        tag_id: tagId,
        created_by: userId,
      }));

      const { error: tagsError } = await supabase
        .from('pdf_document_tags')
        .insert(tagInserts);

      if (tagsError) {
        console.error('Tags assignment error:', tagsError);
        // Don't fail the whole request, just log
      }
    }

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error('Create document API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
