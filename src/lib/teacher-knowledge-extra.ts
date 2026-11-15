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
  }
];

const normalize = (value: string) => value.toLocaleLowerCase("id-ID")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

const stopWords = new Set(["yang", "dan", "atau", "untuk", "dengan", "pada", "dari", "dalam", "apa", "bagaimana", "saya", "guru", "murid", "siswa", "buat", "tolong", "tentang", "cara", "ke", "di", "ini", "itu"]);

export function searchAdditionalTeacherKnowledge(question: string) {
  const normalized = normalize(question);
  const terms = [...new Set(normalized.split(" ").filter((term) => term.length > 2 && !stopWords.has(term)))];
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
