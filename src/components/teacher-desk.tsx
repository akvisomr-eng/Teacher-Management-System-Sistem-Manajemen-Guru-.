"use client";

import { useCallback, useEffect, useState } from "react";

type WorkItem = { id: string; itemType: string; title: string; content: { body: string }; schemaVersion: number; clientUpdatedAt: string; syncState: "local" | "synced" | "conflict" };
type Identity = { teacherId: string; name: string; school: string };
const DB_NAME = "tms-teacher-desk";
const STORE = "work-items";
const TYPES = [
  ["lesson_plan", "Rencana pembelajaran"], ["teaching_journal", "Jurnal mengajar"],
  ["learning_material", "Materi pembelajaran"], ["assessment_draft", "Draf asesmen"],
  ["reflection", "Refleksi pembelajaran"], ["personal_note", "Catatan pribadi"]
];

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function localItems(): Promise<WorkItem[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE).objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result as WorkItem[]);
    request.onerror = () => reject(request.error);
  });
}
async function putLocal(item: WorkItem) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export default function TeacherDesk({ identity }: { identity: Identity }) {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [title, setTitle] = useState("");
  const [itemType, setItemType] = useState("lesson_plan");
  const [body, setBody] = useState("");
  const [online, setOnline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Data kerja tersimpan di perangkat ini sampai Anda memilih sinkronisasi.");

  const refresh = useCallback(async () => setItems(await localItems()), []);
  useEffect(() => {
    void refresh();
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/teacher-sw.js").catch(() => undefined);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, [refresh]);

  async function save() {
    if (!title.trim()) { setMessage("Isi judul dokumen terlebih dahulu."); return; }
    const item: WorkItem = { id: crypto.randomUUID(), itemType, title: title.trim(), content: { body }, schemaVersion: 1, clientUpdatedAt: new Date().toISOString(), syncState: "local" };
    await putLocal(item); await refresh(); setTitle(""); setBody(""); setMessage("Tersimpan di perangkat. Anda dapat melanjutkan tanpa internet.");
  }

  async function sync() {
    setBusy(true);
    try {
      const pending = (await localItems()).filter(x => x.syncState !== "synced");
      if (!pending.length) { setMessage("Semua dokumen lokal sudah tersinkron."); return; }
      const response = await fetch("/api/teacher-workspace", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items: pending.map(({ syncState, ...item }) => item) }) });
      if (!response.ok) throw new Error(response.status === 401 ? "Sesi login berakhir. Login kembali untuk sinkronisasi." : "Sinkronisasi gagal. Data lokal tetap aman.");
      const result = await response.json();
      const accepted = new Set<string>((result.items ?? []).map((x: {id:string}) => x.id));
      for (const item of pending) await putLocal({ ...item, syncState: accepted.has(item.id) ? "synced" : "conflict" });
      await refresh();
      setMessage(`${result.accepted} dari ${result.received} dokumen diterima server. Konflik ditandai untuk pemeriksaan, bukan ditimpa diam-diam.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Tidak dapat terhubung ke server."); }
    finally { setBusy(false); }
  }

  async function exportData() {
    const data = { format: "tms-teacher-desk", version: 1, exportedAt: new Date().toISOString(), teacher: identity, items: await localItems() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `tms-teacher-desk-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url);
    setMessage("Paket kerja berhasil diekspor. Simpan file ini di media pribadi yang aman.");
  }

  async function importData(file?: File) {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (parsed.format !== "tms-teacher-desk" || parsed.version !== 1 || !Array.isArray(parsed.items) || parsed.items.length > 500) throw new Error("Format paket tidak dikenali atau jumlah data melebihi batas.");
      for (const item of parsed.items) {
        if (typeof item.id !== "string" || typeof item.title !== "string" || typeof item.itemType !== "string" || !item.content || typeof item.content !== "object") throw new Error("Ada dokumen dengan struktur tidak valid.");
        await putLocal({ ...item, syncState: "local" });
      }
      await refresh(); setMessage(`${parsed.items.length} dokumen diimpor sebagai draf lokal. Periksa isinya sebelum sinkronisasi.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Impor gagal."); }
  }

  return <main style={{minHeight:"100vh",background:"#f4f6fb",color:"#17233d",fontFamily:"Arial,sans-serif",padding:"28px",maxWidth:1100,margin:"auto"}}>
    <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,flexWrap:"wrap"}}>
      <div><small style={{letterSpacing:2,color:"#6254d9",fontWeight:700}}>TMS • PERSONAL WORKSPACE</small><h1 style={{fontSize:30,margin:"8px 0"}}>Ruang Kerja Guru</h1><p style={{color:"#65708a",margin:0}}>{identity.name} · {identity.school}</p></div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button onClick={exportData}>Ekspor / Flashdisk</button><label style={{border:"1px solid #d9ddec",borderRadius:8,padding:"10px 14px",background:"white",cursor:"pointer"}}>Impor paket<input type="file" accept=".json,application/json" hidden onChange={e=>void importData(e.target.files?.[0])}/></label><button onClick={()=>void sync()} disabled={!online||busy}>{busy?"Menyinkronkan…":"Sinkronkan"}</button></div>
    </header>
    <section style={{background:"white",borderRadius:14,padding:20,marginTop:24,border:"1px solid #e6eaf2"}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><b>Status perangkat</b><span>{online?"● Online":"● Offline"}</span></div><p style={{color:"#65708a",fontSize:13}}>{message}</p>
      <p style={{fontSize:12,color:"#9a5a19",background:"#fff7e9",padding:12,borderRadius:8}}>Catatan keamanan: dokumen kerja tersimpan di profil browser/perangkat ini. Jangan gunakan komputer umum untuk menyimpan data pribadi atau data siswa. Jangan masukkan NIK, alamat, nilai individu, atau data sensitif siswa ke ruang kerja offline ini.</p>
    </section>
    <section style={{display:"grid",gridTemplateColumns:"minmax(280px, .9fr) minmax(320px,1.1fr)",gap:18,marginTop:18}}>
      <div style={{background:"white",borderRadius:14,padding:20,border:"1px solid #e6eaf2"}}>
        <h2 style={{marginTop:0}}>Buat dokumen kerja</h2>
        <label style={{display:"block",fontSize:13,marginBottom:6}}>Jenis dokumen</label><select value={itemType} onChange={e=>setItemType(e.target.value)} style={{width:"100%",padding:11,marginBottom:12}}>{TYPES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
        <label style={{display:"block",fontSize:13,marginBottom:6}}>Judul</label><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Contoh: Rencana pembelajaran Matematika" style={{width:"100%",padding:11,marginBottom:12}}/>
        <label style={{display:"block",fontSize:13,marginBottom:6}}>Isi / catatan</label><textarea value={body} onChange={e=>setBody(e.target.value)} rows={9} placeholder="Tuliskan ide, langkah pembelajaran, refleksi, atau materi…" style={{width:"100%",padding:11,resize:"vertical"}}/>
        <button onClick={()=>void save()} style={{marginTop:12,background:"#6254d9",color:"white",border:0,borderRadius:8,padding:"12px 18px",cursor:"pointer"}}>Simpan di perangkat</button>
      </div>
      <div style={{background:"white",borderRadius:14,padding:20,border:"1px solid #e6eaf2"}}>
        <h2 style={{marginTop:0}}>Dokumen saya ({items.length})</h2>
        {items.length===0?<p style={{color:"#7b8499"}}>Belum ada dokumen. Mulai buat pekerjaan pribadi Anda.</p>:<div style={{display:"grid",gap:10}}>{items.map(item=><article key={item.id} style={{border:"1px solid #edf0f5",borderRadius:10,padding:13}}><div style={{display:"flex",justifyContent:"space-between",gap:8}}><b>{item.title}</b><small>{item.syncState==="synced"?"Tersinkron":item.syncState==="conflict"?"Perlu pemeriksaan":"Lokal"}</small></div><small style={{color:"#7b8499"}}>{TYPES.find(([v])=>v===item.itemType)?.[1]??item.itemType} · {new Date(item.clientUpdatedAt).toLocaleString("id-ID")}</small><p style={{whiteSpace:"pre-wrap",fontSize:13,color:"#46516a"}}>{item.content.body}</p></article>)}</div>}
      </div>
    </section>
    <footer style={{marginTop:24,color:"#8790a3",fontSize:12}}>Teacher Desk terhubung ke database TMS yang sama. Data induk sekolah tetap dikelola melalui alur resmi TMS.</footer>
  </main>;
}
