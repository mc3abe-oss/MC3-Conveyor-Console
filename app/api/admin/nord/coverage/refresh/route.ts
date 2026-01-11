/**
 * NORD Coverage Refresh API
 *
 * POST: Regenerate coverage analysis
 *
 * This clears existing coverage data and re-runs all test cases through
 * the BOM resolver. Only belt admins can trigger this.
 */

import { NextResponse } from 'next/server';
import { createClient } from '../../../../../../src/lib/supabase/server';
import { requireBeltAdmin } from '../../../../../../src/lib/auth/require';
import { generateCoverage } from '../../../../../../src/lib/nord/coverage';

export async function POST() {
  try {
    // Check belt admin access using the standard helper
    const authResult = await requireBeltAdmin();
    if (authResult.response) {
      return authResult.response;
    }

    const supabase = await createClient();

    console.log('[Coverage Refresh] Starting regeneration triggered by', authResult.user.email);

    // Generate coverage (this may take a few seconds)
    const result = await generateCoverage(supabase);

    console.log('[Coverage Refresh] Complete:', result.summary);

    // Check for insert errors
    if (result.errors && result.errors.length > 0) {
      console.error('[Coverage Refresh] Insert errors:', result.errors);
      return NextResponse.json({
        success: false,
        summary: result.summary,
        error: `Coverage generated but insert failed: ${result.errors[0]}`,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      summary: result.summary,
    });
  } catch (err) {
    console.error('[NORD Coverage Refresh API] POST exception:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
