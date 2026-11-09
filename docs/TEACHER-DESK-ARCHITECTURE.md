# TMS Teacher Desk — Architecture and Delivery Plan

## Product decision
Teacher Desk is a teacher-facing companion application inside the existing TMS product. It is not a second school-management system and it does not create a separate database. The existing Neon PostgreSQL project, tenant/school records, teacher master records, and audit foundation remain canonical.

## Access and identity
- Dedicated teacher entry point: `/teacher` and a teacher-specific sign-in entry point.
- Every teacher signs in with an individual account. No shared teacher credentials.
- The authenticated identity must map to exactly one active `teachers.user_id` record in the selected school and a `memberships.role = 'teacher'` membership.
- The server derives teacher, tenant, and school IDs from the authenticated session. Never trust a teacher ID, school ID, tenant ID, or role supplied by the browser.
- Teacher permissions are owner-scoped. A teacher can read and write only their own personal workspace items and only teaching assignments explicitly assigned to them.
- School managers retain their separate TMS workspace and cannot silently impersonate a teacher.
- The school manager links an already registered account to the canonical teacher record at `/workspace/teachers/access`. The link operation checks manager authority, rejects an account with a non-teacher role in that school, and prevents one account from being assigned to two different teacher records in the same school.
- A teacher must first register/sign in once through `/teacher/sign-in`; the school then links that exact email. This keeps identity creation separate from school authorization.

## Data architecture
- One Neon project and one PostgreSQL database shared with TMS.
- Canonical entities stay in existing tables: `teachers`, `teaching_assignments`, `classes`, `subjects`, `teaching_plans`, `teaching_journals`, `assessments`, and `assessment_results`.
- Personal drafts and working documents use a tenant-, school-, teacher-, and user-scoped `teacher_workspace_items` table. This is a new module table in the same database, not a separate database.
- Official master data changes remain subject to school review/approval. Offline imports never directly overwrite canonical teacher/student master records.

## Offline-first and removable-media workflow
- Browser local persistence uses IndexedDB, not localStorage, for structured drafts. Teacher Desk now encrypts local records with AES-256-GCM; a passphrase-derived key uses PBKDF2-SHA-256 with 310,000 iterations and a per-teacher random salt. The passphrase is not persisted.
- A teacher can create and edit personal work without a network connection after the app shell has been visited once.
- Sync is explicit and idempotent. The server authenticates the teacher again and derives ownership before accepting data.
- Portable backup/transfer uses a versioned AES-GCM encrypted JSON package. Export and import are available without network access, including via USB flash drive; the package requires its passphrase on the receiving device.
- Import is staged as local drafts first. It never silently merges into official school records.
- Conflict handling must show both local and server versions and require a teacher choice; no silent destructive last-write-wins.
- Existing v1 plaintext IndexedDB drafts are encrypted in place when the teacher creates the local vault for the first time. The vault must be unlocked after a browser restart. Losing the passphrase makes local data and portable backups unrecoverable. Shared/public computers still require sign-out and local-data clearing.

## Privacy and security
- Do not cache authenticated HTML, API responses, student lists, grades, or sensitive personal information in the service worker.
- Offline-first defaults to teacher-authored lesson plans, reflections, teaching journals, learning materials, and assessment drafts. Student-level identifiable data is not stored offline unless a future permission and explicit opt-in policy allows it.
- Use strict payload validation, per-user ownership checks, tenant/school isolation, RLS, audit events, file-size limits, schema versions, and import validation.
- Teacher Desk does not imply official Dapodik synchronization.

## Delivery phases
1. **Foundation:** dedicated teacher entry, identity-to-teacher mapping, owner-scoped workspace storage, IndexedDB drafts, manual sync, JSON export/import, offline app-shell fallback.
2. **Teaching workflows:** assigned classes/subjects, teaching plans, ATP/TP/Modul Ajar, journals, attendance preparation, assessment drafts, rubrics, and printable documents.
3. **Review and collaboration:** submit selected work to school, reviewer feedback, version history, conflict resolution, and approval handoff to TMS.
4. **Hardening:** encrypted local vault and portable package foundation delivered; remaining work includes device management, audit review, accessibility, performance, and end-to-end testing across Windows/macOS/Linux browsers.

## Release gates
- No production migration before staging migration and API tests pass.
- No production launch until cross-teacher isolation tests prove teacher A cannot read, update, import, or export teacher B's records.
- Offline create/edit/export/import must work with network disabled.
- Reconnect sync must be idempotent and must surface conflicts rather than discard work.
- Existing TMS admin and school workflows must remain unchanged.
