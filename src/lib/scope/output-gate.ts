/**
 * Output Gate
 *
 * Centralized, server-authoritative enforcement for output generation.
 * Outputs (copy, download, export) are ONLY allowed when scope_status === 'set'.
 *
 * This is the SINGLE authoritative source for output permission checks.
 * All output endpoints and operations MUST call assertOutputsAllowed before
 * generating any output payload.
 */

import { createClient } from '../supabase/server';

// ============================================================================
// Types
// ============================================================================

export type ScopeEntityType = 'quote' | 'sales_order';

export type ScopeStatus = 'draft' | 'set';

export interface OutputPermissionResult {
  allowed: boolean;
  status: ScopeStatus;
  error?: {
    code: string;
    message: string;
  };
}

export class OutputsRequireSetError extends Error {
  public readonly code = 'OUTPUTS_REQUIRE_SET';

  constructor(entityType: ScopeEntityType, entityId: string) {
    super(`Outputs are disabled until the scope is Set. (${entityType}:${entityId})`);
    this.name = 'OutputsRequireSetError';
  }
}

export class EntityNotFoundError extends Error {
  public readonly code = 'ENTITY_NOT_FOUND';

  constructor(entityType: ScopeEntityType, entityId: string) {
    super(`${entityType} not found: ${entityId}`);
    this.name = 'EntityNotFoundError';
  }
}

// ============================================================================
// Core Gate Functions
// ============================================================================

/**
 * Check if outputs are allowed for an entity.
 * Returns a result object with allowed status and any error details.
 *
 * @param entityType - 'quote' or 'sales_order'
 * @param entityId - UUID of the entity
 * @returns OutputPermissionResult
 */
export async function checkOutputPermission(
  entityType: ScopeEntityType,
  entityId: string
): Promise<OutputPermissionResult> {
  const supabase = await createClient();

  const tableName = entityType === 'quote' ? 'quotes' : 'sales_orders';

  const { data, error } = await supabase
    .from(tableName)
    .select('scope_status')
    .eq('id', entityId)
    .is('deleted_at', null)
    .single();

  if (error || !data) {
    return {
      allowed: false,
      status: 'draft',
      error: {
        code: 'ENTITY_NOT_FOUND',
        message: `${entityType} not found: ${entityId}`,
      },
    };
  }

  const status = (data.scope_status || 'draft') as ScopeStatus;

  if (status !== 'set') {
    return {
      allowed: false,
      status,
      error: {
        code: 'OUTPUTS_REQUIRE_SET',
        message: 'Outputs are disabled until the scope is Set.',
      },
    };
  }

  return {
    allowed: true,
    status,
  };
}

/**
 * Assert that outputs are allowed for an entity.
 * Throws OutputsRequireSetError if status is not 'set'.
 * Throws EntityNotFoundError if entity doesn't exist.
 *
 * This is the primary enforcement function. Call this before any output operation.
 *
 * @param entityType - 'quote' or 'sales_order'
 * @param entityId - UUID of the entity
 * @throws OutputsRequireSetError if status !== 'set'
 * @throws EntityNotFoundError if entity not found
 */
export async function assertOutputsAllowed(
  entityType: ScopeEntityType,
  entityId: string
): Promise<void> {
  const result = await checkOutputPermission(entityType, entityId);

  if (!result.allowed) {
    if (result.error?.code === 'ENTITY_NOT_FOUND') {
      throw new EntityNotFoundError(entityType, entityId);
    }
    throw new OutputsRequireSetError(entityType, entityId);
  }
}

/**
 * Get the scope status for an entity.
 * Returns 'draft' as fallback if entity not found.
 *
 * @param entityType - 'quote' or 'sales_order'
 * @param entityId - UUID of the entity
 * @returns ScopeStatus
 */
export async function getScopeStatus(
  entityType: ScopeEntityType,
  entityId: string
): Promise<ScopeStatus> {
  const supabase = await createClient();

  const tableName = entityType === 'quote' ? 'quotes' : 'sales_orders';

  const { data } = await supabase
    .from(tableName)
    .select('scope_status')
    .eq('id', entityId)
    .is('deleted_at', null)
    .single();

  return (data?.scope_status || 'draft') as ScopeStatus;
}

// ============================================================================
// HTTP Response Helpers
// ============================================================================

/**
 * Create a standardized error response for output gate violations.
 * Use this in API routes when assertOutputsAllowed throws.
 */
export function createOutputGateErrorResponse(error: unknown): Response {
  if (error instanceof OutputsRequireSetError) {
    return Response.json(
      {
        error: error.message,
        code: error.code,
      },
      { status: 403 }
    );
  }

  if (error instanceof EntityNotFoundError) {
    return Response.json(
      {
        error: error.message,
        code: error.code,
      },
      { status: 404 }
    );
  }

  // Unknown error, rethrow
  throw error;
}
