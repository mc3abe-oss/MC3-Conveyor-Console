/**
 * CALCULATION RUNS MANAGEMENT
 *
 * Functions for persisting and querying calculation audit trail
 */

import { getSupabaseClient } from './client';
import { CalculationRun, CalculationRunInsert, CalculationRunFilters } from './types';
import { CalculationResult } from '../../models/sliderbed_v1/schema';

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get calculation runs with optional filtering
 */
export async function getCalculationRuns(
  filters?: CalculationRunFilters,
  limit: number = 100,
  offset: number = 0
): Promise<{ runs: CalculationRun[]; total: number }> {
  const supabase = getSupabaseClient();

  let query = supabase
    .from('calculation_runs')
    .select('*', { count: 'exact' })
    .order('calculated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters?.model_version_id) {
    query = query.eq('model_version_id', filters.model_version_id);
  }

  if (filters?.user_id) {
    query = query.eq('user_id', filters.user_id);
  }

  if (filters?.session_id) {
    query = query.eq('session_id', filters.session_id);
  }

  if (filters?.tags && filters.tags.length > 0) {
    query = query.overlaps('tags', filters.tags);
  }

  if (filters?.date_from) {
    query = query.gte('calculated_at', filters.date_from);
  }

  if (filters?.date_to) {
    query = query.lte('calculated_at', filters.date_to);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch calculation runs: ${error.message}`);
  }

  return {
    runs: (data as CalculationRun[]) || [],
    total: count || 0,
  };
}

/**
 * Get a specific calculation run by ID
 */
export async function getCalculationRun(id: string): Promise<CalculationRun | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('calculation_runs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch calculation run: ${error.message}`);
  }

  return data as CalculationRun;
}

/**
 * Get calculation run statistics for a model version
 */
export async function getCalculationStats(modelVersionId: string): Promise<{
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  avg_execution_time_ms: number | null;
  last_run_at: string | null;
}> {
  const supabase = getSupabaseClient();

  const { data: runs, error } = await supabase
    .from('calculation_runs')
    .select('errors, execution_time_ms, calculated_at')
    .eq('model_version_id', modelVersionId);

  if (error) {
    throw new Error(`Failed to fetch calculation stats: ${error.message}`);
  }

  if (!runs || runs.length === 0) {
    return {
      total_runs: 0,
      successful_runs: 0,
      failed_runs: 0,
      avg_execution_time_ms: null,
      last_run_at: null,
    };
  }

  const totalRuns = runs.length;
  const failedRuns = runs.filter((r) => r.errors && (r.errors as any[]).length > 0).length;
  const successfulRuns = totalRuns - failedRuns;

  const executionTimes = runs
    .map((r) => r.execution_time_ms)
    .filter((t): t is number => t !== null);

  const avgExecutionTime =
    executionTimes.length > 0
      ? executionTimes.reduce((sum, t) => sum + t, 0) / executionTimes.length
      : null;

  const lastRunAt = runs.reduce((latest, run) => {
    return !latest || run.calculated_at > latest ? run.calculated_at : latest;
  }, null as string | null);

  return {
    total_runs: totalRuns,
    successful_runs: successfulRuns,
    failed_runs: failedRuns,
    avg_execution_time_ms: avgExecutionTime,
    last_run_at: lastRunAt,
  };
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Save a calculation run to the database
 */
export async function saveCalculationRun(
  modelVersionId: string,
  inputs: any,
  result: CalculationResult,
  executionTimeMs?: number,
  userId?: string,
  sessionId?: string,
  tags?: string[],
  notes?: string
): Promise<CalculationRun> {
  const supabase = getSupabaseClient();

  const runData: CalculationRunInsert = {
    model_version_id: modelVersionId,
    inputs: inputs as any,
    outputs: result.outputs as any,
    warnings: result.warnings as any,
    errors: result.errors as any,
    execution_time_ms: executionTimeMs,
    user_id: userId,
    session_id: sessionId,
    tags,
    notes,
  };

  const { data, error } = await supabase
    .from('calculation_runs')
    .insert(runData as any)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save calculation run: ${error.message}`);
  }

  return data as CalculationRun;
}

/**
 * Bulk save calculation runs (for batch processing)
 */
export async function saveCalculationRunsBulk(
  runs: CalculationRunInsert[]
): Promise<CalculationRun[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('calculation_runs')
    .insert(runs as any)
    .select();

  if (error) {
    throw new Error(`Failed to save calculation runs: ${error.message}`);
  }

  return data as CalculationRun[];
}

/**
 * Update tags on an existing calculation run
 */
export async function updateCalculationTags(id: string, tags: string[]): Promise<CalculationRun> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('calculation_runs')
    .update({ tags } as any)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update calculation tags: ${error.message}`);
  }

  return data as CalculationRun;
}

/**
 * Update notes on an existing calculation run
 */
export async function updateCalculationNotes(id: string, notes: string): Promise<CalculationRun> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('calculation_runs')
    .update({ notes } as any)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update calculation notes: ${error.message}`);
  }

  return data as CalculationRun;
}

/**
 * Delete calculation runs (use sparingly - prefer archiving)
 */
export async function deleteCalculationRuns(ids: string[]): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.from('calculation_runs').delete().in('id', ids);

  if (error) {
    throw new Error(`Failed to delete calculation runs: ${error.message}`);
  }
}
