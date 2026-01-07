/**
 * GET /api/library/tags
 * List all PDF tags
 *
 * Response: { data: Tag[] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../src/lib/supabase/server';
import { requireAuth, requireBeltAdmin } from '../../../../src/lib/auth/require';

export async function GET(_request: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuth();
    if (authResult.response) {
      return authResult.response;
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('pdf_tags')
      .select('id, name, description, color, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Tags fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tags', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('Tags API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/library/tags
 * Create a new tag (admin only)
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

    // Get current user ID
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    const { name, description, color } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const { data: tag, error } = await supabase
      .from('pdf_tags')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        color: color || '#6B7280',
        created_by: userId,
        updated_by: userId,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Tag with this name already exists' },
          { status: 409 }
        );
      }
      console.error('Tag creation error:', error);
      return NextResponse.json(
        { error: 'Failed to create tag', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    console.error('Create tag API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
