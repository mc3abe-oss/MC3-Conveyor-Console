/**
 * DELETE /api/applications/:id/delete-quote-line
 *
 * Delete the Quote line linkage from an application.
 * - If application is ALSO linked to a Sales Order: deactivate (is_active=false)
 * - If application is ONLY linked to this Quote: hard delete
 *
 * This is the SERVER TRUTH for delete eligibility based on DB FK columns.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, getCurrentUserId } from '../../../../../src/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const userId = await getCurrentUserId();

    // Fetch the application with linkage columns
    const { data: application, error: fetchError } = await supabase
      .from('calc_recipes')
      .select('id, name, quote_id, sales_order_id, deleted_at, is_active')
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

    // Verify this application is linked to a Quote
    if (!application.quote_id) {
      return NextResponse.json(
        { error: 'Application is not linked to a Quote' },
        { status: 400 }
      );
    }

    // Check if application is ALSO linked to a Sales Order
    const isAlsoLinkedToSO = !!application.sales_order_id;

    if (isAlsoLinkedToSO) {
      // Application is referenced by both - deactivate instead of delete
      const { error: updateError } = await supabase
        .from('calc_recipes')
        .update({
          is_active: false,
          deleted_at: new Date().toISOString(),
          deleted_by: userId,
          quote_id: null, // Remove the quote linkage
        })
        .eq('id', id);

      if (updateError) {
        console.error('Deactivate error:', updateError);
        return NextResponse.json(
          { error: 'Failed to deactivate application', details: updateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        mode: 'deactivated',
        message: `Quote line removed. Application "${application.name}" deactivated (still linked to Sales Order).`,
      });
    } else {
      // Application is ONLY linked to this Quote - hard delete

      // First delete vault items (cascade)
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

      if (hasSpecs || hasNotes || hasAttachments || hasScopeLines) {
        await Promise.all([
          hasSpecs && supabase.from('specs').delete().eq('application_id', id),
          hasNotes && supabase.from('notes').delete().eq('application_id', id),
          hasAttachments && supabase.from('attachments').delete().eq('application_id', id),
          hasScopeLines && supabase.from('scope_lines').delete().eq('application_id', id),
        ]);
      }

      // Hard delete the application
      const { error: deleteError } = await supabase
        .from('calc_recipes')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('Hard delete error:', deleteError);
        return NextResponse.json(
          { error: 'Failed to delete application', details: deleteError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        mode: 'hard_deleted',
        message: `Quote line and application "${application.name}" permanently deleted.`,
      });
    }
  } catch (error) {
    console.error('Delete quote line error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
