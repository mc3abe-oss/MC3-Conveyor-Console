-- ============================================================================
-- PDF REFERENCE LIBRARY - Phase 1: Core Tables
-- ============================================================================
--
-- This migration creates the foundation for a PDF reference library:
-- 1. pdf_documents - Document metadata (title, description, status)
-- 2. pdf_document_versions - Immutable versions with Storage paths
-- 3. pdf_tags - Reusable tags for categorization
-- 4. pdf_document_tags - Many-to-many junction table
--
-- Storage Design:
-- - PDFs stored in Supabase Storage bucket "pdf-library"
-- - SQL stores metadata and storage_path references
-- - Versions are immutable; new uploads create new versions
--
-- Access Control:
-- - All authenticated users can READ documents they have access to
-- - Only BELT_ADMIN or SUPER_ADMIN can CREATE/UPDATE/DELETE
--
-- Future Phase 2 Hooks (placeholder tables):
-- - pdf_chunks - Text chunks for RAG
-- - pdf_embeddings - Vector embeddings for semantic search
-- ============================================================================

-- ============================================================================
-- TABLE: pdf_tags
-- ============================================================================
-- Reusable tags for categorizing documents (e.g., "technical", "safety")

CREATE TABLE IF NOT EXISTS public.pdf_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tag identity
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#6B7280',  -- Default gray color for UI badges

  -- Lifecycle
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pdf_tags_name ON public.pdf_tags(name);
CREATE INDEX IF NOT EXISTS idx_pdf_tags_is_active ON public.pdf_tags(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_pdf_tags_sort_order ON public.pdf_tags(sort_order);

-- Comments
COMMENT ON TABLE public.pdf_tags IS 'Reusable tags for categorizing PDF documents';
COMMENT ON COLUMN public.pdf_tags.color IS 'Hex color for UI badge display';

-- ============================================================================
-- TABLE: pdf_documents
-- ============================================================================
-- Main document metadata. Each document can have multiple versions.

CREATE TABLE IF NOT EXISTS public.pdf_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Document identity
  title TEXT NOT NULL,
  description TEXT,

  -- Optional categorization
  department TEXT,  -- e.g., 'engineering', 'sales', 'operations'

  -- Document lifecycle status
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),

  -- Version tracking (denormalized for quick access)
  current_version_id UUID,  -- FK added after pdf_document_versions exists
  version_count INTEGER NOT NULL DEFAULT 0,

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES auth.users(id),
  archived_at TIMESTAMPTZ,
  archived_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ  -- Soft delete
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pdf_documents_title ON public.pdf_documents(title);
CREATE INDEX IF NOT EXISTS idx_pdf_documents_status ON public.pdf_documents(status);
CREATE INDEX IF NOT EXISTS idx_pdf_documents_department ON public.pdf_documents(department) WHERE department IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pdf_documents_created_at ON public.pdf_documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pdf_documents_deleted_at ON public.pdf_documents(deleted_at) WHERE deleted_at IS NULL;

-- Full-text search index on title and description
CREATE INDEX IF NOT EXISTS idx_pdf_documents_search
  ON public.pdf_documents
  USING gin(to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, '')));

-- Comments
COMMENT ON TABLE public.pdf_documents IS 'PDF document metadata with versioning support';
COMMENT ON COLUMN public.pdf_documents.status IS 'Lifecycle: draft (not visible to users), published (visible), archived (hidden)';
COMMENT ON COLUMN public.pdf_documents.current_version_id IS 'FK to current active version for quick lookup';

-- ============================================================================
-- TABLE: pdf_document_versions
-- ============================================================================
-- Immutable version records. Each upload creates a new version.

CREATE TABLE IF NOT EXISTS public.pdf_document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Parent document
  document_id UUID NOT NULL REFERENCES public.pdf_documents(id) ON DELETE CASCADE,

  -- Version identity
  version_number INTEGER NOT NULL,

  -- File metadata
  storage_path TEXT NOT NULL,      -- Supabase Storage path: pdf-library/{document_id}/{version_number}/{filename}
  original_filename TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/pdf',

  -- Integrity
  sha256_hash TEXT NOT NULL,       -- For deduplication and integrity checks

  -- Metadata extracted from PDF (future)
  page_count INTEGER,

  -- Change tracking
  change_note TEXT,                -- Optional note about this version

  -- Audit (immutable after creation)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- Constraints
  UNIQUE(document_id, version_number),
  UNIQUE(document_id, sha256_hash)  -- Prevent duplicate uploads for same doc
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pdf_doc_versions_document_id ON public.pdf_document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_pdf_doc_versions_created_at ON public.pdf_document_versions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pdf_doc_versions_sha256 ON public.pdf_document_versions(sha256_hash);

-- Comments
COMMENT ON TABLE public.pdf_document_versions IS 'Immutable PDF file versions stored in Supabase Storage';
COMMENT ON COLUMN public.pdf_document_versions.storage_path IS 'Path in Supabase Storage bucket "pdf-library"';
COMMENT ON COLUMN public.pdf_document_versions.sha256_hash IS 'SHA-256 hash for deduplication and integrity';

-- Add FK from pdf_documents.current_version_id to pdf_document_versions
ALTER TABLE public.pdf_documents
  ADD CONSTRAINT fk_pdf_documents_current_version
  FOREIGN KEY (current_version_id) REFERENCES public.pdf_document_versions(id);

-- ============================================================================
-- TABLE: pdf_document_tags (junction table)
-- ============================================================================
-- Many-to-many relationship between documents and tags

CREATE TABLE IF NOT EXISTS public.pdf_document_tags (
  document_id UUID NOT NULL REFERENCES public.pdf_documents(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.pdf_tags(id) ON DELETE CASCADE,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  PRIMARY KEY (document_id, tag_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pdf_doc_tags_document_id ON public.pdf_document_tags(document_id);
CREATE INDEX IF NOT EXISTS idx_pdf_doc_tags_tag_id ON public.pdf_document_tags(tag_id);

-- Comments
COMMENT ON TABLE public.pdf_document_tags IS 'Junction table for document-tag relationships';

-- ============================================================================
-- TRIGGERS: Auto-update timestamps
-- ============================================================================

-- pdf_documents updated_at trigger
CREATE OR REPLACE FUNCTION public.update_pdf_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pdf_documents_updated_at ON public.pdf_documents;
CREATE TRIGGER pdf_documents_updated_at
  BEFORE UPDATE ON public.pdf_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_pdf_documents_updated_at();

-- pdf_tags updated_at trigger
CREATE OR REPLACE FUNCTION public.update_pdf_tags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pdf_tags_updated_at ON public.pdf_tags;
CREATE TRIGGER pdf_tags_updated_at
  BEFORE UPDATE ON public.pdf_tags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_pdf_tags_updated_at();

-- ============================================================================
-- FUNCTION: Get next version number for a document
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_next_pdf_version_number(p_document_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  next_ver INTEGER;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO next_ver
  FROM public.pdf_document_versions
  WHERE document_id = p_document_id;

  RETURN next_ver;
END;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.pdf_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_document_tags ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- pdf_documents policies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated can read published pdf_documents" ON public.pdf_documents;
DROP POLICY IF EXISTS "Admins can read all pdf_documents" ON public.pdf_documents;
DROP POLICY IF EXISTS "Admins can insert pdf_documents" ON public.pdf_documents;
DROP POLICY IF EXISTS "Admins can update pdf_documents" ON public.pdf_documents;
DROP POLICY IF EXISTS "Admins can delete pdf_documents" ON public.pdf_documents;

-- Regular users can only see published, non-deleted documents
CREATE POLICY "Authenticated can read published pdf_documents"
  ON public.pdf_documents FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND status = 'published'
    AND deleted_at IS NULL
  );

-- Admins can see all documents (including drafts and archived)
CREATE POLICY "Admins can read all pdf_documents"
  ON public.pdf_documents FOR SELECT
  USING (public.has_belt_admin_access());

CREATE POLICY "Admins can insert pdf_documents"
  ON public.pdf_documents FOR INSERT
  WITH CHECK (public.has_belt_admin_access());

CREATE POLICY "Admins can update pdf_documents"
  ON public.pdf_documents FOR UPDATE
  USING (public.has_belt_admin_access());

CREATE POLICY "Admins can delete pdf_documents"
  ON public.pdf_documents FOR DELETE
  USING (public.has_belt_admin_access());

-- -----------------------------------------------------------------------------
-- pdf_document_versions policies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can read versions of accessible documents" ON public.pdf_document_versions;
DROP POLICY IF EXISTS "Admins can insert pdf_document_versions" ON public.pdf_document_versions;

-- Users can read versions if they can read the parent document
CREATE POLICY "Users can read versions of accessible documents"
  ON public.pdf_document_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.pdf_documents d
      WHERE d.id = document_id
      AND (
        -- Published docs visible to all authenticated
        (auth.role() = 'authenticated' AND d.status = 'published' AND d.deleted_at IS NULL)
        OR
        -- Admins can see all
        public.has_belt_admin_access()
      )
    )
  );

CREATE POLICY "Admins can insert pdf_document_versions"
  ON public.pdf_document_versions FOR INSERT
  WITH CHECK (public.has_belt_admin_access());

-- Versions are immutable - no UPDATE policy needed
-- DELETE cascades from parent document

-- -----------------------------------------------------------------------------
-- pdf_tags policies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated can read pdf_tags" ON public.pdf_tags;
DROP POLICY IF EXISTS "Admins can insert pdf_tags" ON public.pdf_tags;
DROP POLICY IF EXISTS "Admins can update pdf_tags" ON public.pdf_tags;
DROP POLICY IF EXISTS "Admins can delete pdf_tags" ON public.pdf_tags;

CREATE POLICY "Authenticated can read pdf_tags"
  ON public.pdf_tags FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert pdf_tags"
  ON public.pdf_tags FOR INSERT
  WITH CHECK (public.has_belt_admin_access());

CREATE POLICY "Admins can update pdf_tags"
  ON public.pdf_tags FOR UPDATE
  USING (public.has_belt_admin_access());

CREATE POLICY "Admins can delete pdf_tags"
  ON public.pdf_tags FOR DELETE
  USING (public.has_belt_admin_access());

-- -----------------------------------------------------------------------------
-- pdf_document_tags policies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can read tags of accessible documents" ON public.pdf_document_tags;
DROP POLICY IF EXISTS "Admins can insert pdf_document_tags" ON public.pdf_document_tags;
DROP POLICY IF EXISTS "Admins can delete pdf_document_tags" ON public.pdf_document_tags;

CREATE POLICY "Users can read tags of accessible documents"
  ON public.pdf_document_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.pdf_documents d
      WHERE d.id = document_id
      AND (
        (auth.role() = 'authenticated' AND d.status = 'published' AND d.deleted_at IS NULL)
        OR public.has_belt_admin_access()
      )
    )
  );

CREATE POLICY "Admins can insert pdf_document_tags"
  ON public.pdf_document_tags FOR INSERT
  WITH CHECK (public.has_belt_admin_access());

CREATE POLICY "Admins can delete pdf_document_tags"
  ON public.pdf_document_tags FOR DELETE
  USING (public.has_belt_admin_access());

-- ============================================================================
-- PHASE 2 PLACEHOLDER TABLES (RAG Support - Structure Only)
-- ============================================================================
-- These tables are created now for schema completeness but will be populated
-- by a future text extraction and embedding pipeline.

-- pdf_chunks: Text chunks extracted from PDFs
CREATE TABLE IF NOT EXISTS public.pdf_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Parent version
  version_id UUID NOT NULL REFERENCES public.pdf_document_versions(id) ON DELETE CASCADE,

  -- Chunk identity
  chunk_index INTEGER NOT NULL,
  page_start INTEGER NOT NULL,
  page_end INTEGER NOT NULL,

  -- Content
  text_content TEXT NOT NULL,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(version_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_pdf_chunks_version_id ON public.pdf_chunks(version_id);
CREATE INDEX IF NOT EXISTS idx_pdf_chunks_text_search
  ON public.pdf_chunks
  USING gin(to_tsvector('english', text_content));

COMMENT ON TABLE public.pdf_chunks IS 'Phase 2: Text chunks extracted from PDFs for RAG';

-- pdf_embeddings: Vector embeddings for semantic search
-- Note: Requires pgvector extension. Commented out until extension is enabled.
-- CREATE TABLE IF NOT EXISTS public.pdf_embeddings (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   chunk_id UUID NOT NULL REFERENCES public.pdf_chunks(id) ON DELETE CASCADE,
--   embedding vector(1536),  -- OpenAI ada-002 dimension
--   model TEXT NOT NULL DEFAULT 'text-embedding-ada-002',
--   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- );

-- Enable RLS on placeholder tables
ALTER TABLE public.pdf_chunks ENABLE ROW LEVEL SECURITY;

-- pdf_chunks follows same access as parent version
CREATE POLICY "Users can read chunks of accessible documents"
  ON public.pdf_chunks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.pdf_document_versions v
      JOIN public.pdf_documents d ON d.id = v.document_id
      WHERE v.id = version_id
      AND (
        (auth.role() = 'authenticated' AND d.status = 'published' AND d.deleted_at IS NULL)
        OR public.has_belt_admin_access()
      )
    )
  );

CREATE POLICY "Admins can insert pdf_chunks"
  ON public.pdf_chunks FOR INSERT
  WITH CHECK (public.has_belt_admin_access());

-- ============================================================================
-- SEED: Default Tags
-- ============================================================================

INSERT INTO public.pdf_tags (name, description, color, sort_order)
VALUES
  ('Technical', 'Technical specifications and data sheets', '#3B82F6', 1),
  ('Safety', 'Safety guidelines and warnings', '#EF4444', 2),
  ('Installation', 'Installation guides and manuals', '#10B981', 3),
  ('Maintenance', 'Maintenance and service documentation', '#F59E0B', 4),
  ('Sales', 'Sales materials and brochures', '#8B5CF6', 5),
  ('Training', 'Training materials and tutorials', '#06B6D4', 6),
  ('Reference', 'General reference documents', '#6B7280', 7)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  doc_count INTEGER;
  tag_count INTEGER;
  tables_with_rls INTEGER;
BEGIN
  SELECT COUNT(*) INTO doc_count FROM public.pdf_documents;
  SELECT COUNT(*) INTO tag_count FROM public.pdf_tags;

  SELECT COUNT(*) INTO tables_with_rls
  FROM pg_tables t
  JOIN pg_class c ON c.relname = t.tablename
  WHERE t.schemaname = 'public'
    AND t.tablename IN ('pdf_documents', 'pdf_document_versions', 'pdf_tags', 'pdf_document_tags', 'pdf_chunks')
    AND c.relrowsecurity = true;

  RAISE NOTICE '=== PDF Library Migration Complete ===';
  RAISE NOTICE 'Tables created: pdf_documents, pdf_document_versions, pdf_tags, pdf_document_tags, pdf_chunks';
  RAISE NOTICE 'Default tags seeded: %', tag_count;
  RAISE NOTICE 'RLS enabled on % tables', tables_with_rls;
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Create Supabase Storage bucket "pdf-library"';
  RAISE NOTICE '2. Configure Storage policies for authenticated access';
  RAISE NOTICE '3. Implement API routes for document management';
END $$;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- To rollback this migration:
--
-- DROP TABLE IF EXISTS public.pdf_chunks;
-- DROP TABLE IF EXISTS public.pdf_document_tags;
-- DROP TABLE IF EXISTS public.pdf_document_versions;
-- DROP TABLE IF EXISTS public.pdf_documents;
-- DROP TABLE IF EXISTS public.pdf_tags;
-- DROP FUNCTION IF EXISTS public.get_next_pdf_version_number(UUID);
-- DROP FUNCTION IF EXISTS public.update_pdf_documents_updated_at();
-- DROP FUNCTION IF EXISTS public.update_pdf_tags_updated_at();
-- ============================================================================
