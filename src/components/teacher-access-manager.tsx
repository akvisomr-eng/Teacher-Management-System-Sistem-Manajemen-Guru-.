"use client";

import { useCallback, useEffect, useState } from "react";

type Teacher = { id: string; full_name: string; employee_number: string | null; account_email: string | null; account_linked: boolean };

export default function TeacherAccessManager() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teacherId, setTeacherId] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("Memuat daftar guru…");
  const [busy, setBusy] = useState(false);
  const selectedTeacher = teachers.find(teacher => teacher.id === teacherId);
  useEffect(() => { setEmail(selectedTeacher?.account_email ?? ""); }, [teacherId, selectedTeacher?.account_email]);

  const load = useCallback(async (showReadyMessage = true) => {
    try {
      const response = await fetch("/api/teacher-access", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Tidak dapat memuat daftar guru.");
      setTeachers(data.teachers ?? []);
      if (showReadyMessage) setMessage("Tetapkan email pribadi guru sebelum menghubungkan akunnya.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal memuat daftar guru.");
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function saveEmail() {
    if (!teacherId || !email.trim()) { setMessage("Pilih guru dan isi email akun guru."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/teacher-access", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ teacherId, email: email.trim() }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Email akun gagal disimpan.");
      setMessage("Email akun guru tersimpan. Guru harus mendaftar menggunakan email yang sama.");
      await load(false);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Email akun gagal disimpan."); }
    finally { setBusy(false); }
  }

  async function linkAccount() {
    if (!teacherId || !email.trim()) { setMessage("Pilih guru dan isi email akun guru."); return; }
    if (selectedTeacher?.account_email?.toLowerCase() !== email.trim().toLowerCase()) { setMessage("Simpan email akun terlebih dahulu, lalu tautkan setelah guru selesai mendaftar."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/teacher-access", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ teacherId, email: email.trim() })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Tautan akun gagal.");
      setMessage("Akun " + data.data.account_email + " berhasil ditautkan. Guru dapat masuk melalui halaman Login Guru.");
      setEmail("");
      await load(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Tautan akun gagal.");
    } finally { setBusy(false); }
  }

  return <main style={{maxWidth:980,margin:"0 auto",padding:32,color:"#17233d",fontFamily:"Arial,sans-serif"}}>
    <small style={{letterSpacing:2,color:"#6254d9",fontWeight:700}}>TMS • PENGELOLAAN AKUN</small>
    <h1>Penautan Akun Guru</h1>
    <p style={{color:"#65708a"}}>Setiap guru harus memiliki akun pribadi. Satu akun tidak boleh dipakai bersama atau memiliki peran pengelola sekolah pada sekolah yang sama.</p>
    <section style={{background:"white",border:"1px solid #e6eaf2",borderRadius:14,padding:22,marginTop:20}}>
      <h2 style={{marginTop:0}}>Hubungkan akun ke data induk guru</h2>
      <p style={{fontSize:13,color:"#65708a"}}>Tetapkan email yang akan dipakai guru, lalu minta guru mendaftar melalui <a href="/teacher/sign-in">halaman Login Guru</a>. Setelah akun terdaftar dan email diverifikasi, operator dapat menautkannya.</p>
      <label style={{display:"block",fontSize:13,marginBottom:6}}>Data guru</label>
      <select value={teacherId} onChange={e=>setTeacherId(e.target.value)} style={{width:"100%",padding:12,marginBottom:14}}>
        <option value="">Pilih guru…</option>
        {teachers.map(t=><option key={t.id} value={t.id}>{t.full_name + (t.employee_number ? " · " + t.employee_number : "") + (t.account_linked ? " · akun sudah tertaut" : "")}</option>)}
      </select>
      <label style={{display:"block",fontSize:13,marginBottom:6}}>Email akun pribadi guru</label>
      <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="nama@sekolah.sch.id" style={{width:"100%",padding:12,marginBottom:14}}/>
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}><button disabled={busy} onClick={()=>void saveEmail()} style={{background:"#eef0ff",color:"#4d43b8",border:0,borderRadius:9,padding:"12px 18px",cursor:"pointer"}}>{busy?"Memproses…":"Simpan email guru"}</button><button disabled={busy} onClick={()=>void linkAccount()} style={{background:"#6254d9",color:"white",border:0,borderRadius:9,padding:"12px 18px",cursor:"pointer"}}>{busy?"Memproses…":"Tautkan akun terdaftar"}</button></div>
      <p role="status" style={{fontSize:13,color:"#58647d",marginTop:14}}>{message}</p>
    </section>
    <section style={{background:"white",border:"1px solid #e6eaf2",borderRadius:14,padding:22,marginTop:18}}>
      <h2 style={{marginTop:0}}>Status akun guru</h2>
      <div style={{display:"grid",gap:8}}>{teachers.map(t=><div key={t.id} style={{display:"flex",justifyContent:"space-between",gap:12,borderBottom:"1px solid #edf0f5",padding:"10px 0"}}><span>{t.full_name}<small style={{display:"block",color:"#8b94a7"}}>{t.employee_number??"Tanpa NIP/NUPTK"} · {t.account_email ?? "Email belum ditetapkan"}</small></span><b style={{fontSize:12,color:t.account_linked?"#21845e":"#a36b25"}}>{t.account_linked?"Akun tertaut":"Belum tertaut"}</b></div>)}</div>
    </section>
  </main>;
}
