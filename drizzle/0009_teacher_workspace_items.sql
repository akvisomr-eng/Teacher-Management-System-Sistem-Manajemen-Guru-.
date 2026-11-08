-- TMS Teacher Desk: private teacher-owned offline-first work items.
CREATE TABLE IF NOT EXISTS teacher_workspace_items (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_type varchar(40) NOT NULL,
  title varchar(200) NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  schema_version integer NOT NULL DEFAULT 1,
  client_updated_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  CONSTRAINT teacher_workspace_items_type_ck CHECK (item_type IN ('lesson_plan','teaching_journal','learning_material','assessment_draft','reflection','personal_note')),
  CONSTRAINT teacher_workspace_items_schema_ck CHECK (schema_version > 0)
);
CREATE INDEX IF NOT EXISTS teacher_workspace_items_owner_idx
  ON teacher_workspace_items(tenant_id, school_id, teacher_id, owner_user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS teacher_workspace_items_sync_idx
  ON teacher_workspace_items(tenant_id, school_id, owner_user_id, client_updated_at);
ALTER TABLE teacher_workspace_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_workspace_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS teacher_workspace_items_owner_scope ON teacher_workspace_items;
CREATE POLICY teacher_workspace_items_owner_scope ON teacher_workspace_items
  FOR ALL
  USING (tenant_id = tms_current_tenant_id() AND owner_user_id = tms_current_user_id())
  WITH CHECK (tenant_id = tms_current_tenant_id() AND owner_user_id = tms_current_user_id());
