"use client";

import { useState } from "react";

const sources = [
  { name: "Kurikulum Nasional", publisher: "Kemendikdasmen", domain: "kurikulum.kemendikdasmen.go.id", url: "https://kurikulum.kemendikdasmen.go.id/", detail: "Kurikulum, CP, panduan mata pelajaran, pembelajaran mendalam", access: "Portal resmi gratis" },
  { name: "Repositori Kemendikdasmen", publisher: "Kemendikdasmen", domain: "repositori.kemendikdasmen.go.id", url: "https://repositori.kemendikdasmen.go.id/", detail: "Panduan, buku, naskah kebijakan, dan publikasi pendidikan", access: "Akses publik; cek lisensi tiap dokumen" },
  { name: "Rumah Pendidikan", publisher: "Kemendikdasmen", domain: "rumah.pendidikan.go.id", url: "https://rumah.pendidikan.go.id/", detail: "Ekosistem layanan dan sumber belajar pendidikan", access: "Portal resmi gratis" },
  { name: "Badan Standar, Kurikulum, dan Asesmen Pendidikan", publisher: "BSKAP", domain: "kemendikdasmen.go.id", url: "https://www.kemendikdasmen.go.id/", detail: "Kebijakan, standar, asesmen, dan informasi resmi", access: "Portal resmi gratis" },
  { name: "UNESCO Education", publisher: "UNESCO", domain: "unesco.org", url: "https://www.unesco.org/en/education", detail: "Riset, kebijakan pendidikan, literasi digital dan AI", access: "Banyak materi akses terbuka" },
  { name: "CAST UDL Guidelines", publisher: "CAST", domain: "udlguidelines.cast.org", url: "https://udlguidelines.cast.org/", detail: "Panduan Universal Design for Learning dan pembelajaran inklusif", access: "Panduan publik gratis" },
  { name: "ERIC Education Research", publisher: "Institute of Education Sciences", domain: "eric.ed.gov", url: "https://eric.ed.gov/", detail: "Basis data riset dan publikasi pendidikan", access: "Pencarian gratis; akses dokumen bervariasi" }
];

export default function TeacherOnlineLibrary() {
  const [query, setQuery] = useState("");
  const [sourceIndex, setSourceIndex] = useState("0");
  const [notice, setNotice] = useState("");

  function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanQuery = query.trim().slice(0, 300);
    if (cleanQuery.length < 3) {
      setNotice("Masukkan kata kunci minimal 3 karakter.");
      return;
    }
    const source = sources[Number(sourceIndex)] ?? sources[0];
    const url = `https://duckduckgo.com/?q=${encodeURIComponent(`site:${source.domain} ${cleanQuery}`)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setNotice(`Pencarian dibuka di DuckDuckGo dengan pembatasan situs ${source.domain}. Pertanyaan dikirim langsung ke mesin pencari, bukan disimpan di TMS.`);
  }

  return <section style={{margin:"18px 0",background:"#f7fbff",border:"1px solid #cfe0f2",borderRadius:14,padding:20}}>
    <small style={{color:"#1c6594",fontWeight:700,letterSpacing:1}}>TMS • SUMBER PENGETAHUAN ONLINE</small>
    <h2 style={{fontSize:22,margin:"8px 0"}}>Perpustakaan Online Gratis</h2>
    <p style={{color:"#52647a",lineHeight:1.6,marginTop:0}}>Akses sumber pendidikan dari portal resmi Indonesia dan lembaga pendidikan tepercaya. Tidak perlu akun TMS tambahan, API key, atau langganan mesin pencari. TMS membuka pencarian pada situs pilihan; hasil dan ketersediaan dokumen mengikuti kebijakan situs asal.</p>
    <form onSubmit={search} style={{display:"grid",gap:10}}>
      <label style={{display:"grid",gap:6,fontWeight:600}}>Cari pada sumber
        <select value={sourceIndex} onChange={e=>setSourceIndex(e.target.value)} style={{padding:11,border:"1px solid #c6d5e5",borderRadius:8,background:"white"}}>
          {sources.map((source,index)=><option value={String(index)} key={source.domain}>{source.name} — {source.publisher}</option>)}
        </select>
      </label>
      <label style={{display:"grid",gap:6,fontWeight:600}}>Kata kunci pencarian
        <input value={query} onChange={e=>setQuery(e.target.value)} maxLength={300} placeholder="Contoh: panduan asesmen formatif kelas 5" style={{padding:12,border:"1px solid #c6d5e5",borderRadius:8}} />
      </label>
      <button type="submit" style={{padding:12,border:0,borderRadius:9,background:"#1d5f91",color:"white",fontWeight:700,cursor:"pointer"}}>Cari di sumber online ↗</button>
      {notice && <p role="status" style={{fontSize:12,color:"#52647a",margin:0}}>{notice}</p>}
    </form>
    <div style={{display:"grid",gap:10,marginTop:18}}>
      {sources.map(source=><div key={source.domain} style={{background:"white",border:"1px solid #e0e9f2",borderRadius:9,padding:12}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
          <b>{source.name}</b><span style={{fontSize:11,color:"#25634b",fontWeight:700}}>{source.access}</span>
        </div>
        <div style={{fontSize:12,color:"#607086",margin:"5px 0"}}>{source.publisher} · {source.detail}</div>
        <a href={source.url} target="_blank" rel="noopener noreferrer" style={{color:"#1d5f91",fontSize:13}}>Buka situs resmi ↗</a>
      </div>)}
    </div>
    <p style={{fontSize:12,color:"#76521d",background:"#fff8e9",padding:11,borderRadius:8,marginBottom:0}}>Privasi dan biaya: pencarian memakai DuckDuckGo tanpa biaya langganan atau API TMS; kata kunci dikirim ke layanan pencarian eksternal. Jangan masukkan nama, NISN, nilai, catatan kesehatan, atau data pribadi murid. Sebagian dokumen dapat memiliki lisensi atau akses tersendiri—periksa ketentuan sumber sebelum mengunduh atau menggunakan ulang.</p>
  </section>;
}
