# Commercial Launch Readiness

Status checked: 12 November 2026

## Current release

- Production URL: https://teacher-management-system-nine.vercel.app
- Latest merged main commit at this review: `07cd2b45616602113306dd5cf00d303c5eca65f4` (PRs #60–#63 merged).
- The immediately preceding main release `e5cc622607c1c9c5814749d5c267ca6f69ad2356` passed TMS CI #310 and Vercel Production status `success`; its production smoke verified 9/9 checks, including the teacher AI route's unauthenticated redirect and API rejection.
- PR #63 adds a two-stage specialist + independent reviewer AI pipeline. Its main commit deployment and CI #312 were still pending at the time of this snapshot; do not claim that pipeline is live until both complete.
- PRs #60–#62 are merged; PR #60 adds the AI workspace/API, PR #61 hardens auth and production smoke coverage, and PR #62 adds teacher-approved per-field suggestions. Do not upgrade Vercel or incur paid charges without approval.
- Neon production and staging branches: READY.
- Runtime database role `tms_app`: `rolsuper=false`, `rolbypassrls=false`.

## Implemented for the school pilot

- Organization/school onboarding and role-based workspace.
- Teacher and student master registries, academic structure, assignments and student placement.
- Teacher Desk with encrypted offline drafts, encrypted backup/restore, sync, and explicit local/server conflict resolution.
- Teacher-specific activity view for lesson plans and teaching journals.
- Teacher Desk source clearly distinguishes private offline drafts and synced archive copies from formal school submissions; official review remains in the online Teaching Activities workflow.
- Teacher ownership checks and school-manager review transitions.
- Administrative student-form sections now display in reverse order (bottom section first), as requested; standard administrative forms follow the same visual order. GTK standard-form sections are rendered in reverse order as well.
- Teaching-journal source now uses the browser's local calendar timezone, avoiding UTC date rollover for Indonesian teachers.
- Service worker cache cleanup is isolated to the TMS cache namespace and merged to main; production deployment confirmation is pending the Vercel build-rate-limit.

## Commercial launch blockers

These are external/product decisions or operational controls, not items that can be safely fabricated by code:

1. **Real teacher activation:** production currently has 1 school, 1 tenant, 15 active teacher records, 0 invitation emails recorded, 0 linked teacher accounts, and 0 teacher memberships. The 15 active teacher records currently have no account email set. The school operator must enter each teacher's real email, the teacher registers using that exact email, and the operator then links the account. Do not create dummy users.
2. **Branded authentication email:** production Neon Auth currently uses the shared sender `auth@mail.myneon.app` / `Neon Auth`. A verified organization-owned sender domain and SMTP provider must be configured and deliverability tested before public registration.
3. **Subscription billing:** Midtrans integration is selected and the additive billing ledger schema is installed, but checkout, signed webhook processing, invoice lifecycle automation, subscription enforcement, and a validated price list are not implemented. Starter / Professional / Enterprise are concepts only; prices and quotas must be validated and approved before they are exposed as live offers. Payment provider credentials are not present in the project configuration.
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


## Teacher AI release status (12 November 2026)

- `/teacher/ai` is deployed as an authenticated teacher-only workspace. Production smoke checks confirm unauthenticated page requests redirect to sign-in and unauthenticated API requests return 401.
- The teacher document editor has per-field AI suggestion controls for all six document types. Suggestions remain separate until the teacher explicitly chooses to use them.
- The current AI pipeline uses a document specialist followed by an independent reviewer. Each interaction makes two bounded model calls; per-user controls are 5 interactions/minute and 60 interactions/24 hours.
- AI model execution remains disabled until a supported model is configured and the organization approves a monthly spend ceiling. Vercel OIDC is used for deployed requests; no API key is exposed to the browser.
- Do not send identifiable student data to AI. The field-assistance flow transmits only an allowlist of general academic context fields; the teacher remains responsible for reviewing outputs.
