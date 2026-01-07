/**
 * POST /api/gearmotor/select
 *
 * Query gearmotor candidates based on requirements.
 *
 * Body:
 *   - required_output_rpm: number (required)
 *   - required_output_torque_lb_in: number (required)
 *   - chosen_service_factor: number (required)
 *   - speed_tolerance_pct: number (optional, default 15)
 *
 * Returns:
 *   - candidates: ranked list of GearmotorCandidate
 *   - selected_series: 'FLEXBLOC' | 'MINICASE' | null
 *   - message: error/info message if no candidates found
 */

import { NextRequest, NextResponse } from 'next/server';
import { selectGearmotor, GearmotorSelectionInputs } from '../../../../src/lib/gearmotor';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      required_output_rpm,
      required_output_torque_lb_in,
      chosen_service_factor,
      speed_tolerance_pct,
    } = body;

    // Validate required fields
    if (typeof required_output_rpm !== 'number' || required_output_rpm <= 0) {
      return NextResponse.json(
        { error: 'required_output_rpm must be a positive number' },
        { status: 400 }
      );
    }

    if (typeof required_output_torque_lb_in !== 'number' || required_output_torque_lb_in <= 0) {
      return NextResponse.json(
        { error: 'required_output_torque_lb_in must be a positive number' },
        { status: 400 }
      );
    }

    if (typeof chosen_service_factor !== 'number' || chosen_service_factor <= 0) {
      return NextResponse.json(
        { error: 'chosen_service_factor must be a positive number' },
        { status: 400 }
      );
    }

    const inputs: GearmotorSelectionInputs = {
      required_output_rpm,
      required_output_torque_lb_in,
      chosen_service_factor,
      speed_tolerance_pct: speed_tolerance_pct ?? 15,
    };

    const result = await selectGearmotor(inputs);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Gearmotor select API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
