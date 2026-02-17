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
import { createLogger } from '../../../../../../src/lib/logger';
import { ErrorCodes } from '../../../../../../src/lib/logger/error-codes';

const logger = createLogger().child({ module: 'api.nord-coverage-refresh' });

export async function POST() {
  try {
    // Check belt admin access using the standard helper
    const authResult = await requireBeltAdmin();
    if (authResult.response) {
      return authResult.response;
    }

    const supabase = await createClient();

    logger.info('api.nord-coverage-refresh.started', { triggeredBy: authResult.user.email });

    // Generate coverage (this may take a few seconds)
    const result = await generateCoverage(supabase);

    logger.info('api.nord-coverage-refresh.completed', { summary: result.summary });

    // Check for insert errors
    if (result.errors && result.errors.length > 0) {
      logger.error('api.nord-coverage-refresh.insert.failed', { errorCode: ErrorCodes.DB_INSERT_FAILED, errors: result.errors });
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
    logger.error('api.nord-coverage-refresh.post.failed', { errorCode: ErrorCodes.API_INTERNAL_ERROR, error: err });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
