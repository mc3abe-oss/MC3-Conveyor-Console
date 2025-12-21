/**
 * MODEL VERSION MANAGEMENT
 *
 * Functions for creating, publishing, and managing model versions
 */

import { getSupabaseClient } from './client';
import {
  ModelVersion,
  ModelVersionInsert,
  ModelVersionUpdate,
  ModelVersionFilters,
  PublishVersionResult,
} from './types';
import { SliderbedParameters } from '../../models/sliderbed_v1/schema';

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all model versions with optional filtering
 */
export async function getModelVersions(
  filters?: ModelVersionFilters
): Promise<ModelVersion[]> {
  const supabase = getSupabaseClient();
  let query = supabase.from('model_versions').select('*').order('created_at', { ascending: false });

  if (filters?.model_key) {
    query = query.eq('model_key', filters.model_key);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.created_by) {
    query = query.eq('created_by', filters.created_by);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch model versions: ${error.message}`);
  }

  return data as ModelVersion[];
}

/**
 * Get a specific model version by ID
 */
export async function getModelVersion(id: string): Promise<ModelVersion | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('model_versions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    throw new Error(`Failed to fetch model version: ${error.message}`);
  }

  return data as ModelVersion;
}

/**
 * Get the currently published version for a model
 */
export async function getPublishedVersion(modelKey: string): Promise<ModelVersion | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.rpc('get_published_version', {
    p_model_key: modelKey,
  });

  if (error) {
    throw new Error(`Failed to fetch published version: ${error.message}`);
  }

  return data as ModelVersion | null;
}

/**
 * Get the next available version number for a model
 */
export async function getNextVersionNumber(modelKey: string): Promise<number> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.rpc('get_next_version_number', {
    p_model_key: modelKey,
  });

  if (error) {
    throw new Error(`Failed to get next version number: ${error.message}`);
  }

  return data as number;
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new draft model version
 */
export async function createDraftVersion(
  modelKey: string,
  formulasHash: string,
  parameters: SliderbedParameters,
  createdBy?: string
): Promise<ModelVersion> {
  const supabase = getSupabaseClient();

  // Get next version number
  const versionNumber = await getNextVersionNumber(modelKey);

  const versionData: ModelVersionInsert = {
    model_key: modelKey,
    version_number: versionNumber,
    status: 'draft',
    formulas_hash: formulasHash,
    parameters: parameters as any,
    created_by: createdBy,
  };

  const { data, error } = await supabase
    .from('model_versions')
    .insert(versionData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create draft version: ${error.message}`);
  }

  return data as ModelVersion;
}

/**
 * Update a draft version (only drafts can be updated)
 */
export async function updateDraftVersion(
  id: string,
  updates: ModelVersionUpdate
): Promise<ModelVersion> {
  const supabase = getSupabaseClient();

  // First, verify it's a draft
  const existing = await getModelVersion(id);
  if (!existing) {
    throw new Error('Version not found');
  }

  if (existing.status !== 'draft') {
    throw new Error('Only draft versions can be updated');
  }

  const { data, error } = await supabase
    .from('model_versions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update draft version: ${error.message}`);
  }

  return data as ModelVersion;
}

/**
 * Publish a draft version
 * Requires all fixtures to pass validation
 */
export async function publishVersion(
  id: string,
  publishedBy?: string
): Promise<PublishVersionResult> {
  const supabase = getSupabaseClient();

  // Verify it's a draft
  const existing = await getModelVersion(id);
  if (!existing) {
    return { success: false, errors: ['Version not found'] };
  }

  if (existing.status !== 'draft') {
    return { success: false, errors: ['Only draft versions can be published'] };
  }

  // Check if all fixtures pass
  const { data: fixturesPassed, error: fixturesError } = await supabase.rpc(
    'all_fixtures_pass',
    { p_model_version_id: id }
  );

  if (fixturesError) {
    return {
      success: false,
      errors: [`Failed to validate fixtures: ${fixturesError.message}`],
    };
  }

  if (!fixturesPassed) {
    // Get failed validations
    const { data: failedValidations } = await supabase
      .from('fixture_validation_runs')
      .select('*')
      .eq('model_version_id', id)
      .eq('passed', false);

    return {
      success: false,
      errors: ['Not all fixtures passed validation'],
      validation_failures: failedValidations as any,
    };
  }

  // Archive current published version (if any)
  const currentPublished = await getPublishedVersion(existing.model_key);
  if (currentPublished) {
    await supabase
      .from('model_versions')
      .update({
        status: 'archived',
        archived_at: new Date().toISOString(),
        archived_by: publishedBy,
      } as any)
      .eq('id', currentPublished.id);
  }

  // Publish the version
  const { data, error } = await supabase
    .from('model_versions')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
      published_by: publishedBy,
    } as any)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { success: false, errors: [`Failed to publish version: ${error.message}`] };
  }

  return { success: true, version: data as ModelVersion };
}

/**
 * Archive a version
 */
export async function archiveVersion(id: string, archivedBy?: string): Promise<ModelVersion> {
  const supabase = getSupabaseClient();

  const existing = await getModelVersion(id);
  if (!existing) {
    throw new Error('Version not found');
  }

  if (existing.status === 'archived') {
    throw new Error('Version is already archived');
  }

  const { data, error } = await supabase
    .from('model_versions')
    .update({
      status: 'archived',
      archived_at: new Date().toISOString(),
      archived_by: archivedBy,
    } as any)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to archive version: ${error.message}`);
  }

  return data as ModelVersion;
}

/**
 * Rollback to a previous published version
 * Archives current published version and publishes the specified archived version
 */
export async function rollbackToVersion(
  id: string,
  publishedBy?: string
): Promise<PublishVersionResult> {
  const supabase = getSupabaseClient();

  const targetVersion = await getModelVersion(id);
  if (!targetVersion) {
    return { success: false, errors: ['Version not found'] };
  }

  if (targetVersion.status !== 'archived') {
    return {
      success: false,
      errors: ['Can only rollback to archived versions. Use publishVersion for drafts.'],
    };
  }

  // Archive current published version
  const currentPublished = await getPublishedVersion(targetVersion.model_key);
  if (currentPublished) {
    await supabase
      .from('model_versions')
      .update({
        status: 'archived',
        archived_at: new Date().toISOString(),
        archived_by: publishedBy,
      } as any)
      .eq('id', currentPublished.id);
  }

  // Publish the archived version
  const { data, error } = await supabase
    .from('model_versions')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
      published_by: publishedBy,
    } as any)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { success: false, errors: [`Failed to rollback version: ${error.message}`] };
  }

  return { success: true, version: data as ModelVersion };
}

/**
 * Delete a draft version (only drafts can be deleted)
 */
export async function deleteDraftVersion(id: string): Promise<void> {
  const supabase = getSupabaseClient();

  const existing = await getModelVersion(id);
  if (!existing) {
    throw new Error('Version not found');
  }

  if (existing.status !== 'draft') {
    throw new Error('Only draft versions can be deleted');
  }

  const { error } = await supabase.from('model_versions').delete().eq('id', id);

  if (error) {
    throw new Error(`Failed to delete draft version: ${error.message}`);
  }
}
