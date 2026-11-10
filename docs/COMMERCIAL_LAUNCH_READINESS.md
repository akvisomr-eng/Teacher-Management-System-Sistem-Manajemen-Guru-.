# Commercial Launch Readiness

Status checked: 10 November 2026

## Current release

- Production URL: https://teacher-management-system-nine.vercel.app
- Production commit: `1e7fccf34ee4fee349d409603b6de59db12abfd8`
- Vercel deployment: `dpl_3yFgP47wZSyrZfJs3CRTh2aVAbfA` — READY
- Main CI run #264 for the current release: passed typecheck, lint, production dependency audit, build and production smoke.
- Vercel commit status for the current release: `success`.
- PR #45 merged the local-timezone teaching-journal date fix; its CI and production smoke checks passed.
- Neon production and staging branches: READY.
- Runtime database role `tms_app`: `rolsuper=false`, `rolbypassrls=false`.

## Implemented for the school pilot

- Organization/school onboarding and role-based workspace.
- Teacher and student master registries, academic structure, assignments and student placement.
- Teacher Desk with encrypted offline drafts, encrypted backup/restore, sync, and explicit local/server conflict resolution.
- Teacher-specific activity view for lesson plans and teaching journals.
- Teacher ownership checks and school-manager review transitions.
- Administrative student-form sections now display in reverse order (bottom section first), as requested; standard administrative forms follow the same visual order. GTK standard-form sections are rendered in reverse order as well.
- Teaching-journal default date now uses the browser's local calendar timezone, avoiding UTC date rollover for Indonesian teachers.
- Service worker cache cleanup is isolated to the TMS cache namespace and merged to production.

## Commercial launch blockers

These are external/product decisions or operational controls, not items that can be safely fabricated by code:

1. **Real teacher activation:** production currently has 1 school, 1 tenant, 15 active teacher records, 0 linked teacher accounts, and 0 teacher memberships. Each teacher must register using the real email stored on their teacher record; the school operator then links the account. Do not create dummy users.
2. **Branded authentication email:** production Neon Auth currently uses the shared sender `auth@mail.myneon.app` / `Neon Auth`. A verified organization-owned sender domain and SMTP provider must be configured and deliverability tested before public registration.
3. **Subscription billing:** no payment gateway, subscription enforcement, invoice lifecycle, or validated price list is implemented. Starter / Professional / Enterprise are concepts only; prices and quotas must be validated and approved before they are exposed as live offers. Payment provider credentials are not present in the project configuration.
4. **Branded production domain:** production currently uses Vercel-hosted aliases. A domain controlled by the business, DNS verification, TLS, and Neon Auth trusted-origin configuration are required for a branded commercial launch.
5. **Backup and recovery:** the Neon project is currently on the `free_v3` plan with 6-hour history retention and no separately listed snapshots. Production branch protection was not available under the current plan limit. Upgrade/backup policy, scheduled backups, and a restore drill must be completed before storing commercial customer data.
6. **Legal and support operations:** publish reviewed privacy notice, terms of service, data retention/deletion policy, customer support contact/SLA, incident response and data export/termination process. Student data requires special care and lawful processing.
7. **End-to-end acceptance:** perform a real-user test with the school operator and at least one real teacher: registration, email verification, account linking, access boundaries, lesson plan/journal, offline work, reconnect/sync, conflict resolution, logout/account switch, export and recovery.

## Release policy

- Keep the current production release available for controlled school-pilot use; do not describe it as fully commercial until all blockers above are closed.
- Do not switch on payment collection or publish prices before the chosen payment provider, merchant account, prices, taxes, cancellation/refund rules and invoice requirements are approved.
- Do not claim official Dapodik synchronization or regulatory certification; current administrative fields are TMS reference forms and require verification against the applicable official version.
- No real teacher account, customer data, paid subscription, domain purchase or paid infrastructure upgrade may be fabricated or initiated without the necessary real details and approval.

## Suggested go-to-market sequence

1. Internal acceptance with the current operator account.
2. One-school pilot with real teacher accounts and reviewed privacy/support procedures.
3. Configure business domain, branded SMTP, production backup/restore and monitoring.
4. Select payment provider and approve price/quotas; implement and test checkout, webhook idempotency, invoices, subscription lifecycle and access enforcement.
5. Commercial release after security, operational, legal and payment acceptance.


## Payment provider decision (10 November 2026)

- Midtrans is selected as the primary payment gateway; Xendit is deferred.
- Payment integration is not live and collection remains disabled. Merchant account approval, credentials, approved prices/quotas, billing rules, signed webhook processing, subscription enforcement, and sandbox acceptance are still required.
- The provider decision does not approve any price or authorize charging customers.
- See [Midtrans Payment Foundation](PAYMENTS_MIDTRANS.md) for the implementation contract and release gates.
