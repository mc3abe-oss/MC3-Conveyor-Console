/**
 * DATABASE MODULE - PUBLIC API
 *
 * Complete database layer for Supabase integration
 */

// Client
export { getSupabaseClient, createSupabaseClient, resetSupabaseClient } from './client';

// Types
export * from './types';
export type { Database } from './database.types';

// Model Versions
export {
  getModelVersions,
  getModelVersion,
  getPublishedVersion,
  getNextVersionNumber,
  createDraftVersion,
  updateDraftVersion,
  publishVersion,
  archiveVersion,
  rollbackToVersion,
  deleteDraftVersion,
} from './model-versions';

// Calculation Runs
export {
  getCalculationRuns,
  getCalculationRun,
  getCalculationStats,
  saveCalculationRun,
  saveCalculationRunsBulk,
  updateCalculationTags,
  updateCalculationNotes,
  deleteCalculationRuns,
} from './calculation-runs';

// Test Fixtures
export {
  getTestFixtures,
  getTestFixture,
  getValidationRuns,
  createTestFixture,
  updateTestFixture,
  deactivateTestFixture,
  deleteTestFixture,
  runFixtureValidation,
  runAllFixtureValidations,
  getValidationSummary,
} from './fixtures';
