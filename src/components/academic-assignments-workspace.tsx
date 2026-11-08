"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ClipboardCheck, Plus, RefreshCw, Users, GraduationCap } from "lucide-react";

type Tab = "assignments" | "enrollments";
type AcademicYear = { id: string; name: string };
type SchoolClass = { id: string; name: string; grade_level: string; academic_year_id: string };
type AssignmentRow = { id: string; academic_year_name: string; class_name: string; grade_level: string; subject_name: string; subject_code: string | null; teacher_name: string };
type EnrollmentRow = { id: string; status: string; academic_year_name: string; student_name: string; student_number: string | null; class_name: string; grade_level: string };
type Option = { id: string; name?: string; full_name?: string; code?: string | null; student_number?: string | null };

export function AcademicAssignmentsWorkspace() {
  const [tab, setTab] = useState<Tab>("assignments");
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Option[]>([]);
  const [teachers, setTeachers] = useState<Option[]>([]);
  const [students, setStudents] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [assignmentYear, setAssignmentYear] = useState("");
  const [assignmentClass, setAssignmentClass] = useState("");
  const [assignmentSubject, setAssignmentSubject] = useState("");
  const [assignmentTeacher, setAssignmentTeacher] = useState("");
  const [enrollmentYear, setEnrollmentYear] = useState("");
  const [enrollmentClass, setEnrollmentClass] = useState("");
  const [enrollmentStudent, setEnrollmentStudent] = useState("");

  const assignmentClasses = useMemo(() => classes.filter(item => item.academic_year_id === assignmentYear), [classes, assignmentYear]);
  const enrollmentClasses = useMemo(() => classes.filter(item => item.academic_year_id === enrollmentYear), [classes, enrollmentYear]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [assignmentResponse, enrollmentResponse] = await Promise.all([
        fetch("/api/academic/assignments", { cache: "no-store" }),
        fetch("/api/academic/enrollments", { cache: "no-store" })
      ]);
      const [assignmentResult, enrollmentResult] = await Promise.all([assignmentResponse.json(), enrollmentResponse.json()]);
      if (!assignmentResponse.ok) throw new Error(assignmentResult.error ?? "Data penugasan tidak dapat dimuat.");
      if (!enrollmentResponse.ok) throw new Error(enrollmentResult.error ?? "Data rombongan belajar tidak dapat dimuat.");
      setAssignments(assignmentResult.data ?? []); setEnrollments(enrollmentResult.data ?? []);
      setYears(assignmentResult.options?.academicYears ?? []); setClasses(assignmentResult.options?.classes ?? []);
      setSubjects(assignmentResult.options?.subjects ?? []); setTeachers(assignmentResult.options?.teachers ?? []);
      setStudents(enrollmentResult.options?.students ?? []);
      const firstYear = assignmentResult.options?.academicYears?.[0]?.id ?? "";
      if (firstYear) { setAssignmentYear(current => current || firstYear); setEnrollmentYear(current => current || firstYear); }
    } catch (err) { setError(err instanceof Error ? err.message : "Gagal memuat data akademik."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/academic/assignments", { cache: "no-store" }).then(async response => { const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "Data penugasan tidak dapat dimuat."); return result; }),
      fetch("/api/academic/enrollments", { cache: "no-store" }).then(async response => { const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "Data rombongan belajar tidak dapat dimuat."); return result; })
    ]).then(([assignmentResult, enrollmentResult]) => {
      if (!active) return;
      setAssignments(assignmentResult.data ?? []); setEnrollments(enrollmentResult.data ?? []);
      setYears(assignmentResult.options?.academicYears ?? []); setClasses(assignmentResult.options?.classes ?? []);
      setSubjects(assignmentResult.options?.subjects ?? []); setTeachers(assignmentResult.options?.teachers ?? []);
      setStudents(enrollmentResult.options?.students ?? []);
      const firstYear = assignmentResult.options?.academicYears?.[0]?.id ?? "";
      if (firstYear) { setAssignmentYear(current => current || firstYear); setEnrollmentYear(current => current || firstYear); }
    }).catch(err => { if (active) setError(err instanceof Error ? err.message : "Gagal memuat data akademik."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function submitAssignment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch("/api/academic/assignments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ academicYearId: assignmentYear, classId: assignmentClass, subjectId: assignmentSubject, teacherId: assignmentTeacher }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Penugasan gagal disimpan.");
      setAssignmentClass(""); setAssignmentSubject(""); setAssignmentTeacher(""); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Gagal menyimpan penugasan."); }
    finally { setSaving(false); }
  }

  async function submitEnrollment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch("/api/academic/enrollments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ academicYearId: enrollmentYear, classId: enrollmentClass, studentId: enrollmentStudent }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Pendaftaran siswa gagal disimpan.");
      setEnrollmentClass(""); setEnrollmentStudent(""); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Gagal mendaftarkan siswa."); }
    finally { setSaving(false); }
  }

  async function toggleEnrollment(row: EnrollmentRow) {
    const status = row.status === "active" ? "completed" : "active";
    const response = await fetch("/api/academic/enrollments", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: row.id, status }) });
    const result = await response.json();
    if (!response.ok) { setError(result.error ?? "Status rombongan belajar gagal diperbarui."); return; }
    setEnrollments(current => current.map(item => item.id === row.id ? { ...item, status: result.data.status } : item));
  }

  return <main className="registry-shell">
    <header className="registry-header"><Link href="/" className="registry-back"><ArrowLeft size={16}/> Dashboard</Link><div className="registry-heading"><div className="registry-symbol"><ClipboardCheck size={22}/></div><div><span>OPERASIONAL AKADEMIK</span><h1>Penugasan & Rombongan Belajar</h1><p>Atur guru pengampu mata pelajaran dan penempatan siswa dalam kelas.</p></div></div></header>
    <section className="registry-stats"><div><small>Penugasan guru</small><strong>{assignments.length}</strong></div><div><small>Siswa terdaftar di kelas</small><strong>{enrollments.filter(item => item.status === "active").length}</strong></div><div><small>Tahun ajaran tersedia</small><strong>{years.length}</strong></div></section>
    <section className="registry-panel">
      <div className="registry-panel-head"><div><h2>Operasional kelas</h2><p>Seluruh data dibatasi pada sekolah yang sedang aktif.</p></div><button className="registry-refresh" onClick={() => void load()} aria-label="Muat ulang"><RefreshCw size={16}/></button></div>
      <div className="academic-tabs"><button className={tab === "assignments" ? "selected" : ""} onClick={() => setTab("assignments")}><Users size={15}/> Penugasan guru</button><button className={tab === "enrollments" ? "selected" : ""} onClick={() => setTab("enrollments")}><GraduationCap size={15}/> Penempatan siswa</button></div>
      {error && <div className="registry-error" role="alert">{error}</div>}
      {tab === "assignments" ? <>
        <form className="academic-form" onSubmit={submitAssignment}><label>Tahun ajaran<select required value={assignmentYear} onChange={event => {setAssignmentYear(event.target.value);setAssignmentClass("");}}><option value="">Pilih tahun ajaran</option>{years.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Kelas<select required value={assignmentClass} onChange={event => setAssignmentClass(event.target.value)}><option value="">Pilih kelas</option>{assignmentClasses.map(item => <option key={item.id} value={item.id}>{item.name} · {item.grade_level}</option>)}</select></label><label>Mata pelajaran<select required value={assignmentSubject} onChange={event => setAssignmentSubject(event.target.value)}><option value="">Pilih mapel</option>{subjects.map(item => <option key={item.id} value={item.id}>{item.name}{item.code ? ` · ${item.code}` : ""}</option>)}</select></label><label>Guru pengampu<select required value={assignmentTeacher} onChange={event => setAssignmentTeacher(event.target.value)}><option value="">Pilih guru</option>{teachers.map(item => <option key={item.id} value={item.id}>{item.full_name}</option>)}</select></label><button type="submit" disabled={saving || !years.length || !assignmentClasses.length || !subjects.length || !teachers.length}><Plus size={16}/>{saving ? "Menyimpan..." : "Tambah penugasan"}</button></form>
        <div className="registry-table-wrap"><table className="registry-table"><thead><tr><th>Tahun ajaran</th><th>Kelas</th><th>Mata pelajaran</th><th>Guru pengampu</th></tr></thead><tbody>{loading ? <tr><td colSpan={4} className="registry-empty">Memuat data...</td></tr> : assignments.length ? assignments.map(row => <tr key={row.id}><td>{row.academic_year_name}</td><td><strong>{row.class_name}</strong><small>{row.grade_level}</small></td><td><strong>{row.subject_name}</strong><small>{row.subject_code ?? "Tanpa kode"}</small></td><td>{row.teacher_name}</td></tr>) : <tr><td colSpan={4} className="registry-empty">Belum ada penugasan guru.</td></tr>}</tbody></table></div>
      </> : <>
        <form className="academic-form" onSubmit={submitEnrollment}><label>Tahun ajaran<select required value={enrollmentYear} onChange={event => {setEnrollmentYear(event.target.value);setEnrollmentClass("");}}><option value="">Pilih tahun ajaran</option>{years.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Kelas tujuan<select required value={enrollmentClass} onChange={event => setEnrollmentClass(event.target.value)}><option value="">Pilih kelas</option>{enrollmentClasses.map(item => <option key={item.id} value={item.id}>{item.name} · {item.grade_level}</option>)}</select></label><label>Peserta didik<select required value={enrollmentStudent} onChange={event => setEnrollmentStudent(event.target.value)}><option value="">Pilih siswa</option>{students.map(item => <option key={item.id} value={item.id}>{item.full_name}{item.student_number ? ` · ${item.student_number}` : ""}</option>)}</select></label><button type="submit" disabled={saving || !years.length || !enrollmentClasses.length || !students.length}><Plus size={16}/>{saving ? "Menyimpan..." : "Daftarkan siswa"}</button></form>
        <div className="registry-table-wrap"><table className="registry-table"><thead><tr><th>Peserta didik</th><th>Nomor induk</th><th>Kelas</th><th>Tahun ajaran</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{loading ? <tr><td colSpan={6} className="registry-empty">Memuat data...</td></tr> : enrollments.length ? enrollments.map(row => <tr key={row.id}><td><strong>{row.student_name}</strong></td><td>{row.student_number ?? "—"}</td><td>{row.class_name} · {row.grade_level}</td><td>{row.academic_year_name}</td><td><span className={`registry-status ${row.status === "active" ? "is-active" : ""}`}>{row.status}</span></td><td><button className="registry-toggle" onClick={() => void toggleEnrollment(row)}>{row.status === "active" ? "Selesaikan" : "Aktifkan"}</button></td></tr>) : <tr><td colSpan={6} className="registry-empty">Belum ada siswa yang ditempatkan di kelas.</td></tr>}</tbody></table></div>
      </>}
      <p className="registry-footnote">Penugasan guru dapat mendukung beberapa pengampu pada mapel yang sama. Satu siswa hanya dapat memiliki satu penempatan aktif per tahun ajaran.</p>
    </section>
  </main>;
}
