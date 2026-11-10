# Midtrans Payment Foundation

Status checked: 10 November 2026

## Provider decision

- Primary payment provider: **Midtrans**.
- Xendit is not included in the initial integration to keep implementation and operations small.
- The integration must use the Midtrans Snap API over HTTPS from server-side code. The Midtrans Server Key must never be exposed to browser code, logs, client bundles, or repository history.
- Payment collection stays disabled until a real merchant account is approved, credentials are installed as Vercel Sensitive environment variables, and sandbox end-to-end tests pass.
- No subscription price, plan quota, tax, refund policy, or invoice terms are approved by this provider decision. Do not invent or publish them.

## Rp0 operating principle

- No paid SDK, paid middleware, or monthly payment-gateway integration service is required for the planned server-to-server integration.
- Merchant onboarding and payment processing are subject to Midtrans eligibility and the provider's then-current transaction fees. Rp0 development does not mean transaction processing is free.
- Until merchant credentials are available, the product must not create real Midtrans transactions.
- A manual bank-transfer option may be used for controlled pilot invoicing only after an operator records the invoice and verifies the incoming funds independently. Never mark an invoice paid based on a screenshot or client-side claim alone.

## Required environment variables

Set these in Vercel as Sensitive values, separately for Preview/Sandbox and Production:

- MIDTRANS_ENABLED=false — feature kill switch; remain false until release approval.
- MIDTRANS_IS_PRODUCTION=false — use sandbox endpoints until acceptance tests pass.
- MIDTRANS_SERVER_KEY= — server-only credential; never prefix with NEXT_PUBLIC_.
- NEXT_PUBLIC_MIDTRANS_CLIENT_KEY= — publishable Snap client key only, configured only when the checkout UI is ready.

Do not store real keys in GitHub, SQL, logs, issue descriptions, or chat. Rotate keys immediately if they are exposed.

## Planned transaction lifecycle

1. An authenticated tenant/school administrator selects a server-defined subscription offer.
2. The server resolves the tenant and authorized membership from the authenticated session. Tenant IDs, amount, currency, plan, and order IDs supplied by the browser are not trusted.
3. The server creates a pending invoice/payment record with a unique server-generated order ID and a server-calculated amount.
4. The server requests a Snap transaction using the Server Key and returns only the Snap token/redirect URL to the authenticated client.
5. The customer completes payment on the Midtrans-hosted payment flow.
6. The HTTPS notification handler validates the SHA-512 signature using the Server Key, matches the order and exact gross amount to the pending payment, and processes duplicate notifications idempotently.
7. Before activating a subscription, the server confirms a successful status (settlement, or an accepted capture with the expected fraud status) and records the provider transaction reference and timestamps.
8. Expiry, cancellation, denial, refund, and chargeback states must never grant or extend access. Reconciliation against the Midtrans Get Status API is required for delayed/missing notifications.
9. Subscription entitlements are updated in the same database transaction as the verified payment state change, with an immutable audit event.

## Security and reliability requirements

- HTTPS only; server key is server-side only.
- Verify the Midtrans notification signature: SHA512(order_id + status_code + gross_amount + server_key).
- Use constant-time comparison for signature verification.
- Use a unique constraint on the provider order ID and an idempotent state transition so retries cannot create duplicate invoices or subscription extensions.
- Verify amount and currency against the server-created invoice; do not trust notification amount alone.
- Reject unknown orders, mismatched amounts, invalid signatures, and impossible state transitions.
- Do not activate subscriptions from browser redirects or Snap frontend callbacks.
- Keep webhook processing short and return success only after the verified state has been durably recorded.
- Keep raw provider payloads only when necessary; redact sensitive fields and never log credentials.
- Test duplicate notifications, out-of-order notifications, invalid signatures, amount mismatch, expired transactions, refunds, and cross-tenant access.
- Apply database changes to staging first. Verify RLS, least-privilege grants, and cross-tenant isolation before production.

## Release gates

- [ ] Real Midtrans merchant account approved.
- [ ] Sandbox and production keys stored as Sensitive Vercel environment variables.
- [ ] Approved plan prices, quotas, billing interval, tax treatment, cancellation/refund policy, and invoice wording.
- [ ] Payment and subscription schema/migrations reviewed and tested on staging.
- [ ] Authenticated checkout and server-side amount calculation implemented.
- [ ] Signed, idempotent notification handler and Get Status reconciliation implemented.
- [ ] Subscription entitlement enforcement implemented and tested.
- [ ] Sandbox end-to-end tests pass, including retries, fraud status, refunds, and tenant isolation.
- [ ] Production credentials and notification URL verified; a low-value production transaction reconciled.
- [ ] Manual transfer fallback has an auditable operator verification process.

## Official references

- Midtrans API authorization and Server Key handling: https://docs.midtrans.com/docs/api-authorization-headers
- Midtrans HTTPS notifications, signature verification, idempotency, and reconciliation: https://docs.midtrans.com/docs/https-notification-webhooks
- Midtrans Snap API overview: https://docs.midtrans.com/reference/core-api-snap-open-api-overview

## Current implementation status

Provider selected and integration requirements documented. **No payment checkout, webhook, subscription enforcement, or live collection is implemented or enabled yet.** This is intentional until merchant credentials and commercial terms exist.

## Billing ledger implementation (staging validation)

Migration `0011_billing_payment_ledger.sql` introduces:
- Tenant/school-scoped invoices with IDR integer amounts and explicit lifecycle states.
- Midtrans/manual-transfer payment attempts with unique provider order IDs and optional provider transaction references.
- A sanitized payment-event ledger with a unique provider/payload hash for duplicate-notification detection.
- Row-level security enabled and forced on all three tables.
- Billing reads/writes restricted to tenant owners, tenant admins, principals, vice principals, and school operators in the active tenant/school scope. Payment event records are read-only to the application role.

The migration was applied and checked on the existing Neon staging branch only. All three tables were present, RLS and FORCE RLS were enabled, each table had the expected policy, and the `tms_app` role saw zero billing rows without tenant context. With a real tenant-admin context, the scoped billing authorization helper returned true. **Production schema has not been changed.**

This is a data foundation only. There is still no invoice-creation endpoint, Snap checkout endpoint, notification processor, subscription entitlement enforcement, or payment collection. The feature remains disabled pending merchant credentials and approved commercial terms.
