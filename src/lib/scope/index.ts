/**
 * Scope Module
 *
 * Centralized logic for scope status management, revision snapshots,
 * and output gating.
 */

// Output Gate (the authoritative check for output permissions)
export {
  type ScopeEntityType,
  type ScopeStatus,
  type OutputPermissionResult,
  OutputsRequireSetError,
  EntityNotFoundError,
  checkOutputPermission,
  assertOutputsAllowed,
  getScopeStatus,
  createOutputGateErrorResponse,
} from './output-gate';

// Status Management
export {
  type ScopeRevision,
  type StatusTransitionResult,
  type EntityStatusInfo,
  getEntityStatusInfo,
  getLatestRevision,
  getRevisions,
  transitionScopeStatus,
} from './status';

// Snapshot Creation
export {
  type SpecSnapshot,
  type ScopeLineSnapshot,
  type NoteSnapshot,
  type AttachmentSnapshot,
  type ScopeSnapshot,
  createScopeSnapshot,
} from './snapshot';
