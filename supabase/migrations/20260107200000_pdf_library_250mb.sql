-- Migration: Increase PDF library file size limit to 250MB
-- This enables larger PDF uploads via direct-to-storage signed URLs

-- Update the bucket configuration
UPDATE storage.buckets
SET file_size_limit = 262144000  -- 250MB in bytes
WHERE id = 'pdf-library';

-- Verify the update
DO $$
DECLARE
  v_file_size_limit BIGINT;
BEGIN
  SELECT file_size_limit INTO v_file_size_limit
  FROM storage.buckets
  WHERE id = 'pdf-library';

  RAISE NOTICE '=== PDF Library Storage Update ===';
  RAISE NOTICE 'New file size limit: % bytes (250MB)', v_file_size_limit;
END $$;
