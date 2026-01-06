/**
 * POST /api/recipes/[id]/promote
 *
 * Promote an application snapshot to a CI fixture (recipe).
 * This sets is_fixture = true and updates the tier to 'regression' by default.
 *
 * Body (optional):
 *   - name: string (optional - rename on promote)
 *   - tier: 'smoke' | 'regression' | 'edge' | 'longtail' (default: 'regression')
 *
 * Idempotent: If already a fixture, returns success with message.
 *
 * Requires: ENGINEER or ADMIN role (when auth is implemented)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '../../../../../src/lib/supabase/client';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 503 }
      );
    }

    const { id } = await params;

    // Parse optional body
    let body: { name?: string; tier?: string } = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is fine
    }

    const { name, tier } = body;

    // Validate tier if provided
    const validTiers = ['smoke', 'regression', 'edge', 'longtail'];
    if (tier && !validTiers.includes(tier)) {
      return NextResponse.json(
        { error: `Invalid tier. Must be one of: ${validTiers.join(', ')}` },
        { status: 400 }
      );
    }

    // Fetch current record
    const { data: current, error: fetchError } = await supabase
      .from('calc_recipes')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Record not found' }, { status: 404 });
      }
      console.error('Fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch record', details: fetchError.message },
        { status: 500 }
      );
    }

    // Idempotent: if already a fixture, return success
    if (current.is_fixture === true) {
      return NextResponse.json({
        message: 'Already a recipe (fixture)',
        recipe: current,
        already_promoted: true,
      });
    }

    // Build update payload
    const updatePayload: Record<string, unknown> = {
      is_fixture: true,
      recipe_tier: tier || 'regression',
      recipe_status: 'active',
      updated_at: new Date().toISOString(),
    };

    // Optionally rename
    if (name && typeof name === 'string' && name.trim()) {
      updatePayload.name = name.trim();
    } else if (current.name) {
      // Auto-suggest name with "(Promoted)" suffix if it looks like an application
      const currentName = current.name as string;
      if (
        currentName.startsWith('SALES_ORDER') ||
        currentName.startsWith('QUOTE') ||
        currentName.startsWith('SO') ||
        currentName.match(/^Q\d+/)
      ) {
        updatePayload.name = `${currentName} (Promoted)`;
      }
    }

    // Add promotion note
    const timestamp = new Date().toISOString();
    const existingNotes = current.notes || '';
    const promotionNote = `[${timestamp}] Promoted from application snapshot to CI fixture.`;
    updatePayload.notes = existingNotes
      ? `${existingNotes}\n\n${promotionNote}`
      : promotionNote;

    // Update the record
    const { data: promoted, error: updateError } = await supabase
      .from('calc_recipes')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Promote error:', updateError);
      return NextResponse.json(
        { error: 'Failed to promote to recipe', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Successfully promoted to recipe',
      recipe: promoted,
      already_promoted: false,
    });
  } catch (error) {
    console.error('Promote API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
