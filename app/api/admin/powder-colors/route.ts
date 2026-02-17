/**
 * Admin API for Powder Colors Management
 *
 * GET: List all powder colors (including inactive for admin)
 * POST: Create new powder color
 * PUT: Update existing powder color
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase/client';
import { createLogger } from '../../../../src/lib/logger';
import { ErrorCodes } from '../../../../src/lib/logger/error-codes';

const logger = createLogger().child({ module: 'api.powder-colors' });

export interface PowderColor {
  id: string;
  scope: 'conveyor' | 'guarding' | 'both';
  code: string;
  name: string;
  description: string;
  is_stock: boolean;
  is_default_conveyor: boolean;
  is_default_guarding: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 503 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('powder_colors')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      logger.error('api.powder-colors.fetch.failed', { errorCode: ErrorCodes.DB_QUERY_FAILED, error });
      return NextResponse.json(
        { error: 'Failed to fetch powder colors', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    logger.error('api.powder-colors.get.failed', { errorCode: ErrorCodes.API_INTERNAL_ERROR, error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { scope, code, name, description, is_stock, is_default_conveyor, is_default_guarding, sort_order, is_active } = body;

    // Validate required fields
    if (!code || !name || !description || !scope) {
      return NextResponse.json(
        { error: 'code, name, description, and scope are required' },
        { status: 400 }
      );
    }

    // If setting as default, unset other defaults first
    if (is_default_conveyor) {
      await supabaseAdmin
        .from('powder_colors')
        .update({ is_default_conveyor: false })
        .eq('is_default_conveyor', true);
    }
    if (is_default_guarding) {
      await supabaseAdmin
        .from('powder_colors')
        .update({ is_default_guarding: false })
        .eq('is_default_guarding', true);
    }

    const { data, error } = await supabaseAdmin
      .from('powder_colors')
      .insert({
        scope,
        code,
        name,
        description,
        is_stock: is_stock ?? false,
        is_default_conveyor: is_default_conveyor ?? false,
        is_default_guarding: is_default_guarding ?? false,
        sort_order: sort_order ?? 100,
        is_active: is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      logger.error('api.powder-colors.create.failed', { errorCode: ErrorCodes.DB_INSERT_FAILED, error });
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A powder color with this code already exists' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to create powder color', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    logger.error('api.powder-colors.post.failed', { errorCode: ErrorCodes.API_INTERNAL_ERROR, error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { id, scope, code, name, description, is_stock, is_default_conveyor, is_default_guarding, sort_order, is_active } = body;

    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { error: 'id is required for updates' },
        { status: 400 }
      );
    }

    // If setting as default, unset other defaults first
    if (is_default_conveyor) {
      await supabaseAdmin
        .from('powder_colors')
        .update({ is_default_conveyor: false })
        .neq('id', id)
        .eq('is_default_conveyor', true);
    }
    if (is_default_guarding) {
      await supabaseAdmin
        .from('powder_colors')
        .update({ is_default_guarding: false })
        .neq('id', id)
        .eq('is_default_guarding', true);
    }

    const updateData: Record<string, unknown> = {};
    if (scope !== undefined) updateData.scope = scope;
    if (code !== undefined) updateData.code = code;
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (is_stock !== undefined) updateData.is_stock = is_stock;
    if (is_default_conveyor !== undefined) updateData.is_default_conveyor = is_default_conveyor;
    if (is_default_guarding !== undefined) updateData.is_default_guarding = is_default_guarding;
    if (sort_order !== undefined) updateData.sort_order = sort_order;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await supabaseAdmin
      .from('powder_colors')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('api.powder-colors.update.failed', { errorCode: ErrorCodes.DB_UPDATE_FAILED, error });
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A powder color with this code already exists' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to update powder color', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    logger.error('api.powder-colors.put.failed', { errorCode: ErrorCodes.API_INTERNAL_ERROR, error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
