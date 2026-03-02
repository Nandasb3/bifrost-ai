-- ============================================================
-- Bifrost AI BA Documentation Platform - Initial Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROJECTS
-- ============================================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  client_name TEXT,
  domain TEXT,
  tech_stack JSONB DEFAULT '[]'::jsonb,
  jira_project_key TEXT,
  release_cadence TEXT,
  story_format TEXT DEFAULT 'gherkin',
  definition_of_done TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own projects" ON projects
  FOR ALL USING (auth.uid() = owner_user_id);

-- ============================================================
-- CONTEXT ITEMS
-- ============================================================
CREATE TABLE context_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('constraint','requirement','api','compliance','architecture','glossary','decision')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  source_type TEXT NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual','upload','paste')),
  storage_path TEXT,
  file_name TEXT,
  file_size BIGINT,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE context_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage context for own projects" ON context_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = context_items.project_id AND projects.owner_user_id = auth.uid())
  );

-- ============================================================
-- DOCUMENTS
-- ============================================================
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('BRD','PRD')),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','approved')),
  target_release TEXT,
  seed_input TEXT,
  context_item_ids UUID[] DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage documents for own projects" ON documents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = documents.project_id AND projects.owner_user_id = auth.uid())
  );

-- ============================================================
-- DOCUMENT VERSIONS
-- ============================================================
CREATE TABLE document_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content_json JSONB NOT NULL,
  change_summary TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_id, version_number)
);

ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage versions for own documents" ON document_versions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN projects p ON p.id = d.project_id
      WHERE d.id = document_versions.document_id AND p.owner_user_id = auth.uid()
    )
  );

-- ============================================================
-- EPICS
-- ============================================================
CREATE TABLE epics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  business_value TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  target_release TEXT,
  dependencies TEXT[] DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE epics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage epics for own documents" ON epics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN projects p ON p.id = d.project_id
      WHERE d.id = epics.document_id AND p.owner_user_id = auth.uid()
    )
  );

-- ============================================================
-- STORIES
-- ============================================================
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  epic_id UUID NOT NULL REFERENCES epics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  story_statement TEXT,
  description TEXT,
  business_rules TEXT[] DEFAULT '{}',
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  dependencies TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','ready','in_progress','done')),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage stories for own epics" ON stories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM epics e
      JOIN documents d ON d.id = e.document_id
      JOIN projects p ON p.id = d.project_id
      WHERE e.id = stories.epic_id AND p.owner_user_id = auth.uid()
    )
  );

-- ============================================================
-- ACCEPTANCE CRITERIA
-- ============================================================
CREATE TABLE acceptance_criteria (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('functional','validation','error','edge','nfr')),
  given TEXT NOT NULL,
  "when" TEXT NOT NULL,
  "then" TEXT NOT NULL,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE acceptance_criteria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage AC for own stories" ON acceptance_criteria
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM stories s
      JOIN epics e ON e.id = s.epic_id
      JOIN documents d ON d.id = e.document_id
      JOIN projects p ON p.id = d.project_id
      WHERE s.id = acceptance_criteria.story_id AND p.owner_user_id = auth.uid()
    )
  );

-- ============================================================
-- CHAT MESSAGES
-- ============================================================
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content_text TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage chat for own documents" ON chat_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN projects p ON p.id = d.project_id
      WHERE d.id = chat_messages.document_id AND p.owner_user_id = auth.uid()
    )
  );

-- ============================================================
-- EXPORT JOBS
-- ============================================================
CREATE TABLE export_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('markdown','csv','jira_json')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','failed','completed')),
  artifact_path TEXT,
  artifact_content TEXT,
  error_text TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE export_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage exports for own documents" ON export_jobs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN projects p ON p.id = d.project_id
      WHERE d.id = export_jobs.document_id AND p.owner_user_id = auth.uid()
    )
  );

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_epics_updated_at BEFORE UPDATE ON epics
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_stories_updated_at BEFORE UPDATE ON stories
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Storage bucket for context files
-- Run in Supabase Dashboard: Storage > New Bucket > "context-files" (private)
