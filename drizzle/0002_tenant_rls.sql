-- Identity mapping and tenant isolation policies.
-- The application sets app.auth_user_id and app.tenant_id only inside a server transaction.
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_user_id varchar(64);
CREATE UNIQUE INDEX IF NOT EXISTS users_auth_user_id_uq
  ON users(auth_user_id) WHERE auth_user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION tms_current_tenant_id()
RETURNS uuid LANGUAGE sql STABLE
AS $$ SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid $$;

CREATE OR REPLACE FUNCTION tms_current_auth_user_id()
RETURNS text LANGUAGE sql STABLE
AS $$ SELECT NULLIF(current_setting('app.auth_user_id', true), '') $$;

-- SECURITY DEFINER helpers avoid recursive RLS policy evaluation while
-- checking the authenticated user's own memberships.
CREATE OR REPLACE FUNCTION tms_current_user_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT id FROM users
  WHERE auth_user_id = tms_current_auth_user_id()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION tms_is_tenant_member(target_tenant uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.tenant_id = target_tenant
      AND m.user_id = tms_current_user_id()
  )
$$;

CREATE OR REPLACE FUNCTION tms_user_in_current_tenant(target_user uuid, target_tenant uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.tenant_id = target_tenant
      AND m.user_id = target_user
  )
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
  USING (id = tms_current_tenant_id() OR tms_is_tenant_member(id));
CREATE POLICY tenants_scoped_write ON tenants FOR ALL
  USING (id = tms_current_tenant_id())
  WITH CHECK (id = tms_current_tenant_id());

CREATE POLICY schools_tenant_scope ON schools FOR ALL
  USING (tenant_id = tms_current_tenant_id())
  WITH CHECK (tenant_id = tms_current_tenant_id());

CREATE POLICY users_self_or_tenant_scope ON users FOR ALL
  USING (
    auth_user_id = tms_current_auth_user_id()
    OR tms_user_in_current_tenant(id, tms_current_tenant_id())
  )
  WITH CHECK (
    auth_user_id = tms_current_auth_user_id()
    OR tms_user_in_current_tenant(id, tms_current_tenant_id())
  );

CREATE POLICY memberships_self_or_tenant_scope ON memberships FOR ALL
  USING (tenant_id = tms_current_tenant_id() OR user_id = tms_current_user_id())
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
