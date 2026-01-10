/**
 * Application Status API
 *
 * PUT /api/applications/[id]/status
 * Update application status (DRAFT <-> FINALIZED)
 *
 * Status State Machine:
 * - DRAFT: Editable and deletable
 * - FINALIZED: Editable but NOT deletable
 * - SO_CREATED: Created from quote conversion, NOT deletable (set by quote conversion)
 *
 * Valid transitions:
 * - DRAFT -> FINALIZED (user finalize)
 * - FINALIZED -> DRAFT (user re-open)
 * - Any -> SO_CREATED (only via quote conversion, not via this endpoint)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../src/lib/supabase/server';

interface StatusUpdatePayload {
  status: 'DRAFT' | 'FINALIZED';
}

type ApplicationStatus = 'DRAFT' | 'FINALIZED' | 'SO_CREATED';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const body = await request.json() as StatusUpdatePayload;

    if (!body.status || !['DRAFT', 'FINALIZED'].includes(body.status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be DRAFT or FINALIZED' },
        { status: 400 }
      );
    }

    // Get current application
    const { data: app, error: fetchError } = await supabase
      .from('calc_recipes')
      .select('id, application_status')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !app) {
      console.error('Application fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    const currentStatus = (app.application_status || 'DRAFT') as ApplicationStatus;

    // Cannot transition FROM SO_CREATED
    if (currentStatus === 'SO_CREATED') {
      return NextResponse.json(
        { error: 'Cannot change status of applications created from Sales Orders' },
        { status: 400 }
      );
    }

    // Update status
    const { data: updated, error: updateError } = await supabase
      .from('calc_recipes')
      .update({ application_status: body.status })
      .eq('id', id)
      .select('id, application_status')
      .single();

    if (updateError) {
      console.error('Status update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update status', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      application_status: updated.application_status,
      message: body.status === 'FINALIZED' ? 'Application finalized' : 'Application reopened as draft',
    });
  } catch (error) {
    console.error('Status API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: app, error } = await supabase
      .from('calc_recipes')
      .select('id, application_status')
      .eq('id', id)
      .maybeSingle();

    if (error || !app) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      application_status: app.application_status || 'DRAFT',
    });
  } catch (error) {
    console.error('Status GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
