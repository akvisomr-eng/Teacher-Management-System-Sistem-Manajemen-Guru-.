# Teacher Management System (TMS)

Sistem Manajemen Guru berbasis SaaS multi-tenant untuk satuan pendidikan di Indonesia.

## Cakupan sasaran
PAUD, SD, SMP, SMA/SMK, SLB, Madrasah Aliyah, dan pendidikan kesetaraan. Platform dirancang modular agar dapat digunakan sekolah secara mandiri maupun dalam organisasi/yayasan multi-sekolah.

## Fondasi teknis
- Next.js App Router, TypeScript, React, dan Tailwind/CSS.
- Neon Managed Auth untuk autentikasi.
- Neon Postgres dengan Drizzle, SQL migrations, row-level security, dan runtime database role least-privilege.
- Vercel untuk deployment.
- Tenant/school scope, membership-based authorization, dan audit log.

## Modul domain
Platform & tenant administration, manajemen sekolah, identitas dan akses, direktori guru/siswa, tahun akademik, kelas, mata pelajaran, kurikulum, perencanaan ajar, jurnal mengajar, asesmen, rapor, remedial/enrichment, portofolio siswa, komunikasi wali, pengembangan guru, AI teaching assistant, analitik, integrasi, dan billing.

## Development
```bash
npm install
cp .env.example .env.local
npm run dev
```

Variabel lingkungan dijelaskan pada `.env.example` dan `docs/OPERATIONS.md`. Jangan pernah menggunakan kredensial database admin sebagai `DATABASE_URL` runtime.

## Struktur penting
- `src/app`: halaman dan route handlers.
- `src/db/schema.ts`: schema Drizzle.
- `drizzle/`: SQL migrations berurutan.
- `docs/ARCHITECTURE.md`: arsitektur domain dan prinsip keamanan.
- `docs/RBAC.md`: peran dan batas akses.
- `docs/OPERATIONS.md`: staging, production, migrasi, dan release gates.

## Status rilis
Fondasi autentikasi, onboarding, dashboard, PostgreSQL RLS, serta direktori guru/siswa telah digabung ke `main`. Pengelolaan kelas dan mata pelajaran sedang dikembangkan pada PR berikutnya. Kurikulum, penugasan guru, perencanaan ajar, jurnal, asesmen/rapor, komunikasi, AI, analitik, billing, dan integrasi masih memerlukan implementasi serta pengujian sebelum seluruh platform dinyatakan siap operasional.
