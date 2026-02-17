/**
 * Zod Schema — POST /api/configurations/save
 *
 * API boundary schema — uses .strict() to reject unknown keys.
 * On failure: returns 400 with specific field errors.
 */

import { z } from 'zod';

const ReferenceTypeValues = ['QUOTE', 'SALES_ORDER'] as const;

export const ConfigurationSaveSchema = z.object({
  reference_type: z.enum(ReferenceTypeValues),
  reference_number: z.string().min(1),
  reference_suffix: z.number().int().optional(),
  reference_line: z.number().int().min(1).optional(),
  reference_id: z.string().uuid().optional(),
  customer_name: z.string().optional(),
  quantity: z.number().int().min(1).optional(),
  model_key: z.string().min(1),
  title: z.string().optional(),
  inputs_json: z.record(z.unknown()),
  parameters_json: z.record(z.unknown()),
  application_json: z.record(z.unknown()),
  outputs_json: z.record(z.unknown()).optional(),
  warnings_json: z.array(z.unknown()).optional(),
  change_note: z.string().optional(),
  outputs_stale: z.boolean().optional(),
  existing_application_id: z.string().uuid().optional(),
  base_revision: z.string().optional(),
  force_overwrite: z.boolean().optional(),
}).strict();

export type ConfigurationSaveInput = z.infer<typeof ConfigurationSaveSchema>;
