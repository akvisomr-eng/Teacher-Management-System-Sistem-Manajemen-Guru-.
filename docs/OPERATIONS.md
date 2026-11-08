# Operasional dan Deployment

## Lingkungan
Gunakan dua branch Neon yang berbeda:
- **Production**: branch `production` — data operasional sesungguhnya.
- **Preview/staging**: branch `tms-staging` — pengujian fitur, migrasi, dan autentikasi.

Semua deployment Preview memakai database staging. Deployment Production hanya memakai database production. Jangan pernah mengarahkan Preview ke database production.

## Environment variables
Atur variabel di Vercel sesuai target deployment dan jangan pernah memasukkan nilainya ke repository atau percakapan:
- `NEON_AUTH_BASE_URL`: URL Neon Auth untuk branch yang sesuai dengan target deployment.
- `NEON_AUTH_COOKIE_SECRET`: secret acak minimal 32 karakter, bertipe Sensitive, dan berbeda untuk Production, Preview, dan Development.
- `DATABASE_URL`: connection string role `tms_app`, bukan `neondb_owner`.
- `NEXT_PUBLIC_NEON_AUTH_URL`: endpoint publik Neon Auth untuk branch target.
- `NEXT_PUBLIC_APP_URL`: origin aplikasi yang benar; variabel ini memang bersifat publik.

Preview menggunakan connection string dan Auth URL dari `tms-staging`; Production menggunakan nilai dari branch `production`. Environment variable database dan Auth tidak boleh saling tertukar. Setiap perubahan environment variable memerlukan redeploy untuk diterapkan pada deployment yang sudah ada.

## Migrasi
File SQL dijalankan berurutan:
1. `drizzle/0001_tms_foundation.sql`
2. `drizzle/0002_tenant_rls.sql`
3. `drizzle/0003_academic_operations.sql`
4. `drizzle/0004_academic_assignment_integrity.sql`

Jalankan terlebih dahulu pada branch staging. Periksa tabel, constraint, RLS policy, dan uji akses lintas tenant sebelum menerapkan ke production. Migrasi bersifat additive; jangan menjalankan ulang skrip yang menambahkan constraint tanpa memeriksa statusnya.

## Database security
- Runtime aplikasi harus memakai role `tms_app` dengan akses read/write terbatas.
- Jangan memakai role admin/superuser sebagai `DATABASE_URL` runtime.
- Set `app.auth_user_id` dan `app.tenant_id` di dalam transaksi server.
- Semua endpoint yang membaca atau mengubah data harus memeriksa session dan membership terlebih dahulu.
- Jangan mengandalkan tenant ID dari browser sebagai bukti otorisasi.
- RLS adalah lapisan pertahanan tambahan, bukan pengganti pemeriksaan role dan izin pada service layer.
- API mengembalikan respons autentikasi terstruktur; route handler harus tetap melakukan pemeriksaan session, membership, role, tenant, dan sekolah.
- Penambahan/perubahan direktori guru dan siswa serta master kelas/mapel dicatat ke audit log.
- Data peserta didik adalah data pribadi. Batasi akses, minimalkan pengumpulan, dan tetapkan kebijakan retensi sebelum sekolah menggunakannya secara luas.

## Auth email
Email/password dan verifikasi OTP diaktifkan pada Neon Auth. Shared SMTP hanya untuk uji awal; siapkan SMTP milik organisasi untuk penggunaan produksi dan verifikasi deliverability sebelum membuka pendaftaran umum. Domain production dan preview yang digunakan harus tercatat di trusted-origin allowlist pada branch Neon Auth masing-masing.

## Release gates
- CI: typecheck, lint, dependency audit, dan production build berhasil.
- Preview: sign-up, verifikasi email, sign-in, sign-out, session refresh dan protected routes berhasil.
- Onboarding: organisasi, sekolah, admin awal dan tahun akademik berhasil dibuat.
- Registry: tambah, daftar, pencarian, dan perubahan status guru/siswa, kelas, dan mata pelajaran berhasil.
- Academic operations: penugasan guru-mapel-kelas dan penempatan siswa harus lolos validasi tahun ajaran, sekolah, dan duplikasi.
- Security: dua tenant terpisah dan tidak dapat membaca/mengubah data satu sama lain; role tanpa izin ditolak.
- Database: seluruh migrasi staging berhasil; production migration dilakukan setelah preview disetujui.
- Deployment: environment target, domain, trusted origin, dan health monitoring diverifikasi.
- Operasional: email pengiriman, backup/recovery, monitoring, kebijakan privasi, dukungan, dan prosedur insiden siap.

## Status terverifikasi per 8 November 2026
- Foundation commit `5ca5a7029aa084134d8f76b481f1bffeffa573eb` telah lulus CI #104 dan deployment Vercel Production berstatus `READY`.
- PR #2 (direktori guru/siswa, API tenant-scoped, audit log, dan dokumentasi) telah digabung ke `main`; CI #110 dan deployment Preview untuk commit fitur terakhir berhasil.
- Branch Neon `tms-staging` dan `production` berstatus `ready`; migrasi 0001–0003 telah diterapkan pada keduanya.
- Database awal memiliki 17 tabel aplikasi dengan kebijakan RLS tenant-scoped. Runtime role `tms_app` tidak dapat membaca data sekolah/guru/siswa tanpa konteks tenant pada kedua branch.
- Environment `DATABASE_URL` Production dan Preview memakai role `tms_app`; Preview diarahkan ke staging dan Production ke production.
- Cookie secret Neon Auth telah dipisahkan untuk Production, Preview, dan Development; trusted origins production dan preview telah dikonfigurasi.
- Pengelolaan kelas dan mata pelajaran sedang dikembangkan pada PR terpisah. Modul kurikulum, penugasan, perencanaan ajar, jurnal, asesmen, rapor, komunikasi, AI, analitik, dan billing masih memerlukan implementasi serta pengujian tersendiri.
