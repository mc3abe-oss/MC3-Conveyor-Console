/**
 * PHASE 1: QUOTE & SALES ORDER TYPES
 *
 * TypeScript types for quotes, sales orders, specs, notes, attachments, scope lines.
 * Matches the database schema from 20251228_quotes_sales_orders.sql
 */

// ============================================================================
// ENUMS
// ============================================================================

export type QuoteStatus = 'draft' | 'sent' | 'won' | 'lost' | 'converted';

export type ParentType = 'quote' | 'sales_order';

export type SpecConfidence = 'estimated' | 'confirmed';

export type SpecSourceType = 'note' | 'attachment' | 'other';

export type AttachmentTag = 'drawing' | 'sketch' | 'email' | 'photo' | 'other';

export type ScopeCategory =
  | 'mechanical'
  | 'electrical'
  | 'controls'
  | 'installation'
  | 'documentation'
  | 'training'
  | 'warranty'
  | 'exclusion'
  | 'other';

export type ScopeInclusion = 'included' | 'excluded';

// ============================================================================
// DATABASE TABLES
// ============================================================================

/**
 * Quote - Represents estimating phase
 * Editable until converted, then becomes read-only
 *
 * Numeric identifier format: Q{base_number}.{line}
 * Examples: Q62633, Q62633.2
 */
export interface Quote {
  id: string; // UUID

  // Primary numeric identifier (new)
  base_number: number;

  // Optional suffix line from dotted input (e.g., 2 for "62633.2")
  suffix_line: number | null;

  // Legacy string identifier (deprecated, use base_number + formatRef)
  quote_number: string | null;

  quote_status: QuoteStatus;
  is_read_only: boolean;
  converted_to_sales_order_id: string | null; // UUID
  customer_name: string | null;
  customer_email: string | null;
  created_by: string | null; // UUID
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  deleted_at: string | null; // ISO 8601 (soft delete)
}

/**
 * Sales Order - Represents job/build phase
 * Created ONLY by converting a Quote
 *
 * Numeric identifier format: SO{base_number}.{line}
 * Examples: SO12345, SO12345.1
 */
export interface SalesOrder {
  id: string; // UUID

  // Primary numeric identifier (new)
  base_number: number;

  // Optional suffix line from dotted input (e.g., 2 for "12345.2")
  suffix_line: number | null;

  // Legacy string identifier (deprecated, use base_number + formatRef)
  sales_order_number: string | null;

  origin_quote_id: string; // UUID (immutable, never null)
  customer_name: string | null;
  customer_email: string | null;
  created_by: string | null; // UUID
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  deleted_at: string | null; // ISO 8601 (soft delete)
}

/**
 * Spec - One fact, one value, one unit
 * ONLY current specs define truth
 */
export interface Spec {
  id: string; // UUID
  parent_type: ParentType;
  parent_id: string; // UUID
  key: string; // snake_case, e.g., 'belt_speed_fpm'
  value: string;
  units: string | null;
  confidence: SpecConfidence;
  source_type: SpecSourceType | null;
  source_id: string | null; // UUID
  is_current: boolean;
  created_by: string | null; // UUID
  created_at: string; // ISO 8601
}

/**
 * Note - Chronological, immutable, timestamped
 * Explains WHY, never WHAT
 */
export interface Note {
  id: string; // UUID
  parent_type: ParentType;
  parent_id: string; // UUID
  content: string;
  created_by: string | null; // UUID
  created_at: string; // ISO 8601
}

/**
 * Attachment - File upload
 * Evidence, not instructions
 */
export interface Attachment {
  id: string; // UUID
  parent_type: ParentType;
  parent_id: string; // UUID
  file_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  tag: AttachmentTag;
  created_by: string | null; // UUID
  created_at: string; // ISO 8601
  deleted_at: string | null; // ISO 8601 (soft delete)
}

/**
 * Scope Line - Structured scope of work entry
 */
export interface ScopeLine {
  id: string; // UUID
  parent_type: ParentType;
  parent_id: string; // UUID
  category: ScopeCategory;
  text: string;
  inclusion: ScopeInclusion;
  position: number;
  version: number;
  created_by: string | null; // UUID
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  deleted_at: string | null; // ISO 8601 (soft delete)
}

// ============================================================================
// INSERT TYPES
// ============================================================================

export type QuoteInsert = Omit<Quote, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'quote_number'> & {
  id?: string;
  quote_number?: string | null; // Optional, deprecated
  created_at?: string;
  updated_at?: string;
};

export type SalesOrderInsert = Omit<SalesOrder, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'sales_order_number'> & {
  id?: string;
  sales_order_number?: string | null; // Optional, deprecated
  created_at?: string;
  updated_at?: string;
};

export type SpecInsert = Omit<Spec, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

export type NoteInsert = Omit<Note, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

export type AttachmentInsert = Omit<Attachment, 'id' | 'created_at' | 'deleted_at'> & {
  id?: string;
  created_at?: string;
};

export type ScopeLineInsert = Omit<ScopeLine, 'id' | 'created_at' | 'updated_at' | 'deleted_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

// ============================================================================
// UPDATE TYPES
// ============================================================================

export type QuoteUpdate = Partial<
  Omit<Quote, 'id' | 'base_number' | 'quote_number' | 'created_at' | 'created_by'>
>;

export type SalesOrderUpdate = Partial<
  Omit<SalesOrder, 'id' | 'base_number' | 'sales_order_number' | 'origin_quote_id' | 'created_at' | 'created_by'>
>;

export type SpecUpdate = Partial<Omit<Spec, 'id' | 'parent_type' | 'parent_id' | 'created_at' | 'created_by'>>;

export type ScopeLineUpdate = Partial<
  Omit<ScopeLine, 'id' | 'parent_type' | 'parent_id' | 'created_at' | 'created_by'>
>;

// ============================================================================
// AGGREGATE TYPES (for API responses)
// ============================================================================

/**
 * Quote with all related entities
 */
export interface QuoteWithRelations extends Quote {
  specs: Spec[];
  notes: Note[];
  attachments: Attachment[];
  scope_lines: ScopeLine[];
  sales_order?: SalesOrder | null; // If converted
}

/**
 * Sales Order with all related entities
 */
export interface SalesOrderWithRelations extends SalesOrder {
  specs: Spec[];
  notes: Note[];
  attachments: Attachment[];
  scope_lines: ScopeLine[];
  origin_quote?: Quote | null; // Source quote
}

// ============================================================================
// CONVERSION TYPES
// ============================================================================

/**
 * Conversion request (no body needed - just converts the quote)
 */
export interface ConvertQuoteRequest {
  quote_id: string;
}

/**
 * Conversion result
 */
export interface ConvertQuoteResult {
  success: boolean;
  sales_order_id?: string;
  sales_order_base_number?: number;
  sales_order_number?: string; // Legacy, deprecated
  error?: string;
}

// ============================================================================
// QUERY FILTERS
// ============================================================================

export interface QuoteFilters {
  quote_status?: QuoteStatus;
  customer_name?: string;
  created_by?: string;
  include_deleted?: boolean;
}

export interface SalesOrderFilters {
  origin_quote_id?: string;
  customer_name?: string;
  created_by?: string;
  include_deleted?: boolean;
}

export interface SpecFilters {
  parent_type: ParentType;
  parent_id: string;
  key?: string;
  is_current?: boolean;
  confidence?: SpecConfidence;
}
