-- Telemetry Events Table
-- Internal observability for error tracking, workflow events, and rule/calc monitoring

CREATE TABLE public.telemetry_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core fields
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('error', 'warning', 'info')),
  fingerprint TEXT,

  -- Environment
  app TEXT DEFAULT 'conveyor-console',
  env TEXT,
  release TEXT,
  deployed_at TIMESTAMPTZ,

  -- User context
  user_id UUID,
  tenant_id TEXT,
  session_id TEXT,
  trace_id TEXT,

  -- Request context
  route TEXT,
  url TEXT,
  user_agent TEXT,
  viewport TEXT,

  -- Event data
  message TEXT,
  stack TEXT,
  data JSONB,

  -- Conveyor Console domain fields
  application_id TEXT,
  product_key TEXT,
  model_key TEXT,
  rule_id TEXT,
  calc_key TEXT,
  config_fingerprint TEXT,
  quote_id TEXT,
  sales_order_id TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX idx_telemetry_created_at ON telemetry_events(created_at DESC);
CREATE INDEX idx_telemetry_event_type ON telemetry_events(event_type);
CREATE INDEX idx_telemetry_severity ON telemetry_events(severity);
CREATE INDEX idx_telemetry_fingerprint ON telemetry_events(fingerprint);
CREATE INDEX idx_telemetry_application_id ON telemetry_events(application_id);
CREATE INDEX idx_telemetry_product_key ON telemetry_events(product_key);
CREATE INDEX idx_telemetry_rule_id ON telemetry_events(rule_id);

-- Enable RLS
ALTER TABLE telemetry_events ENABLE ROW LEVEL SECURITY;

-- No client insert/update/delete (API-only writes via service role)
-- Admin-only read using existing is_super_admin() function
CREATE POLICY "Super admins can read telemetry"
  ON telemetry_events FOR SELECT
  USING (public.is_super_admin());

-- Add comment for documentation
COMMENT ON TABLE telemetry_events IS 'Internal telemetry for error tracking and observability. Write-only via service role, read-only for super admins.';

-- ============================================================================
-- Add Telemetry Admin Page
-- ============================================================================

-- Insert telemetry page into admin_pages (system category)
INSERT INTO public.admin_pages (name, slug, href, category, sort_order, is_active)
VALUES
  ('Telemetry', 'telemetry', '/console/admin/system/telemetry', 'system', 40, true)
ON CONFLICT (slug) DO NOTHING;
