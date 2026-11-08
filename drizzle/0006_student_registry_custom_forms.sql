-- Student registry completeness and administrator-defined forms.
-- Safe additive migration: preserves existing student records and profile JSON.
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS custom_form_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name varchar(180) NOT NULL,
  description text,
  module_key varchar(80) NOT NULL,
  form_version integer NOT NULL DEFAULT 1 CHECK (form_version > 0),
  status varchar(24) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT custom_form_templates_tenant_school_id_uq UNIQUE (tenant_id, school_id, id)
);
CREATE INDEX IF NOT EXISTS custom_form_templates_scope_idx
  ON custom_form_templates(tenant_id, school_id, module_key, status);

CREATE TABLE IF NOT EXISTS custom_form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  school_id uuid NOT NULL,
  form_id uuid NOT NULL,
  form_version integer NOT NULL,
  record_type varchar(80) NOT NULL,
  record_id uuid,
  values jsonb NOT NULL DEFAULT '{}'::jsonb,
  status varchar(24) NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft','submitted','reviewed','rejected')),
  submitted_by uuid REFERENCES users(id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT custom_form_submissions_form_fk FOREIGN KEY (tenant_id, school_id, form_id)
    REFERENCES custom_form_templates(tenant_id, school_id, id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS custom_form_submissions_scope_idx
  ON custom_form_submissions(tenant_id, school_id, form_id, created_at DESC);

ALTER TABLE custom_form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_form_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS custom_form_templates_tenant_scope ON custom_form_templates;
CREATE POLICY custom_form_templates_tenant_scope ON custom_form_templates FOR ALL
  USING (tenant_id = tms_current_tenant_id())
  WITH CHECK (tenant_id = tms_current_tenant_id());
DROP POLICY IF EXISTS custom_form_submissions_tenant_scope ON custom_form_submissions;
CREATE POLICY custom_form_submissions_tenant_scope ON custom_form_submissions FOR ALL
  USING (tenant_id = tms_current_tenant_id())
  WITH CHECK (tenant_id = tms_current_tenant_id());

CREATE OR REPLACE FUNCTION tms_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS students_touch_updated_at ON students;
CREATE TRIGGER students_touch_updated_at BEFORE UPDATE ON students
FOR EACH ROW EXECUTE FUNCTION tms_touch_updated_at();
DROP TRIGGER IF EXISTS custom_form_templates_touch_updated_at ON custom_form_templates;
CREATE TRIGGER custom_form_templates_touch_updated_at BEFORE UPDATE ON custom_form_templates
FOR EACH ROW EXECUTE FUNCTION tms_touch_updated_at();
DROP TRIGGER IF EXISTS custom_form_submissions_touch_updated_at ON custom_form_submissions;
CREATE TRIGGER custom_form_submissions_touch_updated_at BEFORE UPDATE ON custom_form_submissions
FOR EACH ROW EXECUTE FUNCTION tms_touch_updated_at();
