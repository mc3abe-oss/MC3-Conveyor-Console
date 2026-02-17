/**
 * Zod Schema — POST /api/gearmotor/config
 *
 * API boundary schema — uses .strict() to reject unknown keys.
 */

import { z } from 'zod';

export const GearmotorConfigSchema = z.object({
  application_id: z.string().uuid(),
  required_output_rpm: z.number().positive().optional(),
  required_output_torque_lb_in: z.number().positive().optional(),
  chosen_service_factor: z.number().positive().optional(),
  speed_tolerance_pct: z.number().min(0).max(100).optional(),
  selected_performance_point_id: z.string().uuid().optional(),
}).strict();

export type GearmotorConfigInput = z.infer<typeof GearmotorConfigSchema>;
