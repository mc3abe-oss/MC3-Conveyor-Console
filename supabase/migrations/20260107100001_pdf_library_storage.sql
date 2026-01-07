-- ============================================================================
-- PDF REFERENCE LIBRARY - Storage Bucket Setup
-- ============================================================================
--
-- This migration configures the Supabase Storage bucket for PDF files.
--
-- Storage Design:
-- - Bucket: "pdf-library" (private by default)
-- - Path structure: {document_id}/{version_number}/{original_filename}
-- - Policies enforce access through pdf_document_versions RLS
--
-- IMPORTANT: This migration creates storage policies that reference
-- the pdf_document_versions table. The table must exist first.
-- ============================================================================

-- ============================================================================
-- CREATE STORAGE BUCKET
-- ============================================================================
-- Note: Bucket creation via SQL requires the storage schema access.
-- If running locally with `supabase db push`, ensure storage extension is enabled.

-- Create the pdf-library bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pdf-library',
  'pdf-library',
  false,  -- Private bucket (requires auth)
  52428800,  -- 50MB limit
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- STORAGE POLICIES
-- ============================================================================
-- Policies control who can read/write to the bucket.
-- We use the pdf_document_versions table to validate access.

-- Drop existing policies (idempotent)
DROP POLICY IF EXISTS "Authenticated users can read published PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can read all PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete PDFs" ON storage.objects;

-- -----------------------------------------------------------------------------
-- SELECT (Download) Policies
-- -----------------------------------------------------------------------------

-- Authenticated users can download PDFs for published documents
CREATE POLICY "Authenticated users can read published PDFs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'pdf-library'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.pdf_document_versions v
      JOIN public.pdf_documents d ON d.id = v.document_id
      WHERE v.storage_path = name
      AND d.status = 'published'
      AND d.deleted_at IS NULL
    )
  );

-- Admins can download any PDF (including drafts/archived)
CREATE POLICY "Admins can read all PDFs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'pdf-library'
    AND public.has_belt_admin_access()
  );

-- -----------------------------------------------------------------------------
-- INSERT (Upload) Policy
-- -----------------------------------------------------------------------------

-- Only admins can upload PDFs
CREATE POLICY "Admins can upload PDFs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'pdf-library'
    AND public.has_belt_admin_access()
  );

-- -----------------------------------------------------------------------------
-- UPDATE Policy
-- -----------------------------------------------------------------------------

-- Only admins can update PDF metadata (rare, but needed for moves)
CREATE POLICY "Admins can update PDFs"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'pdf-library'
    AND public.has_belt_admin_access()
  );

-- -----------------------------------------------------------------------------
-- DELETE Policy
-- -----------------------------------------------------------------------------

-- Only admins can delete PDFs
CREATE POLICY "Admins can delete PDFs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'pdf-library'
    AND public.has_belt_admin_access()
  );

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  bucket_exists BOOLEAN;
  policy_count INTEGER;
BEGIN
  -- Check if bucket exists
  SELECT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'pdf-library'
  ) INTO bucket_exists;

  -- Count storage policies for this bucket
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname LIKE '%PDFs%';

  RAISE NOTICE '=== PDF Library Storage Setup Complete ===';
  RAISE NOTICE 'Bucket "pdf-library" exists: %', bucket_exists;
  RAISE NOTICE 'Storage policies created: %', policy_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Storage configuration:';
  RAISE NOTICE '  - Max file size: 50MB';
  RAISE NOTICE '  - Allowed types: application/pdf';
  RAISE NOTICE '  - Private bucket with RLS';
END $$;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- To rollback storage setup:
--
-- DROP POLICY IF EXISTS "Authenticated users can read published PDFs" ON storage.objects;
-- DROP POLICY IF EXISTS "Admins can read all PDFs" ON storage.objects;
-- DROP POLICY IF EXISTS "Admins can upload PDFs" ON storage.objects;
-- DROP POLICY IF EXISTS "Admins can update PDFs" ON storage.objects;
-- DROP POLICY IF EXISTS "Admins can delete PDFs" ON storage.objects;
-- DELETE FROM storage.buckets WHERE id = 'pdf-library';
-- ============================================================================
