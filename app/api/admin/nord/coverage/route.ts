/**
 * NORD Coverage API
 *
 * GET: Retrieve coverage summary and cases
 */

import { NextResponse } from 'next/server';
import { createClient } from '../../../../../src/lib/supabase/server';
import {
  getCoverageSummary,
  getCoverageCases,
  type CoverageStatus,
} from '../../../../../src/lib/nord/coverage';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') as CoverageStatus | null;

    // Get summary and cases in parallel
    const [summary, cases] = await Promise.all([
      getCoverageSummary(supabase),
      getCoverageCases(supabase, statusFilter || undefined),
    ]);

    return NextResponse.json({
      summary: summary || {
        total: 0,
        resolved: 0,
        ambiguous: 0,
        unresolved: 0,
        invalid: 0,
        generated_at: null,
      },
      cases,
    });
  } catch (err) {
    console.error('[NORD Coverage API] GET exception:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
