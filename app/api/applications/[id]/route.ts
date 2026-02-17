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
import { createLogger } from '../../../../src/lib/logger';
import { ErrorCodes } from '../../../../src/lib/logger/error-codes';
import { ApplicationIdSchema } from '../../../../src/lib/schemas/api/application-id.schema';

const logger = createLogger().child({ module: 'api.applications-id' });

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const parsed = ApplicationIdSchema.safeParse(id);
    if (!parsed.success) {
      logger.warn('api.applications-id.get.validation.failed', {
        errorCode: ErrorCodes.VALIDATION_SCHEMA_FAILED,
        issues: parsed.error.issues.slice(0, 5),
      });
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

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
    logger.error('api.applications-id.get.failed', { errorCode: ErrorCodes.API_INTERNAL_ERROR, error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const parsed = ApplicationIdSchema.safeParse(id);
    if (!parsed.success) {
      logger.warn('api.applications-id.delete.validation.failed', {
        errorCode: ErrorCodes.VALIDATION_SCHEMA_FAILED,
        issues: parsed.error.issues.slice(0, 5),
      });
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

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
      logger.info('api.applications-id.delete-vault-items', { applicationId: id, referenceTypes });
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
      logger.error('api.applications-id.hard-delete.failed', { errorCode: ErrorCodes.DB_DELETE_FAILED, error: deleteError });
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
    logger.error('api.applications-id.delete.failed', { errorCode: ErrorCodes.API_INTERNAL_ERROR, error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
