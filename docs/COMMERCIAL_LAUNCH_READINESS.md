# Commercial Launch Readiness

Status checked: 13 November 2026

## Current release

- Production URL: https://teacher-management-system-nine.vercel.app
- Latest merged main commit at this review: `1f9337222a18b8c831cc9b4ab00391230b2e6338` (PR #82; final release-evidence and commercial-gate documentation).
- The immediately preceding main release `e5cc622607c1c9c5814749d5c267ca6f69ad2356` passed TMS CI #310 and Vercel Production status `success`; its production smoke verified 9/9 checks, including the teacher AI route's unauthenticated redirect and API rejection.
- PR #63 adds the two-stage specialist + independent reviewer AI pipeline and is deployed in main commit `07cd2b45616602113306dd5cf00d303c5eca65f4`; TMS CI #312 passed and production smoke passed 9/9, with Vercel Production status `success`.
- PRs #60–#82 are merged. The current production build is READY for commit `1f9337222a18b8c831cc9b4ab00391230b2e6338`; post-merge TMS CI run `43424908611` (#366) completed successfully. Do not upgrade Vercel or incur paid charges without approval.
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
- Service worker cache cleanup is isolated to the TMS cache namespace and included in the deployed production release.

## Commercial launch blockers

These are external/product decisions or operational controls, not items that can be safely fabricated by code:

1. **Real teacher activation:** refresh the live tenant/school/teacher membership counts before launch; historical snapshots in this document are not a substitute for a current audit. The school operator must enter each teacher's real email, the teacher registers using that exact email, and the operator then links the account. Verify registration, linking, teacher-only access, and account separation with real users. Do not create dummy users.
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
- AI model execution is fail-closed by two independent gates: `TMS_AI_ENABLED` and `TMS_AI_BUDGET_APPROVED`. Both must be explicitly set to `true`; keep both false until a supported model, data-processing terms, and monthly spend ceiling are approved. Vercel OIDC is used for deployed requests; no API key is exposed to the browser.
- Do not send identifiable student data to AI. The field-assistance flow transmits only an allowlist of general academic context fields; the teacher remains responsible for reviewing outputs.


## Engineering continuation — 13 November 2026

- Production deployment for main commit `ad451c12f265859fe1ab97a259636b60c9e4a29c` is Vercel `READY`; the canonical production URL remains https://teacher-management-system-nine.vercel.app.
- TMS CI #343 completed successfully after the local retrieval + grounded teacher AI changes. The prior Production Smoke #144 also passed on the preceding release. These checks verify build and unauthenticated access controls; they do not replace authenticated teacher acceptance.
- Local knowledge search runs on the TMS server from bundled reference material. AI response generation still depends on the configured remote AI Gateway and remains fail-closed behind `TMS_AI_ENABLED` and `TMS_AI_BUDGET_APPROVED`; the product must not be marketed as fully offline generative AI.
- Teacher Desk supports encrypted local drafts, encrypted backup/restore, and explicit sync/conflict handling. Official school submission/review remains a separate online workflow.
- The production smoke suite now covers the offline shell, service worker, PWA manifest, teacher account management and email-assignment authentication, teacher workspace sync authentication, and local knowledge API authentication. The latest main CI run passed all quality gates and production smoke passed 17/17 checks.
- Commercial readiness remains blocked by the external/operational gates listed above: real teacher acceptance, organization-owned SMTP, controlled domain and trusted origins, backup/restore drill and monitoring, legal/support controls, and approved Midtrans merchant credentials/pricing plus checkout/webhook/subscription acceptance. No payment collection or paid infrastructure changes are authorized by this engineering work.


## Production data and auth snapshot — 13 November 2026

- Read-only production count: 1 tenant, 1 school, 15 active teacher records, 1 linked teacher account, 1 teacher membership, 50 active students, 0 billing invoices, and 0 payment transactions.
- Neon Auth production has email/password sign-up enabled with required email verification and OTP verification. Localhost is disabled. The current sender is still the shared Neon Auth sender, not an organization-owned SMTP domain.
- The production origin allowlist currently contains the canonical Vercel application host and two Vercel aliases. A business-controlled domain must be added only after ownership and DNS/TLS verification.
- The Neon production project is Free (`free_v3`), history retention is 6 hours, and the production branch is currently unprotected. The runtime database role is least-privilege with superuser and RLS-bypass disabled.
- Billing ledger tables exist, but there are no invoices or payment transactions. This confirms payment collection has not started; it does not mean the billing product is implemented.


## Release verification — 13 November 2026 (teacher activation release)

- Main commit at that release: `49115350172523a9961830959579b59861967a6b` (PR #79).
- Vercel production deployment for this commit: `READY`.
- TMS CI completed successfully: typecheck, lint, dependency audit, build, and production smoke.
- Production smoke: `17/17` checks passed, including public password-reset, teacher AI route/API authorization, offline shell, service worker, PWA manifest, teacher account management reads, teacher account email assignment writes, teacher workspace sync API, and local teacher knowledge API.
- The teacher account-email workflow is deployed, but it does not create or invite users automatically. The school must provide the 14 remaining real email addresses; each teacher must register and verify that email before the operator links the account.
- No production database migration or teacher account creation was performed in PRs #76–#79.


## Production environment audit — 13 November 2026

This inventory checks variable names and configuration presence only; secret values were not requested or exposed.

- **Custom domain:** the production project has only the verified Vercel host `teacher-management-system-nine.vercel.app`. No organization-owned custom domain is attached.
- **AI generation:** production has no `TMS_AI_ENABLED`, `TMS_AI_BUDGET_APPROVED`, `TMS_AI_MODEL`, or `AI_GATEWAY_API_KEY` project variables. Generative AI responses are therefore disabled in production. Local teacher knowledge retrieval and citation grounding remain available; retrieval is not the same as a local generative model. Do not enable remote AI generation until the model/provider and monthly spending limit are explicitly approved.
- **Payments:** no Midtrans server/client key variables are configured, and no checkout or webhook route exists in the application yet. Billing ledger tables exist, but production currently has 0 invoices and 0 payment transactions. Payment collection is not available.
- **Email:** Neon Auth is configured, but no organization-owned SMTP sender is configured; verification email uses the shared Neon sender. No teacher invitation email is sent by the new account-email assignment flow.
- **External launch inputs still required:** the approved domain and registrant/owner, organization-owned SMTP credentials and sender domain, AI provider/model and spending ceiling (if AI generation is required), Midtrans merchant account credentials, approved plan names/prices/terms, legal entity/contact and support channels, and the 14 remaining real teacher email addresses.
- **Operational risk:** Neon production remains on the Free `free_v3` plan with 6-hour history retention and no verified independent backup/restore drill. This is unsuitable as the final commercial data-protection posture until the organization approves a retention/backup arrangement and a restore drill succeeds.


## Latest production verification — 13 November 2026

- Latest merged main commit: `1f9337222a18b8c831cc9b4ab00391230b2e6338` (PR #82, final production evidence and commercial release gates).
- Vercel production deployment for that exact commit: `READY` (`dpl_2ZZBDYuu2LRBx4ji28AQbh7M5pyW`); canonical alias remains https://teacher-management-system-nine.vercel.app.
- Post-merge TMS CI run `43424908611` (#366): `success` on the exact main commit. The PR #82 Production Smoke run `43424737769` passed `17/17`; the post-merge CI also completed successfully.
- The 17 smoke checks cover sign-in/password reset, unauthenticated workspace redirect, database/auth health, report/registry/onboarding authorization, teacher AI authorization, offline shell, service worker, PWA manifest, teacher account and email-assignment authorization, workspace sync authorization, and local knowledge API authorization.
- This verifies deployability and public/authentication boundaries. It does **not** replace authenticated operator/teacher acceptance, a disaster-recovery drill, or payment end-to-end testing.

## Commercial release decision

**NO-GO for public paid/commercial launch at this time. Controlled school pilot only.**

The following are hard blockers, not engineering tasks that can safely be guessed:
1. Business-controlled domain ownership, DNS/TLS, and verified auth origin.
2. Organization-owned SMTP sender and credentials.
3. Approved privacy notice, terms, data retention/deletion, support contact/SLA, incident response, and customer exit/export process.
4. Neon production backup/retention upgrade decision and successful independent backup/restore drill.
5. Real teacher onboarding: provide the 14 remaining teachers' actual email addresses, complete registration/email verification, link accounts, and test teacher/operator separation with real users.
6. If AI generation is part of the paid offer: explicit AI provider/model, data-processing approval, and monthly spend ceiling. AI generation is currently disabled in production; local retrieval remains available.
7. If paid subscriptions are part of the paid offer: approved Midtrans merchant account/credentials, plan prices and quotas, tax/invoice/refund terms, checkout, signed idempotent webhooks, entitlement enforcement, and sandbox acceptance. No payment route or payment collection is live.

Do not accept paid customer data or advertise a paid subscription until the relevant gates are closed and verified. The current production application remains suitable for a controlled pilot subject to the school's lawful data handling and real-user acceptance.


## Release verification addendum — 13 November 2026 (PR #82)

- Main CI run `43424908611` completed with conclusion `success` on commit `1f9337222a18b8c831cc9b4ab00391230b2e6338`.
- Vercel production deployment `dpl_2ZZBDYuu2LRBx4ji28AQbh7M5pyW` is `READY` for the same commit.
- The release is still restricted to controlled pilot use. The NO-GO commercial decision and all outstanding external/operational gates remain in force.
