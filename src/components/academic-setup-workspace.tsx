"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpenCheck, Plus, RefreshCw, Users, GraduationCap , Printer} from "lucide-react";

type ClassRow = { id: string; name: string; grade_level: string; status: string; academic_year_id: string; academic_year_name: string; homeroom_teacher_name: string | null };
type SubjectRow = { id: string; code: string | null; name: string; category: string | null; is_active: boolean };
type Option = { id: string; name?: string; full_name?: string };
type Tab = "classes" | "subjects";

export function AcademicSetupWorkspace() {
  const [tab, setTab] = useState<Tab>("classes");
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [years, setYears] = useState<Option[]>([]);
  const [teachers, setTeachers] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [className, setClassName] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [yearId, setYearId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [subjectCategory, setSubjectCategory] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [classResponse, subjectResponse] = await Promise.all([
        fetch("/api/registry/classes", { cache: "no-store" }),
        fetch("/api/registry/subjects", { cache: "no-store" })
      ]);
      const [classResult, subjectResult] = await Promise.all([classResponse.json(), subjectResponse.json()]);
      if (!classResponse.ok) throw new Error(classResult.error ?? "Data kelas tidak dapat dimuat.");
      if (!subjectResponse.ok) throw new Error(subjectResult.error ?? "Data mata pelajaran tidak dapat dimuat.");
      setClasses(classResult.data ?? []); setYears(classResult.options?.academicYears ?? []); setTeachers(classResult.options?.teachers ?? []);
      setSubjects(subjectResult.data ?? []);
      if (!yearId && classResult.options?.academicYears?.[0]?.id) setYearId(classResult.options.academicYears[0].id);
    } catch (err) { setError(err instanceof Error ? err.message : "Gagal memuat data akademik."); }
    finally { setLoading(false); }
  }, [yearId]);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/registry/classes", { cache: "no-store" }).then(async response => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Data kelas tidak dapat dimuat.");
        return result;
      }),
      fetch("/api/registry/subjects", { cache: "no-store" }).then(async response => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Data mata pelajaran tidak dapat dimuat.");
        return result;
      })
    ]).then(([classResult, subjectResult]) => {
      if (!active) return;
      setClasses(classResult.data ?? []); setYears(classResult.options?.academicYears ?? []); setTeachers(classResult.options?.teachers ?? []);
      setSubjects(subjectResult.data ?? []);
      if (classResult.options?.academicYears?.[0]?.id) setYearId(current => current || classResult.options.academicYears[0].id);
    }).catch(err => { if (active) setError(err instanceof Error ? err.message : "Gagal memuat data akademik."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function submitClass(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch("/api/registry/classes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: className, gradeLevel, academicYearId: yearId, homeroomTeacherId: teacherId }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Kelas gagal disimpan.");
      setClassName(""); setGradeLevel(""); setTeacherId(""); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Gagal menyimpan kelas."); }
    finally { setSaving(false); }
  }

  async function submitSubject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch("/api/registry/subjects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: subjectName, code: subjectCode, category: subjectCategory }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Mata pelajaran gagal disimpan.");
      setSubjectName(""); setSubjectCode(""); setSubjectCategory(""); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Gagal menyimpan mata pelajaran."); }
    finally { setSaving(false); }
  }

  async function toggleClass(row: ClassRow) {
    const response = await fetch("/api/registry/classes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: row.id, status: row.status === "active" ? "inactive" : "active" }) });
    const result = await response.json();
    if (!response.ok) { setError(result.error ?? "Status kelas gagal diperbarui."); return; }
    setClasses(current => current.map(item => item.id === row.id ? { ...item, status: result.data.status } : item));
  }

  async function toggleSubject(row: SubjectRow) {
    const response = await fetch("/api/registry/subjects", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: row.id, isActive: !row.is_active }) });
    const result = await response.json();
    if (!response.ok) { setError(result.error ?? "Status mata pelajaran gagal diperbarui."); return; }
    setSubjects(current => current.map(item => item.id === row.id ? result.data : item));
  }

  return <main className="registry-shell">
    <header className="registry-header"><div className="registry-header-actions"><Link href="/" className="registry-back"><ArrowLeft size={16}/> Kembali ke Dashboard</Link><button type="button" className="registry-print" onClick={() => window.print()}><Printer size={15}/> Cetak halaman</button></div><div className="registry-heading"><div className="registry-symbol"><BookOpenCheck size={22}/></div><div><span>MASTER DATA AKADEMIK</span><h1>Kelas & Mata Pelajaran</h1><p>Susun struktur kelas dan katalog mata pelajaran sekolah.</p></div></div></header>
    <section className="registry-stats"><div><small>Total kelas</small><strong>{classes.length}</strong></div><div><small>Mata pelajaran aktif</small><strong>{subjects.filter(item => item.is_active).length}</strong></div><div><small>Tahun ajaran tersedia</small><strong>{years.length}</strong></div></section>
    <section className="registry-panel">
      <div className="registry-panel-head"><div><h2>Pengaturan akademik</h2><p>Data terikat pada sekolah dan tenant yang sedang aktif.</p></div><button className="registry-refresh" onClick={() => void load()} aria-label="Muat ulang"><RefreshCw size={16}/></button></div>
      <div className="academic-tabs"><button className={tab === "classes" ? "selected" : ""} onClick={() => setTab("classes")}><Users size={15}/> Kelas</button><button className={tab === "subjects" ? "selected" : ""} onClick={() => setTab("subjects")}><GraduationCap size={15}/> Mata pelajaran</button></div>
      {error && <div className="registry-error" role="alert">{error}</div>}
      {tab === "classes" ? <>
        <form className="academic-form" onSubmit={submitClass}><label>Nama kelas<input required maxLength={100} value={className} onChange={event => setClassName(event.target.value)} placeholder="Contoh: VII-A"/></label><label>Tingkat / fase<input required maxLength={50} value={gradeLevel} onChange={event => setGradeLevel(event.target.value)} placeholder="Contoh: Kelas 7 / Fase D"/></label><label>Tahun ajaran<select required value={yearId} onChange={event => setYearId(event.target.value)}><option value="">Pilih tahun ajaran</option>{years.map(year => <option key={year.id} value={year.id}>{year.name}</option>)}</select></label><label>Wali kelas<select value={teacherId} onChange={event => setTeacherId(event.target.value)}><option value="">Belum ditentukan</option>{teachers.map(teacher => <option key={teacher.id} value={teacher.id}>{teacher.full_name}</option>)}</select></label><button type="submit" disabled={saving || !years.length}><Plus size={16}/>{saving ? "Menyimpan..." : "Tambah kelas"}</button></form>
        <div className="registry-table-wrap"><table className="registry-table"><thead><tr><th>Nama kelas</th><th>Tingkat / fase</th><th>Tahun ajaran</th><th>Wali kelas</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{loading ? <tr><td colSpan={6} className="registry-empty">Memuat data...</td></tr> : classes.length ? classes.map(row => <tr key={row.id}><td><strong>{row.name}</strong></td><td>{row.grade_level}</td><td>{row.academic_year_name}</td><td>{row.homeroom_teacher_name ?? "Belum ditentukan"}</td><td><span className={`registry-status ${row.status === "active" ? "is-active" : ""}`}>{row.status}</span></td><td><button className="registry-toggle" onClick={() => void toggleClass(row)}>{row.status === "active" ? "Nonaktifkan" : "Aktifkan"}</button></td></tr>) : <tr><td colSpan={6} className="registry-empty">Belum ada kelas. Tambahkan kelas pertama melalui formulir.</td></tr>}</tbody></table></div>
      </> : <>
        <form className="academic-form" onSubmit={submitSubject}><label>Nama mata pelajaran<input required minLength={2} maxLength={140} value={subjectName} onChange={event => setSubjectName(event.target.value)} placeholder="Contoh: Matematika"/></label><label>Kode mapel<input maxLength={40} value={subjectCode} onChange={event => setSubjectCode(event.target.value)} placeholder="Contoh: MAT"/></label><label>Kategori / kelompok<input maxLength={80} value={subjectCategory} onChange={event => setSubjectCategory(event.target.value)} placeholder="Contoh: Wajib / Muatan lokal"/></label><button type="submit" disabled={saving}><Plus size={16}/>{saving ? "Menyimpan..." : "Tambah mapel"}</button></form>
        <div className="registry-table-wrap"><table className="registry-table"><thead><tr><th>Nama mata pelajaran</th><th>Kode</th><th>Kategori</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{loading ? <tr><td colSpan={5} className="registry-empty">Memuat data...</td></tr> : subjects.length ? subjects.map(row => <tr key={row.id}><td><strong>{row.name}</strong></td><td>{row.code ?? "—"}</td><td>{row.category ?? "—"}</td><td><span className={`registry-status ${row.is_active ? "is-active" : ""}`}>{row.is_active ? "Aktif" : "Nonaktif"}</span></td><td><button className="registry-toggle" onClick={() => void toggleSubject(row)}>{row.is_active ? "Nonaktifkan" : "Aktifkan"}</button></td></tr>) : <tr><td colSpan={5} className="registry-empty">Belum ada mata pelajaran. Tambahkan katalog pertama.</td></tr>}</tbody></table></div>
      </>}
      <p className="registry-footnote">Perubahan status tidak menghapus riwayat akademik. Semua penambahan dan perubahan dicatat dalam audit log.</p>
    </section>
  </main>;
}
