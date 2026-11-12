"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import TeacherDocumentEditor from "@/components/teacher-document-editor";
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
  const [hasAuthenticated, setHasAuthenticated] = useState(Boolean(identity?.teacherId));
  if (identity?.teacherId && !hasAuthenticated) setHasAuthenticated(true);
  const instanceKey = identity?.teacherId ?? (hasAuthenticated ? "logged-out" : "offline");
  return <TeacherDeskContent key={instanceKey} identity={identity} allowOfflineFallback={!hasAuthenticated && !identity?.teacherId} />;
}

function TeacherDeskContent({ identity, allowOfflineFallback }: { identity: Identity; allowOfflineFallback: boolean }) {
  const [items, setItems] = useState<VaultWorkItem[]>([]);
  const effectiveTeacherId = identity?.teacherId ?? (allowOfflineFallback && typeof window !== "undefined" ? window.sessionStorage.getItem("tms-teacher-id") : null);
  const dbName = effectiveTeacherId ? `${DB_NAME}:${effectiveTeacherId}` : null;
  const [title, setTitle] = useState("");
  const [itemType, setItemType] = useState("lesson_plan");
  const [body, setBody] = useState("");
  const [subject, setSubject] = useState("");
  const [className, setClassName] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [editorInitialData, setEditorInitialData] = useState<Record<string,string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [online, setOnline] = useState(() => typeof navigator !== "undefined" && navigator.onLine);
  const [busy, setBusy] = useState(false);
  const [vaultKey, setVaultKey] = useState<CryptoKey | null>(null);
  const [vaultSalt, setVaultSalt] = useState<string | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [message, setMessage] = useState("Data offline akan dienkripsi sebelum disimpan pada perangkat.");

  const pendingCount = items.filter(item => item.syncState !== "synced").length;
  const syncedCount = items.length - pendingCount;
  const filteredItems = items.filter(item => {
    const matchesType = filterType === "all" || item.itemType === filterType;
    const query = searchQuery.trim().toLocaleLowerCase("id-ID");
    const matchesQuery = !query || [item.title, item.content.body, item.content.subject, item.content.className]
      .some(value => String(value ?? "").toLocaleLowerCase("id-ID").includes(query));
    return matchesType && matchesQuery;
  }).sort((a, b) => new Date(b.clientUpdatedAt).getTime() - new Date(a.clientUpdatedAt).getTime());

  const refresh = useCallback(async () => {
    if (!dbName || !vaultKey) { setItems([]); return; }
    setItems(await readTeacherItems(dbName, vaultKey));
  }, [dbName, vaultKey]);

  useEffect(() => {
    if (identity?.teacherId) sessionStorage.setItem("tms-teacher-id", identity.teacherId);
    else if (!allowOfflineFallback) sessionStorage.removeItem("tms-teacher-id");
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/teacher-sw.js").catch(() => undefined);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, [identity?.teacherId, allowOfflineFallback]);

  async function unlock() {
    if (!dbName) { setMessage("Login online sekali sebagai guru untuk membuka ruang kerja pribadi."); return; }
    setBusy(true);
    try {
      const vault = await unlockTeacherVault(dbName, passphrase);
      const localItems = await readTeacherItems(dbName, vault.key);
      setItems(localItems); setVaultKey(vault.key); setVaultSalt(vault.salt);
      setMessage("Vault berhasil dibuka. Dokumen lokal dienkripsi dengan AES-256-GCM.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Vault gagal dibuka."); }
    finally { setBusy(false); }
  }

  function lock() {
    setVaultKey(null); setVaultSalt(null); setItems([]);
    setMessage("Vault dikunci. Data terenkripsi tetap tersimpan pada perangkat.");
  }

  async function save(formTitle: string, formData: Record<string,string>) {
    if (!dbName || !vaultKey) { setMessage("Buka vault terlebih dahulu untuk menyimpan dokumen."); return; }
    const template = formData.__templateKey ?? itemType;
    const summary = Object.entries(formData).filter(([key,value]) => key !== "__templateKey" && value.trim())
      .map(([key,value]) => `${key}: ${value}`).join("\n");
    const item: VaultWorkItem = {
      id: editingId ?? crypto.randomUUID(), itemType, title: formTitle.trim() || formData.topic || formData.assessmentPurpose || itemType,
      content: { body: summary, subject: formData.subject ?? "", className: formData.className ?? formData.phaseGrade ?? "", dueDate: formData.targetDate ?? formData.followUpDate ?? "", formData, templateKey: template, templateVersion: 2 },
      schemaVersion: 2, clientUpdatedAt: new Date().toISOString(), syncState: "local"
    };
    await writeTeacherItem(dbName, vaultKey, item); await refresh();
    setTitle(""); setBody(""); setSubject(""); setClassName(""); setDueDate(""); setEditingId(null); setEditorInitialData({});
    setMessage("Dokumen terstruktur tersimpan terenkripsi di perangkat. Sinkronisasi menyimpan arsip kerja; pengajuan resmi sekolah tetap melalui Aktivitas pembelajaran.");
  }

  async function sync() {
    if (!dbName || !vaultKey) { setMessage("Buka vault terlebih dahulu."); return; }
    setBusy(true);
    try {
      const pending = (await readTeacherItems(dbName, vaultKey)).filter(x => x.syncState !== "synced");
      if (!pending.length) { setMessage("Semua dokumen lokal sudah tersinkron."); return; }
      const accepted = new Set<string>();
      let received = 0;
      for (let offset = 0; offset < pending.length; offset += 25) {
        const batch = pending.slice(offset, offset + 25);
        const response = await fetch("/api/teacher-workspace", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ items: batch.map(item => ({
            id: item.id, itemType: item.itemType, title: item.title, content: item.content,
            schemaVersion: item.schemaVersion, clientUpdatedAt: item.clientUpdatedAt
          })) })
        });
        if (!response.ok) throw new Error(response.status === 401 ? "Sesi login berakhir. Login kembali untuk sinkronisasi." : "Sinkronisasi gagal. Data lokal tetap aman.");
        const result = await response.json();
        received += Number(result.received ?? batch.length);
        for (const row of (result.items ?? []) as Array<{id:string}>) accepted.add(row.id);
        for (const remote of (result.conflicts ?? []) as Array<{id:string;item_type:string;title:string;content:VaultWorkItem["content"];schema_version:number;client_updated_at:string}>) {
          const local = pending.find(item => item.id === remote.id);
          if (local) await writeTeacherItem(dbName, vaultKey, { ...local, syncState: "conflict",
            serverVersion: { itemType: remote.item_type, title: remote.title, content: remote.content,
              schemaVersion: remote.schema_version, clientUpdatedAt: remote.client_updated_at } });
        }
      }
      for (const item of pending) {
        const latest = (await readTeacherItems(dbName, vaultKey)).find(row => row.id === item.id) ?? item;
        if (accepted.has(item.id)) await writeTeacherItem(dbName, vaultKey, { ...latest, syncState: "synced", serverVersion: undefined });
        else if (latest.syncState !== "conflict") await writeTeacherItem(dbName, vaultKey, { ...latest, syncState: "conflict" });
      }
      await refresh();
      setMessage(`${accepted.size} dari ${received} dokumen diterima server. Konflik ditandai untuk pemeriksaan.`);
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
          await writeTeacherItem(dbName, vaultKey, { ...local, syncState: "conflict", serverVersion: {
            itemType: serverItem.itemType, title: serverItem.title, content: serverItem.content,
            schemaVersion: serverItem.schemaVersion, clientUpdatedAt: serverItem.clientUpdatedAt
          } }); conflicts++;
        } else if (new Date(serverItem.clientUpdatedAt).getTime() > new Date(local.clientUpdatedAt).getTime()) {
          await writeTeacherItem(dbName, vaultKey, serverItem);
        }
      }
      await refresh();
      setMessage(`Data TMS diperiksa. ${added} dokumen baru diunduh; ${conflicts} konflik lokal perlu ditinjau.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Tidak dapat mengambil data dari TMS."); }
    finally { setBusy(false); }
  }

  async function resolveConflict(item: VaultWorkItem, choice: "server" | "local") {
    if (!dbName || !vaultKey || item.syncState !== "conflict" || !item.serverVersion) return;
    if (choice === "server") {
      await writeTeacherItem(dbName, vaultKey, { ...item, ...item.serverVersion, syncState: "synced", serverVersion: undefined });
      setMessage("Versi server dipilih. Versi lokal sebelumnya digantikan pada vault perangkat ini.");
    } else {
      await writeTeacherItem(dbName, vaultKey, { ...item, clientUpdatedAt: new Date(Math.max(Date.parse(item.serverVersion.clientUpdatedAt) + 1000, new Date().getTime() + 1000)).toISOString(), syncState: "local", serverVersion: undefined });
      setMessage("Versi lokal dipertahankan. Sinkronkan kembali untuk mengirim versi pilihan Anda.");
    }
    await refresh();
  }

  async function clearDeviceData() {
    if (!dbName || !vaultKey || !window.confirm("Hapus seluruh dokumen lokal pada perangkat ini? Salinan tersinkron di TMS tidak dihapus.")) return;
    await clearTeacherItems(dbName); await refresh(); setEditingId(null); setTitle(""); setBody(""); setSubject(""); setClassName(""); setDueDate("");
    setMessage("Dokumen lokal dihapus. Salinan server tetap tersedia.");
  }

  async function exportData() {
    if (!dbName || !vaultKey || !vaultSalt) { setMessage("Buka vault terlebih dahulu."); return; }
    const backup = await createTeacherBackup(passphrase, vaultSalt, identity ?? { teacherId: effectiveTeacherId ?? "" }, await readTeacherItems(dbName, vaultKey));
    const blob = new Blob([backup], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `tms-teacher-desk-encrypted-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url);
    setMessage("Cadangan terenkripsi berhasil diekspor. Frasa sandi diperlukan untuk membukanya di perangkat lain.");
  }

  async function importData(file?: File) {
    if (!file || !dbName || !vaultKey || !effectiveTeacherId) return;
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error("Ukuran paket melebihi batas 5 MB.");
      const backup = await openTeacherBackup(await file.text(), passphrase);
      if (!backup.teacher?.teacherId || backup.teacher.teacherId !== effectiveTeacherId) throw new Error("Identitas guru pada paket tidak cocok.");
      if (!Array.isArray(backup.items) || backup.items.length > 500) throw new Error("Struktur paket tidak valid atau jumlah data melebihi batas.");
      const existing = new Map((await readTeacherItems(dbName, vaultKey)).map(item => [item.id, item]));
      let restored = 0, duplicates = 0, conflicts = 0;
      for (const item of backup.items) {
        if (typeof item.id !== "string" || item.id.length > 100 || typeof item.title !== "string" || !item.title.trim() ||
            item.title.length > 200 || !TYPES.some(([type]) => type === item.itemType) ||
            typeof item.content?.body !== "string" || item.content.body.length > 100_000 ||
            !Number.isInteger(item.schemaVersion) || item.schemaVersion < 1 ||
            !Number.isFinite(Date.parse(item.clientUpdatedAt))) {
          throw new Error("Ada dokumen dengan struktur tidak valid.");
        }
        const current = existing.get(item.id);
        if (current) {
          const same = current.title === item.title && current.itemType === item.itemType &&
            current.content.body === item.content.body &&
            current.clientUpdatedAt === item.clientUpdatedAt;
          if (same) { duplicates++; continue; }
          const copy = { ...item, id: crypto.randomUUID(), title: `${item.title} (salinan impor)`, syncState: "local" as const };
          await writeTeacherItem(dbName, vaultKey, copy);
          existing.set(copy.id, copy);
          conflicts++;
        } else {
          const restoredItem = { ...item, syncState: "local" as const };
          await writeTeacherItem(dbName, vaultKey, restoredItem);
          existing.set(restoredItem.id, restoredItem);
        }
        restored++;
      }
      await refresh();
      setMessage(`${restored} dokumen dipulihkan; ${duplicates} duplikat identik dilewati; ${conflicts} ID yang berbenturan disimpan sebagai salinan agar data lama tidak tertimpa.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Impor gagal."); }
  }

  return <main style={{minHeight:"100vh",background:"#f4f6fb",color:"#17233d",fontFamily:"Arial,sans-serif",padding:28,maxWidth:1100,margin:"auto"}}>
    <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,flexWrap:"wrap"}}>
      <div><small style={{letterSpacing:2,color:"#6254d9",fontWeight:700}}>TMS • PERSONAL WORKSPACE</small><h1 style={{fontSize:30,margin:"8px 0"}}>Ruang Kerja Guru</h1><p style={{color:"#65708a",margin:0}}>{identity ? `${identity.name} · ${identity.school}` : "Mode offline · ruang pribadi perangkat"}</p></div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <Link href="/teacher/activities" style={{display:"inline-flex",alignItems:"center",padding:"9px 12px",border:"1px solid #d9ddec",borderRadius:8,background:"white",color:"#35415c",textDecoration:"none",fontSize:14}}>Aktivitas pembelajaran</Link>
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
    <section aria-label="Ringkasan pekerjaan guru" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginTop:18}}>
      {[[items.length,"Total dokumen"],[pendingCount,"Belum tersinkron"],[syncedCount,"Tersinkron"],[items.filter(item=>item.syncState==="conflict").length,"Perlu pemeriksaan"]].map(([value,label])=><article key={String(label)} style={{background:"white",border:"1px solid #e6eaf2",borderRadius:12,padding:16}}><strong style={{display:"block",fontSize:26,color:"#6254d9"}}>{value}</strong><span style={{fontSize:13,color:"#65708a"}}>{label}</span></article>)}
    </section>
    <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,320px),1fr))",gap:18,marginTop:18}}>
      <div style={{background:"white",borderRadius:14,padding:20,border:"1px solid #e6eaf2"}}>
        <TeacherDocumentEditor
          itemType={itemType}
          onTypeChange={next => { setItemType(next); setEditingId(null); setEditorInitialData({}); }}
          initialTitle={title}
          initialData={editorInitialData}
          onSave={(documentTitle, formData) => void save(documentTitle, formData)}
          disabled={!vaultKey}
          editing={Boolean(editingId)}
          onCancel={() => { setEditingId(null); setTitle(""); setEditorInitialData({}); }}
        />
      </div>
      <div style={{background:"white",borderRadius:14,padding:20,border:"1px solid #e6eaf2"}}>
        <h2 style={{marginTop:0}}>Pekerjaan saya ({filteredItems.length})</h2>
        <input aria-label="Cari pekerjaan" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Cari judul, isi, mapel, atau kelas…" style={{width:"100%",padding:11,marginBottom:8}}/>
        <select aria-label="Filter jenis pekerjaan" value={filterType} onChange={e=>setFilterType(e.target.value)} style={{width:"100%",padding:11,marginBottom:12}}><option value="all">Semua jenis pekerjaan</option>{TYPES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
        {!vaultKey?<p style={{color:"#7b8499"}}>Buka vault untuk melihat pekerjaan pribadi.</p>:items.length===0?<p style={{color:"#7b8499"}}>Belum ada pekerjaan. Mulai buat rencana, jurnal, materi, atau refleksi.</p>:filteredItems.length===0?<p style={{color:"#7b8499"}}>Tidak ada pekerjaan yang cocok dengan pencarian.</p>:<div style={{display:"grid",gap:10}}>{filteredItems.map(item=><article key={item.id} style={{border:"1px solid #edf0f5",borderRadius:10,padding:13}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:8}}><b>{item.title}</b><small>{item.syncState==="synced"?"Tersinkron":item.syncState==="conflict"?"Perlu pemeriksaan":"Lokal"}</small></div>
          <button onClick={()=>{setEditingId(item.id);setTitle(item.title);setItemType(item.itemType);setEditorInitialData((item.content.formData && typeof item.content.formData === "object" ? item.content.formData : {}) as Record<string,string>);}} style={{marginTop:6}}>Edit</button>
          {item.syncState === "conflict" && <div style={{marginTop:10,padding:12,background:"#fff7e9",borderRadius:8,border:"1px solid #f0d8ae"}}>
            <b>Konflik sinkronisasi — kedua versi dipertahankan</b>
            {item.serverVersion ? <>
              <p style={{fontSize:13,marginBottom:4}}><b>Versi perangkat:</b> {item.title}</p>
              <p style={{fontSize:13,whiteSpace:"pre-wrap",marginTop:0}}>{item.content.body}</p>
              <p style={{fontSize:13,marginBottom:4}}><b>Versi server:</b> {item.serverVersion.title}</p>
              <p style={{fontSize:13,whiteSpace:"pre-wrap",marginTop:0}}>{item.serverVersion.content.body}</p>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <button onClick={()=>void resolveConflict(item,"server")}>Gunakan versi server</button>
                <button onClick={()=>void resolveConflict(item,"local")}>Pertahankan versi perangkat</button>
              </div>
            </> : <p style={{fontSize:13}}>Versi server belum dapat dibaca dalam lingkup akun ini. Data lokal tidak dihapus; ambil data dari TMS atau hubungi operator.</p>}
          </div>}
          <small style={{display:"block",color:"#7b8499",marginTop:5}}>{TYPES.find(([v])=>v===item.itemType)?.[1]??item.itemType}{item.content.subject?` · ${item.content.subject}`:""}{item.content.className?` · ${item.content.className}`:""} · {new Date(item.clientUpdatedAt).toLocaleString("id-ID")}</small>
          {item.content.dueDate&&<small style={{display:"block",color:"#9a5a19",marginTop:4}}>Target: {new Date(`${item.content.dueDate}T00:00:00`).toLocaleDateString("id-ID")}</small>}
          <p style={{whiteSpace:"pre-wrap",fontSize:13,color:"#46516a"}}>{item.content.body}</p>
        </article>)}</div>}
      </div>
    </section>
    <footer style={{marginTop:24,color:"#8790a3",fontSize:12}}>Teacher Desk terhubung ke database TMS yang sama saat online. Data induk sekolah tetap dikelola melalui alur resmi TMS.</footer>
  </main>;
}
