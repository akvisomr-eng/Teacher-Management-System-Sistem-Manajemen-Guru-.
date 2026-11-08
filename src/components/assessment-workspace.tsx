"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ClipboardCheck, Plus, RefreshCw, Save } from "lucide-react";

type Assignment = { id: string; class_name: string; grade_level: string; subject_name: string; teacher_name?: string };
type Assessment = { id: string; title: string; assessment_type: string; max_score: number; due_at: string | null; status: string; assignment_id: string; class_name: string; grade_level: string; subject_name: string; teacher_name: string };
type ResultRow = { student_id: string; full_name: string; student_number: string | null; result_id: string | null; score: number | null; feedback: string | null; graded_at: string | null };

export function AssessmentWorkspace() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [canPublish, setCanPublish] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Assessment | null>(null);
  const [results, setResults] = useState<ResultRow[]>([]);

  const [assignmentId, setAssignmentId] = useState("");
  const [title, setTitle] = useState("");
  const [assessmentType, setAssessmentType] = useState("Formatif");
  const [maxScore, setMaxScore] = useState("100");
  const [dueAt, setDueAt] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/assessments", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Data asesmen tidak dapat dimuat.");
      setAssessments(result.data ?? []); setAssignments(result.options?.assignments ?? []);
      setCanPublish(Boolean(result.permissions?.canPublish));
    } catch (err) { setError(err instanceof Error ? err.message : "Gagal memuat asesmen."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/assessments", { cache: "no-store" })
      .then(async response => { const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "Data asesmen tidak dapat dimuat."); return result; })
      .then(result => { if (active) { setAssessments(result.data ?? []); setAssignments(result.options?.assignments ?? []); setCanPublish(Boolean(result.permissions?.canPublish)); } })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : "Gagal memuat asesmen."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function createAssessment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch("/api/assessments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assignmentId, title, assessmentType, maxScore: Number(maxScore), dueAt }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Asesmen gagal disimpan.");
      setTitle(""); setAssignmentId(""); setDueAt(""); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Gagal menyimpan asesmen."); }
    finally { setSaving(false); }
  }

  async function openResults(assessment: Assessment) {
    setSelected(assessment); setError(""); setLoading(true);
    try {
      const response = await fetch(`/api/assessments/${assessment.id}/results`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Daftar nilai tidak dapat dimuat.");
      setResults(result.data ?? []);
    } catch (err) { setError(err instanceof Error ? err.message : "Gagal memuat daftar nilai."); }
    finally { setLoading(false); }
  }

  async function saveResult(row: ResultRow) {
    if (!selected || row.score === null || row.score < 0 || row.score > selected.max_score) { setError(`Nilai harus diisi antara 0 sampai ${selected?.max_score ?? 0}.`); return; }
    setSaving(true); setError("");
    try {
      const response = await fetch(`/api/assessments/${selected.id}/results`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ studentId: row.student_id, score: Number(row.score), feedback: row.feedback ?? "" }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Nilai gagal disimpan.");
      setResults(current => current.map(item => item.student_id === row.student_id ? { ...item, result_id: result.data.id, score: result.data.score, feedback: result.data.feedback, graded_at: result.data.graded_at } : item));
    } catch (err) { setError(err instanceof Error ? err.message : "Gagal menyimpan nilai."); }
    finally { setSaving(false); }
  }

  async function changeStatus(assessment: Assessment, status: "published" | "closed") {
    const response = await fetch("/api/assessments", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: assessment.id, status }) });
    const result = await response.json();
    if (!response.ok) { setError(result.error ?? "Status asesmen gagal diperbarui."); return; }
    setAssessments(current => current.map(item => item.id === assessment.id ? { ...item, status: result.data.status } : item));
    if (selected?.id === assessment.id) setSelected(current => current ? { ...current, status: result.data.status } : current);
  }

  return <main className="registry-shell">
    <header className="registry-header"><Link href="/" className="registry-back"><ArrowLeft size={16}/> Dashboard</Link><div className="registry-heading"><div className="registry-symbol"><ClipboardCheck size={22}/></div><div><span>ASSESSMENT CENTER</span><h1>Asesmen & Gradebook</h1><p>Kelola instrumen penilaian dan input hasil belajar siswa.</p></div></div></header>
    <section className="registry-stats"><div><small>Total asesmen</small><strong>{assessments.length}</strong></div><div><small>Sudah diterbitkan</small><strong>{assessments.filter(item => item.status === "published").length}</strong></div><div><small>Perlu dinilai</small><strong>{results.filter(item => item.score === null).length}</strong></div></section>
    <section className="registry-panel">
      <div className="registry-panel-head"><div><h2>{selected ? `Gradebook · ${selected.title}` : "Daftar asesmen"}</h2><p>{selected ? `${selected.class_name} · ${selected.subject_name} · Maksimum ${selected.max_score}` : "Asesmen terikat pada penugasan kelas dan mata pelajaran."}</p></div><button className="registry-refresh" onClick={() => selected ? setSelected(null) : void load()} aria-label={selected ? "Kembali" : "Muat ulang"}>{selected ? <ArrowLeft size={16}/> : <RefreshCw size={16}/>}</button></div>
      {error && <div className="registry-error" role="alert">{error}</div>}
      {!selected ? <>
        <form className="academic-form" onSubmit={createAssessment}><label>Penugasan kelas / mapel<select required value={assignmentId} onChange={event => setAssignmentId(event.target.value)}><option value="">Pilih penugasan</option>{assignments.map(item => <option key={item.id} value={item.id}>{item.class_name} · {item.subject_name}{item.teacher_name ? ` · ${item.teacher_name}` : ""}</option>)}</select></label><label>Judul asesmen<input required minLength={3} maxLength={180} value={title} onChange={event => setTitle(event.target.value)} placeholder="Contoh: Sumatif Bab 1"/></label><label>Jenis asesmen<input required maxLength={40} value={assessmentType} onChange={event => setAssessmentType(event.target.value)} placeholder="Formatif / Sumatif / Proyek"/></label><label>Nilai maksimum<input required type="number" min="1" max="1000" value={maxScore} onChange={event => setMaxScore(event.target.value)}/></label><label>Batas waktu<input type="datetime-local" value={dueAt} onChange={event => setDueAt(event.target.value)}/></label><button type="submit" disabled={saving || !assignments.length}><Plus size={16}/>{saving ? "Menyimpan..." : "Buat asesmen"}</button></form>
        <div className="registry-table-wrap"><table className="registry-table"><thead><tr><th>Asesmen</th><th>Kelas / mapel</th><th>Guru</th><th>Nilai maks.</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{loading ? <tr><td colSpan={6} className="registry-empty">Memuat data...</td></tr> : assessments.length ? assessments.map(item => <tr key={item.id}><td><strong>{item.title}</strong><small>{item.assessment_type}{item.due_at ? ` · ${new Date(item.due_at).toLocaleString("id-ID")}` : ""}</small></td><td><strong>{item.class_name}</strong><small>{item.subject_name} · {item.grade_level}</small></td><td>{item.teacher_name}</td><td>{item.max_score}</td><td><span className={`registry-status ${item.status === "published" ? "is-active" : ""}`}>{item.status}</span></td><td><div className="gradebook-actions"><button className="registry-toggle" onClick={() => void openResults(item)}>Input nilai</button>{canPublish && item.status === "draft" ? <button className="registry-toggle" onClick={() => void changeStatus(item,"published")}>Terbitkan</button> : canPublish && item.status === "published" ? <button className="registry-toggle" onClick={() => void changeStatus(item,"closed")}>Tutup</button> : null}</div></td></tr>) : <tr><td colSpan={6} className="registry-empty">Belum ada asesmen.</td></tr>}</tbody></table></div>
      </> : <>
        <div className="gradebook-summary"><div><small>Jenis</small><strong>{selected.assessment_type}</strong></div><div><small>Nilai maksimum</small><strong>{selected.max_score}</strong></div><div><small>Status</small><strong>{selected.status}</strong></div></div>
        <div className="registry-table-wrap"><table className="registry-table gradebook-table"><thead><tr><th>Peserta didik</th><th>Nomor induk</th><th>Nilai</th><th>Umpan balik</th><th>Aksi</th></tr></thead><tbody>{loading ? <tr><td colSpan={5} className="registry-empty">Memuat daftar siswa...</td></tr> : results.length ? results.map(row => <tr key={row.student_id}><td><strong>{row.full_name}</strong></td><td>{row.student_number ?? "—"}</td><td><input aria-label={`Nilai ${row.full_name}`} type="number" min="0" max={selected.max_score} value={row.score ?? ""} disabled={selected.status === "closed"} onChange={event => setResults(current => current.map(item => item.student_id === row.student_id ? { ...item, score: event.target.value === "" ? null : Number(event.target.value) } : item))}/></td><td><input aria-label={`Umpan balik ${row.full_name}`} maxLength={5000} value={row.feedback ?? ""} disabled={selected.status === "closed"} onChange={event => setResults(current => current.map(item => item.student_id === row.student_id ? { ...item, feedback: event.target.value } : item))}/></td><td><button className="registry-toggle" disabled={saving || selected.status === "closed"} onClick={() => void saveResult(row)}><Save size={13}/> Simpan</button></td></tr>) : <tr><td colSpan={5} className="registry-empty">Belum ada siswa aktif yang terdaftar pada kelas asesmen ini.</td></tr>}</tbody></table></div>
        <p className="registry-footnote">Nilai disimpan per siswa dan dibatasi pada kelas serta tahun ajaran penugasan. Asesmen yang ditutup tidak dapat diubah.</p>
      </>}
    </section>
  </main>;
}
