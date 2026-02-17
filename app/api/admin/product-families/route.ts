/**
 * Product Families API
 *
 * GET: Fetch all product families (including inactive for admin)
 * POST: Create a new product family (SUPER_ADMIN only)
 * PUT: Update a product family (SUPER_ADMIN only)
 *
 * Security:
 * - GET: Authenticated users only
 * - POST/PUT: SUPER_ADMIN only
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../src/lib/supabase/server';
import { supabaseAdmin } from '../../../../src/lib/supabase/client';
import { requireAuth, requireSuperAdmin } from '../../../../src/lib/auth/require';
import { createLogger } from '../../../../src/lib/logger';
import { ErrorCodes } from '../../../../src/lib/logger/error-codes';

const logger = createLogger().child({ module: 'api.product-families' });

interface ProductFamily {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface CreateProductFamilyPayload {
  name: string;
  slug?: string;
  is_active?: boolean;
  sort_order?: number;
}

interface UpdateProductFamilyPayload {
  id: string;
  name?: string;
  slug?: string;
  is_active?: boolean;
  sort_order?: number;
}

/**
 * Generate a slug from a name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * GET /api/admin/product-families
 * Fetch all product families (including inactive for admin display)
 */
export async function GET() {
  try {
    // Require authentication
    const authResult = await requireAuth();
    if (authResult.response) {
      return authResult.response;
    }

    const supabase = await createClient();

    const { data: families, error } = await supabase
      .from('product_families')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      logger.error('api.product-families.fetch.failed', { errorCode: ErrorCodes.DB_QUERY_FAILED, error });
      return NextResponse.json(
        { error: 'Failed to fetch product families', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(families || []);
  } catch (error) {
    logger.error('api.product-families.get.failed', { errorCode: ErrorCodes.API_INTERNAL_ERROR, error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/product-families
 * Create a new product family
 */
export async function POST(request: NextRequest) {
  try {
    // Require super admin role
    const authResult = await requireSuperAdmin();
    if (authResult.response) {
      return authResult.response;
    }

    // Check if admin client is available (required for RLS bypass)
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error: service role not available' },
        { status: 503 }
      );
    }

    const body = (await request.json()) as CreateProductFamilyPayload;

    // Validate required fields
    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Generate slug from name if not provided
    const slug = body.slug?.trim() || generateSlug(body.name);

    // Check for duplicate slug
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('product_families')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (checkError) {
      logger.error('api.product-families.check-slug.failed', { errorCode: ErrorCodes.DB_QUERY_FAILED, error: checkError });
      return NextResponse.json(
        { error: 'Failed to validate slug', details: checkError.message },
        { status: 500 }
      );
    }

    if (existing) {
      return NextResponse.json(
        { error: 'A product family with this slug already exists' },
        { status: 409 }
      );
    }

    // Insert new product family
    const { data: newFamily, error: insertError } = await supabaseAdmin
      .from('product_families')
      .insert({
        name: body.name.trim(),
        slug,
        is_active: body.is_active ?? true,
        sort_order: body.sort_order ?? 0,
      })
      .select()
      .single();

    if (insertError) {
      logger.error('api.product-families.create.failed', { errorCode: ErrorCodes.DB_INSERT_FAILED, error: insertError });
      return NextResponse.json(
        { error: 'Failed to create product family', details: insertError.message },
        { status: 500 }
      );
    }

    logger.info('api.product-families.create.completed', { name: newFamily.name, slug: newFamily.slug, userId: authResult.user.userId });

    return NextResponse.json(newFamily, { status: 201 });
  } catch (error) {
    logger.error('api.product-families.post.failed', { errorCode: ErrorCodes.API_INTERNAL_ERROR, error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/product-families
 * Update an existing product family
 */
export async function PUT(request: NextRequest) {
  try {
    // Require super admin role
    const authResult = await requireSuperAdmin();
    if (authResult.response) {
      return authResult.response;
    }

    // Check if admin client is available (required for RLS bypass)
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error: service role not available' },
        { status: 503 }
      );
    }

    const body = (await request.json()) as UpdateProductFamilyPayload;

    // Validate required fields
    if (!body.id) {
      return NextResponse.json(
        { error: 'Product family ID is required' },
        { status: 400 }
      );
    }

    // Check that the product family exists
    const { data: existing, error: findError } = await supabaseAdmin
      .from('product_families')
      .select('*')
      .eq('id', body.id)
      .maybeSingle();

    if (findError) {
      logger.error('api.product-families.find.failed', { errorCode: ErrorCodes.DB_QUERY_FAILED, error: findError });
      return NextResponse.json(
        { error: 'Failed to find product family', details: findError.message },
        { status: 500 }
      );
    }

    if (!existing) {
      return NextResponse.json(
        { error: 'Product family not found' },
        { status: 404 }
      );
    }

    // Build update object
    const updates: Partial<ProductFamily> = {
      updated_at: new Date().toISOString(),
    };

    if (body.name !== undefined) {
      updates.name = body.name.trim();
    }

    if (body.slug !== undefined) {
      const newSlug = body.slug.trim();

      // Check for duplicate slug (excluding current record)
      const { data: duplicate, error: dupError } = await supabaseAdmin
        .from('product_families')
        .select('id')
        .eq('slug', newSlug)
        .neq('id', body.id)
        .maybeSingle();

      if (dupError) {
        logger.error('api.product-families.check-slug-dup.failed', { errorCode: ErrorCodes.DB_QUERY_FAILED, error: dupError });
        return NextResponse.json(
          { error: 'Failed to validate slug', details: dupError.message },
          { status: 500 }
        );
      }

      if (duplicate) {
        return NextResponse.json(
          { error: 'A product family with this slug already exists' },
          { status: 409 }
        );
      }

      updates.slug = newSlug;
    }

    if (body.is_active !== undefined) {
      updates.is_active = body.is_active;
    }

    if (body.sort_order !== undefined) {
      updates.sort_order = body.sort_order;
    }

    // Update the product family
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('product_families')
      .update(updates)
      .eq('id', body.id)
      .select()
      .single();

    if (updateError) {
      logger.error('api.product-families.update.failed', { errorCode: ErrorCodes.DB_UPDATE_FAILED, error: updateError });
      return NextResponse.json(
        { error: 'Failed to update product family', details: updateError.message },
        { status: 500 }
      );
    }

    logger.info('api.product-families.update.completed', { name: updated.name, slug: updated.slug, userId: authResult.user.userId });

    return NextResponse.json(updated);
  } catch (error) {
    logger.error('api.product-families.put.failed', { errorCode: ErrorCodes.API_INTERNAL_ERROR, error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
