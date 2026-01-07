/**
 * Drive Config API Routes
 *
 * GET /api/gearmotor/config?application_id=UUID
 *   Fetch drive config for an application
 *
 * POST /api/gearmotor/config
 *   Create or update drive config with selected gearmotor
 *
 * Body:
 *   - application_id: UUID (required)
 *   - required_output_rpm: number
 *   - required_output_torque_lb_in: number
 *   - chosen_service_factor: number
 *   - speed_tolerance_pct: number
 *   - selected_performance_point_id: UUID (optional, the selected gearmotor)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '../../../../src/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get('application_id');

    if (!applicationId) {
      return NextResponse.json(
        { error: 'application_id query parameter is required' },
        { status: 400 }
      );
    }

    // Fetch drive config with selected performance point details
    const { data: config, error } = await supabase
      .from('application_drive_config')
      .select(`
        *,
        vendor_performance_points (
          id,
          vendor,
          series,
          size_code,
          motor_hp,
          output_rpm,
          output_torque_lb_in,
          service_factor_catalog,
          source_ref,
          vendor_components (
            id,
            vendor_part_number,
            description
          )
        )
      `)
      .eq('application_id', applicationId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No config exists yet
        return NextResponse.json({ config: null });
      }
      console.error('Drive config fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch drive config', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ config });
  } catch (error) {
    console.error('Drive config GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const body = await request.json();

    const {
      application_id,
      required_output_rpm,
      required_output_torque_lb_in,
      chosen_service_factor,
      speed_tolerance_pct,
      selected_performance_point_id,
    } = body;

    if (!application_id) {
      return NextResponse.json(
        { error: 'application_id is required' },
        { status: 400 }
      );
    }

    // Build upsert payload
    const configRow: Record<string, unknown> = {
      application_id,
      chosen_service_factor: chosen_service_factor ?? 1.5,
      speed_tolerance_pct: speed_tolerance_pct ?? 15,
      updated_at: new Date().toISOString(),
    };

    if (required_output_rpm !== undefined) {
      configRow.required_output_rpm = required_output_rpm;
    }

    if (required_output_torque_lb_in !== undefined) {
      configRow.required_output_torque_lb_in = required_output_torque_lb_in;
    }

    if (selected_performance_point_id !== undefined) {
      configRow.selected_performance_point_id = selected_performance_point_id;
    }

    // Upsert drive config
    const { data: config, error } = await supabase
      .from('application_drive_config')
      .upsert(configRow, {
        onConflict: 'application_id',
        ignoreDuplicates: false,
      })
      .select(`
        *,
        vendor_performance_points (
          id,
          vendor,
          series,
          size_code,
          motor_hp,
          output_rpm,
          output_torque_lb_in,
          service_factor_catalog,
          source_ref,
          vendor_components (
            id,
            vendor_part_number,
            description
          )
        )
      `)
      .single();

    if (error) {
      console.error('Drive config upsert error:', error);
      return NextResponse.json(
        { error: 'Failed to save drive config', details: error.message },
        { status: 500 }
      );
    }

    // If a performance point was selected, also upsert the component selection
    if (selected_performance_point_id) {
      // Get the gear unit component ID from the performance point
      const { data: perfPoint, error: perfError } = await supabase
        .from('vendor_performance_points')
        .select('gear_unit_component_id')
        .eq('id', selected_performance_point_id)
        .single();

      if (!perfError && perfPoint) {
        // Upsert component selection
        await supabase
          .from('application_drive_component_selection')
          .upsert({
            drive_config_id: config.id,
            component_id: perfPoint.gear_unit_component_id,
            qty: 1,
          }, {
            onConflict: 'drive_config_id,component_id',
          });
      }
    }

    return NextResponse.json({ config });
  } catch (error) {
    console.error('Drive config POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
