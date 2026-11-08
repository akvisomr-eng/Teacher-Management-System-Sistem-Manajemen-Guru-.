"use client";

import { useCallback, useEffect, useState } from "react";

type WorkItem = { id: string; itemType: string; title: string; content: { body: string }; schemaVersion: number; clientUpdatedAt: string; syncState: "local" | "synced" | "conflict" };
type Identity = { teacherId: string; name: string; school: string } | null;
const DB_NAME = "tms-teacher-desk";
const STORE = "work-items";
const TYPES = [
  ["lesson_plan", "Rencana pembelajaran"], ["teaching_journal", "Jurnal mengajar"],
  ["learning_material", "Materi pembelajaran"], ["assessment_draft", "Draf asesmen"],
  ["reflection", "Refleksi pembelajaran"], ["personal_note", "Catatan pribadi"]
];

function openDb(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function localItems(name: string): Promise<WorkItem[]> {
  const db = await openDb(name);
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE).objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result as WorkItem[]);
    request.onerror = () => reject(request.error);
  });
}
async function putLocal(name: string, item: WorkItem) {
  const db = await openDb(name);
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export default function TeacherDesk({ identity }: { identity: Identity }) {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [localTeacherId, setLocalTeacherId] = useState<string | null>(identity?.teacherId ?? null);
  const dbName = localTeacherId ? `${DB_NAME}:${localTeacherId}` : null;
  const [title, setTitle] = useState("");
  const [itemType, setItemType] = useState("lesson_plan");
  const [body, setBody] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [online, setOnline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Data kerja tersimpan di perangkat ini sampai Anda memilih sinkronisasi.");

  const refresh = useCallback(async () => { if (!dbName) { setItems([]); return; } setItems(await localItems(dbName)); }, [dbName]);
  useEffect(() => {
    const rememberedTeacher = identity?.teacherId || sessionStorage.getItem("tms-teacher-id");
    if (identity?.teacherId) sessionStorage.setItem("tms-teacher-id", identity.teacherId);
    void Promise.resolve().then(() => setLocalTeacherId(rememberedTeacher));
    if (dbName) { let active = true; void localItems(dbName).then(next => { if (active) setItems(next); }); }
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/teacher-sw.js").catch(() => undefined);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, [dbName, identity?.teacherId]);

  async function save() {
    if (!dbName) { setMessage("Login online sekali sebagai guru untuk membuka penyimpanan pribadi pada perangkat ini."); return; }
    if (!title.trim()) { setMessage("Isi judul dokumen terlebih dahulu."); return; }
    const item: WorkItem = { id: editingId ?? crypto.randomUUID(), itemType, title: title.trim(), content: { body }, schemaVersion: 1, clientUpdatedAt: new Date().toISOString(), syncState: "local" };
    await putLocal(dbName, item); await refresh(); setTitle(""); setBody(""); setEditingId(null); setMessage("Tersimpan di perangkat. Anda dapat melanjutkan tanpa internet.");
  }

  async function sync() {
    setBusy(true);
    try {
      if (!dbName) { setMessage("Login sebagai guru untuk menghubungkan penyimpanan pribadi."); return; }
      const pending = (await localItems(dbName)).filter(x => x.syncState !== "synced");
      if (!pending.length) { setMessage("Semua dokumen lokal sudah tersinkron."); return; }
      const response = await fetch("/api/teacher-workspace", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items: pending.map(item => ({ id: item.id, itemType: item.itemType, title: item.title, content: item.content, schemaVersion: item.schemaVersion, clientUpdatedAt: item.clientUpdatedAt })) }) });
      if (!response.ok) throw new Error(response.status === 401 ? "Sesi login berakhir. Login kembali untuk sinkronisasi." : "Sinkronisasi gagal. Data lokal tetap aman.");
      const result = await response.json();
      const accepted = new Set<string>((result.items ?? []).map((x: {id:string}) => x.id));
      for (const item of pending) await putLocal(dbName, { ...item, syncState: accepted.has(item.id) ? "synced" : "conflict" });
      await refresh();
      setMessage(`${result.accepted} dari ${result.received} dokumen diterima server. Konflik ditandai untuk pemeriksaan, bukan ditimpa diam-diam.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Tidak dapat terhubung ke server."); }
    finally { setBusy(false); }
  }

  async function pull() {
    if (!dbName) { setMessage("Login sebagai guru untuk mengambil dokumen dari TMS."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/teacher-workspace", { cache: "no-store" });
      if (!response.ok) throw new Error(response.status === 401 ? "Sesi login berakhir. Login kembali untuk mengambil data." : "Data TMS belum dapat diambil.");
      const result = await response.json();
      const current = await localItems(dbName);
      const byId = new Map(current.map(item => [item.id, item]));
      let added = 0, conflicts = 0;
      for (const remote of (result.items ?? [])) {
        const serverItem: WorkItem = { id: remote.id, itemType: remote.item_type, title: remote.title, content: remote.content, schemaVersion: remote.schema_version, clientUpdatedAt: remote.client_updated_at, syncState: "synced" };
        const local = byId.get(serverItem.id);
        if (!local) { await putLocal(dbName, serverItem); added++; }
        else if (local.syncState !== "synced" && new Date(local.clientUpdatedAt).getTime() !== new Date(serverItem.clientUpdatedAt).getTime()) {
          await putLocal(dbName, { ...local, syncState: "conflict" }); conflicts++;
        } else if (new Date(serverItem.clientUpdatedAt).getTime() > new Date(local.clientUpdatedAt).getTime()) {
          await putLocal(dbName, serverItem);
        }
      }
      await refresh();
      setMessage(`Data TMS diperiksa. ${added} dokumen baru diunduh; ${conflicts} konflik lokal perlu ditinjau.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Tidak dapat mengambil data dari TMS."); }
    finally { setBusy(false); }
  }

  async function exportData() {
    if (!dbName) { setMessage("Login sebagai guru untuk mengekspor penyimpanan pribadi."); return; }
    const data = { format: "tms-teacher-desk", version: 1, exportedAt: new Date().toISOString(), teacher: identity ?? { teacherId: localTeacherId }, items: await localItems(dbName) };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `tms-teacher-desk-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url);
    setMessage("Paket kerja berhasil diekspor. Simpan file ini di media pribadi yang aman.");
  }

  async function importData(file?: File) {
    if (!file) return;
    if (!dbName || !localTeacherId) { setMessage("Login online sekali sebagai guru sebelum mengimpor paket ke ruang pribadi."); return; }
    try {
      const parsed = JSON.parse(await file.text());
      if (parsed.format !== "tms-teacher-desk" || parsed.version !== 1 || !Array.isArray(parsed.items) || parsed.items.length > 500) throw new Error("Format paket tidak dikenali atau jumlah data melebihi batas.");
      if (parsed.teacher?.teacherId && parsed.teacher.teacherId !== localTeacherId) throw new Error("Paket ini berasal dari akun guru lain. Impor lintas akun tidak diizinkan.");
      for (const item of parsed.items) {
        if (typeof item.id !== "string" || typeof item.title !== "string" || typeof item.itemType !== "string" || !item.content || typeof item.content !== "object") throw new Error("Ada dokumen dengan struktur tidak valid.");
        await putLocal(dbName, { ...item, syncState: "local" });
      }
      await refresh(); setMessage(`${parsed.items.length} dokumen diimpor sebagai draf lokal. Periksa isinya sebelum sinkronisasi.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Impor gagal."); }
  }

  return <main style={{minHeight:"100vh",background:"#f4f6fb",color:"#17233d",fontFamily:"Arial,sans-serif",padding:"28px",maxWidth:1100,margin:"auto"}}>
    <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,flexWrap:"wrap"}}>
      <div><small style={{letterSpacing:2,color:"#6254d9",fontWeight:700}}>TMS • PERSONAL WORKSPACE</small><h1 style={{fontSize:30,margin:"8px 0"}}>Ruang Kerja Guru</h1><p style={{color:"#65708a",margin:0}}>{identity ? `${identity.name} · ${identity.school}` : "Mode offline · data lokal perangkat"}</p></div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button onClick={exportData}>Ekspor / Flashdisk</button><button onClick={()=>void pull()} disabled={!online||busy}>Ambil dari TMS</button><label style={{border:"1px solid #d9ddec",borderRadius:8,padding:"10px 14px",background:"white",cursor:"pointer"}}>Impor paket<input type="file" accept=".json,application/json" hidden onChange={e=>void importData(e.target.files?.[0])}/></label><button onClick={()=>void sync()} disabled={!online||busy}>{busy?"Menyinkronkan…":"Sinkronkan"}</button></div>
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
        <button onClick={()=>void save()} style={{marginTop:12,background:"#6254d9",color:"white",border:0,borderRadius:8,padding:"12px 18px",cursor:"pointer"}}>{editingId?"Perbarui dokumen":"Simpan di perangkat"}</button>{editingId&&<button onClick={()=>{setEditingId(null);setTitle("");setBody("");}} style={{marginLeft:8,marginTop:12,padding:"12px 18px"}}>Batal edit</button>}
      </div>
      <div style={{background:"white",borderRadius:14,padding:20,border:"1px solid #e6eaf2"}}>
        <h2 style={{marginTop:0}}>Dokumen saya ({items.length})</h2>
        {items.length===0?<p style={{color:"#7b8499"}}>Belum ada dokumen. Mulai buat pekerjaan pribadi Anda.</p>:<div style={{display:"grid",gap:10}}>{items.map(item=><article key={item.id} style={{border:"1px solid #edf0f5",borderRadius:10,padding:13}}><div style={{display:"flex",justifyContent:"space-between",gap:8}}><b>{item.title}</b><small>{item.syncState==="synced"?"Tersinkron":item.syncState==="conflict"?"Perlu pemeriksaan":"Lokal"}</small></div><button onClick={()=>{setEditingId(item.id);setTitle(item.title);setItemType(item.itemType);setBody(item.content.body);}} style={{marginTop:6}}>Edit</button><small style={{color:"#7b8499"}}>{TYPES.find(([v])=>v===item.itemType)?.[1]??item.itemType} · {new Date(item.clientUpdatedAt).toLocaleString("id-ID")}</small><p style={{whiteSpace:"pre-wrap",fontSize:13,color:"#46516a"}}>{item.content.body}</p></article>)}</div>}
      </div>
    </section>
    <footer style={{marginTop:24,color:"#8790a3",fontSize:12}}>Teacher Desk terhubung ke database TMS yang sama saat online. Data induk sekolah tetap dikelola melalui alur resmi TMS.</footer>
  </main>;
}
