/**
 * Zod Schema — UUID path parameter for /api/applications/[id]
 *
 * Validates that [id] is a valid UUID v4.
 */

import { z } from 'zod';

export const ApplicationIdSchema = z.string().uuid();

export type ApplicationId = z.infer<typeof ApplicationIdSchema>;
