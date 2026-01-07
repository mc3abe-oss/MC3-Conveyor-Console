/**
 * POST /api/library/search
 * Search documents by content (stub for future RAG)
 *
 * Currently searches title/description/tags.
 * Phase 2 will add vector search on pdf_chunks + pdf_embeddings.
 *
 * Request body:
 *   - query: search text (required)
 *   - department: filter by department (optional)
 *   - tags: array of tag IDs (optional)
 *   - limit: max results (default: 20)
 *
 * Response: { data: SearchResult[], total: number }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../src/lib/supabase/server';
import { requireAuth, requireBeltAdmin } from '../../../../src/lib/auth/require';

interface SearchResult {
  id: string;
  title: string;
  description: string | null;
  department: string | null;
  status: string;
  relevance_score: number;
  matched_in: string[];  // e.g., ['title', 'description']
  snippet?: string;      // Future: text excerpt from matched chunk
}

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuth();
    if (authResult.response) {
      return authResult.response;
    }

    const supabase = await createClient();
    const body = await request.json();

    const { query, department, tags, limit = 20 } = body;

    if (!query?.trim()) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    const searchTerm = query.trim().toLowerCase();
    const maxResults = Math.min(100, Math.max(1, limit));

    // Check if user is admin
    const adminResult = await requireBeltAdmin();
    const isAdmin = !adminResult.response;

    // Build base query
    let dbQuery = supabase
      .from('pdf_documents')
      .select(`
        id,
        title,
        description,
        department,
        status,
        pdf_document_tags (
          tag:pdf_tags (
            id,
            name
          )
        )
      `)
      .is('deleted_at', null);

    // Non-admins only see published
    if (!isAdmin) {
      dbQuery = dbQuery.eq('status', 'published');
    }

    // Department filter
    if (department) {
      dbQuery = dbQuery.eq('department', department);
    }

    // Execute query
    const { data: documents, error } = await dbQuery;

    if (error) {
      console.error('Search query error:', error);
      return NextResponse.json(
        { error: 'Search failed', details: error.message },
        { status: 500 }
      );
    }

    // Score and filter results
    const results: SearchResult[] = [];

    for (const doc of documents || []) {
      const matchedIn: string[] = [];
      let score = 0;

      // Check title match
      const titleLower = doc.title?.toLowerCase() || '';
      if (titleLower.includes(searchTerm)) {
        matchedIn.push('title');
        score += 10; // Title matches are highly weighted
        if (titleLower.startsWith(searchTerm)) {
          score += 5; // Bonus for prefix match
        }
      }

      // Check description match
      const descLower = doc.description?.toLowerCase() || '';
      if (descLower.includes(searchTerm)) {
        matchedIn.push('description');
        score += 5;
      }

      // Check tag name match
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const docTags = (doc.pdf_document_tags || [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((jt: any) => jt.tag)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((t: any): t is { id: string; name: string } => t !== null);

      for (const tag of docTags) {
        if (tag.name.toLowerCase().includes(searchTerm)) {
          matchedIn.push(`tag:${tag.name}`);
          score += 3;
        }
      }

      // Only include if there's at least one match
      if (matchedIn.length > 0) {
        results.push({
          id: doc.id,
          title: doc.title,
          description: doc.description,
          department: doc.department,
          status: doc.status,
          relevance_score: score,
          matched_in: matchedIn,
        });
      }
    }

    // Filter by tags if specified
    let filteredResults = results;
    if (tags && Array.isArray(tags) && tags.length > 0) {
      const tagIds = new Set(tags);
      filteredResults = results.filter(r => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const doc = documents?.find((d: any) => d.id === r.id);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const docTags = (doc?.pdf_document_tags || [])
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((jt: any) => jt.tag)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((t: any): t is { id: string } => t !== null);
        return docTags.some((t: { id: string }) => tagIds.has(t.id));
      });
    }

    // Sort by relevance score descending
    filteredResults.sort((a, b) => b.relevance_score - a.relevance_score);

    // Limit results
    const limitedResults = filteredResults.slice(0, maxResults);

    return NextResponse.json({
      data: limitedResults,
      total: filteredResults.length,
      // Phase 2: will include semantic search results from pdf_chunks
      search_mode: 'keyword',  // Will become 'semantic' or 'hybrid' in Phase 2
    });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
