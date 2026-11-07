"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, ShieldCheck } from "lucide-react";

export function OnboardingForm({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [tenantName, setTenantName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [level, setLevel] = useState("SD");
  const [npsn, setNpsn] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantName, schoolName, level, npsn })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Tidak dapat membuat workspace.");
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="onboarding-shell"><div className="onboarding-card"><div className="onboarding-brand"><div className="brand-mark"><GraduationCap size={22}/></div><div><b>ruang<span>guru</span></b><small>MANAGEMENT SYSTEM</small></div></div><div className="auth-card-eyebrow">PENYIAPAN WORKSPACE</div><h1>Mulai dari sekolah Anda.</h1><p className="onboarding-intro">Halo {name || email}. Lengkapi informasi awal agar TMS dapat menyiapkan ruang kerja dan hak akses administrator.</p><form onSubmit={submit}><label>Nama organisasi / yayasan<input value={tenantName} onChange={e=>setTenantName(e.target.value)} placeholder="Contoh: Yayasan Pendidikan Nusantara" minLength={2} maxLength={140} required/></label><label>Nama satuan pendidikan<input value={schoolName} onChange={e=>setSchoolName(e.target.value)} placeholder="Contoh: SD Nusantara" minLength={2} maxLength={180} required/></label><label>Jenjang pendidikan<select value={level} onChange={e=>setLevel(e.target.value)}><option value="PAUD">PAUD / TK</option><option value="SD">Sekolah Dasar</option><option value="SMP">Sekolah Menengah Pertama</option><option value="SMA">Sekolah Menengah Atas</option><option value="SMK">Sekolah Menengah Kejuruan</option><option value="SLB">Sekolah Luar Biasa</option><option value="MA">Madrasah Aliyah</option><option value="KESETARAAN">Pendidikan Kesetaraan</option></select></label><label>NPSN <span className="optional-label">Opsional · 8 digit</span><input value={npsn} onChange={e=>setNpsn(e.target.value.replace(/\D/g,"").slice(0,8))} inputMode="numeric" placeholder="00000000" maxLength={8}/></label>{error && <div className="auth-error" role="alert">{error}</div>}<button className="auth-submit" disabled={busy}>{busy ? "Menyiapkan..." : "Buat workspace sekolah"}</button></form><div className="auth-privacy"><ShieldCheck size={14}/> Anda menjadi administrator awal organisasi. Peran tambahan dapat diundang setelah workspace aktif.</div></div></main>;
}
