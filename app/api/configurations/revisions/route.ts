/**
 * GET /api/configurations/revisions
 *
 * Get list of revisions for a configuration
 * Query params:
 *   - configuration_id: Required UUID
 *   - include_data: Optional boolean - if true, includes full inputs/application/outputs
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../src/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const configuration_id = searchParams.get('configuration_id');
    const includeData = searchParams.get('include_data') === 'true';

    if (!configuration_id) {
      return NextResponse.json(
        { error: 'Missing required query parameter: configuration_id' },
        { status: 400 }
      );
    }

    // First, get the configuration details
    const { data: configuration, error: configError } = await supabase
      .from('configurations')
      .select('id, reference_type, reference_number, reference_line, model_key, title, created_at, updated_at')
      .eq('id', configuration_id)
      .single();

    if (configError) {
      console.error('Configuration fetch error:', configError);
      return NextResponse.json(
        { error: 'Configuration not found', details: configError.message },
        { status: 404 }
      );
    }

    // Build select clause based on include_data flag
    const selectClause = includeData
      ? 'id, revision_number, created_at, created_by_user_id, change_note, inputs_json, application_json, outputs_json'
      : 'id, revision_number, created_at, created_by_user_id, change_note';

    // Get all revisions for this configuration
    const { data: revisions, error } = await supabase
      .from('configuration_revisions')
      .select(selectClause)
      .eq('configuration_id', configuration_id)
      .order('revision_number', { ascending: false });

    if (error) {
      console.error('Revisions fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to load revisions', details: error.message },
        { status: 500 }
      );
    }

    // If we have full data, compute diffs between consecutive revisions
    if (includeData && revisions && revisions.length > 1) {
      for (let i = 0; i < revisions.length - 1; i++) {
        const current = revisions[i] as any;
        const previous = revisions[i + 1] as any;

        const diff_summary = computeDiff(previous, current);
        current.diff_summary = diff_summary;
      }
    }

    return NextResponse.json({ configuration, revisions });
  } catch (error) {
    console.error('Get revisions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Compute shallow diff between two revisions
 */
function computeDiff(
  prev: { inputs_json?: any; application_json?: any },
  curr: { inputs_json?: any; application_json?: any }
): { inputs_changed: Array<{ key: string; from: any; to: any }>; application_changed: Array<{ key: string; from: any; to: any }> } {
  const inputs_changed: Array<{ key: string; from: any; to: any }> = [];
  const application_changed: Array<{ key: string; from: any; to: any }> = [];

  // Compare inputs
  const prevInputs = prev.inputs_json || {};
  const currInputs = curr.inputs_json || {};
  const allInputKeys = new Set([...Object.keys(prevInputs), ...Object.keys(currInputs)]);

  allInputKeys.forEach((key) => {
    const from = prevInputs[key];
    const to = currInputs[key];
    if (JSON.stringify(from) !== JSON.stringify(to)) {
      inputs_changed.push({ key, from, to });
    }
  });

  // Compare application fields
  const prevApp = prev.application_json || {};
  const currApp = curr.application_json || {};
  const allAppKeys = new Set([...Object.keys(prevApp), ...Object.keys(currApp)]);

  allAppKeys.forEach((key) => {
    const from = prevApp[key];
    const to = currApp[key];
    if (JSON.stringify(from) !== JSON.stringify(to)) {
      application_changed.push({ key, from, to });
    }
  });

  return { inputs_changed, application_changed };
}
