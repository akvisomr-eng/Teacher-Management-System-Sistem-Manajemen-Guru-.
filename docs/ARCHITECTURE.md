# Arsitektur TMS

## Keputusan arsitektur
- Modular monolith Next.js App Router dengan batas domain dan service layer.
- PostgreSQL (Neon) sebagai sumber data utama; Drizzle ORM dan SQL migration disimpan di repository.
- Tenant boundary wajib diterapkan di setiap query server-side. Identitas pengguna dan membership menjadi sumber otorisasi; jangan mempercayai tenant_id dari browser.
- RBAC deny-by-default berlapis: platform, tenant/yayasan, sekolah, kelas, mata pelajaran, dan kepemilikan data.
- Kurikulum, format asesmen, rubrik, dan struktur laporan bersifat versioned/configurable, bukan enum permanen.
- AI hanya memberi rekomendasi/draf; guru atau pejabat sekolah tetap menyetujui keputusan akademik.

## Domain modules
1. Platform & tenant administration
2. School profile and organization
3. Identity, memberships, roles and permissions
4. Teacher and student registry
5. Academic year, calendar, classes, subjects and schedules
6. Curriculum center and versioned learning outcomes
7. Lesson plans, teaching journals and classroom activity
8. Assessment, question bank, rubrics and gradebook
9. Report cards, remedial and enrichment
10. Student development, projects and portfolios
11. Parent communication and notifications
12. Teacher professional development
13. AI teaching assistant and human review
14. Analytics, exports and audit center
15. Integrations and subscription billing

## Implemented baseline
- Authenticated dashboard, school onboarding, academic year creation, Neon Auth, PostgreSQL RLS.
- Teacher and student registry APIs and workspace pages are merged into `main`.
- Class and subject master-data workflows are merged into `main`, including academic-year-bound classes and homeroom teacher assignment.
- Teaching assignments and student enrollments validate class/year pairing, active teacher/subject/student, tenant/school scope, duplicate assignment/enrollment, and audit changes.
- Teaching plans and journals include teacher ownership checks and manager review permissions.
- Assessment and gradebook workflows include assignment-scoped assessments, enrolled-student validation, maximum-score checks, and audit logging.
- Curriculum Center supports draft creation, structured learning outcomes, publication, archiving, and immutable published versions. Version creation uses a transaction advisory lock.
- Runtime audit logs are append-only for `tms_app`; the runtime role can read and insert audit events but cannot update, delete, or truncate them.

## Security baseline
- No public database credentials; `DATABASE_URL` is server-only.
- Validate inputs at API boundaries and use parameterized queries.
- Audit sensitive writes and administrative actions.
- Enforce tenant and school scoping in server services and PostgreSQL RLS.
- Minimize student personal data; establish retention and consent policies before production use.
- Never send sensitive student records to AI providers without an explicit, documented lawful basis and configured safeguards.

## Delivery gates
1. Foundation and CI
2. Authentication, onboarding and authorization
3. Tenant/school setup and registry
4. Curriculum and academic operations
5. Teaching workflow and assessment
6. Report cards, remedial and enrichment
7. Parent/student experience
8. AI assistive workflows
9. Reports, integrations, billing and production hardening
