/**
 * GET /api/applications/:id
 * Fetch a single application by ID
 *
 * DELETE /api/applications/:id
 * Delete an application
 * - Hard delete only allowed if NO commercial linkage (not linked to Quote/SO)
 * - If linked, returns 409 with message to use deactivate instead
 *
 * Query params for DELETE:
 *   - mode: 'hard' (default) - only works if not linked to Quote/SO
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../src/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: application, error } = await supabase
      .from('calc_recipes')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .eq('is_active', true)
      .single();

    if (error || !application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(application);
  } catch (error) {
    console.error('Application GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch the application with linkage columns
    const { data: application, error: fetchError } = await supabase
      .from('calc_recipes')
      .select('id, name, slug, deleted_at, is_active, quote_id, sales_order_id')
      .eq('id', id)
      .single();

    if (fetchError || !application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Already deleted?
    if (application.deleted_at || application.is_active === false) {
      return NextResponse.json(
        { error: 'Application is already deleted or deactivated' },
        { status: 400 }
      );
    }

    // Check for commercial linkage via DB FK columns (SERVER TRUTH)
    const hasCommercialLinkage = !!(application.quote_id || application.sales_order_id);

    // Hard delete requested - only allowed if no commercial linkage
    if (hasCommercialLinkage) {
      const linkageType = application.quote_id ? 'Quote' : 'Sales Order';
      return NextResponse.json(
        {
          error: `Application is linked to a ${linkageType} and cannot be deleted. Use deactivate instead.`,
          hasCommercialLinkage: true,
          quote_id: application.quote_id || null,
          sales_order_id: application.sales_order_id || null,
        },
        { status: 409 }
      );
    }

    // Check for vault references (additional safety check for hard delete)
    const [specsResult, notesResult, attachmentsResult, scopeLinesResult] = await Promise.all([
      supabase.from('specs').select('id').eq('application_id', id).limit(1),
      supabase.from('notes').select('id').eq('application_id', id).limit(1),
      supabase.from('attachments').select('id').eq('application_id', id).limit(1),
      supabase.from('scope_lines').select('id').eq('application_id', id).limit(1),
    ]);

    const hasSpecs = (specsResult.data?.length || 0) > 0;
    const hasNotes = (notesResult.data?.length || 0) > 0;
    const hasAttachments = (attachmentsResult.data?.length || 0) > 0;
    const hasScopeLines = (scopeLinesResult.data?.length || 0) > 0;
    const hasVaultReferences = hasSpecs || hasNotes || hasAttachments || hasScopeLines;

    // Build reference summary for logging
    const referenceTypes: string[] = [];
    if (hasSpecs) referenceTypes.push('specs');
    if (hasNotes) referenceTypes.push('notes');
    if (hasAttachments) referenceTypes.push('attachments');
    if (hasScopeLines) referenceTypes.push('scope lines');

    // Delete vault items first (cascade delete)
    if (hasVaultReferences) {
      console.log(`[Delete] Deleting vault items for application ${id}: ${referenceTypes.join(', ')}`);
      await Promise.all([
        hasSpecs && supabase.from('specs').delete().eq('application_id', id),
        hasNotes && supabase.from('notes').delete().eq('application_id', id),
        hasAttachments && supabase.from('attachments').delete().eq('application_id', id),
        hasScopeLines && supabase.from('scope_lines').delete().eq('application_id', id),
      ]);
    }

    // Perform hard delete
    const { error: deleteError } = await supabase
      .from('calc_recipes')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Application hard delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete application', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      mode: 'hard',
      message: `Application "${application.name}" permanently deleted.`,
      deletedVaultItems: hasVaultReferences ? referenceTypes : undefined,
    });
  } catch (error) {
    console.error('Application DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
