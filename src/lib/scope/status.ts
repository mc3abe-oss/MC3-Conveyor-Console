/**
 * Scope Status Management
 *
 * Handles Draft ⇄ Set transitions for Quotes and Sales Orders.
 * Creates revision snapshots on Draft → Set transitions.
 */

import { createClient } from '../supabase/server';
import { ScopeEntityType, ScopeStatus } from './output-gate';
import { createScopeSnapshot } from './snapshot';

// ============================================================================
// Types
// ============================================================================

export interface ScopeRevision {
  id: string;
  entity_type: ScopeEntityType;
  entity_id: string;
  revision_number: number;
  status_at_creation: 'set';
  snapshot_json: Record<string, unknown>;
  snapshot_hash: string | null;
  created_at: string;
  created_by_user_id: string | null;
}

export interface StatusTransitionResult {
  success: boolean;
  status: ScopeStatus;
  revision?: {
    id: string;
    revision_number: number;
  };
  error?: string;
}

export interface EntityStatusInfo {
  id: string;
  scope_status: ScopeStatus;
  current_revision_id: string | null;
  current_revision_number: number | null;
}

// ============================================================================
// Status Queries
// ============================================================================

/**
 * Get the current status info for an entity.
 */
export async function getEntityStatusInfo(
  entityType: ScopeEntityType,
  entityId: string
): Promise<EntityStatusInfo | null> {
  const supabase = await createClient();
  const tableName = entityType === 'quote' ? 'quotes' : 'sales_orders';

  const { data, error } = await supabase
    .from(tableName)
    .select('id, scope_status, current_revision_id, current_revision_number')
    .eq('id', entityId)
    .is('deleted_at', null)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    scope_status: (data.scope_status || 'draft') as ScopeStatus,
    current_revision_id: data.current_revision_id,
    current_revision_number: data.current_revision_number,
  };
}

/**
 * Get the latest revision for an entity.
 */
export async function getLatestRevision(
  entityType: ScopeEntityType,
  entityId: string
): Promise<ScopeRevision | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('scope_revisions')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('revision_number', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return data as ScopeRevision;
}

/**
 * Get all revisions for an entity.
 */
export async function getRevisions(
  entityType: ScopeEntityType,
  entityId: string
): Promise<ScopeRevision[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('scope_revisions')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('revision_number', { ascending: false });

  if (error) {
    return [];
  }

  return (data || []) as ScopeRevision[];
}

// ============================================================================
// Status Transitions
// ============================================================================

/**
 * Transition an entity's scope status.
 *
 * Draft → Set: Creates a new revision snapshot
 * Set → Draft: No revision created, keeps existing revision references
 *
 * @param entityType - 'quote' or 'sales_order'
 * @param entityId - UUID of the entity
 * @param newStatus - Target status ('draft' or 'set')
 * @param userId - Current user's ID (for audit)
 * @returns StatusTransitionResult
 */
export async function transitionScopeStatus(
  entityType: ScopeEntityType,
  entityId: string,
  newStatus: ScopeStatus,
  userId: string | null
): Promise<StatusTransitionResult> {
  const supabase = await createClient();
  const tableName = entityType === 'quote' ? 'quotes' : 'sales_orders';

  // Get current status
  const currentInfo = await getEntityStatusInfo(entityType, entityId);
  if (!currentInfo) {
    return {
      success: false,
      status: 'draft',
      error: `${entityType} not found: ${entityId}`,
    };
  }

  // If already in target status, return success (idempotent)
  if (currentInfo.scope_status === newStatus) {
    return {
      success: true,
      status: newStatus,
      revision: currentInfo.current_revision_id
        ? {
            id: currentInfo.current_revision_id,
            revision_number: currentInfo.current_revision_number || 0,
          }
        : undefined,
    };
  }

  // Handle Set → Draft (no revision created)
  if (newStatus === 'draft') {
    const { error } = await supabase
      .from(tableName)
      .update({
        scope_status: 'draft',
        updated_at: new Date().toISOString(),
      })
      .eq('id', entityId);

    if (error) {
      return {
        success: false,
        status: currentInfo.scope_status,
        error: `Failed to update status: ${error.message}`,
      };
    }

    return {
      success: true,
      status: 'draft',
      // Keep existing revision info for display
      revision: currentInfo.current_revision_id
        ? {
            id: currentInfo.current_revision_id,
            revision_number: currentInfo.current_revision_number || 0,
          }
        : undefined,
    };
  }

  // Handle Draft → Set (creates new revision)
  // 1. Create snapshot
  const snapshot = await createScopeSnapshot(entityType, entityId);

  // 2. Get next revision number (with locking via RPC)
  const { data: nextRevNum, error: rpcError } = await supabase.rpc(
    'get_next_scope_revision_number',
    {
      p_entity_type: entityType,
      p_entity_id: entityId,
    }
  );

  if (rpcError) {
    return {
      success: false,
      status: 'draft',
      error: `Failed to get next revision number: ${rpcError.message}`,
    };
  }

  const revisionNumber = nextRevNum as number;

  // 3. Insert revision row
  const { data: revision, error: insertError } = await supabase
    .from('scope_revisions')
    .insert({
      entity_type: entityType,
      entity_id: entityId,
      revision_number: revisionNumber,
      status_at_creation: 'set',
      snapshot_json: snapshot,
      created_by_user_id: userId,
    })
    .select('id, revision_number')
    .single();

  if (insertError || !revision) {
    return {
      success: false,
      status: 'draft',
      error: `Failed to create revision: ${insertError?.message || 'unknown error'}`,
    };
  }

  // 4. Update entity status and revision pointers
  const { error: updateError } = await supabase
    .from(tableName)
    .update({
      scope_status: 'set',
      current_revision_id: revision.id,
      current_revision_number: revision.revision_number,
      updated_at: new Date().toISOString(),
    })
    .eq('id', entityId);

  if (updateError) {
    // Rollback: delete the revision we just created
    await supabase.from('scope_revisions').delete().eq('id', revision.id);

    return {
      success: false,
      status: 'draft',
      error: `Failed to update entity status: ${updateError.message}`,
    };
  }

  return {
    success: true,
    status: 'set',
    revision: {
      id: revision.id,
      revision_number: revision.revision_number,
    },
  };
}
