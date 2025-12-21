/**
 * DATABASE TYPES
 *
 * TypeScript types matching the Supabase schema
 * Generated from schema.sql
 */

import { SliderbedInputs, SliderbedOutputs, SliderbedParameters } from '../../models/sliderbed_v1/schema';
import { ValidationError, ValidationWarning } from '../../models/sliderbed_v1/schema';

// ============================================================================
// ENUMS
// ============================================================================

export type ModelVersionStatus = 'draft' | 'published' | 'archived';

// ============================================================================
// DATABASE TABLES
// ============================================================================

/**
 * Model Versions Table
 * Stores versioned calculation models
 */
export interface ModelVersion {
  id: string; // UUID
  model_key: string;
  version_number: number;
  status: ModelVersionStatus;
  formulas_hash: string;
  parameters: SliderbedParameters;
  created_by?: string; // UUID
  created_at: string; // ISO 8601
  published_at?: string; // ISO 8601
  published_by?: string; // UUID
  archived_at?: string; // ISO 8601
  archived_by?: string; // UUID
}

/**
 * Calculation Runs Table
 * Immutable audit trail of all calculations
 */
export interface CalculationRun {
  id: string; // UUID
  model_version_id: string; // UUID
  inputs: SliderbedInputs;
  outputs: SliderbedOutputs;
  warnings?: ValidationWarning[];
  errors?: ValidationError[];
  calculated_at: string; // ISO 8601
  execution_time_ms?: number;
  user_id?: string; // UUID
  session_id?: string; // UUID
  tags?: string[];
  notes?: string;
}

/**
 * Test Fixtures Table
 * Excel test cases for model validation
 */
export interface TestFixture {
  id: string; // UUID
  model_key: string;
  name: string;
  description?: string;
  source?: string;
  inputs: SliderbedInputs;
  expected_outputs: Partial<SliderbedOutputs>;
  tolerances?: Partial<Record<keyof SliderbedOutputs, number>>;
  active: boolean;
  created_at: string; // ISO 8601
  created_by?: string; // UUID
  updated_at?: string; // ISO 8601
  updated_by?: string; // UUID
}

/**
 * Fixture Validation Runs Table
 * Results of running fixtures against model versions
 */
export interface FixtureValidationRun {
  id: string; // UUID
  model_version_id: string; // UUID
  test_fixture_id: string; // UUID
  passed: boolean;
  failures?: FieldFailure[];
  actual_outputs: SliderbedOutputs;
  validated_at: string; // ISO 8601
  execution_time_ms?: number;
}

/**
 * Field-level validation failure detail
 */
export interface FieldFailure {
  field: keyof SliderbedOutputs;
  expected: number;
  actual: number;
  diff: number;
  percent_diff: number;
}

/**
 * Parameter Override Presets Table
 * Saved parameter configurations for reuse
 */
export interface ParameterOverridePreset {
  id: string; // UUID
  model_key: string;
  name: string;
  description?: string;
  parameters: Partial<SliderbedParameters>;
  is_public: boolean;
  owner_id: string; // UUID
  created_at: string; // ISO 8601
  updated_at?: string; // ISO 8601
}

// ============================================================================
// INSERT TYPES (for creating new records)
// ============================================================================

export type ModelVersionInsert = Omit<
  ModelVersion,
  'id' | 'created_at' | 'published_at' | 'archived_at'
> & {
  id?: string;
  created_at?: string;
  published_at?: string;
  archived_at?: string;
};

export type CalculationRunInsert = Omit<CalculationRun, 'id' | 'calculated_at'> & {
  id?: string;
  calculated_at?: string;
};

export type TestFixtureInsert = Omit<TestFixture, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type FixtureValidationRunInsert = Omit<
  FixtureValidationRun,
  'id' | 'validated_at'
> & {
  id?: string;
  validated_at?: string;
};

export type ParameterOverridePresetInsert = Omit<
  ParameterOverridePreset,
  'id' | 'created_at' | 'updated_at'
> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

// ============================================================================
// UPDATE TYPES (for updating existing records)
// ============================================================================

export type ModelVersionUpdate = Partial<
  Omit<ModelVersion, 'id' | 'model_key' | 'version_number' | 'created_at' | 'created_by'>
>;

export type TestFixtureUpdate = Partial<
  Omit<TestFixture, 'id' | 'model_key' | 'created_at' | 'created_by'>
>;

export type ParameterOverridePresetUpdate = Partial<
  Omit<ParameterOverridePreset, 'id' | 'model_key' | 'owner_id' | 'created_at'>
>;

// ============================================================================
// QUERY FILTERS
// ============================================================================

export interface ModelVersionFilters {
  model_key?: string;
  status?: ModelVersionStatus;
  created_by?: string;
}

export interface CalculationRunFilters {
  model_version_id?: string;
  user_id?: string;
  session_id?: string;
  tags?: string[];
  date_from?: string;
  date_to?: string;
}

export interface TestFixtureFilters {
  model_key?: string;
  active?: boolean;
  created_by?: string;
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface PublishVersionResult {
  success: boolean;
  version?: ModelVersion;
  errors?: string[];
  validation_failures?: FixtureValidationRun[];
}

export interface FixtureValidationResult {
  fixture_id: string;
  fixture_name: string;
  passed: boolean;
  failures?: FieldFailure[];
}

export interface BulkValidationResult {
  all_passed: boolean;
  total_fixtures: number;
  passed_count: number;
  failed_count: number;
  results: FixtureValidationResult[];
}
