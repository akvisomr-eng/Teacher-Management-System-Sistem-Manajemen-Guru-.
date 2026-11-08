# Teacher Management System (TMS)

Sistem Manajemen Guru berbasis SaaS multi-tenant untuk satuan pendidikan di Indonesia.

## Cakupan sasaran
PAUD, SD, SMP, SMA/SMK, SLB, Madrasah Aliyah, dan pendidikan kesetaraan. Platform dirancang modular agar dapat digunakan sekolah secara mandiri maupun dalam organisasi/yayasan multi-sekolah.

## Fondasi teknis
- Next.js App Router, TypeScript, React, dan CSS responsif.
- Neon Managed Auth untuk autentikasi.
- Neon Postgres dengan Drizzle, SQL migrations, row-level security, dan runtime database role least-privilege.
- Vercel untuk deployment.
- Tenant/school scope, membership-based authorization, dan audit log append-only untuk role runtime.

## Modul yang telah tersedia pada aplikasi
- Autentikasi, onboarding organisasi/sekolah, dan dashboard.
- Direktori guru dan siswa.
- Tahun ajaran, kelas, mata pelajaran, penugasan guru, dan penempatan siswa.
- Perencanaan ajar dan jurnal mengajar.
- Pusat asesmen dan gradebook.
- Pusat Kurikulum dengan draf, penerbitan, arsip, dan versi kurikulum yang tidak dapat diubah setelah diterbitkan.

Modul rapor, remedial/enrichment, komunikasi wali, pengembangan guru, AI teaching assistant, analitik lanjutan, integrasi, dan billing masih memerlukan implementasi dan pengujian.

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
Fondasi aplikasi telah digabung ke `main` dan dipublikasikan pada Vercel. CI menjalankan typecheck, lint, audit dependency produksi, dan production build. Pusat Kurikulum telah lolos CI dan Preview deployment; deployment Production untuk rilis kurikulum sedang diproses pada saat pembaruan dokumen ini. Status `READY` pada Vercel tidak dengan sendirinya membuktikan seluruh alur bisnis telah diuji end-to-end. Lihat `docs/OPERATIONS.md` untuk status infrastruktur dan release gates yang masih terbuka.
