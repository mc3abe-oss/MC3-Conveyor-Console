/**
 * Product Registry Type Definitions
 *
 * Defines the interfaces for the product module system that enables:
 * - Registration of product calculation modules
 * - Schema-driven output field definitions
 * - Fail-closed card rendering gates
 * - Product-specific UI configurations
 */

// =============================================================================
// INPUT FIELD DEFINITIONS
// =============================================================================

/**
 * Defines an input field for a product's configurator UI.
 */
export interface InputFieldDef {
  /** Unique key matching the input property name */
  key: string;
  /** Display label for the field */
  label: string;
  /** Field type for rendering appropriate input control */
  type: 'number' | 'string' | 'boolean' | 'enum' | 'select';
  /** Unit of measurement (e.g., 'in', 'ft', 'lbs', 'fpm') */
  unit?: string;
  /** Whether the field is required */
  required: boolean;
  /** Default value for the field */
  defaultValue?: unknown;
  /** Options for enum/select fields: { value, label }[] */
  enumOptions?: Array<{ value: string | number; label: string }>;
  /** Minimum value for number fields */
  min?: number;
  /** Maximum value for number fields */
  max?: number;
  /** Step increment for number fields */
  step?: number;
}

// =============================================================================
// OUTPUT FIELD DEFINITIONS
// =============================================================================

/**
 * Defines an output field that a product calculation produces.
 * Used for schema validation and UI rendering.
 */
export interface OutputFieldDef {
  /** Unique key matching the output property name */
  key: string;
  /** Display label for the field */
  label: string;
  /** Data type of the output */
  type: 'number' | 'string' | 'boolean' | 'array' | 'object';
  /** Unit of measurement for display */
  unit?: string;
  /** Decimal precision for number display */
  precision?: number;
  /** Category grouping for UI organization */
  category?: string;
}

// =============================================================================
// UI CONFIGURATION
// =============================================================================

/**
 * Tab configuration for the outputs UI.
 */
export interface TabConfig {
  /** Unique tab identifier */
  id: string;
  /** Display label */
  label: string;
  /** Card IDs to render in this tab */
  cardIds: string[];
}

/**
 * Card configuration for output display.
 */
export interface CardConfig {
  /** Unique card identifier */
  id: string;
  /** Card title */
  title: string;
  /** Component name or type to render */
  component: string;
  /** Output keys required to render this card - FAIL-CLOSED if any missing */
  requiresOutputKeys: string[];
  /** Optional category for grouping */
  category?: string;
}

/**
 * Complete UI configuration for a product.
 */
export interface ProductUIConfig {
  /** Tab definitions */
  tabs: TabConfig[];
  /** Card definitions */
  cards: CardConfig[];
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validation result from input or output validation.
 */
export interface ValidationResult {
  /** Severity level */
  severity: 'error' | 'warning' | 'info';
  /** Field that triggered the validation */
  field: string;
  /** Unique code for programmatic handling */
  code: string;
  /** Human-readable message */
  message: string;
}

// =============================================================================
// PRODUCT MODULE
// =============================================================================

/**
 * Complete product module definition.
 *
 * A product module encapsulates everything needed to:
 * - Accept user inputs
 * - Calculate outputs
 * - Validate inputs/outputs
 * - Build v2 output format
 * - Configure UI
 *
 * @template TInputs - Type of product inputs
 * @template TOutputs - Type of product outputs
 * @template TParams - Type of calculation parameters (optional)
 */
export interface ProductModule<
  TInputs = Record<string, unknown>,
  TOutputs = Record<string, unknown>,
  TParams = Record<string, unknown>
> {
  /** Unique product key (e.g., 'magnetic_conveyor_v1') */
  key: string;

  /** Human-readable product name */
  name: string;

  /** Semantic version string */
  version: string;

  /** Input field definitions */
  inputsSchema: InputFieldDef[];

  /** Output field definitions - CRITICAL for fail-closed gating */
  outputsSchema: OutputFieldDef[];

  /** Optional parameter field definitions */
  parametersSchema?: InputFieldDef[];

  /** Returns default input values */
  getDefaultInputs: () => TInputs;

  /** Returns default parameter values (if applicable) */
  getDefaultParameters?: () => TParams;

  /** Main calculation function: inputs -> outputs */
  calculate: (inputs: TInputs, params?: TParams) => TOutputs;

  /** Validation function: returns validation results */
  validate: (inputs: TInputs) => ValidationResult[];

  /** Build OutputsV2 format from inputs and calculated outputs */
  buildOutputsV2: (inputs: TInputs, outputs: TOutputs) => unknown;

  /** UI configuration */
  ui: ProductUIConfig;
}
