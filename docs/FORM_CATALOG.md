# Katalog Formulir Administrasi Pendidikan TMS

## Prinsip kepatuhan dan batas klaim

TMS menyediakan formulir administrasi sekolah yang dirancang agar dapat dipetakan ke kelompok data pendidikan nasional dan kebutuhan operasional sekolah. TMS bukan aplikasi Dapodik, bukan produk resmi pemerintah, dan tidak boleh mengklaim sinkronisasi Dapodik/SPMB sebelum tersedia spesifikasi antarmuka resmi, otorisasi, pemetaan kode referensi, serta uji integrasi yang sah.

Setiap rilis wajib mencatat versi referensi Dapodik, jenjang, jenis satuan pendidikan, kurikulum, dan tanggal efektif. Kode referensi pemerintah tidak boleh dikunci permanen di komponen UI. Nilai referensi harus dapat diperbarui melalui katalog berversi. Formulir tambahan TMS tidak boleh menimpa identitas pemerintah yang memerlukan koreksi melalui kanal resmi seperti VervalPD.

## Rujukan resmi yang perlu ditinjau setiap rilis

- Portal unduhan Dapodik: https://dapo.kemendikdasmen.go.id/unduhan/
- Panduan Dapodik 2026: https://obj.pauddasmen.id/dapodik/Panduan_Lengkap_Aplikasi_Dapodik_versi_2026.pdf
- Helpdesk Dapodik, profil dan data rinci peserta didik: https://helpdesk.pauddasmen.id/help/en-us/8-peserta-didik/40-profil-dan-data-rinci-peserta-didik
- Helpdesk Dapodik, data siswa dan status: https://helpdesk.pauddasmen.id/help/en-us/21-data-pokok/53-data-siswa
- Permendikdasmen 3/2025 tentang SPMB: https://jdih.kemendikdasmen.go.id/sjdih/siperpu/dokumen/salinan/Permendikdasmen%20Nomor%203%20Tahun%202025%20%28JDIH%29.pdf
- Permendikdasmen 1/2026 tentang Standar Proses: https://peraturan.bpk.go.id/Details/344196/permendikdasmen-no-1-tahun-2026
- Permendikdasmen 12/2025 tentang Standar Isi: https://jdih.kemendikdasmen.go.id/sjdih/siperpu/dokumen/salinan/Permendikdasmen_No_12_Tahun_2025_ttg_Standar_Isi_pada_Pe.pdf
- Permendikdasmen 10/2025 tentang Standar Kompetensi Lulusan: https://jdih.kemendikdasmen.go.id/sjdih/siperpu/dokumen/salinan/Permendikdasmen%20Nomor%2010%20Tahun%202025%20tentang%20Standar%20Kompetensi%20Lulusan%20pada%20Pendidikan%20Anak%20Usia%20Dini%2C%20Jenjang%20Pendidikan%20Dasar%2C%20dan%20Jenjang%20Pendidikan%20Menengah.pdf
- Permendikbudristek 21/2022 tentang Standar Penilaian Pendidikan: https://peraturan.bpk.go.id/Details/224425/permendikbudriset-no-21-tahun-2022
- Permendikbudristek 31/2022 tentang Satu Data: https://peraturan.bpk.go.id/Home/Download/219347/Permendikbudristek%20Nomor%2031%20Tahun%202022_Satu%20Data%20Dikbudristek.pdf
- Permendikdasmen 13/2025 sebagai perubahan atas Permendikbudristek 12/2024 tentang Kurikulum: https://peraturan.bpk.go.id/Details/281847/permendikbudriset-no-12-tahun-2024

Rujukan di atas adalah baseline awal, bukan daftar hukum yang menyatakan seluruh ketentuan masih berlaku tanpa perubahan. Sebelum release, tim produk wajib memeriksa status, perubahan, pencabutan, dan petunjuk teknis terbaru melalui JDIH.

## Cakupan formulir per menu

### 1. Data Guru / GTK
- Identitas: nama sesuai dokumen, NIK, NIP, NUPTK, jenis kelamin, tempat/tanggal lahir, agama/kepercayaan, kewarganegaraan, status perkawinan.
- Kepegawaian: jenis PTK, status kepegawaian, nomor dan tanggal SK, TMT, unit kerja, tugas tambahan, jabatan, pangkat/golongan.
- Pendidikan: jenjang pendidikan, program studi, perguruan tinggi, tahun lulus, bidang keahlian.
- Profesional: sertifikat pendidik, nomor/tahun sertifikasi, kompetensi, pelatihan/diklat.
- Penugasan dan beban: mapel/bidang tugas, JP, rombel, tugas tambahan, periode berlaku.
- Kontak dan dokumen: alamat, telepon, email kedinasan, dokumen pendukung, status verifikasi dan riwayat perubahan.

### 2. Data Siswa / Peserta Didik
- Identitas: nama, NISN/NIS, NIK/KITAS, KK, akta kelahiran, jenis kelamin, tempat/tanggal lahir, agama, kewarganegaraan.
- Registrasi: jenis pendaftaran, tanggal masuk, sekolah asal, NPSN asal, status aktif, mutasi, keluar, lulus, putus sekolah sesuai pilihan status yang berlaku.
- Domisili: alamat, RT/RW, dusun, desa/kelurahan, kecamatan, kabupaten/kota, provinsi, kode pos, koordinat, status tempat tinggal, transportasi.
- Keluarga: ayah, ibu, wali, hubungan, NIK (akses terbatas), pendidikan, pekerjaan, penghasilan, kontak darurat.
- Dukungan: kebutuhan khusus, akomodasi pembelajaran, KIP/KKS/PKH/PIP dan status verifikasi.
- Riwayat: sekolah asal/tujuan, rombel per tahun ajaran, dokumen, perubahan data, alasan dan petugas.

### 3. Kelas & Mapel
- Tahun ajaran, semester, jenjang, tingkat/fase, rombel, jenis rombel, kapasitas, jumlah siswa, wali kelas.
- Ruang, gedung, shift, jadwal, hari belajar, kalender akademik, durasi JP.
- Mapel: kode, nama, kelompok, struktur kurikulum, fase, muatan lokal, alokasi JP mingguan/tahunan.
- Pemetaan peserta didik, status rombel, pembelajaran dan riwayat penempatan.

### 4. Pusat Kurikulum
- KOSP/KTSP dan identitas dokumen, kerangka kurikulum, jenjang, fase, tahun ajaran, pengesahan dan masa berlaku.
- Struktur kurikulum, elemen, Capaian Pembelajaran (CP), Tujuan Pembelajaran (TP), Alur Tujuan Pembelajaran (ATP).
- Ruang lingkup materi, alokasi waktu, projek/kokurikuler, dimensi/kompetensi, asesmen, evaluasi dan revisi.
- Versioning: draf, review, persetujuan, publikasi, arsip, dan versi baru tanpa mengubah versi yang telah diterbitkan.

### 5. Penugasan
- Identitas guru, NIP/NUPTK/ID GTK, SK dan tanggal penetapan.
- Tahun ajaran, semester, kelas/rombel, mapel, bidang tugas, jumlah JP, tugas tambahan dan ekuivalensi bila ketentuan mengaturnya.
- Tanggal efektif, pengganti, status persetujuan, pejabat pemberi persetujuan, verifikasi beban dan histori perubahan.

### 6. Rencana & Jurnal
- Identitas modul ajar/RPP, kurikulum, tahun ajaran, semester, kelas/fase, mapel, guru, pertemuan dan alokasi waktu.
- CP, TP, pemahaman bermakna, pertanyaan pemantik, materi, sumber, media, sarana.
- Langkah pendahuluan, inti, penutup; strategi pembelajaran; diferensiasi dan akomodasi.
- Asesmen awal/diagnostik, formatif, sumatif; jurnal realisasi, kehadiran, refleksi guru dan tindak lanjut.
- Review perangkat ajar dan riwayat revisi.

### 7. Asesmen & Nilai
- Identitas asesmen, tujuan/kompetensi, jenis asesmen, tanggal, kelas, mapel dan periode.
- Kisi-kisi, indikator, bentuk instrumen, butir/tugas, rubrik, deskriptor, pedoman penskoran, bobot.
- Hasil, skala nilai, deskripsi capaian, catatan guru, status review dan penguncian.
- Remedial, pengayaan, tindak lanjut, rekap capaian dan narasi rapor yang disesuaikan jenjang/kurikulum.

### 8. Pusat Laporan
- Profil satuan pendidikan, GTK, peserta didik, rombel, mapel, penugasan, jadwal, kehadiran, asesmen, nilai, rapor, mutasi, kelulusan, kurikulum dan SPMB.
- Filter sekolah, tahun ajaran, semester, jenjang, rombel, periode dan status.
- Validasi kelengkapan, anomali, tanggal batas data, disiapkan/diverifikasi/disahkan oleh, jejak ekspor dan cetak.
- Laporan yang ditujukan untuk pemerintah hanya boleh diberi label sesuai format resmi setelah pemetaan dan validasi terhadap versi format yang berlaku.

### 9. Formulir Kustom
- Konteks modul, kategori, pemilik, tujuan, petunjuk, kelompok/section, urutan field.
- Tipe field, wajib/opsional, pilihan referensi, validasi format/rentang, nilai default, kondisi tampil, lampiran, dan bantuan pengisian.
- Draft, review, publish, arsip, versi skema, tanggal efektif, peran pengisi, approval, dan ekspor.
- Setiap submission menyimpan snapshot versi definisi formulir yang digunakan. Formulir kustom tidak mengubah field standar atau identitas tervalidasi.

## Implementasi saat ini

Tabel standard_module_records adalah arsip formulir pendukung berversi yang tenant/sekolah scoped dan tercatat di audit log. Data ini **tidak otomatis mengubah** master teachers, students, classes, subjects, atau nilai. Integrasi ke master data memerlukan workflow pemetaan, pemeriksaan duplikasi, validasi, persetujuan, dan audit terpisah.

Template awal pada UI disediakan untuk sembilan menu. Field pilihan yang ditampilkan masih merupakan pilihan awal untuk membantu input; sebelum dinyatakan setara dengan formulir resmi, setiap field, kode, opsi, syarat wajib, dan aturan jenjang harus diverifikasi terhadap versi Dapodik dan peraturan yang aktif.

## Perlindungan data dan validasi

- Terapkan minimisasi data dan akses berbasis peran. NIK, KK, penghasilan, kebutuhan khusus, dan data keluarga harus dibatasi dan tidak ditampilkan pada laporan umum.
- Identitas yang dikunci oleh proses verifikasi pemerintah harus diarahkan ke kanal koreksi resmi, bukan diedit bebas.
- Simpan sumber dokumen, petugas pemeriksa, waktu, alasan, keputusan, dan riwayat perubahan.
- Pilihan referensi (agama, pekerjaan, penghasilan, transportasi, status domisili, kebutuhan khusus, status GTK, dan lainnya) harus dapat diperbarui dan diberi versi.
- Field yang tidak relevan pada jenjang/jenis sekolah disembunyikan melalui konfigurasi tanpa menghapus data historis.
- Terapkan retensi, pembatasan ekspor, dan perlindungan data pribadi sesuai kebijakan sekolah serta peraturan yang berlaku.
