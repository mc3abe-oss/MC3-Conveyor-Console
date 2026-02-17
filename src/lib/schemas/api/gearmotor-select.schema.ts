/**
 * Zod Schema — POST /api/gearmotor/select
 *
 * API boundary schema — uses .strict() to reject unknown keys.
 */

import { z } from 'zod';

export const GearmotorSelectSchema = z.object({
  required_output_rpm: z.number().positive(),
  required_output_torque_lb_in: z.number().positive(),
  chosen_service_factor: z.number().positive(),
  speed_tolerance_pct: z.number().min(0).max(100).optional(),
}).strict();

export type GearmotorSelectInput = z.infer<typeof GearmotorSelectSchema>;
