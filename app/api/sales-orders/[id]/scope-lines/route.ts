/**
 * GET /api/sales-orders/[id]/scope-lines
 * List all scope lines for a sales order
 *
 * POST /api/sales-orders/[id]/scope-lines
 * Add a scope line
 *
 * PATCH /api/sales-orders/[id]/scope-lines?scope_line_id=xxx
 * Update a scope line (increments version)
 *
 * DELETE /api/sales-orders/[id]/scope-lines?scope_line_id=xxx
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
      .eq('parent_type', 'sales_order')
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

    // Check if sales order exists
    const { data: so, error: soError } = await supabase
      .from('sales_orders')
      .select('id')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (soError || !so) {
      return NextResponse.json({ error: 'Sales order not found' }, { status: 404 });
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
        .eq('parent_type', 'sales_order')
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
        parent_type: 'sales_order',
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

    // Check if sales order exists
    const { data: so, error: soError } = await supabase
      .from('sales_orders')
      .select('id')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (soError || !so) {
      return NextResponse.json({ error: 'Sales order not found' }, { status: 404 });
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

    // Check if sales order exists
    const { data: so, error: soError } = await supabase
      .from('sales_orders')
      .select('id')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (soError || !so) {
      return NextResponse.json({ error: 'Sales order not found' }, { status: 404 });
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
