"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3, Download, Printer, RefreshCw } from "lucide-react";

type ReportType = "teachers" | "students" | "classes" | "gradebook";
type ReportRow = Record<string, string | number | null>;
const reportOptions: { value: ReportType; label: string; description: string }[] = [
  { value: "students", label: "Data siswa", description: "Daftar siswa dan penempatan kelas aktif." },
  { value: "teachers", label: "Data guru", description: "Direktori guru dan ringkasan penugasannya." },
  { value: "classes", label: "Rombongan belajar", description: "Kelas, wali kelas, tahun ajaran, dan jumlah siswa." },
  { value: "gradebook", label: "Rekap nilai", description: "Nilai asesmen berdasarkan kelas, mata pelajaran, dan siswa." }
];
const columnLabels: Record<string, string> = {
  student_number: "NIS / NISN", full_name: "Nama guru", status: "Status", class_name: "Kelas",
  grade_level: "Tingkat", academic_year: "Tahun ajaran", employee_number: "NIP / ID pegawai",
  employment_status: "Status kepegawaian", education: "Pendidikan", teaching_assignments: "Penugasan",
  classes_taught: "Kelas diampu", homeroom_teacher: "Wali kelas", student_count: "Jumlah siswa",
  subject_name: "Mata pelajaran", teacher_name: "Guru", assessment_title: "Asesmen",
  assessment_type: "Jenis asesmen", student_name: "Nama siswa", score: "Nilai",
  max_score: "Nilai maksimum", percentage: "Persentase", feedback: "Umpan balik", graded_at: "Tanggal penilaian"
};
const formatCell = (key: string, value: string | number | null) => {
  if (value === null || value === undefined || value === "") return "—";
  if (key === "percentage") return `${value}%`;
  if (key === "graded_at") return new Date(String(value)).toLocaleDateString("id-ID");
  return String(value);
};

export function ReportsWorkspace() {
  const [type, setType] = useState<ReportType>("students");
  const [data, setData] = useState<ReportRow[]>([]);
  const [generatedAt, setGeneratedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [classId, setClassId] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ type });
      if (classId && type === "gradebook") params.set("classId", classId);
      const response = await fetch(`/api/reports?${params.toString()}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Laporan tidak dapat dimuat.");
      setData(result.data ?? []);
      setGeneratedAt(result.generatedAt ?? new Date().toISOString());
    } catch (err) { setError(err instanceof Error ? err.message : "Gagal memuat laporan."); }
    finally { setLoading(false); }
  }, [type, classId]);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ type });
    if (classId && type === "gradebook") params.set("classId", classId);
    fetch(`/api/reports?${params.toString()}`, { cache: "no-store" })
      .then(async response => { const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "Laporan tidak dapat dimuat."); return result; })
      .then(result => { if (active) { setData(result.data ?? []); setGeneratedAt(result.generatedAt ?? new Date().toISOString()); } })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : "Gagal memuat laporan."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [type, classId]);

  const columns = data.length ? Object.keys(data[0]) : [];
  const current = reportOptions.find(option => option.value === type) ?? reportOptions[0];

  function exportCsv() {
    if (!data.length) return;
    const csv = [columns.map(key => columnLabels[key] ?? key).join(","), ...data.map(row => columns.map(key => {
      const value = formatCell(key, row[key]);
      return `"${value.replace(/"/g, '""')}"`;
    }).join(","))].join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `tms-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return <main className="registry-shell reports-shell">
    <header className="registry-header">
      <Link href="/" className="registry-back"><ArrowLeft size={16}/> Dashboard</Link>
      <div className="registry-heading"><div className="registry-symbol"><BarChart3 size={22}/></div><div><span>REPORT CENTER</span><h1>Pusat Laporan</h1><p>Ringkasan data akademik sekolah dengan ekspor CSV dan tampilan cetak.</p></div></div>
    </header>
    <section className="reports-overview">
      <div><small>Jenis laporan</small><strong>{reportOptions.length}</strong></div>
      <div><small>Baris data</small><strong>{data.length.toLocaleString("id-ID")}</strong></div>
      <div><small>Dibuat</small><strong>{generatedAt ? new Date(generatedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "—"}</strong></div>
    </section>
    <section className="registry-panel">
      <div className="reports-toolbar">
        <div className="reports-select-wrap"><label htmlFor="report-type">Pilih laporan</label><select id="report-type" value={type} onChange={event => setType(event.target.value as ReportType)}>{reportOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
        <div className="reports-actions">
          <button className="registry-toggle" onClick={() => void load()} disabled={loading}><RefreshCw size={14}/> Perbarui</button>
          <button className="registry-toggle" onClick={exportCsv} disabled={loading || !data.length}><Download size={14}/> Ekspor CSV</button>
          <button className="registry-toggle" onClick={() => window.print()} disabled={loading || !data.length}><Printer size={14}/> Cetak</button>
        </div>
      </div>
      <div className="reports-description"><strong>{current.label}</strong><span>{current.description}</span></div>
      {error && <div className="registry-error" role="alert">{error}</div>}
      <div className="reports-table-wrap">
        <table className="registry-table reports-table">
          <thead><tr>{columns.map(key => <th key={key}>{columnLabels[key] ?? key}</th>)}</tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={Math.max(columns.length, 1)} className="registry-empty">Memuat laporan...</td></tr>
              : data.length ? data.map((row, index) => <tr key={String(row.student_number ?? row.employee_number ?? row.student_name ?? index)}>{columns.map(key => <td key={key}>{formatCell(key, row[key])}</td>)}</tr>)
              : <tr><td colSpan={Math.max(columns.length, 1)} className="registry-empty">Belum ada data untuk laporan ini.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="registry-footnote">Laporan dibatasi pada sekolah dan tenant yang sedang aktif. Guru hanya dapat mengakses rekap nilai dari penugasannya sendiri.</p>
    </section>
  </main>;
}
