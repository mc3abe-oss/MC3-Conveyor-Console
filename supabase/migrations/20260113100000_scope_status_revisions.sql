-- ============================================================================
-- Migration: Scope Status (Draft/Set) + Revision Snapshots
-- ============================================================================
-- Implements universal Draft/Set status for Quotes and Sales Orders with:
-- - scope_status column on both tables
-- - current_revision tracking
-- - scope_revisions table for snapshot history
-- ============================================================================

-- ============================================================================
-- 1. ADD SCOPE STATUS TO QUOTES
-- ============================================================================

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS scope_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (scope_status IN ('draft', 'set'));

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS current_revision_id UUID;

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS current_revision_number INTEGER;

-- Index for filtering by scope status
CREATE INDEX IF NOT EXISTS idx_quotes_scope_status ON quotes(scope_status);

COMMENT ON COLUMN quotes.scope_status IS 'Scope lock status: draft (unlocked, outputs disabled) or set (locked, outputs enabled)';
COMMENT ON COLUMN quotes.current_revision_id IS 'FK to most recent scope_revisions row created on Set';
COMMENT ON COLUMN quotes.current_revision_number IS 'Cached revision number for display (matches current_revision_id)';

-- ============================================================================
-- 2. ADD SCOPE STATUS TO SALES_ORDERS
-- ============================================================================

ALTER TABLE sales_orders
  ADD COLUMN IF NOT EXISTS scope_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (scope_status IN ('draft', 'set'));

ALTER TABLE sales_orders
  ADD COLUMN IF NOT EXISTS current_revision_id UUID;

ALTER TABLE sales_orders
  ADD COLUMN IF NOT EXISTS current_revision_number INTEGER;

-- Index for filtering by scope status
CREATE INDEX IF NOT EXISTS idx_sales_orders_scope_status ON sales_orders(scope_status);

COMMENT ON COLUMN sales_orders.scope_status IS 'Scope lock status: draft (unlocked, outputs disabled) or set (locked, outputs enabled)';
COMMENT ON COLUMN sales_orders.current_revision_id IS 'FK to most recent scope_revisions row created on Set';
COMMENT ON COLUMN sales_orders.current_revision_number IS 'Cached revision number for display (matches current_revision_id)';

-- ============================================================================
-- 3. CREATE SCOPE_REVISIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS scope_revisions (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Entity reference (polymorphic)
  entity_type TEXT NOT NULL CHECK (entity_type IN ('quote', 'sales_order')),
  entity_id UUID NOT NULL,

  -- Revision number (1, 2, 3... per entity)
  revision_number INTEGER NOT NULL,

  -- Status at creation (always 'set' for this workflow)
  status_at_creation TEXT NOT NULL DEFAULT 'set'
    CHECK (status_at_creation IN ('set')),

  -- Snapshot of scope data at time of Set
  snapshot_json JSONB NOT NULL,
  snapshot_hash TEXT,  -- Optional SHA256 for integrity verification

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_user_id UUID,

  -- Constraints
  CONSTRAINT uq_scope_revision_number UNIQUE (entity_type, entity_id, revision_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scope_revisions_entity
  ON scope_revisions(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_scope_revisions_created_at
  ON scope_revisions(created_at DESC);

COMMENT ON TABLE scope_revisions IS 'Snapshot history of scope data, created each time an entity transitions to Set status';
COMMENT ON COLUMN scope_revisions.entity_type IS 'Type of parent entity: quote or sales_order';
COMMENT ON COLUMN scope_revisions.entity_id IS 'UUID of the parent quote or sales_order';
COMMENT ON COLUMN scope_revisions.revision_number IS 'Sequential revision number per entity (1, 2, 3...)';
COMMENT ON COLUMN scope_revisions.snapshot_json IS 'Complete scope snapshot: specs, scope_lines, notes, attachments, linked applications';
COMMENT ON COLUMN scope_revisions.snapshot_hash IS 'Optional SHA256 hash of snapshot_json for integrity';

-- ============================================================================
-- 4. ADD FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- FK from quotes.current_revision_id to scope_revisions
ALTER TABLE quotes
  ADD CONSTRAINT fk_quotes_current_revision
  FOREIGN KEY (current_revision_id) REFERENCES scope_revisions(id)
  ON DELETE SET NULL;

-- FK from sales_orders.current_revision_id to scope_revisions
ALTER TABLE sales_orders
  ADD CONSTRAINT fk_sales_orders_current_revision
  FOREIGN KEY (current_revision_id) REFERENCES scope_revisions(id)
  ON DELETE SET NULL;

-- ============================================================================
-- 5. HELPER FUNCTION: Get Next Revision Number (with locking)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_next_scope_revision_number(
  p_entity_type TEXT,
  p_entity_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  -- Lock existing rows for this entity to prevent concurrent duplicates
  PERFORM 1 FROM scope_revisions
    WHERE entity_type = p_entity_type AND entity_id = p_entity_id
    FOR UPDATE;

  -- Calculate next revision number
  SELECT COALESCE(MAX(revision_number), 0) + 1
  INTO next_num
  FROM scope_revisions
  WHERE entity_type = p_entity_type AND entity_id = p_entity_id;

  RETURN next_num;
END;
$$;

COMMENT ON FUNCTION get_next_scope_revision_number IS 'Returns next sequential revision number for an entity, with row locking for concurrency safety';

-- ============================================================================
-- 6. BACKFILL EXISTING RECORDS
-- ============================================================================

-- All existing quotes default to draft (column default handles this)
-- All existing sales_orders default to draft (column default handles this)
-- No historical revisions are created - only new Set actions create revisions

-- ============================================================================
-- Migration complete
-- ============================================================================
