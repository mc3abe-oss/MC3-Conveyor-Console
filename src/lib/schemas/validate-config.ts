/**
 * Observe-Mode Validation Helper
 *
 * Validates configs against Zod schemas but NEVER blocks execution.
 * Logs warnings on validation failure — calculations still run.
 *
 * CRITICAL: This is observe mode. No coercion, no transforms, no blocking.
 * If Zod rejects something that Excel allowed, the schema is wrong.
 */

import type { ZodSchema } from 'zod';
import { createLogger } from '../logger';
import { ErrorCodes } from '../logger/error-codes';

const logger = createLogger().child({ module: 'validation' });

/**
 * Validate a config against a Zod schema in observe mode.
 *
 * - Logs warnings on failure but does NOT throw.
 * - Returns the ORIGINAL config — no coercion, no stripping.
 * - Truncates issues to 5 for large configs.
 */
export function validateConfig<T>(config: T, schemaName: string, schema: ZodSchema): T {
  const result = schema.safeParse(config);
  if (!result.success) {
    const issues = result.error.issues;
    logger.warn('config.validation.observe.failed', {
      errorCode: ErrorCodes.VALIDATION_SCHEMA_FAILED,
      schema: schemaName,
      issueCount: issues.length,
      issuesPreview: issues.slice(0, 5),
      paths: issues.slice(0, 5).map((i) => i.path.join('.')),
    });
    // OBSERVE MODE: log but do NOT throw — calculations still run
  }
  return config; // pass through the ORIGINAL config — no coercion
}
