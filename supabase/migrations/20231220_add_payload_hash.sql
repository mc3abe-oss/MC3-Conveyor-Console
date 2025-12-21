-- Migration: Add payload_hash for revision deduplication
-- Date: 2023-12-20
-- Purpose: Prevent duplicate revisions when saving identical data

-- Add payload_hash column to configuration_revisions
ALTER TABLE configuration_revisions
ADD COLUMN payload_hash text;

-- Add unique index on (configuration_id, payload_hash)
-- This prevents duplicate revisions with the same payload
CREATE UNIQUE INDEX idx_configuration_revisions_payload_hash
ON configuration_revisions(configuration_id, payload_hash)
WHERE payload_hash IS NOT NULL;

-- Add indexes for search and load performance
CREATE INDEX IF NOT EXISTS idx_configurations_reference
ON configurations(reference_type, reference_number);

CREATE INDEX IF NOT EXISTS idx_configurations_updated_at
ON configurations(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_configurations_title
ON configurations(title);

CREATE INDEX IF NOT EXISTS idx_configuration_revisions_config_revision
ON configuration_revisions(configuration_id, revision_number DESC);

-- Comment on the payload_hash column
COMMENT ON COLUMN configuration_revisions.payload_hash IS 'SHA-256 hash of stable-stringified payload (inputs_json + parameters_json + application_json). Used for deduplication.';
