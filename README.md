# Teacher Management System (TMS)

Sistem Manajemen Guru berbasis SaaS untuk satuan pendidikan di Indonesia.

## Ruang lingkup
- Multi-tenant untuk penyedia platform, yayasan, sekolah, dan unit pendidikan.
- Jenjang PAUD, SD, SMP, SMA/SMK, SLB, MA, dan pendidikan kesetaraan.
- Manajemen guru, siswa, kelas, mata pelajaran, jadwal, dan kalender akademik.
- Kurikulum dan perangkat ajar yang dapat dikonfigurasi serta diberi versi.
- Perencanaan pembelajaran, jurnal mengajar, asesmen, remedial, pengayaan, rapor.
- Komunikasi orang tua, pengembangan guru, analitik, dan asisten AI dengan persetujuan manusia.
- Audit log, kontrol akses berbasis peran, dan isolasi data tenant.

## Prinsip arsitektur
Modular monolith terlebih dahulu, PostgreSQL sebagai sumber data utama, tenant isolation di server/database, API tervalidasi, serta CI/CD dan deployment terukur.

## Status
Fondasi implementasi. Fitur hanya dinyatakan siap setelah implementasi, pengujian, dan verifikasi deployment.

## Development
```bash
npm install
cp .env.example .env.local
npm run dev
```

Set `DATABASE_URL` only in server-side environments. Initial SQL migration: `drizzle/0001_tms_foundation.sql`.

## Current delivery status
Initial application shell, product scope, architecture notes, database schema draft, and CI workflow are on the foundation branch. Authentication, authorization enforcement, data workflows, migration execution, and production deployment remain subsequent delivery gates.
