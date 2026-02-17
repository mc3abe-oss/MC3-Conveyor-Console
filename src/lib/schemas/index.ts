/**
 * Zod Schemas — Barrel Export
 *
 * All schemas for input validation across the MC3 Conveyor Console.
 */

// Observe-mode validation helper
export { validateConfig } from './validate-config';

// Calculation input schemas (observe mode — passthrough, no coercion)
export { MagneticConfigSchema, type MagneticConfigValidated } from './magnetic-conveyor.schema';
export { BeltConfigSchema, type BeltConfigValidated } from './belt-conveyor.schema';
export { CalculationRequestSchema, type CalculationRequestValidated } from './calculation-request.schema';

// API route schemas (blocking — strict, returns 400 on failure)
export { ConfigurationSaveSchema, type ConfigurationSaveInput } from './api/configurations-save.schema';
export { GearmotorSelectSchema, type GearmotorSelectInput } from './api/gearmotor-select.schema';
export { GearmotorConfigSchema, type GearmotorConfigInput } from './api/gearmotor-config.schema';
export { UsersInviteSchema, type UsersInviteInput } from './api/users-invite.schema';
export { UsersPasswordResetSchema, type UsersPasswordResetInput } from './api/users-password-reset.schema';
export { ApplicationIdSchema, type ApplicationId } from './api/application-id.schema';
