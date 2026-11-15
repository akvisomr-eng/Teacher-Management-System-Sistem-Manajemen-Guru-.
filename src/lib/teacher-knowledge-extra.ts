import type { KnowledgeDocument } from "@/lib/teacher-knowledge";

export const additionalTeacherKnowledge: KnowledgeDocument[] = [
  {
    id: "cp-tp-atp-design",
    title: "Menganalisis CP dan menyusun TP serta ATP",
    category: "Kurikulum dan perencanaan",
    audience: "Guru PAUD, pendidikan dasar, menengah, SLB dan kesetaraan",
    summary: "Capaian Pembelajaran (CP) menggambarkan kompetensi yang dituju pada akhir fase. Guru menganalisis CP, merumuskan Tujuan Pembelajaran (TP) yang lebih operasional, lalu mengurutkannya menjadi Alur Tujuan Pembelajaran (ATP). Rencana pembelajaran dan asesmen disusun berdasarkan alur tersebut dengan menyesuaikan karakteristik mata pelajaran, fase, murid, serta regulasi yang berlaku.",
    guidance: [
      "Gunakan dokumen CP resmi yang sesuai dengan mata pelajaran, fase, dan versi kurikulum.",
      "Identifikasi kompetensi dan lingkup materi utama di dalam CP sebelum menulis TP.",
      "Rumuskan TP dengan kata kerja yang dapat diamati dan bukti belajar yang masuk akal.",
      "Susun TP menjadi ATP yang runtut; jelaskan alasan urutannya berdasarkan prasyarat dan perkembangan belajar.",
      "Turunkan ATP menjadi kegiatan belajar dan asesmen yang selaras, lalu tinjau kembali berdasarkan bukti belajar murid."
    ],
    keywords: ["cp", "capaian pembelajaran", "tp", "tujuan pembelajaran", "atp", "alur tujuan pembelajaran", "fase", "perencanaan kurikulum", "modul ajar"],
    source: { title: "Panduan Mata Pelajaran", publisher: "Sistem Informasi Kurikulum Nasional, Kemendikdasmen", url: "https://kurikulum.kemendikdasmen.go.id/panduan-mapel", published: "2025", verifiedAt: "2026-11-13", status: "official" }
  },
  {
    id: "formative-assessment-feedback",
    title: "Asesmen formatif, umpan balik, dan tindak lanjut",
    category: "Perencanaan dan asesmen",
    audience: "Pendidik dan pemimpin pembelajaran",
    summary: "Asesmen formatif merupakan bagian dari proses pembelajaran untuk memperoleh informasi tentang perkembangan belajar dan memperbaiki proses belajar-mengajar. Bukti formatif dapat digunakan guru dan murid untuk memahami kemajuan terhadap tujuan, memberi umpan balik yang dapat ditindaklanjuti, serta menyesuaikan strategi atau dukungan belajar. Asesmen sumatif digunakan untuk menilai ketercapaian tujuan pada akhir unit atau periode yang relevan; keduanya perlu selaras dengan tujuan pembelajaran.",
    guidance: [
      "Tentukan bukti belajar yang akan menunjukkan kemajuan menuju setiap tujuan pembelajaran.",
      "Gunakan pertanyaan diagnostik, observasi, diskusi, kuis singkat, unjuk kerja, atau draf karya sesuai konteks.",
      "Berikan umpan balik yang spesifik: apa yang sudah kuat, bagian yang perlu diperbaiki, dan langkah berikutnya.",
      "Berikan kesempatan bagi murid untuk menggunakan umpan balik dan memperbaiki hasil kerjanya.",
      "Gunakan pola kesulitan yang ditemukan untuk menyesuaikan pengajaran, pengayaan, atau dukungan lanjutan."
    ],
    keywords: ["asesmen formatif", "penilaian formatif", "umpan balik", "feedback", "asesmen sumatif", "diagnostik", "rubrik", "observasi", "tindak lanjut", "remedial", "pengayaan"],
    source: { title: "Panduan Pembelajaran dan Asesmen edisi revisi 2025", publisher: "Kemendikdasmen / BSKAP", url: "https://kurikulum.kemendikdasmen.go.id/file/1755668120_manage_file.pdf", published: "2025", verifiedAt: "2026-11-13", status: "official" }
  },
  {
    id: "unesco-ai-teacher-competencies",
    title: "Kompetensi guru untuk penggunaan AI yang berpusat pada manusia",
    category: "Literasi AI dan pengembangan profesional",
    audience: "Guru, kepala sekolah, pengembang pelatihan dan tenaga kependidikan",
    summary: "UNESCO AI Competency Framework for Teachers (2024) memetakan 15 kompetensi dalam lima dimensi: pola pikir berpusat pada manusia, etika AI, fondasi dan aplikasi AI, pedagogi AI, serta AI untuk pengembangan profesional. Perkembangan kompetensi dijelaskan melalui tiga tingkat: Acquire, Deepen, dan Create. Kerangka ini menempatkan agensi dan tanggung jawab guru, privasi, inklusi, serta penggunaan AI yang aman sebagai pertimbangan penting.",
    guidance: [
      "Mulai dari pemahaman dasar tentang kemampuan dan keterbatasan AI sebelum menggunakannya untuk tugas pendidikan.",
      "Periksa akurasi, bias, sumber, hak cipta, dan kesesuaian konteks setiap keluaran AI.",
      "Lindungi data pribadi guru dan murid; jangan memasukkan identitas atau catatan sensitif ke layanan yang belum disetujui sekolah.",
      "Gunakan AI untuk mendukung desain pembelajaran dan pengembangan profesional, bukan menggantikan relasi pedagogis atau keputusan guru.",
      "Tingkatkan kompetensi secara bertahap: memahami, menerapkan secara bertanggung jawab, lalu merancang praktik yang lebih baik."
    ],
    keywords: ["unesco", "ai", "kecerdasan artifisial", "kecerdasan buatan", "kompetensi ai guru", "etika ai", "privasi", "bias", "pedagogi ai", "literasi digital", "human centred"],
    source: { title: "AI competency framework for teachers", publisher: "UNESCO", url: "https://www.unesco.org/en/articles/ai-competency-framework-teachers", published: "2024", verifiedAt: "2026-11-13", status: "research" }
  },
  {
    id: "unesco-ai-student-competencies",
    title: "Literasi dan kompetensi AI untuk peserta didik",
    category: "Literasi digital dan pembelajaran",
    audience: "Guru dan perancang pembelajaran untuk peserta didik",
    summary: "UNESCO AI Competency Framework for Students (2024) menguraikan 12 kompetensi dalam empat dimensi: pola pikir berpusat pada manusia, etika AI, teknik dan aplikasi AI, serta desain sistem AI. Perkembangan kompetensi bergerak dari Understand, Apply, hingga Create. Kerangka ini dapat membantu guru merancang literasi AI yang kritis, aman, inklusif, dan sesuai usia; bukan instruksi untuk menyerahkan keputusan belajar kepada sistem AI.",
    guidance: [
      "Ajarkan murid mengenali contoh penggunaan AI dan membedakannya dari sumber informasi lain.",
      "Latih murid memeriksa fakta, bias, privasi, hak cipta, dan dampak sosial dari keluaran AI.",
      "Pilih aktivitas sesuai usia, kesiapan, akses teknologi, dan tujuan mata pelajaran.",
      "Dorong murid menggunakan AI secara transparan dan tetap menunjukkan proses berpikir serta kontribusi sendiri.",
      "Bangun pengalaman bertahap dari memahami, mencoba dengan bimbingan, hingga membuat proyek sederhana secara bertanggung jawab."
    ],
    keywords: ["literasi ai siswa", "kompetensi ai peserta didik", "unesco students", "etika ai", "teknik ai", "desain sistem ai", "berpikir kritis", "deepfake", "privasi murid"],
    source: { title: "AI competency framework for students", publisher: "UNESCO", url: "https://www.unesco.org/en/articles/ai-competency-framework-students", published: "2024", verifiedAt: "2026-11-13", status: "research" }
  },
  {
    id: "unesco-teacher-ai-frameworks-2026",
    title: "Peta kerangka kompetensi AI guru dan implementasinya",
    category: "Literasi AI dan pengembangan profesional",
    audience: "Guru, kepala sekolah, pengembang pelatihan, pengelola kebijakan pendidikan",
    summary: "Laporan analitis UNESCO Institute for Information Technologies in Education tahun 2026 meninjau kerangka kompetensi AI guru, keterkaitan dengan pedagogi dan kurikulum, skenario implementasi pada tingkat kebijakan hingga praktik pembelajaran, serta pendekatan untuk mengevaluasi kompetensi. Gunakan laporan ini sebagai bahan pengembangan profesional dan perencanaan program, bukan sebagai pengganti regulasi nasional Indonesia.",
    guidance: [
      "Hubungkan pengembangan kompetensi AI guru dengan kebutuhan pembelajaran dan kurikulum, bukan sekadar penguasaan aplikasi.",
      "Bangun dukungan secara berjenjang: kebijakan sekolah, pelatihan dan pendampingan, lalu praktik pembelajaran.",
      "Nilai kompetensi melalui bukti praktik, refleksi, dan dampak pada pembelajaran; jangan hanya berdasarkan sertifikat penggunaan alat.",
      "Pastikan kebijakan sekolah melindungi privasi, agensi guru dan murid, inklusi, serta akuntabilitas manusia.",
      "Bandingkan rekomendasi internasional dengan peraturan dan panduan resmi Indonesia sebelum diterapkan."
    ],
    keywords: ["unesco iite", "kerangka kompetensi ai guru 2026", "teacher ai competency frameworks", "pengembangan profesional", "evaluasi kompetensi ai", "kebijakan ai pendidikan", "pedagogi ai"],
    source: { title: "Analytical Report: Teacher AI Competency Frameworks", publisher: "UNESCO Institute for Information Technologies in Education", url: "https://iite.unesco.org/publications/analytical-report-teacher-ai-competency-frameworks/", published: "2026", verifiedAt: "2026-11-15", status: "research" }
  },
  {
    id: "permendikdasmen-1-2026-standard-process",
    title: "Standar Proses Pendidikan berdasarkan Permendikdasmen Nomor 1 Tahun 2026",
    category: "Regulasi dan perencanaan pembelajaran",
    audience: "Pendidik dan satuan pendidikan PAUD, pendidikan dasar, dan pendidikan menengah",
    summary: "Permendikdasmen Nomor 1 Tahun 2026 tentang Standar Proses berlaku sejak 5 Januari 2026. Peraturan ini mengatur perencanaan pembelajaran, pelaksanaan pembelajaran, dan penilaian proses pembelajaran serta mencabut Permendikbudristek Nomor 16 Tahun 2022 dan Permendiknas Nomor 3 Tahun 2008. Dokumen perencanaan pembelajaran paling sedikit memuat tujuan pembelajaran, langkah pembelajaran, dan penilaian atau asesmen. Proses pembelajaran berlandaskan prinsip berkesadaran, bermakna, dan menggembirakan.",
    guidance: [
      "Gunakan Permendikdasmen Nomor 1 Tahun 2026 sebagai rujukan Standar Proses yang berlaku; jangan menyajikan Permendikbudristek Nomor 16 Tahun 2022 sebagai aturan yang masih berlaku.",
      "Pastikan dokumen perencanaan sekurang-kurangnya memuat tujuan pembelajaran, langkah pembelajaran, dan penilaian atau asesmen.",
      "Rumuskan tujuan dengan memperhatikan kompetensi, konten, karakteristik murid, dan sumber daya satuan pendidikan.",
      "Rancang langkah belajar yang memberi pengalaman untuk mencapai tujuan dan menerapkan prinsip berkesadaran, bermakna, serta menggembirakan.",
      "Pilih teknik dan instrumen asesmen yang sesuai dengan tujuan pembelajaran; sesuaikan format dokumen dengan konteks tanpa mengabaikan ketentuan yang berlaku.",
      "Periksa naskah peraturan dan ketentuan turunannya sebelum mengambil keputusan administratif atau hukum."
    ],
    keywords: ["permendikdasmen 1 2026", "standar proses", "perencanaan pembelajaran", "dokumen perencanaan", "tujuan pembelajaran", "langkah pembelajaran", "asesmen pembelajaran", "berkesadaran", "bermakna", "menggembirakan", "permendikbudristek 16 2022", "administrasi guru"],
    source: { title: "Permendikdasmen Nomor 1 Tahun 2026 tentang Standar Proses", publisher: "JDIH BPK RI", url: "https://peraturan.bpk.go.id/Details/344196/permendikdasmen-no-1-tahun-2026", published: "2026", verifiedAt: "2026-11-15", status: "official" }
  },

  {
    id: "teacher-performance-planning-pkg",
    title: "Perencanaan Kinerja Guru pada Pengelolaan Kinerja",
    category: "Administrasi dan pengembangan profesional guru",
    audience: "Guru PAUD/TK, pendidikan dasar dan menengah; perhatikan panduan khusus untuk pendidikan khusus dan satuan pendidikan swasta",
    summary: "Panduan resmi Pusat Informasi ULT Kemendikdasmen yang diperbarui 26 November 2025 menjelaskan alur umum Perencanaan Kinerja Guru: meninjau pelaksanaan tugas pokok dan tugas tambahan yang didukung surat keputusan atau surat tugas, memilih fokus praktik kinerja, menentukan indikator pengembangan kompetensi, memilih perilaku kerja, meninjau rangkuman, lalu mengajukan rencana untuk diperiksa dan disepakati bersama atasan. Rincian alur dan pejabat penilai dapat berbeda menurut jenis satuan pendidikan, status guru, jenjang, dan pembaruan sistem Ruang GTK.",
    guidance: [
      "Mulai dari uraian tugas pokok dan tambahkan tugas lain hanya jika benar-benar ditetapkan melalui surat keputusan atau surat tugas yang relevan.",
      "Pilih fokus praktik kinerja berdasarkan kebutuhan peningkatan pembelajaran dan bukti yang tersedia; rekomendasi Rapor Pendidikan dapat dipertimbangkan sesuai jenjang.",
      "Pilih indikator pengembangan kompetensi yang paling sesuai dengan kebutuhan profesional dan diskusikan dengan kepala sekolah atau Tim Kinerja.",
      "Tentukan perilaku kerja yang realistis untuk dikembangkan dan sepakati bersama pihak penilai sesuai mekanisme satuan pendidikan.",
      "Periksa seluruh rangkuman sebelum mengajukan; setelah konfirmasi, perubahan dapat dibatasi dan mungkin memerlukan proses revisi resmi.",
      "Jangan menganggap alur umum ini berlaku identik bagi guru pendidikan khusus, guru di sekolah swasta, atau satuan pendidikan dengan Plt. kepala sekolah; rujuk panduan khusus terbaru.",
      "Gunakan artikel ini sebagai panduan operasional Ruang GTK, bukan sebagai pengganti peraturan kepegawaian atau kebijakan resmi instansi."
    ],
    keywords: ["perencanaan kinerja guru", "pkg", "pengelolaan kinerja", "ruang gtk", "tugas pokok", "tugas tambahan", "praktik kinerja", "pengembangan kompetensi", "perilaku kerja", "rapor pendidikan", "kepala sekolah", "tim kinerja", "skp guru"],
    source: { title: "Cara Mengisi Perencanaan Kinerja Untuk Guru", publisher: "Pusat Informasi ULT, Kemendikdasmen", url: "https://pusatinformasi.ult.kemendikdasmen.go.id/hc/id/articles/40450716460441-Cara-Mengisi-Perencanaan-Kinerja-Untuk-Guru", published: "2025", verifiedAt: "2026-11-15", status: "official" }
  },
];

const normalize = (value: string) => value.toLocaleLowerCase("id-ID")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

const stopWords = new Set(["yang", "dan", "atau", "untuk", "dengan", "pada", "dari", "dalam", "apa", "bagaimana", "saya", "guru", "murid", "siswa", "buat", "tolong", "tentang", "cara", "ke", "di", "ini", "itu"]);

export function searchAdditionalTeacherKnowledge(question: string) {
  const normalized = normalize(question);
  const shortTerms = new Set(["cp", "tp", "atp", "sd", "mi", "smp", "sma", "smk", "slb", "udl", "ai"]);
  const terms = [...new Set(normalized.split(" ").filter((term) => (term.length > 2 || shortTerms.has(term)) && !stopWords.has(term)))];
  return additionalTeacherKnowledge.map((doc) => {
    const title = normalize(doc.title);
    const searchable = normalize([doc.title, doc.category, doc.audience, doc.summary, ...doc.guidance, ...doc.keywords].join(" "));
    let score = 0;
    for (const term of terms) {
      if (title.includes(term)) score += 5;
      if (doc.keywords.some((keyword) => normalize(keyword).includes(term))) score += 4;
      if (searchable.includes(term)) score += 1;
    }
    if (normalized.length > 4 && title.includes(normalized)) score += 8;
    return { doc, score };
  }).filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ doc, score }) => ({ ...doc, relevance: Math.min(100, Math.round(score * 5)) }));
}
