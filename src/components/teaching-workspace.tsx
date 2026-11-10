"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpenCheck, ClipboardList, Plus, RefreshCw , Printer} from "lucide-react";

type Tab = "plans" | "journals";
type Plan = { id: string; title: string; subject: string | null; grade_level: string | null; status: string; teacher_name: string | null; content: { objectives?: string; activities?: string; assessment?: string } };
type Journal = { id: string; journal_date: string; topic: string; reflection: string | null; status: string; teacher_name: string; class_name: string; subject_name: string };
type Option = { id: string; full_name?: string; class_name?: string; subject_name?: string; teacher_name?: string };
type Assignment = { id: string; class_name: string; subject_name: string; teacher_name?: string };

export function TeachingWorkspace({ teacherMode = false }: { teacherMode?: boolean } = {}) {
  const [tab, setTab] = useState<Tab>("plans");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [journals, setJournals] = useState<Journal[]>([]);
  const [teachers, setTeachers] = useState<Option[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [canReview, setCanReview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [objectives, setObjectives] = useState("");
  const [activities, setActivities] = useState("");
  const [assessment, setAssessment] = useState("");

  const [assignmentId, setAssignmentId] = useState("");
  const [journalDate, setJournalDate] = useState(new Date().toISOString().slice(0, 10));
  const [topic, setTopic] = useState("");
  const [reflection, setReflection] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [planResponse, journalResponse] = await Promise.all([
        fetch("/api/teaching/plans", { cache: "no-store" }),
        fetch("/api/teaching/journals", { cache: "no-store" })
      ]);
      const [planResult, journalResult] = await Promise.all([planResponse.json(), journalResponse.json()]);
      if (!planResponse.ok) throw new Error(planResult.error ?? "Perencanaan ajar tidak dapat dimuat.");
      if (!journalResponse.ok) throw new Error(journalResult.error ?? "Jurnal mengajar tidak dapat dimuat.");
      setPlans(planResult.data ?? []); setTeachers(planResult.options?.teachers ?? []);
      setJournals(journalResult.data ?? []); setAssignments(journalResult.options?.assignments ?? []);
      setCanReview(Boolean(planResult.permissions?.canReview));
    } catch (err) { setError(err instanceof Error ? err.message : "Gagal memuat aktivitas pembelajaran."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/teaching/plans", { cache: "no-store" }).then(async response => { const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "Perencanaan ajar tidak dapat dimuat."); return result; }),
      fetch("/api/teaching/journals", { cache: "no-store" }).then(async response => { const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "Jurnal mengajar tidak dapat dimuat."); return result; })
    ]).then(([planResult, journalResult]) => {
      if (!active) return;
      setPlans(planResult.data ?? []); setTeachers(planResult.options?.teachers ?? []);
      setJournals(journalResult.data ?? []); setAssignments(journalResult.options?.assignments ?? []);
      setCanReview(Boolean(planResult.permissions?.canReview));
    }).catch(err => { if (active) setError(err instanceof Error ? err.message : "Gagal memuat aktivitas pembelajaran."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function createPlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch("/api/teaching/plans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, subject, gradeLevel, teacherId, objectives, activities, assessment }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Rencana ajar gagal disimpan.");
      setTitle(""); setSubject(""); setGradeLevel(""); setTeacherId(""); setObjectives(""); setActivities(""); setAssessment(""); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Gagal menyimpan rencana ajar."); }
    finally { setSaving(false); }
  }

  async function createJournal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch("/api/teaching/journals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assignmentId, journalDate, topic, reflection }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Jurnal mengajar gagal disimpan.");
      setTopic(""); setReflection(""); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Gagal menyimpan jurnal."); }
    finally { setSaving(false); }
  }

  async function updateStatus(resource: "plans" | "journals", id: string, status: string) {
    const response = await fetch(`/api/teaching/${resource}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    const result = await response.json();
    if (!response.ok) { setError(result.error ?? "Status gagal diperbarui."); return; }
    if (resource === "plans") setPlans(current => current.map(item => item.id === id ? { ...item, status: result.data.status } : item));
    else setJournals(current => current.map(item => item.id === id ? { ...item, status: result.data.status } : item));
  }

  return <main className="registry-shell">
    <header className="registry-header"><div className="registry-header-actions"><Link href={teacherMode ? "/teacher" : "/"} className="registry-back"><ArrowLeft size={16}/> {teacherMode ? "Kembali ke Ruang Kerja Guru" : "Kembali ke Dashboard"}</Link><button type="button" className="registry-print" onClick={() => window.print()}><Printer size={15}/> Cetak halaman</button></div><div className="registry-heading"><div className="registry-symbol"><BookOpenCheck size={22}/></div><div><span>AKTIVITAS PEMBELAJARAN</span><h1>Perencanaan Ajar & Jurnal</h1><p>Susun perangkat ajar dan dokumentasikan proses pembelajaran.</p></div></div></header>
    <section className="registry-stats"><div><small>Rencana ajar</small><strong>{plans.length}</strong></div><div><small>Jurnal mengajar</small><strong>{journals.length}</strong></div><div><small>Perlu ditinjau</small><strong>{plans.filter(item => item.status === "submitted").length + journals.filter(item => item.status === "submitted").length}</strong></div></section>
    <section className="registry-panel">
      <div className="registry-panel-head"><div><h2>Ruang kerja pembelajaran</h2><p>Guru dan pengelola sekolah dapat menyusun serta meninjau aktivitas.</p></div><button className="registry-refresh" onClick={() => void load()} aria-label="Muat ulang"><RefreshCw size={16}/></button></div>
      <div className="academic-tabs"><button className={tab === "plans" ? "selected" : ""} onClick={() => setTab("plans")}><BookOpenCheck size={15}/> Perencanaan ajar</button><button className={tab === "journals" ? "selected" : ""} onClick={() => setTab("journals")}><ClipboardList size={15}/> Jurnal mengajar</button></div>
      {error && <div className="registry-error" role="alert">{error}</div>}
      {tab === "plans" ? <>
        <form className="teaching-form" onSubmit={createPlan}><label>Judul rencana ajar<input required minLength={3} maxLength={200} value={title} onChange={event => setTitle(event.target.value)} placeholder="Contoh: Modul Ajar Persamaan Linear"/></label><label>Mata pelajaran<input maxLength={120} value={subject} onChange={event => setSubject(event.target.value)} placeholder="Contoh: Matematika"/></label><label>Tingkat / fase<input maxLength={50} value={gradeLevel} onChange={event => setGradeLevel(event.target.value)} placeholder="Contoh: Kelas 7 / Fase D"/></label>{!teacherMode && teachers.length > 0 && <label>Guru penanggung jawab<select value={teacherId} onChange={event => setTeacherId(event.target.value)}><option value="">Pilih guru (opsional)</option>{teachers.map(item => <option key={item.id} value={item.id}>{item.full_name}</option>)}</select></label>}<label>Tujuan pembelajaran<textarea rows={2} maxLength={5000} value={objectives} onChange={event => setObjectives(event.target.value)} placeholder="Tuliskan kompetensi dan tujuan yang ingin dicapai."/></label><label>Langkah / aktivitas pembelajaran<textarea rows={2} maxLength={8000} value={activities} onChange={event => setActivities(event.target.value)} placeholder="Pendahuluan, kegiatan inti, dan penutup."/></label><label>Asesmen / bukti belajar<textarea rows={2} maxLength={5000} value={assessment} onChange={event => setAssessment(event.target.value)} placeholder="Teknik asesmen dan indikator keberhasilan."/></label><button type="submit" disabled={saving}><Plus size={16}/>{saving ? "Menyimpan..." : "Simpan rencana ajar"}</button></form>
        <div className="registry-table-wrap"><table className="registry-table"><thead><tr><th>Rencana ajar</th><th>Mapel / tingkat</th><th>Guru</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{loading ? <tr><td colSpan={5} className="registry-empty">Memuat data...</td></tr> : plans.length ? plans.map(row => <tr key={row.id}><td><strong>{row.title}</strong><small>{row.content?.objectives ? row.content.objectives.slice(0,90) : "Belum ada tujuan pembelajaran"}</small></td><td>{row.subject ?? "—"}<small>{row.grade_level ?? "—"}</small></td><td>{row.teacher_name ?? "Belum ditentukan"}</td><td><span className={`registry-status ${row.status === "approved" ? "is-active" : ""}`}>{row.status}</span></td><td>{row.status === "draft" || row.status === "revision" ? <button className="registry-toggle" onClick={() => void updateStatus("plans", row.id, "submitted")}>Ajukan</button> : canReview && row.status === "submitted" ? <button className="registry-toggle" onClick={() => void updateStatus("plans", row.id, "approved")}>Setujui</button> : canReview && row.status === "approved" ? <button className="registry-toggle" onClick={() => void updateStatus("plans", row.id, "revision")}>Minta revisi</button> : "—"}</td></tr>) : <tr><td colSpan={5} className="registry-empty">Belum ada rencana ajar.</td></tr>}</tbody></table></div>
      </> : <>
        <form className="teaching-form teaching-journal-form" onSubmit={createJournal}><label>Penugasan kelas / mapel<select required value={assignmentId} onChange={event => setAssignmentId(event.target.value)}><option value="">Pilih penugasan</option>{assignments.map(item => <option key={item.id} value={item.id}>{item.class_name} · {item.subject_name}{item.teacher_name ? ` · ${item.teacher_name}` : ""}</option>)}</select></label><label>Tanggal pembelajaran<input type="date" required value={journalDate} onChange={event => setJournalDate(event.target.value)}/></label><label>Topik pembelajaran<input required minLength={3} maxLength={200} value={topic} onChange={event => setTopic(event.target.value)} placeholder="Materi yang diajarkan"/></label><label>Refleksi / catatan<textarea rows={2} maxLength={10000} value={reflection} onChange={event => setReflection(event.target.value)} placeholder="Kehadiran, aktivitas, kendala, dan tindak lanjut."/></label><button type="submit" disabled={saving || !assignments.length}><Plus size={16}/>{saving ? "Menyimpan..." : "Simpan jurnal"}</button></form>
        <div className="registry-table-wrap"><table className="registry-table"><thead><tr><th>Tanggal</th><th>Kelas / mapel</th><th>Guru</th><th>Topik</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{loading ? <tr><td colSpan={6} className="registry-empty">Memuat data...</td></tr> : journals.length ? journals.map(row => <tr key={row.id}><td>{new Date(row.journal_date).toLocaleDateString("id-ID")}</td><td><strong>{row.class_name}</strong><small>{row.subject_name}</small></td><td>{row.teacher_name}</td><td><strong>{row.topic}</strong><small>{row.reflection ?? "—"}</small></td><td><span className={`registry-status ${row.status === "reviewed" ? "is-active" : ""}`}>{row.status}</span></td><td>{row.status === "draft" ? <button className="registry-toggle" onClick={() => void updateStatus("journals", row.id, "submitted")}>Ajukan</button> : canReview && row.status === "submitted" ? <button className="registry-toggle" onClick={() => void updateStatus("journals", row.id, "reviewed")}>Tandai ditinjau</button> : "—"}</td></tr>) : <tr><td colSpan={6} className="registry-empty">Belum ada jurnal mengajar.</td></tr>}</tbody></table></div>
      </>}
      <p className="registry-footnote">Status persetujuan membantu alur supervisi. Keputusan akademik tetap menjadi tanggung jawab guru dan sekolah.</p>
    </section>
  </main>;
}
