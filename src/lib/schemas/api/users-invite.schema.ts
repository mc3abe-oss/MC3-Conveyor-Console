/**
 * Zod Schema — POST /api/admin/users/invite
 *
 * API boundary schema — uses .strict() to reject unknown keys.
 */

import { z } from 'zod';

const RoleValues = ['SUPER_ADMIN', 'BELT_ADMIN', 'BELT_USER'] as const;

export const UsersInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(RoleValues).optional(),
}).strict();

export type UsersInviteInput = z.infer<typeof UsersInviteSchema>;
