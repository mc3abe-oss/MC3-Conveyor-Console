/**
 * Admin Pages API
 *
 * GET: Fetch all admin pages with their product family tags
 *
 * Returns:
 * - pages: Array of admin pages with their category, sort order, and product family tags
 * - productFamilies: Array of all active product families for filtering
 *
 * Note: No auth required for GET (page visibility, not data)
 * The actual pages have their own authorization checks.
 */

import { NextResponse } from 'next/server';
import { createClient } from '../../../../src/lib/supabase/server';

interface ProductFamily {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  sort_order: number;
}

interface AdminPage {
  id: string;
  name: string;
  slug: string;
  href: string;
  category: 'system' | 'catalog';
  sort_order: number;
  is_active: boolean;
  productFamilies: { id: string; slug: string }[];
}

/**
 * GET /api/admin/admin-pages
 * Fetch all admin pages with product family tags
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Fetch all active admin pages
    const { data: pages, error: pagesError } = await supabase
      .from('admin_pages')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (pagesError) {
      console.error('Error fetching admin pages:', pagesError);
      return NextResponse.json(
        { error: 'Failed to fetch admin pages', details: pagesError.message },
        { status: 500 }
      );
    }

    // Fetch all product families (including inactive for admin display)
    const { data: productFamilies, error: familiesError } = await supabase
      .from('product_families')
      .select('*')
      .order('sort_order', { ascending: true });

    if (familiesError) {
      console.error('Error fetching product families:', familiesError);
      return NextResponse.json(
        { error: 'Failed to fetch product families', details: familiesError.message },
        { status: 500 }
      );
    }

    // Fetch all page-to-family mappings
    const { data: mappings, error: mappingsError } = await supabase
      .from('admin_page_product_families')
      .select('admin_page_id, product_family_id');

    if (mappingsError) {
      console.error('Error fetching page-family mappings:', mappingsError);
      return NextResponse.json(
        { error: 'Failed to fetch page mappings', details: mappingsError.message },
        { status: 500 }
      );
    }

    // Create a map of product family id -> { id, slug }
    const familyMap = new Map<string, { id: string; slug: string }>();
    for (const family of productFamilies || []) {
      familyMap.set(family.id, { id: family.id, slug: family.slug });
    }

    // Group mappings by page id
    const pageToFamilies = new Map<string, { id: string; slug: string }[]>();
    for (const mapping of mappings || []) {
      const family = familyMap.get(mapping.product_family_id);
      if (family) {
        const existing = pageToFamilies.get(mapping.admin_page_id) || [];
        existing.push(family);
        pageToFamilies.set(mapping.admin_page_id, existing);
      }
    }

    // Build the response with product families attached to each page
    const pagesWithFamilies: AdminPage[] = (pages || []).map((page) => ({
      id: page.id,
      name: page.name,
      slug: page.slug,
      href: page.href,
      category: page.category as 'system' | 'catalog',
      sort_order: page.sort_order,
      is_active: page.is_active,
      productFamilies: pageToFamilies.get(page.id) || [],
    }));

    // Filter product families to only active ones for the filter dropdown
    const activeProductFamilies: ProductFamily[] = (productFamilies || [])
      .filter((pf) => pf.is_active)
      .map((pf) => ({
        id: pf.id,
        name: pf.name,
        slug: pf.slug,
        is_active: pf.is_active,
        sort_order: pf.sort_order,
      }));

    return NextResponse.json({
      pages: pagesWithFamilies,
      productFamilies: activeProductFamilies,
    });
  } catch (error) {
    console.error('Error in /api/admin/admin-pages GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
