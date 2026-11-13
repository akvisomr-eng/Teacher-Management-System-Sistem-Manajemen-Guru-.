export type KnowledgeDocument = {
  id: string;
  title: string;
  category: string;
  audience: string;
  summary: string;
  guidance: string[];
  keywords: string[];
  source: { title: string; publisher: string; url: string; published: string; verifiedAt: string; status: "official" | "research" | "framework" };
};

export const teacherKnowledge: KnowledgeDocument[] = [
  {
    id: "curriculum-policy-2025",
    title: "Arah kebijakan kurikulum Indonesia 2025",
    category: "Kurikulum dan kebijakan",
    audience: "PAUD, SD/MI, SMP/MTs, SMA/MA, SMK/MAK, SLB dan pendidikan kesetaraan",
    summary: "Permendikdasmen Nomor 13 Tahun 2025 merupakan penyesuaian atas regulasi kurikulum yang berlaku, bukan penggantian kurikulum secara menyeluruh. Penguatan pendekatan pembelajaran mendalam, kegiatan kokurikuler yang lebih fleksibel, serta mata pelajaran pilihan Koding dan Kecerdasan Artifisial menjadi bagian dari arah kebijakan. Penerapan dan ketentuan rinci harus diperiksa pada regulasi dan panduan resmi yang berlaku untuk jenjang terkait.",
    guidance: [
      "Jangan menyebut Permendikdasmen 13/2025 sebagai kurikulum baru.",
      "Periksa dokumen regulasi resmi dan panduan mata pelajaran sesuai jenjang sebelum menyusun perangkat ajar.",
      "Sesuaikan pelaksanaan dengan sumber daya, kesiapan satuan pendidikan, dan ketentuan resmi."
    ],
    keywords: ["permendikdasmen 13 2025", "kurikulum", "regulasi", "koding", "kecerdasan artifisial", "kokurikuler", "tahun ajaran 2025 2026"],
    source: { title: "Ringkasan Permendikdasmen Nomor 13 Tahun 2025", publisher: "Sistem Informasi Kurikulum Nasional, Kemendikdasmen", url: "https://kurikulum.kemendikdasmen.go.id/", published: "2025", verifiedAt: "2026-11-13", status: "official" }
  },
  {
    id: "deep-learning-framework",
    title: "Kerangka Pembelajaran Mendalam",
    category: "Pedagogi dan strategi pembelajaran",
    audience: "Semua jenjang pendidikan",
    summary: "Pembelajaran mendalam adalah pendekatan yang memuliakan peserta didik melalui proses berkesadaran, bermakna, dan menggembirakan. Pengalaman belajar dirancang agar murid memahami, mengaplikasi, dan merefleksi. Kerangka desain mencakup praktik pedagogis, kemitraan pembelajaran, lingkungan pembelajaran, dan pemanfaatan digital; dengan perhatian pada delapan dimensi profil lulusan.",
    guidance: [
      "Mulai dari kesiapan dan karakteristik murid serta karakteristik materi.",
      "Rumuskan tujuan pembelajaran yang jelas dan dapat diamati.",
      "Rancang aktivitas memahami, mengaplikasi pada konteks nyata, lalu merefleksi.",
      "Pilih asesmen awal, proses, dan akhir yang selaras dengan tujuan.",
      "Bangun suasana berkesadaran, bermakna, menggembirakan dan menghargai martabat murid."
    ],
    keywords: ["pembelajaran mendalam", "berkesadaran", "bermakna", "menggembirakan", "memahami", "mengaplikasi", "merefleksi", "profil lulusan", "pedagogi"],
    source: { title: "Pendekatan Pembelajaran Mendalam", publisher: "Sistem Informasi Kurikulum Nasional, Kemendikdasmen", url: "https://kurikulum.kemendikdasmen.go.id/pembelajaran-mendalam", published: "2025", verifiedAt: "2026-11-13", status: "official" }
  },
  {
    id: "lesson-planning-assessment",
    title: "Perencanaan pembelajaran dan asesmen",
    category: "Perencanaan dan asesmen",
    audience: "PAUD, pendidikan dasar dan menengah",
    summary: "Perencanaan pembelajaran merumuskan tujuan belajar dari capaian pembelajaran, cara mencapai tujuan, dan cara menilai ketercapaiannya. Panduan Pembelajaran dan Asesmen edisi revisi 2025 memuat kerangka pembelajaran mendalam, perencanaan, pelaksanaan, pengolahan dan pelaporan hasil asesmen, beserta contoh penerapannya.",
    guidance: [
      "Pastikan tujuan, aktivitas belajar, dan bukti asesmen saling selaras.",
      "Gunakan asesmen awal untuk memahami kesiapan dan kebutuhan belajar.",
      "Gunakan asesmen formatif selama proses untuk memberi umpan balik dan menyesuaikan pembelajaran.",
      "Gunakan asesmen sumatif untuk menilai ketercapaian tujuan pada akhir unit/periode yang relevan.",
      "Sampaikan kriteria dan rubrik secara jelas; gunakan hasil asesmen untuk tindak lanjut."
    ],
    keywords: ["rpp", "modul ajar", "perencanaan", "capaian pembelajaran", "tujuan pembelajaran", "asesmen", "formatif", "sumatif", "rubrik", "umpan balik", "pelaporan"],
    source: { title: "Panduan Pembelajaran dan Asesmen edisi revisi 2025", publisher: "Repositori Kemendikdasmen / BSKAP", url: "https://repositori.kemendikdasmen.go.id/33290/", published: "2025", verifiedAt: "2026-11-13", status: "official" }
  },
  {
    id: "subject-guides",
    title: "Panduan mata pelajaran dan penerjemahan capaian pembelajaran",
    category: "Kurikulum dan perencanaan",
    audience: "Guru semua mata pelajaran dan jenjang yang tersedia",
    summary: "Panduan mata pelajaran membantu pendidik menerjemahkan Capaian Pembelajaran ke praktik kelas dan merancang pembelajaran yang bermakna, mendalam, serta berpusat pada murid. Contoh dan rincian harus dipilih berdasarkan mata pelajaran, fase, dan jenjang yang sesuai.",
    guidance: [
      "Pilih panduan berdasarkan jenjang dan mata pelajaran yang benar.",
      "Gunakan Capaian Pembelajaran yang berlaku sebagai titik awal, bukan menyalin contoh tanpa adaptasi.",
      "Kontekstualisasikan materi dengan lingkungan dan kebutuhan murid.",
      "Periksa versi panduan terbaru sebelum digunakan sebagai acuan resmi."
    ],
    keywords: ["panduan mata pelajaran", "capaian pembelajaran", "fase", "jenjang", "mata pelajaran", "sd", "smp", "sma", "smk", "slb", "paud"],
    source: { title: "Panduan Mata Pelajaran", publisher: "Sistem Informasi Kurikulum Nasional, Kemendikdasmen", url: "https://kurikulum.kemendikdasmen.go.id/panduan-mapel", published: "2025", verifiedAt: "2026-11-13", status: "official" }
  },
  {
    id: "inclusive-udl",
    title: "Pembelajaran inklusif dan Universal Design for Learning",
    category: "Diferensiasi dan inklusi",
    audience: "Semua jenjang, termasuk peserta didik dengan kebutuhan belajar beragam",
    summary: "Universal Design for Learning (UDL) membantu pendidik mengurangi hambatan belajar dengan merancang berbagai cara keterlibatan, representasi informasi, serta tindakan dan ekspresi. Kerangka ini mendukung akses dan partisipasi yang lebih adil, tetapi tetap perlu disesuaikan dengan kebutuhan individu dan ketentuan akomodasi yang berlaku.",
    guidance: [
      "Sediakan variasi cara murid terlibat dan menunjukkan pemahaman.",
      "Sajikan informasi melalui lebih dari satu bentuk yang relevan, misalnya teks, visual, audio, atau demonstrasi.",
      "Berikan pilihan cara merespons atau menghasilkan karya dengan kriteria tujuan yang tetap jelas.",
      "Identifikasi hambatan lingkungan dan materi, bukan memberi label negatif pada murid.",
      "Konsultasikan kebutuhan akomodasi individual dengan pihak yang berwenang di sekolah dan keluarga."
    ],
    keywords: ["inklusi", "inklusif", "udl", "universal design for learning", "diferensiasi", "disabilitas", "akomodasi", "aksesibilitas", "kebutuhan khusus"],
    source: { title: "CAST Universal Design for Learning Guidelines 3.0", publisher: "CAST", url: "https://udlguidelines.cast.org/", published: "2024", verifiedAt: "2026-11-13", status: "framework" }
  },
  {
    id: "teacher-ai-literacy",
    title: "Kompetensi guru dalam penggunaan kecerdasan artifisial",
    category: "Literasi AI dan pengembangan profesional",
    audience: "Guru, kepala sekolah dan tenaga kependidikan",
    summary: "Kerangka kompetensi AI UNESCO membahas pengetahuan, keterampilan, dan nilai yang perlu dikembangkan guru dalam penggunaan AI di pendidikan. AI perlu digunakan dengan pendekatan berpusat pada manusia, etis, bertanggung jawab, dan mendukung kapasitas profesional guru; bukan menggantikan pertimbangan pedagogis guru.",
    guidance: [
      "Periksa akurasi, bias, konteks, dan relevansi setiap keluaran AI.",
      "Jangan memasukkan identitas atau data pribadi murid ke layanan AI tanpa dasar hukum dan perlindungan yang sesuai.",
      "Beritahu murid ketika AI digunakan secara material dalam proses atau produk pembelajaran sesuai kebijakan sekolah.",
      "Gunakan AI sebagai pendamping untuk eksplorasi, umpan balik, dan draf; guru tetap bertanggung jawab atas keputusan.",
      "Kembangkan literasi AI, etika, privasi, dan evaluasi sumber secara berkelanjutan."
    ],
    keywords: ["ai", "kecerdasan buatan", "literasi ai", "unesco", "etika", "privasi", "bias", "kompetensi guru", "transformasi digital"],
    source: { title: "AI competency framework for teachers", publisher: "UNESCO", url: "https://www.unesco.org/en/articles/ai-competency-framework-teachers", published: "2024", verifiedAt: "2026-11-13", status: "research" }
  },
  {
    id: "school-model-deep-learning",
    title: "Implementasi pembelajaran mendalam dan Koding/AI di sekolah",
    category: "Implementasi sekolah dan inovasi",
    audience: "Satuan pendidikan, guru dan pengelola program",
    summary: "Panduan penyelenggaraan sekolah model 2026 memberi acuan untuk merencanakan, melaksanakan, memantau, dan mengevaluasi implementasi pembelajaran mendalam serta Koding dan Kecerdasan Artifisial. Dokumen ini dapat menjadi referensi perencanaan program, tetapi penerapannya perlu mempertimbangkan status sekolah, kesiapan, dan sumber daya.",
    guidance: [
      "Tetapkan tujuan, penanggung jawab, indikator, dan jadwal implementasi.",
      "Mulai dari kebutuhan nyata sekolah dan kapasitas guru.",
      "Lakukan pemantauan dan evaluasi berbasis bukti, lalu perbaiki program.",
      "Jangan menganggap sekolah wajib menjadi sekolah model hanya karena panduan tersedia."
    ],
    keywords: ["sekolah model", "implementasi", "pembelajaran mendalam", "koding", "kecerdasan artifisial", "monitoring", "evaluasi", "program sekolah"],
    source: { title: "Panduan penyelenggaraan sekolah model implementasi pembelajaran mendalam dan Koding dan Kecerdasan Artifisial", publisher: "Repositori Kemendikdasmen / BSKAP", url: "https://repositori.kemendikdasmen.go.id/36445/", published: "2026", verifiedAt: "2026-11-13", status: "official" }
  }
];

const normalize = (value: string) => value.toLocaleLowerCase("id-ID")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

const stopWords = new Set(["yang", "dan", "atau", "untuk", "dengan", "pada", "dari", "dalam", "apa", "bagaimana", "saya", "guru", "murid", "siswa", "buat", "tolong", "tentang", "cara", "ke", "di", "ini", "itu"]);

export function searchTeacherKnowledge(question: string) {
  const normalized = normalize(question);
  const terms = [...new Set(normalized.split(" ").filter((term) => term.length > 2 && !stopWords.has(term)))];
  const ranked = teacherKnowledge.map((doc) => {
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
  }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);

  return ranked.map(({ doc, score }) => ({ ...doc, relevance: Math.min(100, Math.round(score * 5)) }));
}
