"use client";

import { useState } from "react";
import Link from "next/link";

const docs = [
  ["lesson_plan", "Modul Ajar / RPP"], ["teaching_journal", "Jurnal Mengajar"],
  ["learning_material", "Bahan Ajar"], ["assessment_draft", "Instrumen & Analisis Asesmen"],
  ["reflection", "Refleksi Pembelajaran"], ["personal_note", "Catatan Profesional"]
] as const;
const actions = [
  ["draft", "Buat draf"], ["suggest", "Saran per field"], ["review", "Tinjau dokumen"],
  ["improve", "Perbaiki isi"], ["innovation", "Ide inovasi"]
] as const;

export default function TeacherAiAssistant() {
  const [documentType, setDocumentType] = useState<(typeof docs)[number][0]>("lesson_plan");
  const [action, setAction] = useState<(typeof actions)[number][0]>("draft");
  const [field, setField] = useState("");
  const [instruction, setInstruction] = useState("");
  const [context, setContext] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true); setError(""); setAnswer("");
    try {
      const parsed: Record<string,string> = {};
      for (const line of context.split("\n")) {
        const index = line.indexOf(":");
        if (index > 0) parsed[line.slice(0,index).trim().slice(0,120)] = line.slice(index+1).trim().slice(0,3000);
      }
      const response = await fetch("/api/teacher-ai", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ documentType, action, field, instruction, context: parsed })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Permintaan tidak berhasil.");
      setAnswer(result.answer);
    } catch (e) { setError(e instanceof Error ? e.message : "Tidak dapat menghubungi asisten AI."); }
    finally { setBusy(false); }
  }

  return <main style={{maxWidth:980,margin:"auto",padding:24,color:"#17233d",fontFamily:"Arial,sans-serif"}}>
    <Link href="/teacher" style={{color:"#6254d9",textDecoration:"none"}}>← Kembali ke Ruang Kerja Guru</Link>
    <header style={{margin:"20px 0"}}><small style={{color:"#6254d9",fontWeight:700,letterSpacing:1.5}}>TMS • TEACHING ASSISTANT</small>
      <h1 style={{fontSize:30,margin:"8px 0"}}>Asisten AI Guru</h1>
      <p style={{color:"#65708a"}}>Pendamping khusus untuk menyusun, meninjau, menyempurnakan, dan mengembangkan praktik pembelajaran.</p>
    </header>
    <section style={{background:"white",border:"1px solid #e3e8f1",borderRadius:14,padding:20,display:"grid",gap:14}}>
      <label style={{display:"grid",gap:6,fontWeight:600}}>Dokumen yang dibantu
        <select value={documentType} onChange={e=>setDocumentType(e.target.value as typeof documentType)} style={{padding:12,border:"1px solid #ccd4e2",borderRadius:8}}>
          {docs.map(([value,label])=><option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label style={{display:"grid",gap:6,fontWeight:600}}>Peran asisten
        <select value={action} onChange={e=>setAction(e.target.value as typeof action)} style={{padding:12,border:"1px solid #ccd4e2",borderRadius:8}}>
          {actions.map(([value,label])=><option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label style={{display:"grid",gap:6,fontWeight:600}}>Field tertentu (opsional)
        <input value={field} onChange={e=>setField(e.target.value)} placeholder="Contoh: tujuan pembelajaran, pemahaman bermakna, asesmen" style={{padding:12,border:"1px solid #ccd4e2",borderRadius:8}}/>
      </label>
      <label style={{display:"grid",gap:6,fontWeight:600}}>Konteks atau isi dokumen
        <textarea value={context} onChange={e=>setContext(e.target.value)} rows={7} placeholder={"Satu informasi per baris dengan format Field: isi\nContoh:\nMata pelajaran: Bahasa Indonesia\nKelas: 1\nTopik: Mengenal huruf vokal\nTujuan: Murid mengenali bunyi huruf vokal"} style={{padding:12,border:"1px solid #ccd4e2",borderRadius:8,resize:"vertical"}}/>
      </label>
      <label style={{display:"grid",gap:6,fontWeight:600}}>Arahan tambahan
        <textarea value={instruction} onChange={e=>setInstruction(e.target.value)} rows={3} placeholder="Jelaskan kebutuhan atau kendala pembelajaran..." style={{padding:12,border:"1px solid #ccd4e2",borderRadius:8,resize:"vertical"}}/>
      </label>
      <button onClick={()=>void submit()} disabled={busy} style={{padding:13,border:0,borderRadius:9,background:"#6254d9",color:"white",fontWeight:700,cursor:busy?"wait":"pointer"}}>{busy?"Sedang menyiapkan bantuan…":"Minta bantuan AI"}</button>
      {error && <p role="alert" style={{color:"#a33232",background:"#fff1f1",padding:12,borderRadius:8}}>{error}</p>}
    </section>
    {answer && <section style={{marginTop:18,background:"white",border:"1px solid #e3e8f1",borderRadius:14,padding:20}}>
      <h2 style={{marginTop:0}}>Hasil bantuan AI</h2><pre style={{whiteSpace:"pre-wrap",fontFamily:"inherit",lineHeight:1.65,overflowWrap:"anywhere"}}>{answer}</pre>
      <p style={{fontSize:12,color:"#8a5a20",background:"#fff8eb",padding:12,borderRadius:8}}>Tinjau, koreksi, dan sesuaikan hasil dengan kondisi nyata. AI tidak mengisi atau mengirim dokumen secara otomatis. Jangan masukkan identitas pribadi peserta didik.</p>
      <button onClick={()=>void navigator.clipboard.writeText(answer)} style={{padding:"9px 13px",border:"1px solid #ccd4e2",borderRadius:8,background:"white"}}>Salin hasil</button>
    </section>}
    <p style={{fontSize:12,color:"#7c879c",marginTop:18}}>Asisten ini aktif setelah administrator mengonfigurasi AI Gateway dan model server. Semua permintaan tercatat pada audit log sekolah; isi dokumen tidak disimpan oleh fitur asisten ini.</p>
  </main>;
}
