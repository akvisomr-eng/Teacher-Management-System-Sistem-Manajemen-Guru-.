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
- Teacher Desk pribadi untuk guru, termasuk draf offline terenkripsi, backup/restore terenkripsi, sinkronisasi eksplisit, dan penanganan konflik.
- Asisten AI guru yang terlindungi autentikasi, pencarian pengetahuan lokal dengan referensi sumber, serta alur spesialis dan reviewer; generasi model tetap nonaktif sampai persetujuan provider dan anggaran.
- Pusat asesmen dan gradebook.
- Pusat Kurikulum dengan draf, penerbitan, arsip, dan versi kurikulum yang tidak dapat diubah setelah diterbitkan.
- Pusat Laporan untuk direktori guru, daftar siswa, rombongan belajar, dan rekap nilai dengan ekspor CSV serta cetak.

Modul rapor lengkap, remedial/enrichment, komunikasi wali, pengembangan profesi guru, analitik lanjutan, integrasi eksternal, dan billing/checkout masih memerlukan implementasi serta pengujian. Asisten AI sudah tersedia sebagai fitur terlindungi, tetapi eksekusi model generatif dinonaktifkan di production sampai persetujuan provider, pemrosesan data, dan batas biaya diberikan.

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

- Production: https://teacher-management-system-nine.vercel.app
- Latest merged main commit: `237b924bff28dc2507de64d4964620fe713ccdc7` (PR #84).
- Main TMS CI run `43440431348` passed: typecheck, lint, production dependency audit, build, and production smoke.
- Matching Vercel Production deployment `dpl_9dwBaj8k7mWaSJaLiVHfcbSeZpro` is `READY` and has the canonical production alias.
- A READY deployment and passing smoke checks establish deployability and tested public/auth boundaries; they do not replace authenticated school/teacher acceptance, backup/restore drills, or end-to-end payment tests.
- Current use is limited to a controlled school pilot. See [Commercial Launch Readiness](docs/COMMERCIAL_LAUNCH_READINESS.md) for verified operational gates.

## Commercial launch status

The current release is live for controlled school-pilot validation. It is **not yet declared commercially ready**: billing/payment, approved pricing, branded domain and SMTP, production backup/restore, legal/support policies, and real teacher end-to-end acceptance remain open. See [Commercial Launch Readiness](docs/COMMERCIAL_LAUNCH_READINESS.md) for verified status and release gates.
