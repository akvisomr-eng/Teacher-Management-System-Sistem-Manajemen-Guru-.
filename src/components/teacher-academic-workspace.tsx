"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Assignment = {
  assignment_id: string; class_id: string; class_name: string; grade_level: string;
  subject_id: string; subject_name: string; academic_year_id: string;
  academic_year_name: string; is_homeroom: boolean;
};
type SchoolClass = {
  class_id: string; class_name: string; grade_level: string;
  academic_year_id: string; academic_year_name: string; is_homeroom: boolean;
};
type Student = { student_id: string; student_number: string | null; full_name: string; class_id: string; class_name: string; grade_level: string };
type AssessmentRow = {
  assessment_id: string; title: string; assessment_type: string; max_score: number;
  due_at: string | null; status: string; class_id: string; class_name: string;
  subject_name: string; academic_year_name: string; result_id: string | null;
  student_id: string | null; student_name: string | null; score: number | null;
  feedback: string | null; graded_at: string | null;
};
type Payload = { academicYear: string | null; assignments: Assignment[]; classes: SchoolClass[]; students: Student[]; assessments: AssessmentRow[] };
const panel: React.CSSProperties = { background: "#fff", border: "1px solid #e6eaf2", borderRadius: 14, padding: 18 };
const muted: React.CSSProperties = { color: "#65708a", fontSize: 13 };

export default function TeacherAcademicWorkspace() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeClass, setActiveClass] = useState("all");
  const [activeTab, setActiveTab] = useState<"overview" | "students" | "assignments" | "assessments">("overview");

  async function fetchData(): Promise<Payload> {
    const response = await fetch("/api/teacher-academic", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Data akademik tidak dapat dimuat.");
    return result as Payload;
  }

  useEffect(() => {
    let active = true;
    fetchData()
      .then(result => { if (active) setData(result); })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : "Koneksi ke data akademik gagal."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function reload() {
    setLoading(true);
    setError("");
    try { setData(await fetchData()); }
    catch (err) { setError(err instanceof Error ? err.message : "Koneksi ke data akademik gagal."); }
    finally { setLoading(false); }
  }

  const classes = data?.classes ?? [];
  const students = useMemo(() => (data?.students ?? []).filter(s => activeClass === "all" || s.class_id === activeClass), [data, activeClass]);
  const assignments = useMemo(() => (data?.assignments ?? []).filter(a => activeClass === "all" || a.class_id === activeClass), [data, activeClass]);
  const assessmentGroups = useMemo(() => {
    const grouped = new Map<string, { assessment: AssessmentRow; results: AssessmentRow[] }>();
    for (const row of data?.assessments ?? []) {
      const group = grouped.get(row.assessment_id) ?? { assessment: row, results: [] };
      if (row.result_id && row.student_id) group.results.push(row);
      grouped.set(row.assessment_id, group);
    }
    return [...grouped.values()].filter(g => activeClass === "all" || g.assessment.class_id === activeClass);
  }, [data, activeClass]);

  const tabs = [
    ["overview", "Ringkasan"], ["students", "Data Siswa"], ["assignments", "Kelas & Mapel"], ["assessments", "Asesmen & Nilai"]
  ] as const;

  return <section style={{ marginTop: 24, display: "grid", gap: 14 }}>
    <header style={{ ...panel, background: "#f8f7ff", borderColor: "#dedafc" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div><small style={{ color: "#6254d9", fontWeight: 800, letterSpacing: 1.2 }}>AKADEMIK PERSONAL</small>
          <h2 style={{ margin: "6px 0" }}>Kelas, Siswa, Penugasan & Asesmen</h2>
          <p style={{ ...muted, margin: 0 }}>Data mengikuti penugasan resmi akun guru pada tahun ajaran aktif{data?.academicYear ? ` · ${data.academicYear}` : ""}.</p>
        </div>
        <button type="button" onClick={() => void reload()} disabled={loading} style={{ padding: "9px 13px", border: "1px solid #c9c3f4", borderRadius: 8, background: "white", cursor: "pointer" }}>{loading ? "Memuat…" : "Muat ulang data"}</button>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
        {tabs.map(([id, label]) => <button key={id} type="button" onClick={() => setActiveTab(id)} aria-pressed={activeTab === id} style={{ padding: "9px 13px", borderRadius: 8, border: activeTab === id ? "1px solid #6254d9" : "1px solid #d9ddec", background: activeTab === id ? "#6254d9" : "#fff", color: activeTab === id ? "#fff" : "#35415c", fontWeight: 700, cursor: "pointer" }}>{label}</button>)}
      </div>
    </header>

    {error && <div role="alert" style={{ ...panel, borderColor: "#efc2c2", color: "#8c2929", background: "#fff7f7" }}>{error}<p style={{ ...muted, marginBottom: 0 }}>Periksa penugasan tahun ajaran aktif dan kelengkapan data kelas di administrator sekolah.</p></div>}
    {loading && !data && <div style={panel}>Mengambil data akademik yang ditugaskan kepada akun guru…</div>}
    {data && <>
      <div style={{ ...panel, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <label htmlFor="teacher-class-filter" style={{ fontWeight: 700 }}>Filter kelas</label>
        <select id="teacher-class-filter" value={activeClass} onChange={e => setActiveClass(e.target.value)} style={{ minWidth: 220, padding: 10, border: "1px solid #d9ddec", borderRadius: 8, background: "#fff" }}>
          <option value="all">Semua kelas yang ditugaskan</option>
          {classes.map(c => <option key={c.class_id} value={c.class_id}>{c.class_name} · {c.grade_level}</option>)}
        </select>
        <span style={muted}>Hanya kelas dan siswa yang terhubung dengan penugasan Anda yang ditampilkan.</span>
      </div>

      {activeTab === "overview" && <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
          {[[classes.length, "Kelas aktif"], [assignments.length, "Penugasan mapel"], [students.length, "Siswa terdaftar"], [assessmentGroups.length, "Asesmen aktif/tersimpan"]].map(([value, label]) => <article key={String(label)} style={panel}><strong style={{ display: "block", fontSize: 27, color: "#5143c5" }}>{value}</strong><span style={muted}>{label}</span></article>)}
        </div>
        <div style={{ ...panel }}>
          <h3 style={{ marginTop: 0 }}>Kelas dan mata pelajaran saya</h3>
          {assignments.length ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>{assignments.map(a => <article key={a.assignment_id} style={{ padding: 13, border: "1px solid #edf0f5", borderRadius: 10 }}><b>{a.class_name}</b><div style={muted}>{a.grade_level} · {a.subject_name}</div>{a.is_homeroom && <small style={{ color: "#5143c5" }}>Wali kelas</small>}</article>)}</div> : <p style={muted}>Belum ada penugasan mata pelajaran pada tahun ajaran aktif.</p>}
        </div>
        <div style={panel}><h3 style={{ marginTop: 0 }}>Catatan data akademik</h3><p style={muted}>Jika kelas atau mata pelajaran belum muncul, administrator sekolah perlu memastikan tahun ajaran aktif, data kelas, penempatan wali kelas, dan penugasan guru sudah benar. Ruang kerja tidak menebak atau membuat penugasan sendiri.</p></div>
      </>}

      {activeTab === "students" && <div style={panel}>
        <h3 style={{ marginTop: 0 }}>Data Siswa ({students.length})</h3>
        {students.length ? <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}><thead><tr>{["No.","Nama siswa","NIS/NISN","Kelas"].map(x => <th key={x} style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e6eaf2" }}>{x}</th>)}</tr></thead><tbody>{students.map((s,i) => <tr key={s.student_id}><td style={{ padding: 10, borderBottom: "1px solid #f0f2f7" }}>{i+1}</td><td style={{ padding: 10, borderBottom: "1px solid #f0f2f7", fontWeight: 600 }}>{s.full_name}</td><td style={{ padding: 10, borderBottom: "1px solid #f0f2f7" }}>{s.student_number || "—"}</td><td style={{ padding: 10, borderBottom: "1px solid #f0f2f7" }}>{s.class_name}</td></tr>)}</tbody></table></div> : <p style={muted}>Belum ada siswa aktif yang terdaftar pada kelas penugasan Anda.</p>}
      </div>}

      {activeTab === "assignments" && <div style={panel}>
        <h3 style={{ marginTop: 0 }}>Kelas & Mata Pelajaran</h3>
        {assignments.length ? <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}><thead><tr>{["Kelas","Tingkat/Fase","Mata pelajaran","Tahun ajaran","Peran"].map(x => <th key={x} style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e6eaf2" }}>{x}</th>)}</tr></thead><tbody>{assignments.map(a => <tr key={a.assignment_id}>{[a.class_name,a.grade_level,a.subject_name,a.academic_year_name,a.is_homeroom ? "Guru mapel · Wali kelas" : "Guru mapel"].map((v,i)=><td key={i} style={{ padding: 10, borderBottom: "1px solid #f0f2f7" }}>{v}</td>)}</tr>)}</tbody></table></div> : <p style={muted}>Penugasan belum tersedia. Mintalah administrator sekolah menetapkan kelas dan mapel Anda.</p>}
      </div>}

      {activeTab === "assessments" && <div style={panel}>
        <h3 style={{ marginTop: 0 }}>Asesmen & Nilai ({assessmentGroups.length})</h3>
        {assessmentGroups.length ? <div style={{ display: "grid", gap: 12 }}>{assessmentGroups.map(({assessment:a,results}) => <article key={a.assessment_id} style={{ border: "1px solid #edf0f5", borderRadius: 10, padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}><b>{a.title}</b><span style={muted}>{a.status}</span></div>
          <p style={{ ...muted, margin: "5px 0 10px" }}>{a.class_name} · {a.subject_name} · {a.assessment_type} · Maks. {a.max_score}{a.due_at ? ` · Batas ${new Date(a.due_at).toLocaleDateString("id-ID")}` : ""}</p>
          {results.length ? <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}><thead><tr><th style={{ textAlign: "left", padding: 8 }}>Siswa</th><th style={{ textAlign: "left", padding: 8 }}>Nilai</th><th style={{ textAlign: "left", padding: 8 }}>Umpan balik</th></tr></thead><tbody>{results.map(r=><tr key={r.result_id}><td style={{ padding: 8, borderTop: "1px solid #f0f2f7" }}>{r.student_name}</td><td style={{ padding: 8, borderTop: "1px solid #f0f2f7", fontWeight: 700 }}>{r.score ?? "Belum dinilai"} / {a.max_score}</td><td style={{ padding: 8, borderTop: "1px solid #f0f2f7" }}>{r.feedback || "—"}</td></tr>)}</tbody></table></div> : <p style={muted}>Belum ada nilai yang dicatat untuk asesmen ini.</p>}
        </article>)}</div> : <p style={muted}>Belum ada asesmen untuk penugasan Anda pada tahun ajaran aktif.</p>}
        <p style={{ ...muted, marginBottom: 0 }}>Tampilan ini membaca data asesmen dan nilai yang sudah dicatat sekolah. Penginputan dan perubahan nilai harus mengikuti hak akses serta alur penilaian resmi sekolah.</p>
      </div>}
    </>}
    <p style={{ ...muted, margin: "0 2px" }}>Data siswa dan nilai bersifat terbatas. Jangan gunakan data pribadi nyata selama uji coba; gunakan data simulasi terlebih dahulu.</p>
  </section>;
}
