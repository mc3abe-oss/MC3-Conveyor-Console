/**
 * Zod Schema — CalculationRequest
 *
 * Observe-mode schema for the engine's CalculationRequest interface.
 * This wraps the product-specific input schemas.
 *
 * Uses .passthrough() — request may contain additional metadata.
 */

import { z } from 'zod';

export const CalculationRequestSchema = z.object({
  inputs: z.record(z.unknown()), // Product-specific inputs — validated separately per product
  parameters: z.record(z.unknown()).optional(),
  model_version_id: z.string().optional(),
  productKey: z.string().optional(),
}).passthrough();

export type CalculationRequestValidated = z.infer<typeof CalculationRequestSchema>;
