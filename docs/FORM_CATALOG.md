# Katalog Formulir Administrasi Pendidikan

## Prinsip kesesuaian

TMS menyediakan formulir operasional internal yang mengikuti kelompok data dan validasi referensi Dapodik, bukan menyalin tampilan aplikasi pemerintah atau mengklaim sebagai formulir resmi pemerintah. Nama, kode referensi, daftar pilihan, dan aturan wajib harus mengikuti versi referensi Dapodik yang aktif. Integrasi/sinkronisasi resmi hanya boleh diaktifkan setelah skema, autentikasi, dan mekanisme layanan pemerintah tersedia serta diuji.

Rujukan awal yang harus diperiksa kembali setiap rilis:
- Dapodik 2026 dan dokumentasi/pembaruan aplikasi: https://dapo.kemendikdasmen.go.id/unduhan/
- Panduan penggunaan Dapodik 2026: https://obj.pauddasmen.id/dapodik/Panduan_Lengkap_Aplikasi_Dapodik_versi_2026.pdf
- Helpdesk Dapodik – profil dan data rinci peserta didik: https://helpdesk.pauddasmen.id/help/en-us/8-peserta-didik/40-profil-dan-data-rinci-peserta-didik
- Helpdesk Dapodik – data siswa dan status: https://helpdesk.pauddasmen.id/help/en-us/21-data-pokok/53-data-siswa
- Permendikdasmen Nomor 3 Tahun 2025 tentang SPMB: https://jdih.kemendikdasmen.go.id/sjdih/siperpu/dokumen/salinan/Permendikdasmen%20Nomor%203%20Tahun%202025%20%28JDIH%29.pdf
- Informasi layanan data SPMB tahun ajaran 2026/2027: https://pelayanan.data.kemendikdasmen.go.id/informasi-data-spmb

## Formulir bawaan per menu

| Menu | Kelompok formulir / data |
|---|---|
| Data Siswa | Identitas utama; kewarganegaraan; NISN/NIS; NIK/KITAS; KK; akta; jenis kelamin; tempat/tanggal lahir; agama; alamat dan domisili; koordinat; moda transportasi; ayah; ibu; wali; kontak; sekolah asal; tanggal masuk; kebutuhan khusus; KIP/KKS/KPS/PKH/PIP; status peserta didik; riwayat perubahan |
| Data Guru | Identitas GTK; NIK; NIP/NUPTK; status kepegawaian; jenis PTK; pendidikan; sertifikasi; pangkat/golongan; tugas tambahan; kontak; penugasan; riwayat kepegawaian |
| Kelas & Mapel | Tahun ajaran; tingkat/rombel; kapasitas; wali kelas; ruang; mata pelajaran; kelompok mapel; jam pelajaran |
| Pusat Kurikulum | Kurikulum; struktur; fase/tingkat; capaian pembelajaran; tujuan pembelajaran; alur tujuan; projek/kokurikuler; versi dan masa berlaku |
| Penugasan | Guru; kelas/rombel; mata pelajaran; tahun ajaran; beban mengajar; status persetujuan |
| Rencana & Jurnal | Modul ajar/RPP sesuai jenjang dan kurikulum; tujuan; materi; langkah pembelajaran; diferensiasi; asesmen; refleksi; jurnal pertemuan |
| Asesmen & Nilai | Jenis asesmen; kisi-kisi; instrumen; rubrik; nilai; deskripsi capaian; remedial/pengayaan; persetujuan dan penguncian nilai |
| Pusat Laporan | Rekap peserta didik; rombel; GTK; kehadiran; nilai; rapor; mutasi/lulus; rekap per periode dan ekspor |

## Pembuat formulir kustom

Admin tenant, admin sekolah, kepala sekolah, wakil kepala sekolah, dan operator sekolah dapat:
- Membuat formulir untuk konteks Data Siswa, Data Guru, Kelas, PPDB/SPMB, Akademik, atau Umum.
- Menambah label, kunci data, tipe kolom (teks, paragraf, angka, tanggal, email, telepon, pilihan, centang), pilihan dropdown, dan status wajib.
- Menyimpan draft, menerbitkan, mengubah versi, dan mengarsipkan formulir.
- Menggunakan audit log untuk melacak pembuat dan perubahan konfigurasi.

Template bersifat tenant dan sekolah scoped. Formulir kustom tidak boleh mengubah field master pemerintah, NISN/NIK tervalidasi, atau data yang hanya dapat diperbaiki melalui mekanisme VervalPD. Perubahan definisi tidak boleh menulis ulang nilai submission lama; setiap submission harus menyimpan versi formulir.

## Perlindungan data dan validasi

- Data NIK, KK, kontak, dan data kesejahteraan adalah data pribadi; tampilkan hanya pada peran yang memerlukan.
- Kolom identitas yang dikunci oleh mekanisme verifikasi pemerintah harus diberi label "perlu koreksi melalui VervalPD/kanal resmi", bukan dapat diedit bebas.
- Wajibkan pemeriksaan dokumen sumber dan simpan jejak siapa, kapan, serta alasan perubahan.
- Nilai pilihan seperti agama, pekerjaan, penghasilan, moda transportasi, status domisili, dan kebutuhan khusus harus menggunakan referensi terkelola yang dapat diperbarui; hindari enum permanen yang cepat usang.
- Kolom yang tidak relevan untuk jenjang/jenis sekolah dapat disembunyikan melalui konfigurasi, bukan dihapus dari riwayat.
- Formulir ini membantu administrasi sekolah dan bukan kanal sinkronisasi resmi Dapodik/SPMB.
