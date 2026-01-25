/**
 * GET /api/applications/:id
 * Fetch a single application by ID
 *
 * DELETE /api/applications/:id
 * Delete an application (HARD DELETE)
 * - Always performs hard delete regardless of commercial linkage
 * - Deletes all vault items (specs, notes, attachments, scope_lines) first
 * - No soft delete - once deleted, gone forever
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

    // Note: Commercial linkage check removed - always allow hard delete (v1.x FIRE requirement)
    // The application will be permanently deleted regardless of Quote/SO linkage

    // Check for vault references to clean up before delete
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
