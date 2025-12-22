/**
 * POST /api/configurations/save
 *
 * Save or update a configuration with a new revision
 * Includes deduplication: identical payloads will not create new revisions
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '../../../../src/lib/supabase/client';
import { getCurrentUserId } from '../../../../src/lib/supabase/server';
import { computePayloadHash, payloadsEqual } from '../../../../src/lib/payload-hash';

interface SaveRequestBody {
  reference_type: 'QUOTE' | 'SALES_ORDER';
  reference_number: string;
  reference_line?: number;
  model_key: string;
  title?: string;
  inputs_json: any;
  parameters_json: any;
  application_json: any;
  outputs_json?: any;
  warnings_json?: any;
  change_note?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        {
          error: 'Supabase not configured',
          message: 'Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
        },
        { status: 503 }
      );
    }

    const body = await request.json() as SaveRequestBody;

    const {
      reference_type,
      reference_number,
      reference_line = 1,
      model_key,
      title,
      inputs_json,
      parameters_json,
      application_json,
      outputs_json,
      warnings_json,
      change_note,
    } = body;

    // Validate required fields
    if (!reference_type || !reference_number || !model_key || !inputs_json) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate reference_number: must be numeric (digits only)
    if (!/^\d+$/.test(reference_number)) {
      return NextResponse.json(
        { error: 'Reference number must be numeric.' },
        { status: 400 }
      );
    }

    // Validate reference_line: must be integer >= 1
    const lineNumber = Number(reference_line);
    if (!Number.isInteger(lineNumber) || lineNumber < 1) {
      return NextResponse.json(
        { error: 'Reference line must be an integer >= 1.' },
        { status: 400 }
      );
    }

    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Compute payload hash for deduplication
    const payload = { inputs_json, parameters_json, application_json };
    const payloadHash = computePayloadHash(payload);

    // Upsert configuration
    const { data: config, error: configError } = await supabase
      .from('configurations')
      .upsert(
        {
          model_key,
          reference_type,
          reference_number,
          reference_line: lineNumber,
          title,
          created_by_user_id: userId,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'reference_type,reference_number,reference_line',
          ignoreDuplicates: false,
        }
      )
      .select()
      .single();

    if (configError) {
      console.error('Configuration upsert error:', configError);
      return NextResponse.json(
        { error: 'Failed to save configuration', details: configError.message },
        { status: 500 }
      );
    }

    // Check for duplicate payload by fetching latest revision
    const { data: latestRevision, error: latestError } = await supabase
      .from('configuration_revisions')
      .select('id, revision_number, payload_hash, inputs_json, parameters_json, application_json')
      .eq('configuration_id', config.id)
      .order('revision_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestError) {
      console.error('Error fetching latest revision:', latestError);
      // Continue anyway - this is just for deduplication
    }

    // Check if payload is identical to latest revision
    if (latestRevision) {
      let isDuplicate = false;

      // If latest revision has payload_hash, compare hashes
      if (latestRevision.payload_hash) {
        isDuplicate = latestRevision.payload_hash === payloadHash;
      } else {
        // Fallback: deep equality check for old revisions without hash
        const latestPayload = {
          inputs_json: latestRevision.inputs_json,
          parameters_json: latestRevision.parameters_json,
          application_json: latestRevision.application_json,
        };
        isDuplicate = payloadsEqual(payload, latestPayload);
      }

      if (isDuplicate) {
        // No change detected - return existing revision without creating new one
        return NextResponse.json({
          status: 'no_change',
          message: 'No changes detected. Revision not created.',
          configuration: config,
          revision: {
            id: latestRevision.id,
            revision_number: latestRevision.revision_number,
          },
        });
      }
    }

    // Get next revision number
    const { data: revisionNumberData, error: revisionNumberError } = await supabase
      .rpc('get_next_revision_number', { p_configuration_id: config.id });

    if (revisionNumberError) {
      console.error('Get next revision number error:', revisionNumberError);
      return NextResponse.json(
        { error: 'Failed to get next revision number', details: revisionNumberError.message },
        { status: 500 }
      );
    }

    const nextRevisionNumber = revisionNumberData as number;

    // Create new revision with payload_hash
    let revision;
    let revisionError;

    try {
      const result = await supabase
        .from('configuration_revisions')
        .insert({
          configuration_id: config.id,
          revision_number: nextRevisionNumber,
          inputs_json,
          parameters_json,
          application_json,
          outputs_json,
          warnings_json,
          payload_hash: payloadHash,
          change_note,
          created_by_user_id: userId,
        })
        .select()
        .single();

      revision = result.data;
      revisionError = result.error;
    } catch (insertError: any) {
      revisionError = insertError;
    }

    if (revisionError) {
      // Check if this is a unique constraint violation on payload_hash
      const errorCode = revisionError.code;
      const errorMessage = revisionError.message || '';
      const isPayloadHashDuplicate =
        errorCode === '23505' &&
        (errorMessage.includes('ux_revision_payload_hash') ||
         errorMessage.includes('idx_configuration_revisions_payload_hash'));

      if (isPayloadHashDuplicate) {
        // Duplicate detected by unique constraint - fetch latest revision
        console.log('Duplicate payload_hash detected by unique constraint');

        const { data: existingRevision } = await supabase
          .from('configuration_revisions')
          .select('id, revision_number, created_at, created_by_user_id')
          .eq('configuration_id', config.id)
          .order('revision_number', { ascending: false })
          .limit(1)
          .single();

        return NextResponse.json({
          status: 'no_change',
          message: 'No changes to save',
          configuration: config,
          revision: existingRevision || {
            id: latestRevision?.id,
            revision_number: latestRevision?.revision_number,
          },
        });
      }

      // Other error - return 500
      console.error('Revision insert error:', revisionError);
      return NextResponse.json(
        { error: 'Failed to create revision', details: revisionError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: 'created',
      configuration: config,
      revision: {
        id: revision.id,
        revision_number: revision.revision_number,
        created_at: revision.created_at,
        created_by_user_id: revision.created_by_user_id,
      },
    });
  } catch (error) {
    console.error('Save configuration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
