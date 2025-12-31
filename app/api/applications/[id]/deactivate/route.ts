/**
 * POST /api/applications/:id/deactivate
 * Deactivate an application (soft delete)
 *
 * Sets is_active=false and records deleted_at/deleted_by.
 * Used for applications linked to Quotes/SOs that cannot be hard deleted.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, getCurrentUserId } from '../../../../../src/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Fetch the application
    const { data: application, error: fetchError } = await supabase
      .from('calc_recipes')
      .select('id, name, slug, deleted_at, is_active, inputs')
      .eq('id', id)
      .single();

    if (fetchError || !application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Already deactivated?
    if (application.is_active === false || application.deleted_at) {
      return NextResponse.json(
        { error: 'Application is already deactivated' },
        { status: 400 }
      );
    }

    // Get reference info for message
    const config = application.inputs?._config;
    const referenceType = config?.reference_type;
    const referenceNumber = config?.reference_number || config?.reference_number_base;
    const hasLinkage = (referenceType === 'QUOTE' || referenceType === 'SALES_ORDER') && referenceNumber;

    // Perform deactivation
    const { error: updateError } = await supabase
      .from('calc_recipes')
      .update({
        is_active: false,
        deleted_at: new Date().toISOString(),
        deleted_by: userId,
      })
      .eq('id', id);

    if (updateError) {
      console.error('Application deactivate error:', updateError);
      return NextResponse.json(
        { error: 'Failed to deactivate application', details: updateError.message },
        { status: 500 }
      );
    }

    const refDisplay = hasLinkage
      ? referenceType === 'QUOTE'
        ? `Quote ${referenceNumber}`
        : `SO ${referenceNumber}`
      : null;

    return NextResponse.json({
      success: true,
      message: refDisplay
        ? `Application "${application.name}" deactivated. Lineage preserved for ${refDisplay}.`
        : `Application "${application.name}" deactivated.`,
      application: {
        id: application.id,
        name: application.name,
        is_active: false,
      },
    });
  } catch (error) {
    console.error('Application deactivate error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
