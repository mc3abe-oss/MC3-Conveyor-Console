/**
 * Scope Snapshot Creation
 *
 * Captures the complete scope state for a Quote or Sales Order at a point in time.
 * Used when transitioning to Set status to create an immutable revision record.
 */

import { createClient } from '../supabase/server';
import { ScopeEntityType } from './output-gate';

// ============================================================================
// Types
// ============================================================================

export interface SpecSnapshot {
  id: string;
  key: string;
  value: string;
  units: string | null;
  confidence: 'estimated' | 'confirmed';
  source_type: string | null;
  source_id: string | null;
}

export interface ScopeLineSnapshot {
  id: string;
  category: string;
  text: string;
  inclusion: 'included' | 'excluded';
  position: number;
  version: number;
}

export interface NoteSnapshot {
  id: string;
  content: string;
  created_at: string;
  created_by: string | null;
}

export interface AttachmentSnapshot {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  tag: string;
}

export interface ScopeSnapshot {
  captured_at: string;
  specs: SpecSnapshot[];
  scope_lines: ScopeLineSnapshot[];
  notes: NoteSnapshot[];
  attachments: AttachmentSnapshot[];
  linked_application_ids: string[];
}

// ============================================================================
// Snapshot Creation
// ============================================================================

/**
 * Create a complete scope snapshot for an entity.
 * Captures all current specs, scope_lines, notes, attachments, and linked applications.
 *
 * @param entityType - 'quote' or 'sales_order'
 * @param entityId - UUID of the entity
 * @returns ScopeSnapshot
 */
export async function createScopeSnapshot(
  entityType: ScopeEntityType,
  entityId: string
): Promise<ScopeSnapshot> {
  const supabase = await createClient();
  const parentType = entityType === 'quote' ? 'quote' : 'sales_order';

  // Fetch all scope data in parallel
  const [specsResult, scopeLinesResult, notesResult, attachmentsResult, applicationsResult] =
    await Promise.all([
      // Specs (only is_current=true)
      supabase
        .from('specs')
        .select('id, key, value, units, confidence, source_type, source_id')
        .eq('parent_type', parentType)
        .eq('parent_id', entityId)
        .eq('is_current', true),

      // Scope lines (not deleted)
      supabase
        .from('scope_lines')
        .select('id, category, text, inclusion, position, version')
        .eq('parent_type', parentType)
        .eq('parent_id', entityId)
        .is('deleted_at', null)
        .order('position', { ascending: true }),

      // Notes
      supabase
        .from('notes')
        .select('id, content, created_at, created_by')
        .eq('parent_type', parentType)
        .eq('parent_id', entityId)
        .order('created_at', { ascending: true }),

      // Attachments (not deleted)
      supabase
        .from('attachments')
        .select('id, file_name, file_path, file_size, mime_type, tag')
        .eq('parent_type', parentType)
        .eq('parent_id', entityId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true }),

      // Linked applications (calc_recipes)
      entityType === 'quote'
        ? supabase
            .from('calc_recipes')
            .select('id')
            .eq('quote_id', entityId)
            .is('deleted_at', null)
        : supabase
            .from('calc_recipes')
            .select('id')
            .eq('sales_order_id', entityId)
            .is('deleted_at', null),
    ]);

  return {
    captured_at: new Date().toISOString(),
    specs: (specsResult.data || []) as SpecSnapshot[],
    scope_lines: (scopeLinesResult.data || []) as ScopeLineSnapshot[],
    notes: (notesResult.data || []) as NoteSnapshot[],
    attachments: (attachmentsResult.data || []) as AttachmentSnapshot[],
    linked_application_ids: (applicationsResult.data || []).map((a: { id: string }) => a.id),
  };
}
