/**
 * GET /api/applications/load
 *
 * Load an application by ID or by reference lookup.
 *
 * Query params (priority order):
 *   - app: UUID - Direct application ID lookup
 *   - quote: number - Quote base number
 *   - so: number - Sales Order base number
 *   - suffix: number (optional) - Reference suffix (e.g., 2 for "62633.2")
 *   - jobLine: number (optional) - Job line within reference
 *
 * Returns:
 *   - application: The full application record from calc_recipes
 *   - context: SaveTarget-compatible context object
 *   - needsJobLineSelection: boolean - True if multiple job lines exist and none specified
 *   - availableJobLines: number[] - Available job lines if selection needed
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../src/lib/supabase/server';
import { supabaseAdmin } from '../../../../src/lib/supabase/client';
import { getCreatorDisplayOrNull } from '../../../../src/lib/user-display';

/**
 * Product routing configuration
 * Maps product family slugs to their routing keys and URLs
 */
const PRODUCT_ROUTES: Record<string, { key: string; href: string; name: string }> = {
  'belt-conveyor': { key: 'belt_conveyor_v1', href: '/console/belt', name: 'Belt Conveyor' },
  'magnetic-conveyor': { key: 'magnetic_conveyor_v1', href: '/console/magnetic', name: 'Magnetic Conveyor' },
};

const DEFAULT_PRODUCT_ROUTE = PRODUCT_ROUTES['belt-conveyor'];

/**
 * Get product routing info from application's product_family_id
 */
async function getProductRouting(supabase: any, productFamilyId: string | null): Promise<{ key: string; href: string; name: string }> {
  if (!productFamilyId) {
    return DEFAULT_PRODUCT_ROUTE;
  }

  const { data: productFamily } = await supabase
    .from('product_families')
    .select('slug, name')
    .eq('id', productFamilyId)
    .single();

  if (!productFamily?.slug) {
    return DEFAULT_PRODUCT_ROUTE;
  }

  return PRODUCT_ROUTES[productFamily.slug] ?? DEFAULT_PRODUCT_ROUTE;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const appId = searchParams.get('app');
    const quoteBase = searchParams.get('quote');
    const soBase = searchParams.get('so');
    const suffix = searchParams.get('suffix');
    const jobLine = searchParams.get('jobLine');

    // Priority 1: Direct ID lookup
    if (appId) {
      const { data: app, error } = await supabase
        .from('calc_recipes')
        .select('*')
        .eq('id', appId)
        .is('deleted_at', null)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Application load error:', error);
        return NextResponse.json(
          { error: 'Failed to load application', details: error.message },
          { status: 500 }
        );
      }

      if (!app) {
        return NextResponse.json(
          { error: 'Application not found' },
          { status: 404 }
        );
      }

      // Get revision count for this reference + job line combination
      const revisionCount = await getRevisionCount(supabase, app);

      // Enrich with creator display if missing
      await enrichCreatorDisplay(app);

      // Get product routing info for correct UI navigation
      const productRouting = await getProductRouting(supabase, app.product_family_id);

      return NextResponse.json({
        application: app,
        context: buildContextFromApp(app),
        revision_count: revisionCount,
        // Product routing info for navigation
        product: productRouting,
      });
    }

    // Priority 2: Reference lookup (quote or so)
    const referenceType = quoteBase ? 'QUOTE' : soBase ? 'SALES_ORDER' : null;
    const referenceBase = quoteBase || soBase;

    if (!referenceType || !referenceBase) {
      return NextResponse.json(
        { error: 'Must provide app, quote, or so parameter' },
        { status: 400 }
      );
    }

    // Build query for reference lookup
    // We query the inputs JSONB field for _config values
    // Use reference_number for backward compat, will also check reference_number_base
    // Exclude soft-deleted and deactivated records
    const { data: apps, error } = await supabase
      .from('calc_recipes')
      .select('*')
      .eq('inputs->_config->>reference_type', referenceType)
      .or(`inputs->_config->>reference_number.eq.${referenceBase},inputs->_config->>reference_number_base.eq.${referenceBase}`)
      .is('deleted_at', null)
      .eq('is_active', true)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Application lookup error:', error);
      return NextResponse.json(
        { error: 'Failed to lookup application', details: error.message },
        { status: 500 }
      );
    }

    if (!apps || apps.length === 0) {
      const refDisplay = referenceType === 'QUOTE'
        ? `Q${referenceBase}${suffix ? '.' + suffix : ''}`
        : `SO${referenceBase}${suffix ? '.' + suffix : ''}`;
      return NextResponse.json(
        { error: `No Application found for ${refDisplay}` },
        { status: 404 }
      );
    }

    // Filter by suffix if specified (handle null vs undefined in JSONB)
    let filteredApps = apps;
    if (suffix !== null) {
      const suffixNum = parseInt(suffix, 10);
      filteredApps = apps.filter(app => {
        const appSuffix = app.inputs?._config?.reference_suffix;
        if (suffix) {
          // Looking for specific suffix
          return appSuffix === suffixNum || appSuffix === suffix;
        } else {
          // Looking for no suffix (null/undefined)
          return appSuffix === null || appSuffix === undefined;
        }
      });
    }

    if (filteredApps.length === 0) {
      const refDisplay = referenceType === 'QUOTE'
        ? `Q${referenceBase}${suffix ? '.' + suffix : ''}`
        : `SO${referenceBase}${suffix ? '.' + suffix : ''}`;
      return NextResponse.json(
        { error: `No Application found for ${refDisplay}` },
        { status: 404 }
      );
    }

    // Check job lines
    if (jobLine) {
      // Filter to specific job line (default to 1 if not set)
      const jobLineNum = parseInt(jobLine, 10);
      const matchingApps = filteredApps.filter(app => {
        const appJobLine = app.inputs?._config?.reference_line ?? 1;
        return appJobLine === jobLineNum;
      });

      if (matchingApps.length === 0) {
        return NextResponse.json(
          { error: `No Application found for line ${jobLine}` },
          { status: 404 }
        );
      }

      // Return the latest revision for this job line (already sorted by updated_at desc)
      const latestApp = matchingApps[0];
      const revisionCount = matchingApps.length;
      await enrichCreatorDisplay(latestApp);
      const productRouting = await getProductRouting(supabase, latestApp.product_family_id);
      return NextResponse.json({
        application: latestApp,
        context: buildContextFromApp(latestApp),
        revision_count: revisionCount,
        product: productRouting,
      });
    }

    // No jobLine specified - check if we need selection
    const uniqueJobLines = [...new Set(filteredApps.map(app =>
      app.inputs?._config?.reference_line ?? 1
    ))].sort((a, b) => a - b);

    if (uniqueJobLines.length === 1) {
      // Only one job line exists, load it
      const latestApp = filteredApps[0];
      const revisionCount = filteredApps.length;
      await enrichCreatorDisplay(latestApp);
      const productRouting = await getProductRouting(supabase, latestApp.product_family_id);
      return NextResponse.json({
        application: latestApp,
        context: buildContextFromApp(latestApp),
        revision_count: revisionCount,
        product: productRouting,
      });
    }

    // Multiple job lines exist - prompt for selection
    return NextResponse.json({
      needsJobLineSelection: true,
      availableJobLines: uniqueJobLines,
      referenceType,
      referenceBase,
      suffix: suffix ? parseInt(suffix, 10) : null,
    });

  } catch (error) {
    console.error('Application load error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Build a SaveTarget-compatible context object from an application record
 */
function buildContextFromApp(app: any): {
  type: 'quote' | 'sales_order';
  id: string;
  base: number;
  line: number | null;
  jobLine: number;
  quantity: number;
  customer_name: string | null;
  // Calculation status fields (v1.21)
  calculation_status: 'draft' | 'calculated';
  is_calculated: boolean;
  outputs_stale: boolean;
  last_calculated_at: string | null;
} | null {
  const config = app.inputs?._config;
  if (!config?.reference_type) {
    return null;
  }

  const type = config.reference_type === 'QUOTE' ? 'quote' : 'sales_order';
  // Use reference_number_base (5-digit integer) if available, fallback to parsing reference_number
  const base = config.reference_number_base ?? (parseInt(config.reference_number, 10) || 0);
  const suffix = config.reference_suffix ?? null;
  const jobLine = config.reference_line ?? 1;
  const quantity = config.application_json?.conveyor_qty ?? 1;
  const customerName = config.customer_name ?? null;

  // Return the FK reference ID (quote_id or sales_order_id), NOT the application ID
  const referenceId = type === 'quote' ? app.quote_id : app.sales_order_id;

  return {
    type,
    id: referenceId || null,
    base,
    line: suffix,
    jobLine,
    quantity,
    customer_name: customerName,
    // Calculation status fields (v1.21)
    calculation_status: app.calculation_status ?? 'draft',
    is_calculated: app.is_calculated ?? false,
    outputs_stale: app.outputs_stale ?? false,
    last_calculated_at: app.last_calculated_at ?? null,
  };
}

/**
 * Get the revision count for an application by counting all versions
 * with the same reference type, base number, suffix, and job line.
 */
async function getRevisionCount(supabase: any, app: any): Promise<number> {
  const config = app.inputs?._config;
  if (!config?.reference_type) {
    return 1;
  }

  const referenceType = config.reference_type;
  const referenceBase = config.reference_number_base ?? config.reference_number;

  // Count all versions with matching reference (by type and base number)
  const { count, error } = await supabase
    .from('calc_recipes')
    .select('*', { count: 'exact', head: true })
    .eq('inputs->_config->>reference_type', referenceType)
    .or(`inputs->_config->>reference_number.eq.${referenceBase},inputs->_config->>reference_number_base.eq.${referenceBase}`)
    .is('deleted_at', null)
    .eq('is_active', true);

  if (error) {
    console.error('Error counting revisions:', error);
    return 1;
  }

  return count || 1;
}

/**
 * Enrich an application with creator display name if it's missing.
 * Does runtime lookup from auth.users when stamped value is null.
 */
async function enrichCreatorDisplay(app: any): Promise<void> {
  // Already has stamped display name
  if (app.created_by_display) {
    return;
  }

  // No creator ID to lookup
  if (!app.created_by) {
    return;
  }

  // Need runtime lookup
  if (!supabaseAdmin) {
    return;
  }

  try {
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(app.created_by);
    if (userData?.user) {
      const metadata = userData.user.user_metadata as { first_name?: string; last_name?: string } | undefined;
      const display = getCreatorDisplayOrNull(userData.user.email, metadata);
      if (display) {
        app.created_by_display = display;
      }
    }
  } catch (err) {
    console.error('Error fetching creator info:', err);
  }
}
