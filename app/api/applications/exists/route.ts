/**
 * GET /api/applications/exists
 *
 * Check if an application already exists for a given reference identity.
 * Used for pre-flight duplicate detection before creating a new application.
 *
 * Query params:
 *   - reference_type: 'QUOTE' | 'SALES_ORDER' (required)
 *   - reference_number: The full reference number including suffix (e.g., "12345" or "12345.2") (required)
 *   - job_line: The job line number (required)
 *
 * Returns:
 *   - exists: boolean
 *   - existing_application_id?: string (if exists)
 *   - existing_details?: { id, created_at, created_by, updated_at } (if exists)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../src/lib/supabase/server';
import { parseApplicationCode, isApplicationCodeError } from '../../../../src/lib/applicationCode';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const referenceType = searchParams.get('reference_type');
    const referenceNumber = searchParams.get('reference_number');
    const jobLine = searchParams.get('job_line');

    // Validate required params
    if (!referenceType || !['QUOTE', 'SALES_ORDER'].includes(referenceType)) {
      return NextResponse.json(
        { error: 'reference_type must be QUOTE or SALES_ORDER' },
        { status: 400 }
      );
    }

    if (!referenceNumber) {
      return NextResponse.json(
        { error: 'reference_number is required' },
        { status: 400 }
      );
    }

    if (!jobLine) {
      return NextResponse.json(
        { error: 'job_line is required' },
        { status: 400 }
      );
    }

    const jobLineNum = parseInt(jobLine, 10);
    if (isNaN(jobLineNum) || jobLineNum < 1) {
      return NextResponse.json(
        { error: 'job_line must be a positive integer' },
        { status: 400 }
      );
    }

    // Parse the reference number to handle dotted format (e.g., "12345.2")
    const parsed = parseApplicationCode(referenceNumber);

    // For exists check, we need both the full code and the base
    let fullReferenceNumber: string;
    let referenceBase: string;
    let referenceSuffix: number | null;

    if (isApplicationCodeError(parsed)) {
      // If parsing fails, use as-is (backward compatibility)
      fullReferenceNumber = referenceNumber;
      referenceBase = referenceNumber;
      referenceSuffix = null;
    } else {
      fullReferenceNumber = parsed.code;
      referenceBase = parsed.base;
      referenceSuffix = parsed.releaseIndex;
    }

    // Build the slug to match against
    const slug = `config:${referenceType.toLowerCase()}:${fullReferenceNumber}:${jobLineNum}`;

    // Check if an application exists with this slug
    const { data: existingApp, error } = await supabase
      .from('calc_recipes')
      .select('id, slug, created_at, created_by_display, updated_at')
      .eq('slug', slug)
      .is('deleted_at', null)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Error checking for existing application:', error);
      return NextResponse.json(
        { error: 'Failed to check for existing application', details: error.message },
        { status: 500 }
      );
    }

    if (existingApp) {
      return NextResponse.json({
        exists: true,
        existing_application_id: existingApp.id,
        existing_details: {
          id: existingApp.id,
          created_at: existingApp.created_at,
          created_by: existingApp.created_by_display,
          updated_at: existingApp.updated_at,
        },
      });
    }

    // Also check by base number + suffix + job line (in case slug format differs)
    // This ensures we catch duplicates even if the slug construction differs slightly
    let query = supabase
      .from('calc_recipes')
      .select('id, slug, created_at, created_by_display, updated_at, inputs')
      .eq('inputs->_config->>reference_type', referenceType)
      .is('deleted_at', null)
      .eq('is_active', true);

    // Match by base number
    query = query.or(
      `inputs->_config->>reference_number.eq.${fullReferenceNumber},inputs->_config->>reference_number_base.eq.${referenceBase}`
    );

    const { data: apps, error: queryError } = await query;

    if (queryError) {
      console.error('Error querying applications:', queryError);
      return NextResponse.json(
        { error: 'Failed to query applications', details: queryError.message },
        { status: 500 }
      );
    }

    // Filter by suffix and job line
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matchingApp = apps?.find((app: any) => {
      const config = app.inputs?._config;
      if (!config) return false;

      // Check suffix matches
      const appSuffix = config.reference_suffix ?? null;
      if (referenceSuffix !== null) {
        // Looking for specific suffix
        if (appSuffix !== referenceSuffix) return false;
      } else {
        // Looking for no suffix
        if (appSuffix !== null && appSuffix !== undefined) return false;
      }

      // Check job line matches
      const appJobLine = config.reference_line ?? 1;
      if (appJobLine !== jobLineNum) return false;

      return true;
    });

    if (matchingApp) {
      return NextResponse.json({
        exists: true,
        existing_application_id: matchingApp.id,
        existing_details: {
          id: matchingApp.id,
          created_at: matchingApp.created_at,
          created_by: matchingApp.created_by_display,
          updated_at: matchingApp.updated_at,
        },
      });
    }

    return NextResponse.json({
      exists: false,
    });

  } catch (error) {
    console.error('Exists check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
