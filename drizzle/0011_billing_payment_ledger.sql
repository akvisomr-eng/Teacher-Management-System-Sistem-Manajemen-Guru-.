-- Tenant-scoped billing ledger foundation. No prices, subscriptions, checkout, or live collection are enabled here.
CREATE OR REPLACE FUNCTION public.tms_can_manage_billing(target_tenant uuid, target_school uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM memberships m
    WHERE m.user_id = tms_current_user_id()
      AND m.tenant_id = target_tenant
      AND (m.school_id = target_school OR m.school_id IS NULL)
      AND m.role IN ('tenant_owner', 'tenant_admin', 'principal', 'vice_principal', 'school_operator')
  )
$function$;

CREATE TABLE IF NOT EXISTS billing_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  invoice_number varchar(64) NOT NULL,
  description varchar(240) NOT NULL,
  amount_idr bigint NOT NULL CHECK (amount_idr > 0),
  currency varchar(3) NOT NULL DEFAULT 'IDR' CHECK (currency = 'IDR'),
  status varchar(24) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending', 'paid', 'expired', 'cancelled', 'refunded', 'void')),
  due_at timestamptz,
  issued_at timestamptz,
  paid_at timestamptz,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT billing_invoices_tenant_number_uq UNIQUE (tenant_id, invoice_number),
  CONSTRAINT billing_invoices_id_scope_uq UNIQUE (id, tenant_id, school_id)
);
CREATE INDEX IF NOT EXISTS billing_invoices_scope_status_idx
  ON billing_invoices (tenant_id, school_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  school_id uuid NOT NULL,
  provider varchar(24) NOT NULL CHECK (provider IN ('midtrans', 'manual_transfer')),
  provider_order_id varchar(64) NOT NULL UNIQUE,
  provider_transaction_id varchar(100),
  amount_idr bigint NOT NULL CHECK (amount_idr > 0),
  currency varchar(3) NOT NULL DEFAULT 'IDR' CHECK (currency = 'IDR'),
  status varchar(24) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'authorize', 'capture', 'settlement', 'deny', 'cancel', 'expire', 'refund', 'partial_refund', 'chargeback', 'failed')),
  fraud_status varchar(24),
  payment_type varchar(48),
  expires_at timestamptz,
  paid_at timestamptz,
  sanitized_provider_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_transactions_invoice_scope_fk
    FOREIGN KEY (invoice_id, tenant_id, school_id)
    REFERENCES billing_invoices (id, tenant_id, school_id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX IF NOT EXISTS payment_transactions_provider_ref_uq
  ON payment_transactions (provider, provider_transaction_id)
  WHERE provider_transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS payment_transactions_scope_status_idx
  ON payment_transactions (tenant_id, school_id, status, created_at DESC);

-- Store only allow-listed notification fields; do not persist raw customer/card payloads.
-- A stable SHA-256 payload hash makes webhook retries idempotently identifiable.
CREATE TABLE IF NOT EXISTS billing_payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  school_id uuid NOT NULL,
  payment_transaction_id uuid REFERENCES payment_transactions(id) ON DELETE RESTRICT,
  provider varchar(24) NOT NULL CHECK (provider IN ('midtrans', 'manual_transfer')),
  payload_hash varchar(64) NOT NULL,
  event_type varchar(48) NOT NULL,
  signature_valid boolean NOT NULL DEFAULT false,
  sanitized_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  received_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT billing_payment_events_provider_hash_uq UNIQUE (provider, payload_hash)
);
CREATE INDEX IF NOT EXISTS billing_payment_events_scope_received_idx
  ON billing_payment_events (tenant_id, school_id, received_at DESC);

ALTER TABLE billing_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_invoices FORCE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE billing_payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_payment_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS billing_invoices_manager_scope ON billing_invoices;
CREATE POLICY billing_invoices_manager_scope ON billing_invoices
  FOR ALL
  USING (tenant_id = tms_current_tenant_id() AND tms_can_manage_billing(tenant_id, school_id))
  WITH CHECK (tenant_id = tms_current_tenant_id() AND tms_can_manage_billing(tenant_id, school_id));

DROP POLICY IF EXISTS payment_transactions_manager_scope ON payment_transactions;
CREATE POLICY payment_transactions_manager_scope ON payment_transactions
  FOR ALL
  USING (tenant_id = tms_current_tenant_id() AND tms_can_manage_billing(tenant_id, school_id))
  WITH CHECK (tenant_id = tms_current_tenant_id() AND tms_can_manage_billing(tenant_id, school_id));

DROP POLICY IF EXISTS billing_payment_events_manager_select ON billing_payment_events;
CREATE POLICY billing_payment_events_manager_select ON billing_payment_events
  FOR SELECT
  USING (tenant_id = tms_current_tenant_id() AND tms_can_manage_billing(tenant_id, school_id));

REVOKE ALL ON FUNCTION public.tms_can_manage_billing(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tms_can_manage_billing(uuid, uuid) TO tms_app;
GRANT SELECT, INSERT, UPDATE ON billing_invoices TO tms_app;
GRANT SELECT, INSERT, UPDATE ON payment_transactions TO tms_app;
GRANT SELECT ON billing_payment_events TO tms_app;
