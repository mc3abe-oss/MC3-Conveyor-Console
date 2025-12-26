/**
 * RECIPE SYSTEM - PUBLIC API
 *
 * Provides validation, regression testing, and drift detection for calculations.
 */

// Types
export * from './types';

// Hashing
export { canonicalStringify, hashCanonical, stripUndefined } from './hash';

// Comparison
export {
  getFieldType,
  getDefaultTolerance,
  getDefaultTolerancesForAllFields,
  compareField,
  compareOutputs,
  compareIssues,
} from './compare';

// Runner
export {
  getModelVersionInfo,
  normalizeInputs,
  runRecipe,
  runRecipes,
  formatRunResult,
} from './runner';

// CI
export {
  shouldBlockCI,
  checkCIBlocking,
  getCIExitCode,
  filterRecipesForCI,
} from './ci';
