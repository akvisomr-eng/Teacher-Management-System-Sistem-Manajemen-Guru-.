# Teacher Management System (TMS)

Sistem Manajemen Guru berbasis SaaS untuk satuan pendidikan di Indonesia.

## Fondasi saat ini
- Next.js App Router dengan dashboard responsif berbahasa Indonesia.
- Neon Managed Auth untuk login, registrasi, dan verifikasi email OTP.
- Onboarding organisasi/sekolah, administrator awal, dan tahun akademik.
- Multi-tenant schema dengan PostgreSQL RLS dan role runtime least-privilege.
- Domain akademik awal: guru, siswa, kelas, mapel, penugasan, jurnal, asesmen, hasil asesmen, kurikulum, perangkat ajar, dan audit log.

## Jenjang sasaran
PAUD, SD, SMP, SMA/SMK, SLB, Madrasah Aliyah, dan pendidikan kesetaraan.

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
Fondasi aplikasi, autentikasi, onboarding, dan schema akademik awal berada pada PR draft. Migrasi database 0001–0003 sudah diterapkan pada branch Neon staging dan production; pengujian RLS lintas tenant berhasil di staging. CI dan preview deployment masih menjadi release gate, dan environment DATABASE_URL Vercel belum diisi.
