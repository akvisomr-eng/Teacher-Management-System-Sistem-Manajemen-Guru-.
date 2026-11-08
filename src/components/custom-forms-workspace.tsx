"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {ArrowLeft,Plus,Save,Trash2,FilePlus2,ShieldCheck} from "lucide-react";

type Field={id:string;key:string;label:string;type:"text"|"textarea"|"number"|"date"|"email"|"phone"|"select"|"checkbox";required:boolean;options:string[]};
type Form={id:string;name:string;description:string|null;module_key:string;form_version:number;status:string;fields:Field[]};
const modules=[["students","Data Siswa"],["teachers","Data Guru"],["classes","Kelas"],["admissions","PPDB / SPMB"],["academics","Akademik"],["general","Umum"]];
const newField=():Field=>({id:crypto.randomUUID(),key:"field_"+Math.random().toString(36).slice(2,8),label:"Kolom baru",type:"text",required:false,options:[]});
export function CustomFormsWorkspace(){
 const [forms,setForms]=useState<Form[]>([]),[name,setName]=useState(""),[description,setDescription]=useState(""),[moduleKey,setModuleKey]=useState("students"),[fields,setFields]=useState<Field[]>([newField()]),[editing,setEditing]=useState<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
 async function load(){const r=await fetch("/api/forms",{cache:"no-store"});const d=await r.json();if(!r.ok)throw new Error(d.error||"Gagal memuat formulir");setForms(d.data||[]);}
 useEffect(()=>{void load().catch(e=>setError(e.message));},[]);
 function reset(){setName("");setDescription("");setModuleKey("students");setFields([newField()]);setEditing(null);}
 function edit(f:Form){setEditing(f.id);setName(f.name);setDescription(f.description||"");setModuleKey(f.module_key);setFields(f.fields||[]);setMessage("");}
 function changeField(id:string,patch:Partial<Field>){setFields(current=>current.map(f=>f.id===id?{...f,...patch}:f));}
 async function save(status:"draft"|"published"){
  setBusy(true);setError("");setMessage("");
  try{
   const payload={name,description,moduleKey,fields,status};
   const r=await fetch("/api/forms",{method:editing?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(editing?{...payload,id:editing}:payload)});
   const d=await r.json();if(!r.ok)throw new Error(d.error||"Formulir gagal disimpan");
   setMessage(status==="published"?"Formulir berhasil diterbitkan.":"Draft formulir berhasil disimpan.");await load();if(!editing)reset();
  }catch(e){setError(e instanceof Error?e.message:"Gagal menyimpan");}finally{setBusy(false);}
 }
 async function archive(f:Form){const r=await fetch("/api/forms",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:f.id,name:f.name,description:f.description||"",moduleKey:f.module_key,fields:f.fields,status:"archived"})});const d=await r.json();if(!r.ok){setError(d.error||"Gagal mengarsipkan");return;}await load();}
 return <main className="registry-shell forms-shell">
  <header className="registry-header"><Link href="/" className="registry-back"><ArrowLeft size={16}/> Dashboard</Link><div className="registry-heading"><div className="registry-symbol"><FilePlus2 size={22}/></div><div><span>ADMINISTRASI SEKOLAH</span><h1>Pembuat Formulir</h1><p>Buat formulir tambahan sesuai kebutuhan sekolah tanpa mengubah kode aplikasi.</p></div></div></header>
  <div className="forms-layout"><section className="registry-panel"><div className="registry-panel-head"><div><h2>{editing?"Ubah formulir":"Buat formulir baru"}</h2><p>Hanya admin, kepala sekolah, wakil kepala sekolah, dan operator berwenang.</p></div><ShieldCheck size={20}/></div>
   <div className="forms-meta"><label>Nama formulir<input value={name} onChange={e=>setName(e.target.value)} placeholder="Contoh: Pendataan minat dan bakat siswa"/></label><label>Menu / konteks<select value={moduleKey} onChange={e=>setModuleKey(e.target.value)}>{modules.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label className="forms-wide">Deskripsi<textarea value={description} onChange={e=>setDescription(e.target.value)} rows={2} placeholder="Tujuan dan petunjuk pengisian"/></label></div>
   <div className="forms-field-head"><h3>Kolom formulir</h3><button className="registry-add" onClick={()=>setFields(v=>[...v,newField()])}><Plus size={14}/> Tambah kolom</button></div>
   {fields.map((f,i)=><div className="forms-field" key={f.id}><div className="forms-field-title"><b>Kolom {i+1}</b><button onClick={()=>setFields(v=>v.filter(x=>x.id!==f.id))} aria-label="Hapus kolom"><Trash2 size={15}/></button></div><div className="forms-field-grid"><label>Label<input value={f.label} onChange={e=>changeField(f.id,{label:e.target.value})}/></label><label>Kunci data<input value={f.key} onChange={e=>changeField(f.id,{key:e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,"_")})}/></label><label>Jenis kolom<select value={f.type} onChange={e=>changeField(f.id,{type:e.target.value as Field["type"]})}>{["text","textarea","number","date","email","phone","select","checkbox"].map(t=><option key={t}>{t}</option>)}</select></label><label className="forms-required"><input type="checkbox" checked={f.required} onChange={e=>changeField(f.id,{required:e.target.checked})}/> Wajib diisi</label></div>{f.type==="select"&&<label className="forms-options">Pilihan (pisahkan dengan koma)<input value={f.options.join(", ")} onChange={e=>changeField(f.id,{options:e.target.value.split(",").map(v=>v.trim()).filter(Boolean)})}/></label>}</div>)}
   {error&&<p className="registry-error">{error}</p>}{message&&<p className="registry-notice">{message}</p>}
   <div className="forms-actions"><button className="registry-toggle" onClick={reset}>Formulir baru</button><button className="registry-add" disabled={busy||name.trim().length<3||!fields.length} onClick={()=>void save("draft")}><Save size={15}/> Simpan draft</button><button className="registry-add" disabled={busy||name.trim().length<3||!fields.length} onClick={()=>void save("published")}>Terbitkan</button></div>
  </section>
  <section className="registry-panel"><div className="registry-panel-head"><div><h2>Formulir tersimpan</h2><p>Versi, konteks, dan status publikasi.</p></div></div><div className="forms-list">{forms.length?forms.map(f=><article key={f.id}><div><b>{f.name}</b><small>{modules.find(x=>x[0]===f.module_key)?.[1]||f.module_key} · v{f.form_version} · {f.fields.length} kolom</small></div><span className={`registry-status ${f.status==="published"?"is-active":""}`}>{f.status}</span><div className="forms-item-actions"><button className="registry-toggle" onClick={()=>edit(f)}>Ubah</button>{f.status==="published"&&<Link className="registry-toggle" href={`/workspace/forms/${f.id}`}>Isi formulir</Link>}{f.status!=="archived"&&<button className="registry-toggle" onClick={()=>void archive(f)}>Arsipkan</button>}</div></article>):<p className="registry-empty">Belum ada formulir kustom.</p>}</div></section></div>
 </main>;
}
