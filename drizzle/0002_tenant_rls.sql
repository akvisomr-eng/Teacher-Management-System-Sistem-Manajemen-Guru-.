-- Identity mapping and tenant isolation policies.
-- Application queries must set app.auth_user_id and app.tenant_id inside a transaction.
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_user_id varchar(64);
CREATE UNIQUE INDEX IF NOT EXISTS users_auth_user_id_uq
  ON users(auth_user_id) WHERE auth_user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION tms_current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION tms_current_auth_user_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.auth_user_id', true), '')
$$;

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE teaching_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenants_member_select ON tenants FOR SELECT
  USING (
    id = tms_current_tenant_id()
    OR id IN (
      SELECT m.tenant_id FROM memberships m
      JOIN users u ON u.id = m.user_id
      WHERE u.auth_user_id = tms_current_auth_user_id()
    )
  );
CREATE POLICY tenants_scoped_write ON tenants FOR ALL
  USING (id = tms_current_tenant_id())
  WITH CHECK (id = tms_current_tenant_id());

CREATE POLICY schools_tenant_scope ON schools FOR ALL
  USING (tenant_id = tms_current_tenant_id())
  WITH CHECK (tenant_id = tms_current_tenant_id());

CREATE POLICY users_self_or_tenant_scope ON users FOR ALL
  USING (
    auth_user_id = tms_current_auth_user_id()
    OR id IN (SELECT m.user_id FROM memberships m WHERE m.tenant_id = tms_current_tenant_id())
  )
  WITH CHECK (
    auth_user_id = tms_current_auth_user_id()
    OR id IN (SELECT m.user_id FROM memberships m WHERE m.tenant_id = tms_current_tenant_id())
  );

CREATE POLICY memberships_self_or_tenant_scope ON memberships FOR ALL
  USING (
    tenant_id = tms_current_tenant_id()
    OR user_id IN (SELECT u.id FROM users u WHERE u.auth_user_id = tms_current_auth_user_id())
  )
  WITH CHECK (tenant_id = tms_current_tenant_id());

CREATE POLICY academic_years_tenant_scope ON academic_years FOR ALL
  USING (tenant_id = tms_current_tenant_id())
  WITH CHECK (tenant_id = tms_current_tenant_id());
CREATE POLICY teachers_tenant_scope ON teachers FOR ALL
  USING (tenant_id = tms_current_tenant_id())
  WITH CHECK (tenant_id = tms_current_tenant_id());
CREATE POLICY students_tenant_scope ON students FOR ALL
  USING (tenant_id = tms_current_tenant_id())
  WITH CHECK (tenant_id = tms_current_tenant_id());
CREATE POLICY curriculum_tenant_scope ON curriculum_versions FOR ALL
  USING (tenant_id = tms_current_tenant_id())
  WITH CHECK (tenant_id = tms_current_tenant_id());
CREATE POLICY teaching_plans_tenant_scope ON teaching_plans FOR ALL
  USING (tenant_id = tms_current_tenant_id())
  WITH CHECK (tenant_id = tms_current_tenant_id());
CREATE POLICY audit_logs_tenant_scope ON audit_logs FOR ALL
  USING (tenant_id = tms_current_tenant_id())
  WITH CHECK (tenant_id = tms_current_tenant_id());
