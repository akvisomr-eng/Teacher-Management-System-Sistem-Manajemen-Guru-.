# Operasional dan Deployment

## Lingkungan
Gunakan dua branch Neon yang berbeda:
- **Production**: branch `production` — data operasional sesungguhnya.
- **Preview/staging**: branch `tms-staging` — pengujian fitur, migrasi, dan autentikasi.

Jangan arahkan deployment preview ke database production.

## Environment variables
Set seluruh variabel di Vercel sebagai encrypted/sensitive dan jangan commit nilainya:
- `NEON_AUTH_BASE_URL`: URL Neon Auth untuk branch yang sesuai dengan target deployment.
- `NEON_AUTH_COOKIE_SECRET`: secret acak minimal 32 karakter.
- `DATABASE_URL`: connection string role `tms_app`, bukan `neondb_owner`.
- `NEXT_PUBLIC_APP_URL`: origin aplikasi yang benar.

Preview menggunakan connection string dan Auth URL dari `tms-staging`. Production menggunakan nilai dari branch `production`.

## Migrasi
File SQL dijalankan berurutan:
1. `drizzle/0001_tms_foundation.sql`
2. `drizzle/0002_tenant_rls.sql`
3. `drizzle/0003_academic_operations.sql`

Jalankan terlebih dahulu pada branch staging. Periksa tabel, constraint, RLS policy, dan uji akses lintas tenant sebelum menerapkan ke production. Migrasi bersifat additive; jangan menjalankan ulang skrip yang menambahkan constraint tanpa memeriksa statusnya.

## Database security
- Runtime aplikasi harus memakai role `tms_app` dengan akses read/write terbatas.
- Jangan memakai role admin/superuser sebagai `DATABASE_URL` runtime.
- Set `app.auth_user_id` dan `app.tenant_id` di dalam transaksi server.
- Semua endpoint yang membaca atau mengubah data harus memeriksa session dan membership terlebih dahulu.
- Jangan mengandalkan tenant ID dari browser sebagai bukti otorisasi.
- RLS adalah lapisan pertahanan tambahan, bukan pengganti pemeriksaan role dan izin pada service layer.

## Auth email
Email/password dan verifikasi OTP diaktifkan pada Neon Auth. Shared SMTP hanya untuk uji awal; siapkan SMTP milik organisasi untuk penggunaan produksi dan verifikasi deliverability sebelum membuka pendaftaran umum.

## Release gates
- CI: typecheck, lint, build berhasil.
- Preview: sign-up, verifikasi email, sign-in, sign-out, session refresh dan protected routes berhasil.
- Onboarding: organisasi, sekolah, admin awal dan tahun akademik berhasil dibuat.
- Security: dua tenant terpisah dan tidak dapat membaca/mengubah data satu sama lain.
- Database: seluruh migrasi staging berhasil; production migration dilakukan setelah preview disetujui.
- Deployment: GitHub repository terhubung ke Vercel, environment target diverifikasi, dan domain/trusted origin didaftarkan.

## Snapshot implementasi 7 November 2026
- Migrasi 0001–0003 sudah diterapkan pada branch `tms-staging` dan `production` setelah berhasil diuji pada staging.
- Kedua branch memiliki 17 tabel aplikasi awal dan 18 kebijakan RLS.
- Role `tms_app` diuji: tanpa konteks tenant tidak dapat membaca data sekolah/siswa.
- Environment Vercel masih memerlukan `DATABASE_URL` role `tms_app` per target (staging untuk Preview, production untuk Production).
