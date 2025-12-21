/**
 * TEST FIXTURE MANAGEMENT
 *
 * Functions for managing test fixtures and validation
 */

import { getSupabaseClient } from './client';
import {
  TestFixture,
  TestFixtureInsert,
  TestFixtureUpdate,
  TestFixtureFilters,
  FixtureValidationRun,
  FixtureValidationRunInsert,
  BulkValidationResult,
  FixtureValidationResult,
  FieldFailure,
} from './types';
import { calculate } from '../../models/sliderbed_v1/formulas';
import { SliderbedParameters, SliderbedOutputs } from '../../models/sliderbed_v1/schema';
import { compareOutputs, DEFAULT_TOLERANCE } from '../../models/sliderbed_v1/fixtures';

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get test fixtures with optional filtering
 */
export async function getTestFixtures(filters?: TestFixtureFilters): Promise<TestFixture[]> {
  const supabase = getSupabaseClient();

  let query = supabase.from('test_fixtures').select('*').order('created_at', { ascending: false });

  if (filters?.model_key) {
    query = query.eq('model_key', filters.model_key);
  }

  if (filters?.active !== undefined) {
    query = query.eq('active', filters.active);
  }

  if (filters?.created_by) {
    query = query.eq('created_by', filters.created_by);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch test fixtures: ${error.message}`);
  }

  return data as TestFixture[];
}

/**
 * Get a specific test fixture by ID
 */
export async function getTestFixture(id: string): Promise<TestFixture | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.from('test_fixtures').select('*').eq('id', id).single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch test fixture: ${error.message}`);
  }

  return data as TestFixture;
}

/**
 * Get validation runs for a model version
 */
export async function getValidationRuns(
  modelVersionId: string
): Promise<FixtureValidationRun[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('fixture_validation_runs')
    .select('*')
    .eq('model_version_id', modelVersionId)
    .order('validated_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch validation runs: ${error.message}`);
  }

  return data as FixtureValidationRun[];
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new test fixture
 */
export async function createTestFixture(
  fixtureData: Omit<TestFixtureInsert, 'id' | 'created_at'>,
  createdBy?: string
): Promise<TestFixture> {
  const supabase = getSupabaseClient();

  const insert: TestFixtureInsert = {
    ...fixtureData,
    created_by: createdBy,
  };

  const { data, error } = await supabase
    .from('test_fixtures')
    .insert(insert as any)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test fixture: ${error.message}`);
  }

  return data as TestFixture;
}

/**
 * Update a test fixture
 */
export async function updateTestFixture(
  id: string,
  updates: TestFixtureUpdate,
  updatedBy?: string
): Promise<TestFixture> {
  const supabase = getSupabaseClient();

  const updateData = {
    ...updates,
    updated_at: new Date().toISOString(),
    updated_by: updatedBy,
  };

  const { data, error } = await supabase
    .from('test_fixtures')
    .update(updateData as any)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update test fixture: ${error.message}`);
  }

  return data as TestFixture;
}

/**
 * Deactivate a test fixture (soft delete)
 */
export async function deactivateTestFixture(id: string, updatedBy?: string): Promise<TestFixture> {
  return updateTestFixture(id, { active: false }, updatedBy);
}

/**
 * Delete a test fixture (hard delete - use sparingly)
 */
export async function deleteTestFixture(id: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.from('test_fixtures').delete().eq('id', id);

  if (error) {
    throw new Error(`Failed to delete test fixture: ${error.message}`);
  }
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate a single fixture against calculated outputs
 */
function validateFixture(
  fixture: TestFixture,
  actualOutputs: SliderbedOutputs
): FixtureValidationResult {
  const tolerance =
    typeof fixture.tolerances === 'object' && fixture.tolerances !== null
      ? (fixture.tolerances as Partial<Record<keyof SliderbedOutputs, number>>)
      : DEFAULT_TOLERANCE;

  const { passed, failures: failureMessages } = compareOutputs(
    actualOutputs,
    fixture.expected_outputs,
    tolerance
  );

  // Parse failures into structured format
  const failures: FieldFailure[] = failureMessages.map((msg) => {
    const match = msg.match(
      /^(.+): expected (.+), got (.+) \((.+)% difference\)$/
    );
    if (match) {
      const [, field, expected, actual, percentDiff] = match;
      return {
        field: field as keyof SliderbedOutputs,
        expected: parseFloat(expected),
        actual: parseFloat(actual),
        diff: parseFloat(actual) - parseFloat(expected),
        percent_diff: parseFloat(percentDiff),
      };
    }
    // Fallback for non-numeric comparisons
    return {
      field: 'unknown' as keyof SliderbedOutputs,
      expected: 0,
      actual: 0,
      diff: 0,
      percent_diff: 0,
    };
  });

  return {
    fixture_id: fixture.id,
    fixture_name: fixture.name,
    passed,
    failures: failures.length > 0 ? failures : undefined,
  };
}

/**
 * Run a single fixture validation and save to database
 */
export async function runFixtureValidation(
  modelVersionId: string,
  fixtureId: string,
  parameters: SliderbedParameters
): Promise<FixtureValidationRun> {
  const supabase = getSupabaseClient();

  // Fetch fixture
  const fixture = await getTestFixture(fixtureId);
  if (!fixture) {
    throw new Error('Test fixture not found');
  }

  // Run calculation
  const startTime = Date.now();
  const actualOutputs = calculate(fixture.inputs as any, parameters);
  const executionTimeMs = Date.now() - startTime;

  // Validate
  const validation = validateFixture(fixture, actualOutputs);

  // Save validation run
  const validationData: FixtureValidationRunInsert = {
    model_version_id: modelVersionId,
    test_fixture_id: fixtureId,
    passed: validation.passed,
    failures: validation.failures as any,
    actual_outputs: actualOutputs as any,
    execution_time_ms: executionTimeMs,
  };

  const { data, error } = await supabase
    .from('fixture_validation_runs')
    .insert(validationData as any)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save validation run: ${error.message}`);
  }

  return data as FixtureValidationRun;
}

/**
 * Run all active fixtures for a model and save results
 */
export async function runAllFixtureValidations(
  modelVersionId: string,
  modelKey: string,
  parameters: SliderbedParameters
): Promise<BulkValidationResult> {
  // Get all active fixtures for this model
  const fixtures = await getTestFixtures({ model_key: modelKey, active: true });

  const results: FixtureValidationResult[] = [];

  // Run each fixture
  for (const fixture of fixtures) {
    try {
      const validationRun = await runFixtureValidation(
        modelVersionId,
        fixture.id,
        parameters
      );

      results.push({
        fixture_id: fixture.id,
        fixture_name: fixture.name,
        passed: validationRun.passed,
        failures: validationRun.failures as FieldFailure[] | undefined,
      });
    } catch (error) {
      // Log error but continue with other fixtures
      console.error(`Failed to validate fixture ${fixture.name}:`, error);
      results.push({
        fixture_id: fixture.id,
        fixture_name: fixture.name,
        passed: false,
        failures: [
          {
            field: 'unknown' as keyof SliderbedOutputs,
            expected: 0,
            actual: 0,
            diff: 0,
            percent_diff: 0,
          },
        ],
      });
    }
  }

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.length - passedCount;

  return {
    all_passed: failedCount === 0 && results.length > 0,
    total_fixtures: results.length,
    passed_count: passedCount,
    failed_count: failedCount,
    results,
  };
}

/**
 * Get validation summary for a model version
 */
export async function getValidationSummary(modelVersionId: string): Promise<{
  total_validations: number;
  passed: number;
  failed: number;
  last_validated_at: string | null;
}> {
  const validations = await getValidationRuns(modelVersionId);

  if (validations.length === 0) {
    return {
      total_validations: 0,
      passed: 0,
      failed: 0,
      last_validated_at: null,
    };
  }

  const passed = validations.filter((v) => v.passed).length;
  const failed = validations.length - passed;
  const lastValidatedAt = validations[0].validated_at; // Already sorted desc

  return {
    total_validations: validations.length,
    passed,
    failed,
    last_validated_at: lastValidatedAt,
  };
}
