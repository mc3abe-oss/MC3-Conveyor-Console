/**
 * Error Taxonomy — stable error code constants for the MC3 Conveyor Console.
 *
 * Codes represent CLASSES of failure, not per-message nuance.
 * Scanned from real failure modes across calculation engines, API routes,
 * drive selection, Supabase calls, auth/RBAC, and middleware.
 */

export const ErrorCodes = {
  // ---------------------------------------------------------------------------
  // Calculation engine — general
  // ---------------------------------------------------------------------------
  CALC_INVALID_GEOMETRY: 'CALC_INVALID_GEOMETRY',
  CALC_MISSING_INPUT: 'CALC_MISSING_INPUT',
  CALC_DIVISION_BY_ZERO: 'CALC_DIVISION_BY_ZERO',
  CALC_OUT_OF_RANGE: 'CALC_OUT_OF_RANGE',
  CALC_PRODUCT_NOT_FOUND: 'CALC_PRODUCT_NOT_FOUND',

  // ---------------------------------------------------------------------------
  // Belt conveyor — validation errors
  // ---------------------------------------------------------------------------
  BELT_INVALID_LENGTH: 'BELT_INVALID_LENGTH',
  BELT_INVALID_WIDTH: 'BELT_INVALID_WIDTH',
  BELT_INVALID_SPEED: 'BELT_INVALID_SPEED',
  BELT_INVALID_INCLINE: 'BELT_INVALID_INCLINE',
  BELT_INCLINE_TOO_STEEP: 'BELT_INCLINE_TOO_STEEP',
  BELT_NO_BELT_SELECTED: 'BELT_NO_BELT_SELECTED',
  BELT_MATERIAL_FORM_REQUIRED: 'BELT_MATERIAL_FORM_REQUIRED',
  BELT_PARTS_PARAMS_REQUIRED: 'BELT_PARTS_PARAMS_REQUIRED',
  BELT_BULK_PARAMS_REQUIRED: 'BELT_BULK_PARAMS_REQUIRED',
  BELT_RED_HOT_MATERIAL: 'BELT_RED_HOT_MATERIAL',
  BELT_INVALID_PULLEY_DIAMETER: 'BELT_INVALID_PULLEY_DIAMETER',
  BELT_INVALID_SHAFT_DIAMETER: 'BELT_INVALID_SHAFT_DIAMETER',
  BELT_INVALID_SPROCKET: 'BELT_INVALID_SPROCKET',
  BELT_VGUIDE_REQUIRED: 'BELT_VGUIDE_REQUIRED',
  BELT_FRAME_CONFIG_MISSING: 'BELT_FRAME_CONFIG_MISSING',
  BELT_SUPPORT_CONFIG_MISSING: 'BELT_SUPPORT_CONFIG_MISSING',
  BELT_HEAVY_SIDE_LOAD: 'BELT_HEAVY_SIDE_LOAD',

  // Belt conveyor — output warnings
  BELT_MIN_PULLEY_VIOLATION: 'BELT_MIN_PULLEY_VIOLATION',
  BELT_TENSION_EXCEEDS_RATING: 'BELT_TENSION_EXCEEDS_RATING',
  BELT_SHAFT_DEFLECTION_HIGH: 'BELT_SHAFT_DEFLECTION_HIGH',
  BELT_SNUB_WRAP_INSUFFICIENT: 'BELT_SNUB_WRAP_INSUFFICIENT',
  BELT_ROLLER_SPACING_EXCESSIVE: 'BELT_ROLLER_SPACING_EXCESSIVE',
  BELT_CASTER_OVERLOAD: 'BELT_CASTER_OVERLOAD',
  BELT_LENGTH_MISSING: 'BELT_LENGTH_MISSING',
  BELT_TOB_MISSING: 'BELT_TOB_MISSING',

  // ---------------------------------------------------------------------------
  // Magnetic conveyor
  // ---------------------------------------------------------------------------
  MAG_INVALID_MATERIAL: 'MAG_INVALID_MATERIAL',
  MAG_INVALID_STYLE_ANGLE: 'MAG_INVALID_STYLE_ANGLE',
  MAG_THROUGHPUT_UNDERSIZED: 'MAG_THROUGHPUT_UNDERSIZED',
  MAG_SPEED_EXCESSIVE: 'MAG_SPEED_EXCESSIVE',
  MAG_CHIP_BRIDGING_RISK: 'MAG_CHIP_BRIDGING_RISK',
  MAG_HEAVY_DUTY_SUGGESTED: 'MAG_HEAVY_DUTY_SUGGESTED',

  // ---------------------------------------------------------------------------
  // Drive / gearmotor selection
  // ---------------------------------------------------------------------------
  DRIVE_NO_MATCH: 'DRIVE_NO_MATCH',
  DRIVE_UNDERSIZED: 'DRIVE_UNDERSIZED',
  DRIVE_INVALID_RPM: 'DRIVE_INVALID_RPM',
  DRIVE_INVALID_TORQUE: 'DRIVE_INVALID_TORQUE',
  DRIVE_INVALID_SERVICE_FACTOR: 'DRIVE_INVALID_SERVICE_FACTOR',
  DRIVE_SPEED_MISMATCH: 'DRIVE_SPEED_MISMATCH',
  DRIVE_SF_LOW: 'DRIVE_SF_LOW',
  DRIVE_TORQUE_MISMATCH: 'DRIVE_TORQUE_MISMATCH',
  DRIVE_CHAIN_RATIO_OUT_OF_RANGE: 'DRIVE_CHAIN_RATIO_OUT_OF_RANGE',
  DRIVE_SMALL_SPROCKET: 'DRIVE_SMALL_SPROCKET',
  DRIVE_BOM_RESOLUTION_FAILED: 'DRIVE_BOM_RESOLUTION_FAILED',

  // ---------------------------------------------------------------------------
  // Configuration save / load
  // ---------------------------------------------------------------------------
  CONFIG_MISSING_REQUIRED: 'CONFIG_MISSING_REQUIRED',
  CONFIG_INVALID_REFERENCE: 'CONFIG_INVALID_REFERENCE',
  CONFIG_REVISION_CONFLICT: 'CONFIG_REVISION_CONFLICT',
  CONFIG_DUPLICATE: 'CONFIG_DUPLICATE',
  CONFIG_NOT_FOUND: 'CONFIG_NOT_FOUND',
  CONFIG_PRODUCT_FAMILY_NOT_FOUND: 'CONFIG_PRODUCT_FAMILY_NOT_FOUND',

  // ---------------------------------------------------------------------------
  // API routes — general
  // ---------------------------------------------------------------------------
  API_INVALID_REQUEST: 'API_INVALID_REQUEST',
  API_METHOD_NOT_ALLOWED: 'API_METHOD_NOT_ALLOWED',
  API_INTERNAL_ERROR: 'API_INTERNAL_ERROR',
  API_ENTITY_NOT_FOUND: 'API_ENTITY_NOT_FOUND',
  API_RESOURCE_IN_USE: 'API_RESOURCE_IN_USE',

  // ---------------------------------------------------------------------------
  // Auth / RBAC
  // ---------------------------------------------------------------------------
  AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
  AUTH_FORBIDDEN: 'AUTH_FORBIDDEN',
  AUTH_SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
  AUTH_USER_DEACTIVATED: 'AUTH_USER_DEACTIVATED',
  AUTH_INSUFFICIENT_ROLE: 'AUTH_INSUFFICIENT_ROLE',
  AUTH_SUPABASE_NOT_CONFIGURED: 'AUTH_SUPABASE_NOT_CONFIGURED',

  // ---------------------------------------------------------------------------
  // Supabase / database
  // ---------------------------------------------------------------------------
  DB_QUERY_FAILED: 'DB_QUERY_FAILED',
  DB_INSERT_FAILED: 'DB_INSERT_FAILED',
  DB_UPDATE_FAILED: 'DB_UPDATE_FAILED',
  DB_DELETE_FAILED: 'DB_DELETE_FAILED',
  DB_NOT_FOUND: 'DB_NOT_FOUND',
  DB_UNIQUE_VIOLATION: 'DB_UNIQUE_VIOLATION',
  DB_RPC_FAILED: 'DB_RPC_FAILED',
  DB_NOT_CONFIGURED: 'DB_NOT_CONFIGURED',

  // ---------------------------------------------------------------------------
  // Catalog lookups
  // ---------------------------------------------------------------------------
  CATALOG_BELT_NOT_FOUND: 'CATALOG_BELT_NOT_FOUND',
  CATALOG_CLEAT_NOT_FOUND: 'CATALOG_CLEAT_NOT_FOUND',
  CATALOG_PULLEY_NOT_FOUND: 'CATALOG_PULLEY_NOT_FOUND',
  CATALOG_VGUIDE_NOT_FOUND: 'CATALOG_VGUIDE_NOT_FOUND',
  CATALOG_GEARMOTOR_NOT_FOUND: 'CATALOG_GEARMOTOR_NOT_FOUND',

  // ---------------------------------------------------------------------------
  // Recipe management
  // ---------------------------------------------------------------------------
  RECIPE_NOT_FOUND: 'RECIPE_NOT_FOUND',
  RECIPE_INVALID_TYPE: 'RECIPE_INVALID_TYPE',
  RECIPE_INVALID_TIER: 'RECIPE_INVALID_TIER',
  RECIPE_PROMOTION_FAILED: 'RECIPE_PROMOTION_FAILED',

  // ---------------------------------------------------------------------------
  // Input validation — schema level
  // ---------------------------------------------------------------------------
  VALIDATION_SCHEMA_FAILED: 'VALIDATION_SCHEMA_FAILED',
  VALIDATION_TYPE_MISMATCH: 'VALIDATION_TYPE_MISMATCH',
  VALIDATION_MISSING_FIELD: 'VALIDATION_MISSING_FIELD',

  // ---------------------------------------------------------------------------
  // Telemetry
  // ---------------------------------------------------------------------------
  TELEMETRY_FLUSH_FAILED: 'TELEMETRY_FLUSH_FAILED',
  TELEMETRY_EVENT_INVALID: 'TELEMETRY_EVENT_INVALID',

  // ---------------------------------------------------------------------------
  // General
  // ---------------------------------------------------------------------------
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  OPERATION_TIMEOUT: 'OPERATION_TIMEOUT',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
