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
import { requireAuth, requireSuperAdmin } from '../../../../src/lib/auth/require';

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
      console.error('Error fetching product families:', error);
      return NextResponse.json(
        { error: 'Failed to fetch product families', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(families || []);
  } catch (error) {
    console.error('Error in /api/admin/product-families GET:', error);
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

    const supabase = await createClient();
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
    const { data: existing, error: checkError } = await supabase
      .from('product_families')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking for duplicate slug:', checkError);
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
    const { data: newFamily, error: insertError } = await supabase
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
      console.error('Error creating product family:', insertError);
      return NextResponse.json(
        { error: 'Failed to create product family', details: insertError.message },
        { status: 500 }
      );
    }

    console.log(`[Admin] Product family created: ${newFamily.name} (${newFamily.slug}) by ${authResult.user.userId}`);

    return NextResponse.json(newFamily, { status: 201 });
  } catch (error) {
    console.error('Error in /api/admin/product-families POST:', error);
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

    const supabase = await createClient();
    const body = (await request.json()) as UpdateProductFamilyPayload;

    // Validate required fields
    if (!body.id) {
      return NextResponse.json(
        { error: 'Product family ID is required' },
        { status: 400 }
      );
    }

    // Check that the product family exists
    const { data: existing, error: findError } = await supabase
      .from('product_families')
      .select('*')
      .eq('id', body.id)
      .maybeSingle();

    if (findError) {
      console.error('Error finding product family:', findError);
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
      const { data: duplicate, error: dupError } = await supabase
        .from('product_families')
        .select('id')
        .eq('slug', newSlug)
        .neq('id', body.id)
        .maybeSingle();

      if (dupError) {
        console.error('Error checking for duplicate slug:', dupError);
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
    const { data: updated, error: updateError } = await supabase
      .from('product_families')
      .update(updates)
      .eq('id', body.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating product family:', updateError);
      return NextResponse.json(
        { error: 'Failed to update product family', details: updateError.message },
        { status: 500 }
      );
    }

    console.log(`[Admin] Product family updated: ${updated.name} (${updated.slug}) by ${authResult.user.userId}`);

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error in /api/admin/product-families PUT:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
