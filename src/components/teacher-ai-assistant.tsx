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
  const [aiSources, setAiSources] = useState<Array<{id:string;citation:string;title:string;category:string;source:{title:string;publisher:string;url:string;published:string;verifiedAt:string;status:string}}>>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [knowledgeQuery, setKnowledgeQuery] = useState("");
  const [knowledgeAnswer, setKnowledgeAnswer] = useState("");
  const [knowledgeSources, setKnowledgeSources] = useState<Array<{id:string;title:string;category:string;summary:string;source:{title:string;publisher:string;url:string;published:string;verifiedAt:string;status:string}}>>([]);
  const [knowledgeBusy, setKnowledgeBusy] = useState(false);
  const [knowledgeError, setKnowledgeError] = useState("");

  async function submit() {
    setBusy(true); setError(""); setAnswer(""); setAiSources([]);
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
      setAiSources(Array.isArray(result.knowledgeSources) ? result.knowledgeSources : []);
    } catch (e) { setError(e instanceof Error ? e.message : "Tidak dapat menghubungi asisten AI."); }
    finally { setBusy(false); }
  }

  async function searchLocalKnowledge() {
    setKnowledgeBusy(true); setKnowledgeError(""); setKnowledgeAnswer(""); setKnowledgeSources([]);
    try {
      const response = await fetch("/api/teacher-knowledge", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: knowledgeQuery })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Pencarian pengetahuan gagal.");
      setKnowledgeAnswer(result.answer || "");
      setKnowledgeSources(result.results || []);
    } catch (e) { setKnowledgeError(e instanceof Error ? e.message : "Tidak dapat mencari basis pengetahuan lokal."); }
    finally { setKnowledgeBusy(false); }
  }

  return <main style={{maxWidth:980,margin:"auto",padding:24,color:"#17233d",fontFamily:"Arial,sans-serif"}}>
    <Link href="/teacher" style={{color:"#6254d9",textDecoration:"none"}}>← Kembali ke Ruang Kerja Guru</Link>
    <header style={{margin:"20px 0"}}><small style={{color:"#6254d9",fontWeight:700,letterSpacing:1.5}}>TMS • TEACHING ASSISTANT</small>
      <h1 style={{fontSize:30,margin:"8px 0"}}>Asisten AI Guru</h1>
      <p style={{color:"#65708a"}}>Agen spesialis menyusun saran, reviewer independen memeriksa, dan guru tetap memutuskan hasil akhir.</p>
    </header>
    <section style={{margin:"18px 0",background:"#f7f8fc",border:"1px solid #dfe4ef",borderRadius:14,padding:20}}>
      <small style={{color:"#6254d9",fontWeight:700,letterSpacing:1}}>TMS • PENGETAHUAN LOKAL</small>
      <h2 style={{fontSize:22,margin:"8px 0"}}>Perpustakaan Pengetahuan Guru</h2>
      <p style={{color:"#65708a",lineHeight:1.6,marginTop:0}}>Cari materi pendidikan yang sudah tertanam di aplikasi. Pencarian ini berjalan di server TMS tanpa AI Gateway, tanpa API berbayar, dan tanpa mengirim pertanyaan ke penyedia AI eksternal.</p>
      <form onSubmit={e=>{e.preventDefault();void searchLocalKnowledge();}} style={{display:"grid",gap:10}}>
        <textarea value={knowledgeQuery} onChange={e=>setKnowledgeQuery(e.target.value)} rows={2} maxLength={500} placeholder="Contoh: bagaimana merancang asesmen formatif dalam pembelajaran mendalam?" style={{padding:12,border:"1px solid #ccd4e2",borderRadius:8,resize:"vertical"}} />
        <button type="submit" disabled={knowledgeBusy || knowledgeQuery.trim().length<3} style={{padding:12,border:0,borderRadius:9,background:"#243b6b",color:"white",fontWeight:700,cursor:knowledgeBusy?"wait":"pointer"}}>{knowledgeBusy?"Mencari materi lokal…":"Cari pengetahuan lokal"}</button>
      </form>
      {knowledgeError && <p role="alert" style={{color:"#a33232"}}>{knowledgeError}</p>}
      {knowledgeAnswer && <div style={{marginTop:16,background:"white",border:"1px solid #e3e8f1",borderRadius:10,padding:16}}>
        <h3 style={{marginTop:0}}>Ringkasan hasil pencarian</h3>
        <pre style={{whiteSpace:"pre-wrap",fontFamily:"inherit",lineHeight:1.65,overflowWrap:"anywhere"}}>{knowledgeAnswer}</pre>
        <h3>Sumber rujukan</h3>
        <div style={{display:"grid",gap:12}}>
          {knowledgeSources.map(source=><div key={source.id} style={{borderTop:"1px solid #edf0f5",paddingTop:10}}>
            <b>{source.title}</b><div style={{fontSize:13,color:"#65708a",margin:"4px 0"}}>{source.category} · {source.source.publisher} · {source.source.published}</div>
            <a href={source.source.url} target="_blank" rel="noreferrer" style={{color:"#5144bb",fontSize:13}}>Buka sumber asli ↗</a>
          </div>)}
        </div>
        <p style={{fontSize:12,color:"#8a5a20",background:"#fff8eb",padding:10,borderRadius:8}}>Materi lokal adalah ringkasan berindeks, bukan pengganti dokumen resmi. Periksa sumber asli dan tanggal berlakunya sebelum menjadikannya dasar keputusan sekolah.</p>
      </div>}
    </section>
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
      <h3>Rujukan pengetahuan lokal TMS</h3>
      {aiSources.length ? <div style={{display:"grid",gap:10}}>{aiSources.map(source=><div key={source.id} style={{borderTop:"1px solid #edf0f5",paddingTop:10}}><b>[{source.citation}] {source.title}</b><div style={{fontSize:13,color:"#65708a",margin:"4px 0"}}>{source.category} · {source.source.publisher} · {source.source.published}</div><a href={source.source.url} target="_blank" rel="noreferrer" style={{color:"#5144bb",fontSize:13}}>Periksa dokumen sumber ↗</a></div>)}</div> : <p style={{fontSize:13,color:"#8a5a20"}}>Tidak ada materi lokal yang cukup relevan untuk permintaan ini. Periksa sumber resmi secara mandiri.</p>}
      <p style={{fontSize:12,color:"#8a5a20",background:"#fff8eb",padding:12,borderRadius:8}}>Hasil telah diperiksa oleh agen spesialis dan reviewer independen. Tinjau kembali dengan kondisi nyata; AI tidak mengisi atau mengirim dokumen secara otomatis. Jangan masukkan identitas pribadi peserta didik.</p>
      <button onClick={()=>void navigator.clipboard.writeText(answer)} style={{padding:"9px 13px",border:"1px solid #ccd4e2",borderRadius:8,background:"white"}}>Salin hasil</button>
    </section>}
    <p style={{fontSize:12,color:"#7c879c",marginTop:18}}>Asisten memerlukan persetujuan model dan anggaran dari administrator. Setiap permintaan melibatkan dua agen; audit log hanya menyimpan metadata, bukan isi dokumen.</p>
  </main>;
}
