"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Search, RefreshCw, Users, GraduationCap } from "lucide-react";

type Resource = "teachers" | "students";
type Row = { id: string; full_name: string; employee_number?: string | null; education?: string | null; student_number?: string | null; birth_date?: string | null; status: string; created_at: string };

export function RegistryWorkspace({ resource }: { resource: Resource }) {
  const isTeacher = resource === "teachers";
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [fullName, setFullName] = useState("");
  const [number, setNumber] = useState("");
  const [extra, setExtra] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/registry/${resource}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Data tidak dapat dimuat.");
      setRows(result.data ?? []);
    } catch (err) { setError(err instanceof Error ? err.message : "Gagal memuat data."); }
    finally { setLoading(false); }
  }, [resource]);

  useEffect(() => { void load(); }, [load]);
  const filtered = useMemo(() => rows.filter(row => [row.full_name, row.employee_number, row.student_number].some(value => value?.toLowerCase().includes(query.toLowerCase()))), [rows, query]);

  async function createRecord(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const payload = isTeacher ? { fullName, employeeNumber: number, education: extra } : { fullName, studentNumber: number, birthDate: extra };
      const response = await fetch(`/api/registry/${resource}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Data gagal disimpan.");
      setFullName(""); setNumber(""); setExtra(""); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Gagal menyimpan data."); }
    finally { setSaving(false); }
  }

  async function toggleStatus(row: Row) {
    const status = row.status === "active" ? "inactive" : "active";
    const response = await fetch(`/api/registry/${resource}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: row.id, status }) });
    const result = await response.json();
    if (!response.ok) { setError(result.error ?? "Status gagal diperbarui."); return; }
    setRows(current => current.map(item => item.id === row.id ? result.data : item));
  }

  return <main className="registry-shell">
    <header className="registry-header"><Link href="/" className="registry-back"><ArrowLeft size={16}/> Dashboard</Link><div className="registry-heading"><div className="registry-symbol">{isTeacher ? <Users size={22}/> : <GraduationCap size={22}/>}</div><div><span>MASTER DATA SEKOLAH</span><h1>{isTeacher ? "Data Guru" : "Data Siswa"}</h1><p>Kelola direktori {isTeacher ? "tenaga pendidik" : "peserta didik"} sekolah secara aman dan terpusat.</p></div></div></header>
    <section className="registry-stats"><div><small>Total terdaftar</small><strong>{rows.length}</strong></div><div><small>Aktif</small><strong>{rows.filter(row => row.status === "active").length}</strong></div><div><small>Nonaktif / lainnya</small><strong>{rows.filter(row => row.status !== "active").length}</strong></div></section>
    <section className="registry-panel"><div className="registry-panel-head"><div><h2>Direktori {isTeacher ? "guru" : "siswa"}</h2><p>Data dibatasi pada sekolah dan tenant yang Anda kelola.</p></div><button className="registry-refresh" onClick={() => void load()} aria-label="Muat ulang"><RefreshCw size={16}/></button></div>
      <div className="registry-search"><Search size={17}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Cari nama atau nomor identitas..."/></div>
      {error && <div className="registry-error" role="alert">{error}</div>}
      <form className="registry-form" onSubmit={createRecord}><label>Nama lengkap<input required minLength={2} maxLength={180} value={fullName} onChange={event => setFullName(event.target.value)} placeholder="Masukkan nama lengkap"/></label><label>{isTeacher ? "NIP / NUPTK / Nomor pegawai" : "NIS / NISN"}<input maxLength={50} value={number} onChange={event => setNumber(event.target.value)} placeholder="Opsional"/></label><label>{isTeacher ? "Pendidikan terakhir" : "Tanggal lahir"}<input type={isTeacher ? "text" : "date"} maxLength={80} value={extra} onChange={event => setExtra(event.target.value)} placeholder={isTeacher ? "Contoh: S.Pd., S1 Pendidikan" : undefined}/></label><button type="submit" disabled={saving}><Plus size={16}/>{saving ? "Menyimpan..." : "Tambah data"}</button></form>
      <div className="registry-table-wrap"><table className="registry-table"><thead><tr><th>Nama lengkap</th><th>{isTeacher ? "Nomor pegawai" : "Nomor induk"}</th><th>{isTeacher ? "Pendidikan" : "Tanggal lahir"}</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{loading ? <tr><td colSpan={5} className="registry-empty">Memuat data...</td></tr> : filtered.length ? filtered.map(row => <tr key={row.id}><td><strong>{row.full_name}</strong><small>Terdaftar {new Date(row.created_at).toLocaleDateString("id-ID")}</small></td><td>{row.employee_number ?? row.student_number ?? "—"}</td><td>{isTeacher ? row.education ?? "—" : row.birth_date ? new Date(row.birth_date).toLocaleDateString("id-ID") : "—"}</td><td><span className={`registry-status ${row.status === "active" ? "is-active" : ""}`}>{row.status}</span></td><td><button className="registry-toggle" onClick={() => void toggleStatus(row)}>{row.status === "active" ? "Nonaktifkan" : "Aktifkan"}</button></td></tr>) : <tr><td colSpan={5} className="registry-empty">Belum ada data. Tambahkan data pertama melalui formulir di atas.</td></tr>}</tbody></table></div>
      <p className="registry-footnote">Maksimal 500 entri ditampilkan. Setiap perubahan dicatat pada audit log sekolah.</p>
    </section>
  </main>;
}
