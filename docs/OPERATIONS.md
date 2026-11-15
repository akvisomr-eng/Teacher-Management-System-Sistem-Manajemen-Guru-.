# Operasional dan Deployment

## Lingkungan
- **Production**: Neon branch `production` untuk data operasional.
- **Preview/staging**: Neon branch `tms-staging` untuk pengujian fitur, migrasi, dan autentikasi.

Semua deployment Preview memakai database staging. Deployment Production hanya memakai database production. Jangan pernah mengarahkan Preview ke database production.

## Environment variables
Atur di Vercel sesuai target dan jangan pernah memasukkan nilainya ke repository atau percakapan:
- `NEON_AUTH_BASE_URL`: endpoint Neon Auth sesuai branch.
- `NEON_AUTH_COOKIE_SECRET`: secret acak minimal 32 karakter, bertipe Sensitive, berbeda untuk Production, Preview, dan Development.
- `DATABASE_URL`: connection string role `tms_app`, bukan `neondb_owner`.
- `NEXT_PUBLIC_NEON_AUTH_URL`: endpoint publik Neon Auth sesuai branch.
- `NEXT_PUBLIC_APP_URL`: origin aplikasi yang benar.

Preview memakai connection string dan Auth URL dari `tms-staging`; Production memakai nilai dari branch `production`. Setiap perubahan environment variable memerlukan redeploy.

## Migrasi

Jalankan SQL secara berurutan dan periksa status objek sebelum menerapkan ulang:
1. `drizzle/0001_tms_foundation.sql`
2. `drizzle/0002_tenant_rls.sql`
3. `drizzle/0003_academic_operations.sql`
4. `drizzle/0004_academic_assignment_integrity.sql`
5. `drizzle/0005_audit_log_immutability.sql`
6. `drizzle/0006_student_registry_custom_forms.sql`
7. `drizzle/0007_standard_module_records.sql`
8. `drizzle/0008_standard_form_workflow_links.sql`
9. `drizzle/0009_teacher_workspace_items.sql`
10. `drizzle/0010_teacher_account_invitation_email.sql`
11. `drizzle/0011_billing_payment_ledger.sql`

Terapkan perubahan baru terlebih dahulu pada staging. Periksa tabel, kolom, constraint, index, RLS policy, hak akses runtime, serta akses lintas tenant sebelum production. Migrasi bersifat additive dan sebagian menggunakan `IF NOT EXISTS`; jangan menganggap aman untuk menjalankan ulang seluruh skrip tanpa memeriksa efek dan kondisi aktual. Jangan pernah menjalankan migrasi production tanpa review dan persetujuan release yang sesuai.

**Audit skema production 13 November 2026 (read-only):** objek penting dari rangkaian 0008–0011 terdeteksi: kolom dan constraint link entitas pada `standard_module_records`, `teacher_workspace_items` dengan RLS aktif dan FORCE RLS, kolom email akun guru, serta tiga tabel billing ledger dengan RLS aktif dan FORCE RLS. `standard_module_records` memiliki RLS aktif tetapi tidak FORCE RLS. Role runtime tetap harus non-owner, non-superuser, dan tanpa RLS bypass. Audit ini memverifikasi keberadaan objek, bukan pengganti pencatatan migrasi atau pengujian staging.

## Database security
- Runtime memakai role `tms_app`; jangan gunakan role admin/superuser sebagai `DATABASE_URL`.
- Set `app.auth_user_id` dan `app.tenant_id` di dalam transaksi server.
- Semua endpoint wajib memeriksa session, membership, role, tenant, dan sekolah.
- Jangan mempercayai tenant ID dari browser.
- RLS adalah pertahanan tambahan, bukan pengganti pemeriksaan izin pada service layer.
- Audit log append-only untuk `tms_app`: hanya SELECT dan INSERT; UPDATE, DELETE, dan TRUNCATE dicabut. Kebijakan RLS audit log hanya SELECT dan INSERT pada tenant aktif.
- Data peserta didik adalah data pribadi. Batasi akses, minimalkan pengumpulan, dan tetapkan kebijakan retensi.

## Auth email
Email/password dan verifikasi OTP aktif. Shared SMTP masih digunakan untuk uji awal; siapkan SMTP organisasi dan verifikasi deliverability sebelum pendaftaran umum. Domain production/preview harus tercatat pada trusted-origin allowlist branch Neon Auth masing-masing. Localhost dinonaktifkan pada Auth Production.

## Formulir administrasi standar
- Template sembilan menu menyimpan arsip pendukung melalui /api/standard-forms; akses saat ini hanya role pengelola sekolah.
- Data formulir pendukung tidak otomatis menimpa tabel master. Pemetaan/approval ke master memerlukan implementasi dan pengujian terpisah.
- Pilihan dan field template adalah profil awal TMS, bukan salinan resmi Dapodik. Verifikasi field-level terhadap versi Dapodik dan status peraturan wajib sebelum klaim kepatuhan.

## Release gates
- CI: typecheck, lint, dependency audit, production build.
- Preview: sign-up, verifikasi email, sign-in/out, session refresh, dan protected routes.
- Onboarding: organisasi, sekolah, admin awal, dan tahun akademik.
- Registry: CRUD dan pencarian guru/siswa, kelas, mata pelajaran.
- Academic operations: penugasan guru-mapel-kelas dan penempatan siswa lolos validasi tahun ajaran, sekolah, dan duplikasi.
- Curriculum: draf, capaian pembelajaran, penerbitan, arsip, dan versi baru; versi terbit terkunci.
- Reports: laporan guru, siswa, kelas, dan rekap nilai dibatasi role serta scope sekolah; ekspor CSV dan cetak berfungsi.
- Teaching: kepemilikan guru, alur review, dan audit log.
- Assessment/gradebook: asesmen terikat penugasan; nilai hanya untuk siswa terdaftar pada kelas/tahun ajaran.
- Security: isolasi tenant, penolakan role tanpa izin, dan pengujian lintas sekolah.
- Deployment: environment, domain, trusted origin, dan health monitoring.
- Operasional: SMTP bermerek, backup/recovery teruji, monitoring, kebijakan privasi/retensi, dukungan, dan prosedur insiden.

## Status terverifikasi per 13 November 2026

- Main commit `237b924bff28dc2507de64d4964620fe713ccdc7` (PR #84) passed TMS CI: typecheck, lint, production dependency audit, build, and production smoke. Matching Vercel Production deployment is READY at https://teacher-management-system-nine.vercel.app.
- Production and staging Neon branches are `ready`. Production uses the `tms_app` runtime role; it is not superuser and does not bypass RLS.
- Teacher Desk supports encrypted local drafts and portable backups, explicit sync, and conflict handling. The teacher-specific activity workflow remains separate from private/offline drafts.
- Teacher AI is an authenticated workspace. Local knowledge retrieval and citation grounding are available; remote generative model execution remains fail-closed and disabled until both feature and budget approval gates are explicitly enabled.
- Production aggregate audit: 1 tenant, 1 school, 15 teacher records, 15 assigned account emails, 1 linked teacher account, 14 unlinked teacher records, 1 teacher-role membership, 1 non-teacher membership, 2 app users, 2 Neon Auth users, 50 active students, 0 invoices, and 0 payment transactions. No personal student or teacher details were retrieved for this audit.
- Neon production project remains on `free_v3` with 6-hour history retention. The production branch is unprotected; no automatic snapshot schedule or separately listed snapshots were found. A backup/restore drill has not been verified.
- Shared Neon Auth sender remains in use. Business-owned SMTP, custom domain/trusted origin, legal/support procedures, real teacher activation, and disaster recovery remain commercial release gates.
- Production remains for controlled school-pilot validation, not a declaration of full commercial readiness.

## Payment gateway (Midtrans)

- Midtrans is the selected primary provider; Xendit is not part of the first integration.
- Payment collection remains disabled. No payment credentials or subscription prices are configured.
- Keep MIDTRANS_ENABLED=false until merchant approval, sandbox checkout/webhook acceptance, pricing approval, and entitlement enforcement are complete.
- Store MIDTRANS_SERVER_KEY as a Sensitive server-only Vercel environment variable. Never expose it to browser code or logs. The optional Snap Client Key is publishable and may be configured only when the checkout UI is ready.
- Preview must use Midtrans Sandbox credentials and Production must use Production credentials. Do not mix environments.
- Follow docs/PAYMENTS_MIDTRANS.md for signed notifications, idempotency, reconciliation, subscription lifecycle, and release gates.

## AI Teaching Assistant (12 November 2026)

- PR #60, #61, and #62 are merged. `/teacher/ai` is a protected teacher route; unauthenticated page access redirects to sign-in and the unauthenticated API returns 401 in production smoke tests.
- The Teacher Desk editor now offers contextual suggestions on each field across the six teacher document types. A suggestion is not applied until the teacher explicitly accepts it.
- PR #63 adds the specialist + independent reviewer two-agent pipeline; main commit `07cd2b45616602113306dd5cf00d303c5eca65f4` is deployed with TMS CI #312 passed and production smoke 9/9.
- AI model execution stays disabled until an approved model and monthly spend cap are configured. Vercel OIDC is used for deployed Gateway authentication. Each enabled interaction will invoke two bounded model calls.
- Offline drafts remain available; AI suggestions require an authenticated online session. Avoid sending identifiable student data.
