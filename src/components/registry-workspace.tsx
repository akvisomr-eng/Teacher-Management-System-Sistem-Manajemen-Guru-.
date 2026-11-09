"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Search, RefreshCw, Users, GraduationCap, Save , Printer} from "lucide-react";

type Resource = "teachers" | "students";
type Profile = {
  citizenship: string; noKitas: string; birthCertificateNumber: string; birthPlace: string; gender: string; religion: string; nik: string; familyCardNumber: string;
  address: string; rt: string; rw: string; hamlet: string; residenceType: string; latitude: string; longitude: string; province: string; city: string; district: string; village: string; postalCode: string;
  fatherName: string; fatherNik: string; fatherPhone: string; fatherEducation: string; fatherOccupation: string; fatherIncomeRange: string;
  motherName: string; motherNik: string; motherPhone: string; motherEducation: string; motherOccupation: string; motherIncomeRange: string;
  guardianName: string; guardianRelation: string; guardianPhone: string; guardianEducation: string; guardianOccupation: string; guardianIncomeRange: string; previousSchool: string;
  admissionDate: string; childOrder: string; siblingsCount: string; transportMode: string; hasKip: string; kipNumber: string; kksNumber: string; kpsNumber: string; pkhRecipient: string; pipEligible: string; specialNeeds: string; contactPhone: string; contactEmail: string;
};
type Row = { id: string; full_name: string; employee_number?: string | null; education?: string | null; account_email?: string | null; account_linked?: boolean; account_activated?: boolean; student_number?: string | null; birth_date?: string | null; profile?: Partial<Profile> | null; status: string; created_at: string };
const emptyProfile: Profile = {
  citizenship:"WNI",noKitas:"",birthCertificateNumber:"",birthPlace:"",gender:"",religion:"",nik:"",familyCardNumber:"",address:"",rt:"",rw:"",hamlet:"",residenceType:"",latitude:"",longitude:"",province:"",city:"",district:"",village:"",postalCode:"",
  fatherName:"",fatherNik:"",fatherPhone:"",fatherEducation:"",fatherOccupation:"",fatherIncomeRange:"",motherName:"",motherNik:"",motherPhone:"",motherEducation:"",motherOccupation:"",motherIncomeRange:"",guardianName:"",guardianRelation:"",guardianPhone:"",guardianEducation:"",guardianOccupation:"",guardianIncomeRange:"",
  previousSchool:"",admissionDate:"",childOrder:"",siblingsCount:"",transportMode:"",hasKip:"",kipNumber:"",kksNumber:"",kpsNumber:"",pkhRecipient:"",pipEligible:"",specialNeeds:"",contactPhone:"",contactEmail:""
};

export function RegistryWorkspace({ resource }: { resource: Resource }) {
  const isTeacher = resource === "teachers";
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [fullName, setFullName] = useState("");
  const [number, setNumber] = useState("");
  const [extra, setExtra] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/registry/${resource}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Data tidak dapat dimuat.");
      setRows(result.data ?? []);
    } catch (err) { setError(err instanceof Error ? err.message : "Gagal memuat data."); }
    finally { setLoading(false); }
  }, [resource]);

  useEffect(() => { let active=true;fetch(`/api/registry/${resource}`,{cache:"no-store"}).then(async response=>{const result=await response.json();if(!response.ok)throw new Error(result.error??"Data tidak dapat dimuat.");if(active)setRows(result.data??[]);}).catch(err=>{if(active)setError(err instanceof Error?err.message:"Gagal memuat data.");}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[resource]);
  const filtered = useMemo(() => rows.filter(row => [row.full_name,row.employee_number,row.student_number].some(value => value?.toLowerCase().includes(query.toLowerCase()))), [rows,query]);
  function setField<K extends keyof Profile>(key: K, value: Profile[K]) { setProfile(current => ({...current,[key]:value})); }

  async function createRecord(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const payload = isTeacher ? { fullName, employeeNumber:number, education:extra, accountEmail } : {
        fullName, studentNumber:number, birthDate,
        profile: {...profile, childOrder: profile.childOrder ? Number(profile.childOrder) : null, siblingsCount: profile.siblingsCount ? Number(profile.siblingsCount) : null, hasKip: profile.hasKip === "" ? undefined : profile.hasKip === "true", pkhRecipient: profile.pkhRecipient === "" ? undefined : profile.pkhRecipient === "true", pipEligible: profile.pipEligible === "" ? undefined : profile.pipEligible === "true"}
      };
      const response = await fetch(`/api/registry/${resource}`, {method:editingId?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(editingId?{...payload,id:editingId}:payload)});
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Data gagal disimpan.");
      setFullName("");setNumber("");setExtra("");setAccountEmail("");setBirthDate("");setProfile(emptyProfile);setEditingId(null);setShowForm(false);await load();
    } catch(err) { setError(err instanceof Error ? err.message : "Gagal menyimpan data."); }
    finally { setSaving(false); }
  }

  function startEdit(row: Row) {
    setEditingId(row.id);setFullName(row.full_name);setNumber(row.student_number??row.employee_number??"");setExtra(row.education??"");setAccountEmail(row.account_email??"");setBirthDate(row.birth_date?new Date(row.birth_date).toISOString().slice(0,10):"");
    const raw=(row.profile??{}) as Record<string,unknown>;
    const values=Object.fromEntries(Object.keys(emptyProfile).map(key=>[key,raw[key]===undefined?"":String(raw[key])]));
    for(const key of ["hasKip","pkhRecipient","pipEligible"])values[key]=raw[key]===true?"true":raw[key]===false?"false":"";
    setProfile({...emptyProfile,...values} as Profile);setShowForm(true);setError("");
  }

  async function toggleStatus(row: Row) {
    const status = row.status === "active" ? "inactive" : "active";
    const response = await fetch(`/api/registry/${resource}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:row.id,status})});
    const result = await response.json();
    if(!response.ok){setError(result.error ?? "Status gagal diperbarui.");return;}
    setRows(current=>current.map(item=>item.id===row.id?result.data:item));
  }

  const field = (label:string,key:keyof Profile,placeholder="",type="text") => <label key={key}>{label}<input type={type} value={profile[key]} onChange={e=>setField(key,e.target.value)} placeholder={placeholder}/></label>;
  return <main className="registry-shell">
    <header className="registry-header"><div className="registry-header-actions"><Link href="/" className="registry-back"><ArrowLeft size={16}/> Kembali ke Dashboard</Link><button type="button" className="registry-print" onClick={() => window.print()}><Printer size={15}/> Cetak halaman</button></div><div className="registry-heading"><div className="registry-symbol">{isTeacher?<Users size={22}/>:<GraduationCap size={22}/>}</div><div><span>MASTER DATA SEKOLAH</span><h1>{isTeacher?"Data Guru":"Data Siswa"}</h1><p>Kelola direktori {isTeacher?"tenaga pendidik":"peserta didik"} sesuai kebutuhan administrasi satuan pendidikan.</p></div></div></header>
    <section className="registry-stats"><div><small>Total terdaftar</small><strong>{rows.length}</strong></div><div><small>Aktif</small><strong>{rows.filter(row=>row.status==="active").length}</strong></div><div><small>Nonaktif / lainnya</small><strong>{rows.filter(row=>row.status!=="active").length}</strong></div></section>
    <section className="registry-panel"><div className="registry-panel-head"><div><h2>Direktori {isTeacher?"guru":"peserta didik"}</h2><p>Data dibatasi pada sekolah dan tenant yang Anda kelola.</p></div><div className="registry-toolbar"><button className="registry-refresh" onClick={()=>void load()} aria-label="Muat ulang"><RefreshCw size={16}/></button>{!isTeacher&&<button className="registry-add" onClick={()=>{if(!showForm)setEditingId(null);setShowForm(v=>!v)}}><Plus size={16}/> {showForm?"Tutup formulir":"Tambah siswa"}</button>}</div></div>
      <div className="registry-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari nama atau nomor identitas..."/></div>
      {error&&<div className="registry-error" role="alert">{error}</div>}
      {(isTeacher||showForm)&&<form className="registry-form student-form" onSubmit={createRecord}>{isTeacher?<div className="student-form-grid"><label>Nama lengkap<input required minLength={2} maxLength={180} value={fullName} onChange={e=>setFullName(e.target.value)}/></label><label>Nomor pegawai<input value={number} onChange={e=>setNumber(e.target.value)}/></label><label>Pendidikan terakhir<input value={extra} onChange={e=>setExtra(e.target.value)}/></label><label>Email akun guru<input type="email" maxLength={254} value={accountEmail} onChange={e=>setAccountEmail(e.target.value)} placeholder="nama@sekolah.sch.id"/><small>Profil akses disiapkan jika belum ada. Minta guru mendaftar menggunakan email ini untuk mengaktifkan Ruang Kerja Guru.</small></label></div><div className="student-form-actions"><small>{editingId?"Periksa kembali perubahan data guru sebelum disimpan.":"Lengkapi data guru, lalu simpan untuk memperbarui direktori sekolah."}</small><div className="registry-row-actions"><button type="button" className="registry-toggle" disabled={saving} onClick={()=>{setFullName("");setNumber("");setExtra("");setAccountEmail("");setEditingId(null);setShowForm(false);setError("");}}>Batal</button><button type="submit" disabled={saving||!fullName.trim()}><Save size={16}/>{saving?"Menyimpan...":editingId?"Simpan perubahan":"Simpan data guru"}</button></div></div>:<><div className="student-form-section"><h3>{editingId?"Ubah data peserta didik":"1. Identitas peserta didik"}</h3><div className="student-form-grid">
          <label>Nama lengkap sesuai dokumen<input required minLength={2} maxLength={180} value={fullName} onChange={e=>setFullName(e.target.value)}/></label>
          <label>NIS / NISN<input maxLength={50} value={number} onChange={e=>setNumber(e.target.value)} placeholder="Nomor induk sekolah / nasional"/></label>
          {field("Tempat lahir","birthPlace")}
          <label>Tanggal lahir<input type="date" value={birthDate} onChange={e=>setBirthDate(e.target.value)}/></label>
          <label>Jenis kelamin<select value={profile.gender} onChange={e=>setField("gender",e.target.value)}><option value="">Pilih</option><option value="L">Laki-laki</option><option value="P">Perempuan</option></select></label>
          <label>Agama / kepercayaan<input value={profile.religion} onChange={e=>setField("religion",e.target.value)}/></label>
          <label>Kewarganegaraan<select value={profile.citizenship} onChange={e=>setField("citizenship",e.target.value)}><option>WNI</option><option>WNA</option></select></label>
          <label>NIK peserta didik<input inputMode="numeric" maxLength={16} value={profile.nik} onChange={e=>setField("nik",e.target.value)}/></label>
          <label>Nomor KITAS (WNA)<input maxLength={30} value={profile.noKitas} onChange={e=>setField("noKitas",e.target.value)}/></label>
          <label>Nomor Kartu Keluarga<input inputMode="numeric" maxLength={16} value={profile.familyCardNumber} onChange={e=>setField("familyCardNumber",e.target.value)}/></label>
          <label>Nomor akta kelahiran<input maxLength={80} value={profile.birthCertificateNumber} onChange={e=>setField("birthCertificateNumber",e.target.value)}/></label>
        </div></div>
        <div className="student-form-section"><h3>2. Alamat dan domisili</h3><div className="student-form-grid">
          {field("Alamat / jalan","address","Nama jalan dan nomor rumah")}{field("RT","rt")}{field("RW","rw")}{field("Dusun","hamlet")}{field("Jenis tempat tinggal","residenceType")}
          {field("Lintang","latitude")}{field("Bujur","longitude")}{field("Provinsi","province")}{field("Kabupaten / kota","city")}{field("Kecamatan","district")}{field("Desa / kelurahan","village")}{field("Kode pos","postalCode")}
        </div></div>
        <div className="student-form-section"><h3>3. Data orang tua / wali</h3><div className="student-form-grid">
          {field("Nama ayah kandung","fatherName")}{field("NIK ayah","fatherNik")}{field("Nomor HP ayah","fatherPhone")}{field("Pendidikan ayah","fatherEducation")}{field("Pekerjaan ayah","fatherOccupation")}{field("Penghasilan ayah","fatherIncomeRange")}
          {field("Nama ibu kandung","motherName")}{field("NIK ibu","motherNik")}{field("Nomor HP ibu","motherPhone")}{field("Pendidikan ibu","motherEducation")}{field("Pekerjaan ibu","motherOccupation")}{field("Penghasilan ibu","motherIncomeRange")}
          {field("Nama wali (jika ada)","guardianName")}{field("Hubungan dengan siswa","guardianRelation")}{field("Nomor HP wali","guardianPhone")}{field("Pendidikan wali","guardianEducation")}{field("Pekerjaan wali","guardianOccupation")}{field("Penghasilan wali","guardianIncomeRange")}
        </div></div>
        <div className="student-form-section"><h3>4. Riwayat pendidikan dan data tambahan</h3><div className="student-form-grid">
          {field("Sekolah asal","previousSchool")}{field("Tanggal masuk sekolah","admissionDate","","date")}
          <label>Anak ke<input type="number" min="1" max="30" value={profile.childOrder} onChange={e=>setField("childOrder",e.target.value)}/></label>
          <label>Jumlah saudara kandung<input type="number" min="0" max="30" value={profile.siblingsCount} onChange={e=>setField("siblingsCount",e.target.value)}/></label>
          {field("Moda transportasi","transportMode")}{field("Nomor KIP","kipNumber")}{field("Nomor KKS","kksNumber")}{field("Nomor KPS","kpsNumber")}{field("Nomor HP kontak","contactPhone")}{field("Email kontak","contactEmail")}{field("Kebutuhan khusus","specialNeeds")}
          <label>Penerima KIP<select value={profile.hasKip} onChange={e=>setField("hasKip",e.target.value)}><option value="">Belum diisi</option><option value="true">Ya</option><option value="false">Tidak</option></select></label>
          <label>Penerima PKH<select value={profile.pkhRecipient} onChange={e=>setField("pkhRecipient",e.target.value)}><option value="">Belum diisi</option><option value="true">Ya</option><option value="false">Tidak</option></select></label>
          <label>Layak PIP<select value={profile.pipEligible} onChange={e=>setField("pipEligible",e.target.value)}><option value="">Belum diisi</option><option value="true">Ya</option><option value="false">Tidak</option></select></label>
          {isTeacher&&<><label>Nomor pegawai<input value={number} onChange={e=>setNumber(e.target.value)}/></label><label>Pendidikan terakhir<input value={extra} onChange={e=>setExtra(e.target.value)}/></label></>}
        </div></div>
        <div className="student-form-actions"><small>Kolom identitas inti dilengkapi sesuai data yang tersedia. Data opsional dapat diperbarui kemudian dan wajib diverifikasi dengan dokumen sumber.</small><button type="submit" disabled={saving}><Save size={16}/>{saving?"Menyimpan...":editingId?"Simpan perubahan":"Simpan data peserta didik"}</button></div></>}</form>}
      <div className="registry-table-wrap"><table className="registry-table"><thead><tr><th>Nama lengkap</th><th>{isTeacher?"Nomor pegawai":"NIS / NISN"}</th><th>{isTeacher?"Pendidikan":"Tanggal lahir"}</th><th>Status</th>{isTeacher&&<th>Akun Ruang Kerja</th>}<th>Aksi</th></tr></thead><tbody>{loading?<tr><td colSpan={isTeacher?6:5} className="registry-empty">Memuat data...</td></tr>:filtered.length?filtered.map(row=><tr key={row.id}><td><strong>{row.full_name}</strong><small>Terdaftar {row.created_at?new Date(row.created_at).toLocaleDateString("id-ID"):"—"}</small></td><td>{row.employee_number??row.student_number??"—"}</td><td>{isTeacher?row.education??"—":row.birth_date?new Date(row.birth_date).toLocaleDateString("id-ID"):"—"}</td><td><span className={`registry-status ${row.status==="active"?"is-active":""}`}>{row.status}</span></td>{isTeacher&&<td>{row.account_linked?<><strong>{row.account_email}</strong><small>{row.account_activated?"Akun aktif":"Menunggu guru mendaftar"}</small></>:<small>Belum ditautkan</small>}</td>}<td><div className="registry-row-actions"><button className="registry-toggle" onClick={()=>startEdit(row)}>Ubah</button><button className="registry-toggle" onClick={()=>void toggleStatus(row)}>{row.status==="active"?"Nonaktifkan":"Aktifkan"}</button></div></td></tr>):<tr><td colSpan={isTeacher?6:5} className="registry-empty">Belum ada data. Tambahkan data pertama melalui formulir di atas.</td></tr>}</tbody></table></div>
      <p className="registry-footnote">Data peserta didik mengikuti struktur referensi administrasi pendidikan nasional. Isian dan pemetaan Dapodik harus divalidasi terhadap versi referensi resmi yang berlaku sebelum sinkronisasi.</p>
    </section>
  </main>;
}
