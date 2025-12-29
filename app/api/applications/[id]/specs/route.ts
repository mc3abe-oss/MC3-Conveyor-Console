/**
 * GET /api/applications/[id]/specs
 * List specs for an application
 *
 * Query params:
 *   - current_only: 'true' to only return is_current=true specs (default)
 *   - key: filter by spec key
 *
 * POST /api/applications/[id]/specs
 * Create or update a spec (creates new row, marks previous as not current)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, getCurrentUserId } from '../../../../../src/lib/supabase/server';
import { SpecConfidence, SpecSourceType } from '../../../../../src/lib/database/quote-types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const currentOnly = searchParams.get('current_only') !== 'false';
    const keyFilter = searchParams.get('key');

    // Verify application exists
    const { data: app, error: appError } = await supabase
      .from('calc_recipes')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (appError || !app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    let query = supabase
      .from('specs')
      .select('*')
      .eq('application_id', id)
      .order('created_at', { ascending: false });

    if (currentOnly) {
      query = query.eq('is_current', true);
    }

    if (keyFilter) {
      query = query.eq('key', keyFilter);
    }

    const { data: specs, error } = await query;

    if (error) {
      console.error('Specs fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch specs', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(specs || []);
  } catch (error) {
    console.error('Specs GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const userId = await getCurrentUserId();

    // Verify application exists
    const { data: app, error: appError } = await supabase
      .from('calc_recipes')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (appError || !app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const body = await request.json();
    const { key, value, units, confidence, source_type, source_id } = body;

    // Validate required fields
    if (!key || typeof key !== 'string' || !key.trim()) {
      return NextResponse.json({ error: 'key is required' }, { status: 400 });
    }

    if (value === undefined || value === null) {
      return NextResponse.json({ error: 'value is required' }, { status: 400 });
    }

    // Validate enums
    const validConfidence: SpecConfidence[] = ['estimated', 'confirmed'];
    if (confidence && !validConfidence.includes(confidence)) {
      return NextResponse.json(
        { error: `Invalid confidence. Must be one of: ${validConfidence.join(', ')}` },
        { status: 400 }
      );
    }

    const validSourceTypes: SpecSourceType[] = ['note', 'attachment', 'other'];
    if (source_type && !validSourceTypes.includes(source_type)) {
      return NextResponse.json(
        { error: `Invalid source_type. Must be one of: ${validSourceTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Mark any existing current spec for this key as not current
    await supabase
      .from('specs')
      .update({ is_current: false })
      .eq('application_id', id)
      .eq('key', key.trim())
      .eq('is_current', true);

    // Insert the new spec
    const { data: spec, error } = await supabase
      .from('specs')
      .insert({
        application_id: id,
        parent_type: 'application', // For backward compat, set a parent type
        parent_id: id,
        key: key.trim(),
        value: String(value),
        units: units || null,
        confidence: confidence || 'estimated',
        source_type: source_type || null,
        source_id: source_id || null,
        is_current: true,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      console.error('Spec create error:', error);
      return NextResponse.json(
        { error: 'Failed to create spec', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(spec, { status: 201 });
  } catch (error) {
    console.error('Specs POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
