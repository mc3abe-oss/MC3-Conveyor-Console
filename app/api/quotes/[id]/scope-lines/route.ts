/**
 * GET /api/quotes/[id]/scope-lines
 * List all scope lines for a quote
 *
 * POST /api/quotes/[id]/scope-lines
 * Add a scope line to a quote
 *
 * PATCH /api/quotes/[id]/scope-lines
 * Update a scope line (increments version)
 *
 * DELETE /api/quotes/[id]/scope-lines
 * Soft delete a scope line
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, getCurrentUserId } from '../../../../../src/lib/supabase/server';
import { ScopeCategory, ScopeInclusion } from '../../../../../src/lib/database/quote-types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const validCategories: ScopeCategory[] = [
  'mechanical', 'electrical', 'controls', 'installation',
  'documentation', 'training', 'warranty', 'exclusion', 'other'
];

const validInclusions: ScopeInclusion[] = ['included', 'excluded'];

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: scopeLines, error } = await supabase
      .from('scope_lines')
      .select('*')
      .eq('parent_type', 'quote')
      .eq('parent_id', id)
      .is('deleted_at', null)
      .order('position', { ascending: true });

    if (error) {
      console.error('Scope lines fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch scope lines', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(scopeLines || []);
  } catch (error) {
    console.error('Scope lines GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const userId = await getCurrentUserId();

    // Check if quote exists and is not read-only
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('is_read_only')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    if (quote.is_read_only) {
      return NextResponse.json(
        { error: 'Quote is read-only (already converted)' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { category, text, inclusion, position } = body;

    // Validate required fields
    if (!category || !validCategories.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
        { status: 400 }
      );
    }

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    if (inclusion && !validInclusions.includes(inclusion)) {
      return NextResponse.json(
        { error: `Invalid inclusion. Must be one of: ${validInclusions.join(', ')}` },
        { status: 400 }
      );
    }

    // Get next position if not specified
    let nextPosition = position;
    if (nextPosition === undefined) {
      const { data: maxPos } = await supabase
        .from('scope_lines')
        .select('position')
        .eq('parent_type', 'quote')
        .eq('parent_id', id)
        .is('deleted_at', null)
        .order('position', { ascending: false })
        .limit(1)
        .single();

      nextPosition = (maxPos?.position ?? -1) + 1;
    }

    const { data: scopeLine, error } = await supabase
      .from('scope_lines')
      .insert({
        parent_type: 'quote',
        parent_id: id,
        category,
        text: text.trim(),
        inclusion: inclusion || 'included',
        position: nextPosition,
        version: 1,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      console.error('Scope line create error:', error);
      return NextResponse.json(
        { error: 'Failed to create scope line', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(scopeLine, { status: 201 });
  } catch (error) {
    console.error('Scope lines POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const scopeLineId = searchParams.get('scope_line_id');

    if (!scopeLineId) {
      return NextResponse.json({ error: 'scope_line_id query param required' }, { status: 400 });
    }

    // Check if quote is not read-only
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('is_read_only')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    if (quote.is_read_only) {
      return NextResponse.json(
        { error: 'Quote is read-only (already converted)' },
        { status: 403 }
      );
    }

    // Get current scope line
    const { data: existing, error: fetchError } = await supabase
      .from('scope_lines')
      .select('*')
      .eq('id', scopeLineId)
      .eq('parent_id', id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Scope line not found' }, { status: 404 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.category !== undefined) {
      if (!validCategories.includes(body.category)) {
        return NextResponse.json(
          { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
          { status: 400 }
        );
      }
      updates.category = body.category;
    }

    if (body.text !== undefined) {
      if (typeof body.text !== 'string' || !body.text.trim()) {
        return NextResponse.json({ error: 'text cannot be empty' }, { status: 400 });
      }
      updates.text = body.text.trim();
    }

    if (body.inclusion !== undefined) {
      if (!validInclusions.includes(body.inclusion)) {
        return NextResponse.json(
          { error: `Invalid inclusion. Must be one of: ${validInclusions.join(', ')}` },
          { status: 400 }
        );
      }
      updates.inclusion = body.inclusion;
    }

    if (body.position !== undefined) {
      updates.position = body.position;
    }

    // Increment version
    updates.version = existing.version + 1;
    updates.updated_at = new Date().toISOString();

    const { data: scopeLine, error } = await supabase
      .from('scope_lines')
      .update(updates)
      .eq('id', scopeLineId)
      .select()
      .single();

    if (error) {
      console.error('Scope line update error:', error);
      return NextResponse.json(
        { error: 'Failed to update scope line', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(scopeLine);
  } catch (error) {
    console.error('Scope lines PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const scopeLineId = searchParams.get('scope_line_id');

    if (!scopeLineId) {
      return NextResponse.json({ error: 'scope_line_id query param required' }, { status: 400 });
    }

    // Check if quote is not read-only
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('is_read_only')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    if (quote.is_read_only) {
      return NextResponse.json(
        { error: 'Quote is read-only (already converted)' },
        { status: 403 }
      );
    }

    // Soft delete
    const { error } = await supabase
      .from('scope_lines')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', scopeLineId)
      .eq('parent_id', id);

    if (error) {
      console.error('Scope line delete error:', error);
      return NextResponse.json(
        { error: 'Failed to delete scope line', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Scope lines DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
