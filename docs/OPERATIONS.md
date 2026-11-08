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
Jalankan SQL secara berurutan:
1. `drizzle/0001_tms_foundation.sql`
2. `drizzle/0002_tenant_rls.sql`
3. `drizzle/0003_academic_operations.sql`
4. `drizzle/0004_academic_assignment_integrity.sql`
5. `drizzle/0005_audit_log_immutability.sql`
6. `drizzle/0006_student_registry_custom_forms.sql`
7. `drizzle/0007_standard_module_records.sql`

Terapkan terlebih dahulu pada staging. Periksa tabel, constraint, RLS policy, dan akses lintas tenant sebelum production. Migrasi bersifat additive; jangan menjalankan ulang skrip yang menambahkan constraint tanpa memeriksa statusnya. Migrasi 0007 membuat arsip formulir pendukung per modul dengan RLS, versi skema/referensi, status review, dan audit trail. Migrasi 0007 telah diterapkan dan diverifikasi pada branch staging serta production.

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

## Status terverifikasi per 8 November 2026
- Foundation, registry, master akademik, penugasan, penempatan siswa, perencanaan ajar, jurnal, asesmen, gradebook, Pusat Kurikulum, dan Pusat Laporan telah digabung ke `main`.
- CI #126 (audit hardening) dan #128 (Pusat Kurikulum) berhasil: typecheck, lint, audit dependency produksi, dan production build.
- Preview Pusat Kurikulum dan Pusat Laporan berstatus `READY`. Deployment Production untuk commit `20758d48f6d5cce983c7c821878f97433ea575b3` berstatus `READY`.
- Neon `tms-staging` dan `production` berstatus ready. Kedua branch memiliki 20 tabel aplikasi; tabel tenant-scoped dilindungi RLS. Migrasi 0001–0007 telah diterapkan.
- Migrasi 0005 telah diterapkan pada staging dan production. Hak `tms_app` untuk audit log diverifikasi: SELECT/INSERT diizinkan; UPDATE/DELETE/TRUNCATE ditolak. RLS audit log hanya SELECT/INSERT.
- PR #15 (formulir administrasi pendidikan) merged pada commit `bdb08e0984e1d67e78c8362477a49b3b3a530547`; CI #166 lulus (typecheck, lint, audit dependency, build, smoke check). Deployment Production Vercel berstatus READY. Migrasi 0007 telah diterapkan pada staging dan production; RLS aktif, hak tabel role `tms_app` tersedia, dan tanpa tenant context tidak ada baris yang terlihat.
- Pembacaan tanpa tenant context mengembalikan nol baris pada tabel tenant-scoped di staging dan production.
- Vercel memiliki `DATABASE_URL` role `tms_app` yang terpisah untuk Preview dan Production; Auth URL dan cookie secret juga dipisahkan. `NEXT_PUBLIC_APP_URL` Production menggunakan `teacher-management-system-nine.vercel.app`.
- Tidak ada runtime error yang terdeteksi pada rentang pemeriksaan terakhir 30 menit. Route workspace baru ter-build dan deployment READY; pengujian UI dan transaksi dengan sesi pengguna sekolah nyata masih diperlukan karena sesi autentikasi pengguna tidak tersedia untuk pengujian otomatis dari luar. Uji end-to-end sign-in, onboarding, dan transaksi sekolah dengan akun pengguna nyata tetap diperlukan.
- Shared SMTP masih aktif. SMTP bermerek organisasi, uji autentikasi end-to-end, backup/recovery teruji, kebijakan privasi/retensi, dan prosedur insiden tetap menjadi release gate sebelum operasional komersial penuh.
- Rapor, remedial/enrichment, komunikasi wali, AI, analitik lanjutan, integrasi, dan billing belum dinyatakan siap operasional.
