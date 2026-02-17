/**
 * Zod Schema — POST /api/admin/users/send-password-reset
 *
 * API boundary schema — uses .strict() to reject unknown keys.
 */

import { z } from 'zod';

export const UsersPasswordResetSchema = z.object({
  email: z.string().email(),
}).strict();

export type UsersPasswordResetInput = z.infer<typeof UsersPasswordResetSchema>;
