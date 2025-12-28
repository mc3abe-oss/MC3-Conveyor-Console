-- ============================================================================
-- PHASE 1: QUOTES, SALES ORDERS, SPECS, NOTES, ATTACHMENTS, SCOPE LINES
-- ============================================================================
--
-- Core rules (non-negotiable):
-- 1. A Quote is immutable history once converted.
-- 2. A Sales Order is a new object created from a Quote.
-- 3. Conversion is COPY, not TRANSFORM.
-- 4. Quotes and Sales Orders must be permanently linked.
-- 5. Designers must never infer truth from notes or attachments.
-- 6. ONLY Specs define current truth.
--
-- ============================================================================

-- ============================================================================
-- TABLE: quotes
-- ============================================================================
-- Represents estimating phase. Editable until converted.
-- Once converted: becomes READ-ONLY, never mutated.

CREATE TABLE quotes (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Numeric identifier: base_number is the primary ID, line is optional
  -- Display format: Q{base_number}.{line} e.g., Q62633.2
  base_number INTEGER NOT NULL,

  -- Legacy string identifier (kept for backward compatibility)
  quote_number TEXT UNIQUE,

  -- Status lifecycle
  quote_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (quote_status IN ('draft', 'sent', 'won', 'lost', 'converted')),
  is_read_only BOOLEAN NOT NULL DEFAULT false,

  -- Bidirectional link to sales order (set on conversion)
  converted_to_sales_order_id UUID,

  -- Customer info (optional, placeholder for future)
  customer_name TEXT,
  customer_email TEXT,

  -- Audit
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ  -- Soft delete
);

-- Unique constraint on base_number (primary identifier)
CREATE UNIQUE INDEX idx_quotes_base_number ON quotes(base_number);

-- Indexes
CREATE INDEX idx_quotes_quote_number ON quotes(quote_number) WHERE quote_number IS NOT NULL;
CREATE INDEX idx_quotes_quote_status ON quotes(quote_status);
CREATE INDEX idx_quotes_created_at ON quotes(created_at DESC);
CREATE INDEX idx_quotes_deleted_at ON quotes(deleted_at) WHERE deleted_at IS NULL;

-- Comments
COMMENT ON TABLE quotes IS 'Quotes for estimating phase. Immutable once converted.';
COMMENT ON COLUMN quotes.base_number IS 'Numeric identifier. Display as Q{base_number}';
COMMENT ON COLUMN quotes.quote_number IS 'Legacy string identifier (deprecated, use base_number)';
COMMENT ON COLUMN quotes.quote_status IS 'Lifecycle: draft → sent → won/lost → converted';
COMMENT ON COLUMN quotes.is_read_only IS 'Set true on conversion. Prevents all mutations.';
COMMENT ON COLUMN quotes.converted_to_sales_order_id IS 'Bidirectional link to created sales order';

-- ============================================================================
-- TABLE: sales_orders
-- ============================================================================
-- Represents a job/build. Created ONLY by converting a Quote.
-- Specs may evolve independently after creation.

CREATE TABLE sales_orders (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Numeric identifier: base_number is the primary ID
  -- Display format: SO{base_number}.{line} e.g., SO12345.1
  base_number INTEGER NOT NULL,

  -- Legacy string identifier (kept for backward compatibility)
  sales_order_number TEXT UNIQUE,

  -- Origin link (immutable, mandatory)
  origin_quote_id UUID NOT NULL,

  -- Customer info (copied from quote or editable)
  customer_name TEXT,
  customer_email TEXT,

  -- Audit
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ  -- Soft delete
);

-- Add foreign key after both tables exist
ALTER TABLE sales_orders
  ADD CONSTRAINT fk_sales_orders_origin_quote
  FOREIGN KEY (origin_quote_id) REFERENCES quotes(id);

-- Add foreign key for quotes.converted_to_sales_order_id
ALTER TABLE quotes
  ADD CONSTRAINT fk_quotes_converted_to_sales_order
  FOREIGN KEY (converted_to_sales_order_id) REFERENCES sales_orders(id);

-- Unique constraint on base_number (primary identifier)
CREATE UNIQUE INDEX idx_sales_orders_base_number ON sales_orders(base_number);

-- Indexes
CREATE INDEX idx_sales_orders_sales_order_number ON sales_orders(sales_order_number) WHERE sales_order_number IS NOT NULL;
CREATE INDEX idx_sales_orders_origin_quote_id ON sales_orders(origin_quote_id);
CREATE INDEX idx_sales_orders_created_at ON sales_orders(created_at DESC);
CREATE INDEX idx_sales_orders_deleted_at ON sales_orders(deleted_at) WHERE deleted_at IS NULL;

-- Comments
COMMENT ON TABLE sales_orders IS 'Sales orders created by converting quotes. Job/build phase.';
COMMENT ON COLUMN sales_orders.base_number IS 'Numeric identifier. Display as SO{base_number}';
COMMENT ON COLUMN sales_orders.sales_order_number IS 'Legacy string identifier (deprecated, use base_number)';
COMMENT ON COLUMN sales_orders.origin_quote_id IS 'Immutable link to source quote. Never null, never changed.';

-- ============================================================================
-- TABLE: specs
-- ============================================================================
-- One fact, one value, one unit. Only current specs are truth.
-- Updating a spec creates a NEW ROW; previous rows set is_current = false.

CREATE TABLE specs (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Parent polymorphic reference
  parent_type TEXT NOT NULL CHECK (parent_type IN ('quote', 'sales_order')),
  parent_id UUID NOT NULL,

  -- Spec data
  key TEXT NOT NULL,  -- e.g., 'belt_speed_fpm', 'conveyor_length_ft'
  value TEXT NOT NULL,
  units TEXT,  -- e.g., 'fpm', 'ft', 'lbs'

  -- Confidence level
  confidence TEXT NOT NULL DEFAULT 'estimated'
    CHECK (confidence IN ('estimated', 'confirmed')),

  -- Source tracking
  source_type TEXT CHECK (source_type IN ('note', 'attachment', 'other')),
  source_id UUID,  -- References note or attachment if applicable

  -- Current flag (only one is_current=true per parent+key)
  is_current BOOLEAN NOT NULL DEFAULT true,

  -- Audit
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique partial index: only one is_current=true per (parent_type, parent_id, key)
CREATE UNIQUE INDEX idx_specs_current_unique
  ON specs(parent_type, parent_id, key)
  WHERE is_current = true;

-- Indexes
CREATE INDEX idx_specs_parent ON specs(parent_type, parent_id);
CREATE INDEX idx_specs_key ON specs(key);
CREATE INDEX idx_specs_is_current ON specs(is_current) WHERE is_current = true;
CREATE INDEX idx_specs_created_at ON specs(created_at DESC);

-- Comments
COMMENT ON TABLE specs IS 'Specifications are the ONLY source of truth. Versioned with is_current.';
COMMENT ON COLUMN specs.key IS 'Spec key in snake_case, e.g., belt_speed_fpm';
COMMENT ON COLUMN specs.is_current IS 'Only one is_current=true per (parent_type, parent_id, key)';
COMMENT ON COLUMN specs.confidence IS 'estimated = needs confirmation; confirmed = verified';

-- ============================================================================
-- TABLE: notes
-- ============================================================================
-- Chronological, immutable, timestamped. Explains WHY, never WHAT.

CREATE TABLE notes (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Parent polymorphic reference
  parent_type TEXT NOT NULL CHECK (parent_type IN ('quote', 'sales_order')),
  parent_id UUID NOT NULL,

  -- Note content
  content TEXT NOT NULL,

  -- Audit (immutable after creation)
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_notes_parent ON notes(parent_type, parent_id);
CREATE INDEX idx_notes_created_at ON notes(created_at DESC);

-- Comments
COMMENT ON TABLE notes IS 'Immutable notes. Explain WHY, not WHAT. Not a source of truth.';

-- ============================================================================
-- TABLE: attachments
-- ============================================================================
-- Drag/drop uploads. Evidence, not instructions.

CREATE TABLE attachments (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Parent polymorphic reference
  parent_type TEXT NOT NULL CHECK (parent_type IN ('quote', 'sales_order')),
  parent_id UUID NOT NULL,

  -- File info
  file_path TEXT NOT NULL,  -- Storage path (Supabase storage or S3)
  file_name TEXT NOT NULL,  -- Original filename
  file_size INTEGER,  -- Bytes
  mime_type TEXT,

  -- Tag/category
  tag TEXT NOT NULL DEFAULT 'other'
    CHECK (tag IN ('drawing', 'sketch', 'email', 'photo', 'other')),

  -- Audit
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ  -- Soft delete
);

-- Indexes
CREATE INDEX idx_attachments_parent ON attachments(parent_type, parent_id);
CREATE INDEX idx_attachments_tag ON attachments(tag);
CREATE INDEX idx_attachments_created_at ON attachments(created_at DESC);
CREATE INDEX idx_attachments_deleted_at ON attachments(deleted_at) WHERE deleted_at IS NULL;

-- Comments
COMMENT ON TABLE attachments IS 'File attachments. Evidence only, not instructions.';
COMMENT ON COLUMN attachments.tag IS 'Category: drawing, sketch, email, photo, other';
COMMENT ON COLUMN attachments.file_path IS 'Storage path. On conversion, new row points to same file.';

-- ============================================================================
-- TABLE: scope_lines
-- ============================================================================
-- Structured text entries. Category + text + status.

CREATE TABLE scope_lines (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Parent polymorphic reference
  parent_type TEXT NOT NULL CHECK (parent_type IN ('quote', 'sales_order')),
  parent_id UUID NOT NULL,

  -- Scope line data
  category TEXT NOT NULL CHECK (category IN (
    'mechanical', 'electrical', 'controls', 'installation',
    'documentation', 'training', 'warranty', 'exclusion', 'other'
  )),
  text TEXT NOT NULL,

  -- Inclusion status
  inclusion TEXT NOT NULL DEFAULT 'included'
    CHECK (inclusion IN ('included', 'excluded')),

  -- Ordering
  position INTEGER NOT NULL DEFAULT 0,

  -- Versioning
  version INTEGER NOT NULL DEFAULT 1,

  -- Audit
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ  -- Soft delete
);

-- Indexes
CREATE INDEX idx_scope_lines_parent ON scope_lines(parent_type, parent_id);
CREATE INDEX idx_scope_lines_category ON scope_lines(category);
CREATE INDEX idx_scope_lines_position ON scope_lines(parent_type, parent_id, position);
CREATE INDEX idx_scope_lines_deleted_at ON scope_lines(deleted_at) WHERE deleted_at IS NULL;

-- Comments
COMMENT ON TABLE scope_lines IS 'Scope of work lines. Structured text with category and inclusion status.';
COMMENT ON COLUMN scope_lines.position IS 'Display order within parent';
COMMENT ON COLUMN scope_lines.version IS 'Incremented on each update';

-- ============================================================================
-- FUNCTION: Generate next quote base number
-- ============================================================================

CREATE OR REPLACE FUNCTION next_quote_base_number()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  -- Get next base number (start at 1001 for new quotes)
  SELECT COALESCE(MAX(base_number) + 1, 1001)
  INTO next_num
  FROM quotes;

  RETURN next_num;
END;
$$;

-- ============================================================================
-- FUNCTION: Generate next sales order base number
-- ============================================================================

CREATE OR REPLACE FUNCTION next_sales_order_base_number()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  -- Get next base number (start at 1001 for new sales orders)
  SELECT COALESCE(MAX(base_number) + 1, 1001)
  INTO next_num
  FROM sales_orders;

  RETURN next_num;
END;
$$;

-- ============================================================================
-- LEGACY FUNCTIONS (for backward compatibility)
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  next_num := next_quote_base_number();
  RETURN 'Q' || next_num::TEXT;
END;
$$;

CREATE OR REPLACE FUNCTION generate_sales_order_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  next_num := next_sales_order_base_number();
  RETURN 'SO' || next_num::TEXT;
END;
$$;

-- ============================================================================
-- Migration complete: Phase 1 Quote → Sales Order + Specs
-- ============================================================================
