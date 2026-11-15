-- Security hardening: audit history is append-only for the application runtime role.
-- The application only creates and reads audit events; it must never rewrite or erase them.

REVOKE ALL PRIVILEGES ON TABLE public.audit_logs FROM tms_app;
GRANT SELECT, INSERT ON TABLE public.audit_logs TO tms_app;

DROP POLICY IF EXISTS audit_logs_tenant_scope ON public.audit_logs;

CREATE POLICY audit_logs_tenant_select ON public.audit_logs
  FOR SELECT
  USING (tenant_id = tms_current_tenant_id());

CREATE POLICY audit_logs_tenant_insert ON public.audit_logs
  FOR INSERT
  WITH CHECK (tenant_id = tms_current_tenant_id());
