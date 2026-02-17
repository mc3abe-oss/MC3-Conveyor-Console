/**
 * GET /api/applications/[id]/vault
 * Get all vault data for an application in one call
 *
 * Returns:
 *   - specs: current specs only
 *   - notes: all notes
 *   - attachments: non-deleted attachments
 *   - scope_lines: non-deleted scope lines
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../src/lib/supabase/server';
import { createLogger } from '../../../../../src/lib/logger';
import { ErrorCodes } from '../../../../../src/lib/logger/error-codes';

const logger = createLogger().child({ module: 'api.vault' });

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Verify application exists
    const { data: app, error: appError } = await supabase
      .from('calc_recipes')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (appError || !app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Fetch all vault data in parallel
    const [specsResult, notesResult, attachmentsResult, scopeLinesResult] = await Promise.all([
      supabase
        .from('specs')
        .select('*')
        .eq('application_id', id)
        .eq('is_current', true)
        .order('key', { ascending: true }),
      supabase
        .from('notes')
        .select('*')
        .eq('application_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('attachments')
        .select('*')
        .eq('application_id', id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
      supabase
        .from('scope_lines')
        .select('*')
        .eq('application_id', id)
        .is('deleted_at', null)
        .order('position', { ascending: true }),
    ]);

    // Check for errors
    if (specsResult.error) {
      logger.error('api.vault.specs-fetch.failed', { errorCode: ErrorCodes.DB_QUERY_FAILED, error: specsResult.error });
    }
    if (notesResult.error) {
      logger.error('api.vault.notes-fetch.failed', { errorCode: ErrorCodes.DB_QUERY_FAILED, error: notesResult.error });
    }
    if (attachmentsResult.error) {
      logger.error('api.vault.attachments-fetch.failed', { errorCode: ErrorCodes.DB_QUERY_FAILED, error: attachmentsResult.error });
    }
    if (scopeLinesResult.error) {
      logger.error('api.vault.scope-lines-fetch.failed', { errorCode: ErrorCodes.DB_QUERY_FAILED, error: scopeLinesResult.error });
    }

    return NextResponse.json({
      specs: specsResult.data || [],
      notes: notesResult.data || [],
      attachments: attachmentsResult.data || [],
      scope_lines: scopeLinesResult.data || [],
    });
  } catch (error) {
    logger.error('api.vault.get.failed', { errorCode: ErrorCodes.API_INTERNAL_ERROR, error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
