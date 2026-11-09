"use client";

import { useCallback, useEffect, useState } from "react";
import {
  clearTeacherItems, createTeacherBackup, openTeacherBackup, readTeacherItems,
  unlockTeacherVault, writeTeacherItem, type VaultWorkItem
} from "@/lib/teacher-vault";

type Identity = { teacherId: string; name: string; school: string } | null;
const DB_NAME = "tms-teacher-desk";
const TYPES = [
  ["lesson_plan", "Rencana pembelajaran"], ["teaching_journal", "Jurnal mengajar"],
  ["learning_material", "Materi pembelajaran"], ["assessment_draft", "Draf asesmen"],
  ["reflection", "Refleksi pembelajaran"], ["personal_note", "Catatan pribadi"]
];

export default function TeacherDesk({ identity }: { identity: Identity }) {
  const [items, setItems] = useState<VaultWorkItem[]>([]);
  const [localTeacherId] = useState<string | null>(() => identity?.teacherId ?? (typeof window !== "undefined" ? window.sessionStorage.getItem("tms-teacher-id") : null));
  const dbName = localTeacherId ? `${DB_NAME}:${localTeacherId}` : null;
  const [title, setTitle] = useState("");
  const [itemType, setItemType] = useState("lesson_plan");
  const [body, setBody] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [online, setOnline] = useState(() => typeof navigator !== "undefined" && navigator.onLine);
  const [busy, setBusy] = useState(false);
  const [vaultKey, setVaultKey] = useState<CryptoKey | null>(null);
  const [vaultSalt, setVaultSalt] = useState<string | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [message, setMessage] = useState("Data offline akan dienkripsi sebelum disimpan pada perangkat.");

  const refresh = useCallback(async () => {
    if (!dbName || !vaultKey) { setItems([]); return; }
    setItems(await readTeacherItems(dbName, vaultKey));
  }, [dbName, vaultKey]);

  useEffect(() => {
    if (identity?.teacherId) sessionStorage.setItem("tms-teacher-id", identity.teacherId);
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/teacher-sw.js").catch(() => undefined);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, [identity?.teacherId]);

  async function unlock() {
    if (!dbName) { setMessage("Login online sekali sebagai guru untuk membuka ruang kerja pribadi."); return; }
    setBusy(true);
    try {
      const vault = await unlockTeacherVault(dbName, passphrase);
      setVaultKey(vault.key); setVaultSalt(vault.salt);
      setMessage("Vault berhasil dibuka. Dokumen lokal dienkripsi dengan AES-256-GCM.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Vault gagal dibuka."); }
    finally { setBusy(false); }
  }

  function lock() {
    setVaultKey(null); setVaultSalt(null); setItems([]);
    setMessage("Vault dikunci. Data terenkripsi tetap tersimpan pada perangkat.");
  }

  async function save() {
    if (!dbName || !vaultKey) { setMessage("Buka vault terlebih dahulu untuk menyimpan dokumen."); return; }
    if (!title.trim()) { setMessage("Isi judul dokumen terlebih dahulu."); return; }
    const item: VaultWorkItem = {
      id: editingId ?? crypto.randomUUID(), itemType, title: title.trim(), content: { body },
      schemaVersion: 1, clientUpdatedAt: new Date().toISOString(), syncState: "local"
    };
    await writeTeacherItem(dbName, vaultKey, item); await refresh();
    setTitle(""); setBody(""); setEditingId(null);
    setMessage("Tersimpan terenkripsi di perangkat. Anda dapat melanjutkan tanpa internet.");
  }

  async function sync() {
    if (!dbName || !vaultKey) { setMessage("Buka vault terlebih dahulu."); return; }
    setBusy(true);
    try {
      const pending = (await readTeacherItems(dbName, vaultKey)).filter(x => x.syncState !== "synced");
      if (!pending.length) { setMessage("Semua dokumen lokal sudah tersinkron."); return; }
      const response = await fetch("/api/teacher-workspace", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ items: pending.map(item => ({
          id: item.id, itemType: item.itemType, title: item.title, content: item.content,
          schemaVersion: item.schemaVersion, clientUpdatedAt: item.clientUpdatedAt
        })) })
      });
      if (!response.ok) throw new Error(response.status === 401 ? "Sesi login berakhir. Login kembali untuk sinkronisasi." : "Sinkronisasi gagal. Data lokal tetap aman.");
      const result = await response.json();
      const accepted = new Set<string>((result.items ?? []).map((x: {id:string}) => x.id));
      for (const item of pending) await writeTeacherItem(dbName, vaultKey, { ...item, syncState: accepted.has(item.id) ? "synced" : "conflict" });
      await refresh();
      setMessage(`${result.accepted} dari ${result.received} dokumen diterima server. Konflik ditandai untuk pemeriksaan.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Tidak dapat terhubung ke server."); }
    finally { setBusy(false); }
  }

  async function pull() {
    if (!dbName || !vaultKey) { setMessage("Buka vault terlebih dahulu."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/teacher-workspace", { cache: "no-store" });
      if (!response.ok) throw new Error(response.status === 401 ? "Sesi login berakhir. Login kembali untuk mengambil data." : "Data TMS belum dapat diambil.");
      const result = await response.json();
      const current = await readTeacherItems(dbName, vaultKey);
      const byId = new Map(current.map(item => [item.id, item]));
      let added = 0, conflicts = 0;
      for (const remote of (result.items ?? [])) {
        const serverItem: VaultWorkItem = {
          id: remote.id, itemType: remote.item_type, title: remote.title, content: remote.content,
          schemaVersion: remote.schema_version, clientUpdatedAt: remote.client_updated_at, syncState: "synced"
        };
        const local = byId.get(serverItem.id);
        if (!local) { await writeTeacherItem(dbName, vaultKey, serverItem); added++; }
        else if (local.syncState !== "synced" && new Date(local.clientUpdatedAt).getTime() !== new Date(serverItem.clientUpdatedAt).getTime()) {
          await writeTeacherItem(dbName, vaultKey, { ...local, syncState: "conflict" }); conflicts++;
        } else if (new Date(serverItem.clientUpdatedAt).getTime() > new Date(local.clientUpdatedAt).getTime()) {
          await writeTeacherItem(dbName, vaultKey, serverItem);
        }
      }
      await refresh();
      setMessage(`Data TMS diperiksa. ${added} dokumen baru diunduh; ${conflicts} konflik lokal perlu ditinjau.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Tidak dapat mengambil data dari TMS."); }
    finally { setBusy(false); }
  }

  async function clearDeviceData() {
    if (!dbName || !vaultKey || !window.confirm("Hapus seluruh dokumen lokal pada perangkat ini? Salinan tersinkron di TMS tidak dihapus.")) return;
    await clearTeacherItems(dbName); await refresh(); setEditingId(null); setTitle(""); setBody("");
    setMessage("Dokumen lokal dihapus. Salinan server tetap tersedia.");
  }

  async function exportData() {
    if (!dbName || !vaultKey || !vaultSalt) { setMessage("Buka vault terlebih dahulu."); return; }
    const backup = await createTeacherBackup(passphrase, vaultSalt, identity ?? { teacherId: localTeacherId }, await readTeacherItems(dbName, vaultKey));
    const blob = new Blob([backup], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `tms-teacher-desk-encrypted-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url);
    setMessage("Cadangan terenkripsi berhasil diekspor. Frasa sandi diperlukan untuk membukanya di perangkat lain.");
  }

  async function importData(file?: File) {
    if (!file || !dbName || !vaultKey || !localTeacherId) return;
    try {
      const backup = await openTeacherBackup(await file.text(), passphrase);
      if (!backup.teacher?.teacherId || backup.teacher.teacherId !== localTeacherId) throw new Error("Identitas guru pada paket tidak cocok.");
      if (!Array.isArray(backup.items) || backup.items.length > 500) throw new Error("Struktur paket tidak valid atau jumlah data melebihi batas.");
      for (const item of backup.items) {
        if (typeof item.id !== "string" || typeof item.title !== "string" || !TYPES.some(([type]) => type === item.itemType) || typeof item.content?.body !== "string") {
          throw new Error("Ada dokumen dengan struktur tidak valid.");
        }
        await writeTeacherItem(dbName, vaultKey, { ...item, syncState: "local" });
      }
      await refresh(); setMessage(`${backup.items.length} dokumen dipulihkan sebagai draf lokal terenkripsi.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Impor gagal."); }
  }

  return <main style={{minHeight:"100vh",background:"#f4f6fb",color:"#17233d",fontFamily:"Arial,sans-serif",padding:28,maxWidth:1100,margin:"auto"}}>
    <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,flexWrap:"wrap"}}>
      <div><small style={{letterSpacing:2,color:"#6254d9",fontWeight:700}}>TMS • PERSONAL WORKSPACE</small><h1 style={{fontSize:30,margin:"8px 0"}}>Ruang Kerja Guru</h1><p style={{color:"#65708a",margin:0}}>{identity ? `${identity.name} · ${identity.school}` : "Mode offline · ruang pribadi perangkat"}</p></div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <button onClick={exportData} disabled={!vaultKey}>Ekspor cadangan</button>
        <button onClick={()=>void pull()} disabled={!online||busy||!vaultKey}>Ambil dari TMS</button>
        <button onClick={()=>void clearDeviceData()} disabled={!vaultKey}>Bersihkan perangkat</button>
        <label style={{border:"1px solid #d9ddec",borderRadius:8,padding:"10px 14px",background:"white",cursor:"pointer",opacity:vaultKey?1:.5}}>Impor cadangan<input type="file" accept=".json,application/json" hidden disabled={!vaultKey} onChange={e=>void importData(e.target.files?.[0])}/></label>
        <button onClick={()=>void sync()} disabled={!online||busy||!vaultKey}>{busy?"Memproses…":"Sinkronkan"}</button>
      </div>
    </header>
    <section style={{background:"white",borderRadius:14,padding:20,marginTop:24,border:"1px solid #e6eaf2"}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><b>Keamanan perangkat</b><span>{online?"● Online":"● Offline"}</span></div>
      <p style={{color:"#65708a",fontSize:13}}>{message}</p>
      {!vaultKey ? <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
        <input type="password" value={passphrase} onChange={e=>setPassphrase(e.target.value)} placeholder="Frasa sandi vault (minimal 10 karakter)" autoComplete="new-password" style={{padding:11,minWidth:260,flex:1}}/>
        <button onClick={()=>void unlock()} disabled={busy||passphrase.length<10}>{busy?"Membuka…":"Buka / buat vault"}</button>
      </div> : <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}><b>Vault terbuka · AES-256-GCM</b><button onClick={lock}>Kunci vault</button></div>}
      <p style={{fontSize:12,color:"#9a5a19",background:"#fff7e9",padding:12,borderRadius:8}}>Frasa sandi tidak disimpan oleh aplikasi. Jika hilang, data lokal dan cadangan terenkripsi tidak dapat dipulihkan. Gunakan frasa sandi kuat dan simpan dengan aman. Hindari memasukkan data sensitif siswa pada perangkat bersama.</p>
    </section>
    <section style={{display:"grid",gridTemplateColumns:"minmax(280px,.9fr) minmax(320px,1.1fr)",gap:18,marginTop:18}}>
      <div style={{background:"white",borderRadius:14,padding:20,border:"1px solid #e6eaf2"}}>
        <h2 style={{marginTop:0}}>Buat dokumen kerja</h2>
        <label style={{display:"block",fontSize:13,marginBottom:6}}>Jenis dokumen</label><select value={itemType} onChange={e=>setItemType(e.target.value)} style={{width:"100%",padding:11,marginBottom:12}}>{TYPES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
        <label style={{display:"block",fontSize:13,marginBottom:6}}>Judul</label><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Contoh: Rencana pembelajaran Matematika" style={{width:"100%",padding:11,marginBottom:12}}/>
        <label style={{display:"block",fontSize:13,marginBottom:6}}>Isi / catatan</label><textarea value={body} onChange={e=>setBody(e.target.value)} rows={9} placeholder="Tuliskan ide, langkah pembelajaran, refleksi, atau materi…" style={{width:"100%",padding:11,resize:"vertical"}}/>
        <button onClick={()=>void save()} disabled={!vaultKey} style={{marginTop:12,background:"#6254d9",color:"white",border:0,borderRadius:8,padding:"12px 18px",cursor:"pointer"}}>{editingId?"Perbarui dokumen":"Simpan terenkripsi"}</button>
        {editingId&&<button onClick={()=>{setEditingId(null);setTitle("");setBody("");}} style={{marginLeft:8,marginTop:12,padding:"12px 18px"}}>Batal edit</button>}
      </div>
      <div style={{background:"white",borderRadius:14,padding:20,border:"1px solid #e6eaf2"}}>
        <h2 style={{marginTop:0}}>Dokumen saya ({items.length})</h2>
        {!vaultKey?<p style={{color:"#7b8499"}}>Buka vault untuk melihat dokumen pribadi.</p>:items.length===0?<p style={{color:"#7b8499"}}>Belum ada dokumen. Mulai buat pekerjaan pribadi Anda.</p>:<div style={{display:"grid",gap:10}}>{items.map(item=><article key={item.id} style={{border:"1px solid #edf0f5",borderRadius:10,padding:13}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:8}}><b>{item.title}</b><small>{item.syncState==="synced"?"Tersinkron":item.syncState==="conflict"?"Perlu pemeriksaan":"Lokal"}</small></div>
          <button onClick={()=>{setEditingId(item.id);setTitle(item.title);setItemType(item.itemType);setBody(item.content.body);}} style={{marginTop:6}}>Edit</button>
          <small style={{color:"#7b8499"}}>{TYPES.find(([v])=>v===item.itemType)?.[1]??item.itemType} · {new Date(item.clientUpdatedAt).toLocaleString("id-ID")}</small>
          <p style={{whiteSpace:"pre-wrap",fontSize:13,color:"#46516a"}}>{item.content.body}</p>
        </article>)}</div>}
      </div>
    </section>
    <footer style={{marginTop:24,color:"#8790a3",fontSize:12}}>Teacher Desk terhubung ke database TMS yang sama saat online. Data induk sekolah tetap dikelola melalui alur resmi TMS.</footer>
  </main>;
}
