-- Versioned, tenant-scoped supporting records for the nine education administration workspaces.
-- These records complement canonical master tables; they are not an official Dapodik sync channel.
CREATE TABLE IF NOT EXISTS standard_module_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  school_id uuid NOT NULL,
  module_key varchar(40) NOT NULL CHECK (module_key IN ('teachers','students','academic','curriculum','assignments','teaching','assessments','reports','forms')),
  schema_key varchar(100) NOT NULL,
  schema_version integer NOT NULL DEFAULT 1 CHECK (schema_version > 0),
  reference_version varchar(80) NOT NULL DEFAULT 'internal-v1',
  title varchar(200) NOT NULL,
  status varchar(24) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected','archived')),
  record_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_system varchar(80) NOT NULL DEFAULT 'tms',
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT standard_module_records_school_fk
    FOREIGN KEY (tenant_id, school_id) REFERENCES schools(tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS standard_module_records_scope_idx
  ON standard_module_records(tenant_id, school_id, module_key, created_at DESC);
CREATE INDEX IF NOT EXISTS standard_module_records_schema_idx
  ON standard_module_records(tenant_id, school_id, schema_key, schema_version);
ALTER TABLE standard_module_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS standard_module_records_tenant_scope ON standard_module_records;
CREATE POLICY standard_module_records_tenant_scope ON standard_module_records FOR ALL
  USING (tenant_id = tms_current_tenant_id())
  WITH CHECK (tenant_id = tms_current_tenant_id());
DROP TRIGGER IF EXISTS standard_module_records_touch_updated_at ON standard_module_records;
CREATE TRIGGER standard_module_records_touch_updated_at BEFORE UPDATE ON standard_module_records
FOR EACH ROW EXECUTE FUNCTION tms_touch_updated_at();
