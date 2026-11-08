# RBAC dan Batas Akses

## Prinsip
- Deny by default: tidak ada izin tanpa permission eksplisit.
- Identitas berasal dari Neon Auth; profil aplikasi dihubungkan melalui `users.auth_user_id`.
- Keanggotaan pada tenant/sekolah menjadi sumber akses. Role dari browser tidak pernah dipercaya.
- Tenant dan school scope diverifikasi di service layer serta dibatasi ulang oleh PostgreSQL RLS.
- Perubahan role, keanggotaan, ekspor data, dan perubahan konfigurasi akademik wajib dicatat di audit log.
- Tidak ada pengguna yang boleh menaikkan role atau mengubah tenant sendiri melalui endpoint umum.

## Role awal
| Role | Lingkup | Kemampuan inti |
|---|---|---|
| platform_owner | Platform | Mengelola tenant, paket, kebijakan global, dan operator platform |
| platform_support | Platform terbatas | Diagnostik dan bantuan terkontrol; akses data sekolah perlu persetujuan |
| tenant_owner | Yayasan/tenant | Mengelola sekolah, admin tenant, dan kebijakan organisasi |
| tenant_admin | Tenant/sekolah | Administrasi sekolah, pengguna, kalender, dan data master |
| principal | Sekolah | Persetujuan dan pemantauan akademik sekolah |
| vice_principal | Sekolah | Pengelolaan akademik sesuai penugasan |
| school_operator | Sekolah | Administrasi data sekolah sesuai permission |
| teacher | Sekolah/kelas/mapel | Perangkat ajar, jurnal, asesmen, dan data kelas yang ditugaskan |
| homeroom_teacher | Kelas | Pemantauan kelas dan perkembangan siswa yang ditugaskan |
| student | Diri sendiri/kelas | Materi, jadwal, tugas, dan hasil belajar yang diizinkan |
| parent | Anak yang ditautkan | Informasi perkembangan anak dan komunikasi wali |
| auditor | Read-only | Laporan dan jejak audit yang ditugaskan |

## Permission namespaces
`tenant.*`, `school.*`, `user.*`, `teacher.*`, `student.*`, `curriculum.*`, `class.*`, `lesson_plan.*`, `journal.*`, `assessment.*`, `gradebook.*`, `report.*`, `communication.*`, `audit.*`, `billing.*`.

## Aturan wajib
1. Setiap operasi memeriksa session, status akun, membership, role, permission, dan scope.
2. Guru hanya mengakses kelas/mapel dalam penugasannya, kecuali diberi izin tambahan.
3. Orang tua hanya melihat siswa yang relasi walinya telah diverifikasi.
4. Siswa hanya melihat data miliknya dan konteks kelas yang relevan.
5. Perubahan nilai setelah dipublikasikan harus memiliki alasan, pembuat perubahan, waktu, dan riwayat versi.
6. AI tidak boleh menerbitkan nilai, rapor, keputusan disiplin, atau keputusan berisiko tinggi tanpa persetujuan manusia.
7. Dukungan platform tidak otomatis mendapat akses isi data sensitif; akses break-glass harus sementara dan diaudit.


## Implementasi awal yang sudah tersedia
- Pengelolaan data master dan konfigurasi akademik dibatasi pada `tenant_owner`, `tenant_admin`, `principal`, `vice_principal`, dan `school_operator`.
- Alur rencana ajar/jurnal mendukung role `teacher` dan `homeroom_teacher` dengan pembatasan ke profil guru, penugasan, tenant, dan sekolah miliknya.
- Guru hanya dapat mengajukan rencana/jurnal; persetujuan dan peninjauan dilakukan oleh pengelola sekolah.
- Akses guru memerlukan tautan `teachers.user_id` ke profil pengguna yang memiliki membership role guru pada sekolah tersebut. Alur undangan dan penautan akun guru masih merupakan pekerjaan lanjutan.
- Daftar role di atas adalah target kebijakan produk. Permission namespace dan evaluasi permission granular masih perlu diselesaikan sebelum peluncuran multi-sekolah skala luas.
