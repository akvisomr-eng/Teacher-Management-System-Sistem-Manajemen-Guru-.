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


-- Only a school manager may link an already registered individual account to a teacher.
CREATE OR REPLACE FUNCTION public.tms_link_teacher_account(
  p_tenant_id uuid,
  p_school_id uuid,
  p_teacher_id uuid,
  p_email text
)
RETURNS TABLE(teacher_id uuid, account_email varchar)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $function$
DECLARE
  actor_id uuid;
  target_user_id uuid;
  target_email varchar(254);
BEGIN
  actor_id := tms_current_user_id();
  IF actor_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = actor_id AND tenant_id = p_tenant_id AND school_id = p_school_id
      AND role IN ('tenant_owner','tenant_admin','principal','vice_principal','school_operator')
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN_TEACHER_ACCOUNT_LINK';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM teachers
    WHERE id = p_teacher_id AND tenant_id = p_tenant_id AND school_id = p_school_id
  ) THEN
    RAISE EXCEPTION 'TEACHER_RECORD_NOT_FOUND';
  END IF;

  SELECT id, email INTO target_user_id, target_email
  FROM users
  WHERE lower(email) = lower(trim(p_email)) AND auth_user_id IS NOT NULL
  LIMIT 1;
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'TEACHER_ACCOUNT_NOT_READY';
  END IF;

  IF EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = target_user_id AND tenant_id = p_tenant_id AND school_id = p_school_id
      AND role <> 'teacher'
  ) THEN
    RAISE EXCEPTION 'ACCOUNT_HAS_NON_TEACHER_ROLE';
  END IF;

  IF EXISTS (
    SELECT 1 FROM teachers
    WHERE user_id = target_user_id AND school_id = p_school_id AND id <> p_teacher_id
  ) THEN
    RAISE EXCEPTION 'ACCOUNT_ALREADY_LINKED_TO_ANOTHER_TEACHER';
  END IF;

  UPDATE teachers SET user_id = target_user_id
  WHERE id = p_teacher_id AND tenant_id = p_tenant_id AND school_id = p_school_id
    AND (user_id IS NULL OR user_id = target_user_id);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TEACHER_ALREADY_LINKED_TO_DIFFERENT_ACCOUNT';
  END IF;

  INSERT INTO memberships(tenant_id, school_id, user_id, role, scope)
  VALUES (p_tenant_id, p_school_id, target_user_id, 'teacher', jsonb_build_object('teacherId', p_teacher_id))
  ON CONFLICT (tenant_id, school_id, user_id, role)
  DO UPDATE SET scope = EXCLUDED.scope;

  INSERT INTO audit_logs(tenant_id, school_id, actor_user_id, action, resource_type, resource_id, metadata)
  VALUES (p_tenant_id, p_school_id, actor_id, 'teacher_access.linked', 'teacher', p_teacher_id::text,
    jsonb_build_object('account_email', target_email));

  RETURN QUERY SELECT p_teacher_id, target_email;
END;
$function$;
