"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Copy, Plus, RefreshCw, Save, Send, Archive } from "lucide-react";

type Outcome = { code: string; title: string; description: string; phase: string };
type Definition = { description: string; learningOutcomes: Outcome[]; subjectGuides: { subject: string; notes: string }[]; assessmentPrinciples: string };
type Curriculum = { id: string; name: string; framework: string; version: number; status: "draft" | "published" | "archived"; definition: Definition; created_at: string };

const emptyDefinition: Definition = { description: "", learningOutcomes: [], subjectGuides: [], assessmentPrinciples: "" };
const asDefinition = (value: unknown): Definition => {
  if (!value || typeof value !== "object") return emptyDefinition;
  const item = value as Partial<Definition>;
  return {
    description: typeof item.description === "string" ? item.description : "",
    learningOutcomes: Array.isArray(item.learningOutcomes) ? item.learningOutcomes : [],
    subjectGuides: Array.isArray(item.subjectGuides) ? item.subjectGuides : [],
    assessmentPrinciples: typeof item.assessmentPrinciples === "string" ? item.assessmentPrinciples : ""
  };
};

export function CurriculumWorkspace() {
  const [items, setItems] = useState<Curriculum[]>([]);
  const [selected, setSelected] = useState<Curriculum | null>(null);
  const [name, setName] = useState("");
  const [framework, setFramework] = useState("Kurikulum Merdeka");
  const [description, setDescription] = useState("");
  const [outcomesText, setOutcomesText] = useState("");
  const [assessmentPrinciples, setAssessmentPrinciples] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/curriculum", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Data kurikulum tidak dapat dimuat.");
      const data = (result.data ?? []).map((row: Curriculum) => ({ ...row, definition: asDefinition(row.definition) })) as Curriculum[];
      setItems(data);
      setSelected(current => current ? data.find((item: Curriculum) => item.id === current.id) ?? null : null);
    } catch (err) { setError(err instanceof Error ? err.message : "Gagal memuat kurikulum."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/curriculum", { cache: "no-store" })
      .then(async response => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Data kurikulum tidak dapat dimuat.");
        return result;
      })
      .then(result => {
        if (!active) return;
        const data = (result.data ?? []).map((row: Curriculum) => ({ ...row, definition: asDefinition(row.definition) })) as Curriculum[];
        setItems(data);
      })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : "Gagal memuat kurikulum."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function selectItem(item: Curriculum) {
    const definition = asDefinition(item.definition);
    setSelected({ ...item, definition });
    setName(item.name);
    setFramework(item.framework);
    setDescription(definition.description);
    setOutcomesText(definition.learningOutcomes.map(outcome => outcome.title).join("\n"));
    setAssessmentPrinciples(definition.assessmentPrinciples);
    setNotice("");
    setError("");
  }

  function clearEditor() {
    setSelected(null); setName(""); setFramework("Kurikulum Merdeka");
    setDescription(""); setOutcomesText(""); setAssessmentPrinciples("");
    setNotice(""); setError("");
  }

  function makeDefinition(): Definition {
    return {
      description,
      learningOutcomes: outcomesText.split("\n").map(line => line.trim()).filter(Boolean).map((title, index) => ({
        code: `CP-${String(index + 1).padStart(2, "0")}`,
        title,
        description: "",
        phase: ""
      })),
      subjectGuides: selected ? asDefinition(selected.definition).subjectGuides : [],
      assessmentPrinciples
    };
  }

  async function createCurriculum(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/curriculum", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, framework })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Draf kurikulum gagal dibuat.");
      await load(); selectItem({ ...result.data, definition: asDefinition(result.data.definition) });
      setNotice("Draf kurikulum berhasil dibuat.");
    } catch (err) { setError(err instanceof Error ? err.message : "Gagal membuat kurikulum."); }
    finally { setSaving(false); }
  }

  async function saveDraft() {
    if (!selected) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/curriculum", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.id, action: "update", definition: makeDefinition() })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Perubahan kurikulum gagal disimpan.");
      await load(); selectItem({ ...result.data, definition: asDefinition(result.data.definition) });
      setNotice("Perubahan draf berhasil disimpan.");
    } catch (err) { setError(err instanceof Error ? err.message : "Gagal menyimpan kurikulum."); }
    finally { setSaving(false); }
  }

  async function changeStatus(action: "publish" | "archive") {
    if (!selected) return;
    setSaving(true); setError(""); setNotice("");
    try {
      if (action === "publish") {
        const saveResponse = await fetch("/api/curriculum", {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: selected.id, action: "update", definition: makeDefinition() })
        });
        const saveResult = await saveResponse.json();
        if (!saveResponse.ok) throw new Error(saveResult.error ?? "Draf gagal disimpan sebelum diterbitkan.");
      }
      const response = await fetch("/api/curriculum", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.id, action })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Status kurikulum gagal diperbarui.");
      await load(); selectItem({ ...result.data, definition: asDefinition(result.data.definition) });
      setNotice(action === "publish" ? "Kurikulum berhasil diterbitkan. Versi ini terkunci dan tidak dapat diedit." : "Versi kurikulum berhasil diarsipkan.");
    } catch (err) { setError(err instanceof Error ? err.message : "Gagal memperbarui status."); }
    finally { setSaving(false); }
  }

  async function createNextVersion() {
    if (!selected) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/curriculum", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: selected.name, framework: selected.framework, cloneFromId: selected.id })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Versi baru gagal dibuat.");
      await load(); selectItem({ ...result.data, definition: asDefinition(result.data.definition) });
      setNotice("Versi draf baru dibuat dari versi sebelumnya.");
    } catch (err) { setError(err instanceof Error ? err.message : "Gagal membuat versi baru."); }
    finally { setSaving(false); }
  }

  const publishedCount = items.filter(item => item.status === "published").length;
  const draftCount = items.filter(item => item.status === "draft").length;

  return <main className="registry-shell">
    <header className="registry-header">
      <Link href="/" className="registry-back"><ArrowLeft size={16}/> Dashboard</Link>
      <div className="registry-heading"><div className="registry-symbol"><BookOpen size={22}/></div><div><span>CURRICULUM CENTER</span><h1>Pusat Kurikulum</h1><p>Kelola kerangka, capaian pembelajaran, dan versi kurikulum sekolah.</p></div></div>
    </header>
    <section className="registry-stats">
      <div><small>Total versi</small><strong>{items.length}</strong></div>
      <div><small>Draf</small><strong>{draftCount}</strong></div>
      <div><small>Diterbitkan</small><strong>{publishedCount}</strong></div>
    </section>
    <section className="registry-panel">
      <div className="registry-panel-head"><div><h2>{selected ? `${selected.name} · v${selected.version}` : "Daftar kurikulum"}</h2><p>Setiap perubahan setelah penerbitan dibuat sebagai versi baru.</p></div><button className="registry-refresh" onClick={() => selected ? clearEditor() : void load()} aria-label={selected ? "Kembali ke daftar" : "Muat ulang"}>{selected ? <ArrowLeft size={16}/> : <RefreshCw size={16}/>}</button></div>
      {error && <div className="registry-error" role="alert">{error}</div>}
      {notice && <div className="registry-notice" role="status">{notice}</div>}
      {!selected ? <>
        <form className="academic-form" onSubmit={createCurriculum}>
          <label>Nama kurikulum<input required minLength={3} maxLength={160} value={name} onChange={event => setName(event.target.value)} placeholder="Contoh: Kurikulum Operasional Sekolah"/></label>
          <label>Kerangka / acuan<input required minLength={2} maxLength={100} value={framework} onChange={event => setFramework(event.target.value)} placeholder="Contoh: Kurikulum Merdeka"/></label>
          <button type="submit" disabled={saving}><Plus size={16}/>{saving ? "Membuat..." : "Buat draf"}</button>
        </form>
        <div className="registry-table-wrap"><table className="registry-table"><thead><tr><th>Kurikulum</th><th>Kerangka</th><th>Versi</th><th>Capaian</th><th>Status</th><th>Aksi</th></tr></thead><tbody>
          {loading ? <tr><td colSpan={6} className="registry-empty">Memuat data...</td></tr> : items.length ? items.map(item => <tr key={item.id}><td><strong>{item.name}</strong><small>{new Date(item.created_at).toLocaleDateString("id-ID")}</small></td><td>{item.framework}</td><td>v{item.version}</td><td>{asDefinition(item.definition).learningOutcomes.length}</td><td><span className={`registry-status ${item.status === "published" ? "is-active" : ""}`}>{item.status === "published" ? "Diterbitkan" : item.status === "archived" ? "Diarsipkan" : "Draf"}</span></td><td><button className="registry-toggle" onClick={() => selectItem(item)}>Buka</button></td></tr>) : <tr><td colSpan={6} className="registry-empty">Belum ada kurikulum. Buat draf pertama untuk mulai menyusun capaian pembelajaran.</td></tr>}
        </tbody></table></div>
      </> : <>
        <div className="curriculum-editor-meta"><span className={`registry-status ${selected.status === "published" ? "is-active" : ""}`}>{selected.status === "published" ? "Diterbitkan" : selected.status === "archived" ? "Diarsipkan" : "Draf"}</span><span>Versi {selected.version}</span><span>{selected.framework}</span></div>
        <div className="curriculum-editor">
          <label>Nama kurikulum<input disabled maxLength={160} value={name} onChange={event => setName(event.target.value)}/></label>
          <label>Kerangka / acuan<input disabled maxLength={100} value={framework} onChange={event => setFramework(event.target.value)}/></label>
          <label>Deskripsi dan ruang lingkup<textarea disabled={selected.status !== "draft"} rows={4} maxLength={5000} value={description} onChange={event => setDescription(event.target.value)} placeholder="Jelaskan karakteristik dan ruang lingkup kurikulum..."/></label>
          <label>Capaian pembelajaran <small>Masukkan satu capaian per baris. Kode CP dibuat otomatis.</small><textarea disabled={selected.status !== "draft"} rows={8} maxLength={30000} value={outcomesText} onChange={event => setOutcomesText(event.target.value)} placeholder={"Memahami konsep dasar...\nMenerapkan pengetahuan dalam konteks...\nMerefleksikan proses belajar..."}/></label>
          <label>Prinsip asesmen<textarea disabled={selected.status !== "draft"} rows={4} maxLength={5000} value={assessmentPrinciples} onChange={event => setAssessmentPrinciples(event.target.value)} placeholder="Tuliskan prinsip penilaian, umpan balik, dan bukti belajar..."/></label>
          <div className="curriculum-editor-actions">
            {selected.status === "draft" ? <><button className="registry-toggle" disabled={saving} onClick={() => void saveDraft()}><Save size={14}/> Simpan draf</button><button className="registry-toggle" disabled={saving || !outcomesText.trim()} onClick={() => void changeStatus("publish")}><Send size={14}/> Terbitkan</button></> : null}
            {selected.status === "published" ? <button className="registry-toggle" disabled={saving} onClick={() => void changeStatus("archive")}><Archive size={14}/> Arsipkan</button> : null}
            <button className="registry-toggle" disabled={saving} onClick={() => void createNextVersion()}><Copy size={14}/> Buat versi berikutnya</button>
          </div>
        </div>
        <p className="registry-footnote">Versi yang sudah diterbitkan tidak dapat diubah. Revisi dilakukan dengan membuat versi berikutnya; riwayat versi tetap tersimpan.</p>
      </>}
    </section>
  </main>;
}
