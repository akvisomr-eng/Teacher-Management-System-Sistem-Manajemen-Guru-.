"use client";

import { useState } from "react";
import {
  Activity, BookOpenCheck, CalendarDays, ChevronDown, GraduationCap,
  LayoutDashboard, Menu, MessageSquareText, Search, Settings2, ShieldCheck,
  Users, X, ClipboardCheck, Sparkles, TrendingUp, Bell, CircleHelp
} from "lucide-react";

const nav = [
  { label: "Ringkasan", icon: LayoutDashboard, active: true },
  { label: "Data Guru", icon: Users },
  { label: "Data Siswa", icon: GraduationCap },
  { label: "Kurikulum", icon: BookOpenCheck },
  { label: "Perencanaan Ajar", icon: CalendarDays },
  { label: "Jurnal Mengajar", icon: ClipboardCheck },
  { label: "Asesmen & Rapor", icon: Activity },
  { label: "Komunikasi", icon: MessageSquareText }
];

const metrics = [
  { label: "Total Guru", value: "128", detail: "+4 bulan ini", icon: Users, tone: "violet" },
  { label: "Peserta Didik", value: "1.842", detail: "Aktif tahun ajaran ini", icon: GraduationCap, tone: "blue" },
  { label: "Kelas Aktif", value: "42", detail: "Seluruh jenjang", icon: BookOpenCheck, tone: "mint" },
  { label: "Kelengkapan Jurnal", value: "86%", detail: "+8% dari bulan lalu", icon: ClipboardCheck, tone: "amber" }
];

const activities = [
  { title: "Jurnal mengajar diperbarui", person: "Dina Puspitasari, S.Pd.", time: "10 menit lalu", tag: "Pembelajaran" },
  { title: "Modul ajar menunggu tinjauan", person: "Agus Setiawan, M.Pd.", time: "35 menit lalu", tag: "Kurikulum" },
  { title: "Asesmen formatif diselesaikan", person: "Rina Kartika, S.Pd.", time: "1 jam lalu", tag: "Asesmen" }
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("Ringkasan");
  return (
    <main className="shell">
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="brand"><div className="brand-mark"><GraduationCap size={22}/></div><div><b>ruang<span>guru</span></b><small>MANAGEMENT SYSTEM</small></div><button className="close-menu" onClick={() => setMenuOpen(false)} aria-label="Tutup menu"><X size={18}/></button></div>
        <div className="school-switch"><div className="school-avatar">SN</div><div className="school-name"><b>Sekolah Nusantara</b><small>Workspace sekolah</small></div><ChevronDown size={16}/></div>
        <div className="nav-caption">MENU UTAMA</div>
        <nav>{nav.map(item => <button key={item.label} className={`nav-item ${activeNav === item.label ? "selected" : ""}`} onClick={() => {setActiveNav(item.label);setMenuOpen(false);}}><item.icon size={18}/><span>{item.label}</span>{item.label === "Asesmen & Rapor" && <i>3</i>}</button>)}</nav>
        <div className="sidebar-bottom"><div className="nav-caption">PREFERENSI</div><button className="nav-item" onClick={() => setActiveNav("Pengaturan")}><Settings2 size={18}/><span>Pengaturan</span></button><div className="help-card"><div className="help-icon"><CircleHelp size={18}/></div><b>Butuh bantuan?</b><p>Pusat panduan penggunaan TMS.</p><button onClick={() => setActiveNav("Pusat Bantuan")}>Buka pusat bantuan <span>→</span></button></div><div className="profile"><div className="profile-avatar">AM</div><div><b>Admin Sekolah</b><small>Administrator</small></div><ChevronDown size={16}/></div></div>
      </aside>
      {menuOpen && <button className="scrim" aria-label="Tutup navigasi" onClick={() => setMenuOpen(false)}/>}
      <section className="main-area">
        <header className="topbar"><div className="top-left"><button className="menu-toggle" onClick={() => setMenuOpen(true)} aria-label="Buka menu"><Menu size={20}/></button><div className="crumb">Workspace <span>/</span> <b>{activeNav}</b></div></div><div className="top-actions"><div className="searchbox"><Search size={16}/><input aria-label="Cari" placeholder="Cari data, menu, atau bantuan..."/><kbd>⌘ K</kbd></div><button className="icon-button notification" aria-label="Notifikasi"><Bell size={19}/><i/></button><div className="top-avatar">AM</div></div></header>
        <div className="content">
          <div className="welcome-row"><div><div className="eyebrow">SABTU, 7 NOVEMBER 2026</div><h1>Selamat datang, Admin! <span>✦</span></h1><p>Berikut ringkasan aktivitas akademik sekolah Anda hari ini.</p></div><button className="period-button"><CalendarDays size={16}/> Tahun Ajaran 2026/2027 <ChevronDown size={15}/></button></div>
          <div className="notice"><div className="notice-icon"><ShieldCheck size={19}/></div><div><b>Workspace sekolah Anda</b><p>Data ditampilkan dalam lingkup Sekolah Nusantara. Hak akses dan isolasi data diterapkan berdasarkan peran.</p></div><button aria-label="Tutup informasi" onClick={(e) => e.currentTarget.parentElement?.remove()}><X size={17}/></button></div>
          <div className="section-heading"><div><h2>Ringkasan sekolah</h2><p>Pantau indikator utama kegiatan akademik.</p></div><button className="text-action">Lihat laporan <span>→</span></button></div>
          <div className="metric-grid">{metrics.map(m => <article className="metric-card" key={m.label}><div className="metric-top"><span>{m.label}</span><div className={`metric-icon ${m.tone}`}><m.icon size={19}/></div></div><strong>{m.value}</strong><small>{m.detail}</small></article>)}</div>
          <div className="dashboard-grid"><section className="panel"><div className="panel-head"><div><h3>Aktivitas terbaru</h3><p>Pembaruan dari seluruh unit sekolah</p></div><button className="dots">•••</button></div><div className="activity-list">{activities.map((a,i)=><div className="activity" key={a.title}><div className={`activity-dot dot-${i}`}/><div className="activity-copy"><b>{a.title}</b><span>{a.person}</span></div><div className="activity-meta"><small>{a.time}</small><em>{a.tag}</em></div></div>)}</div><button className="panel-link">Lihat semua aktivitas <span>→</span></button></section>
          <section className="panel ai-panel"><div className="ai-orb"><Sparkles size={23}/></div><div className="ai-label">TMS INTELLIGENCE</div><h3>Asisten Guru AI</h3><p>Bantu guru merancang pembelajaran, menyusun asesmen, dan menyiapkan materi dengan lebih efisien.</p><button className="ai-button" onClick={() => setActiveNav("Asisten Guru AI")}>Jelajahi asisten AI <span>→</span></button><div className="ai-foot"><span><span className="live-dot"/> Dirancang dengan kontrol guru</span><span>Beta</span></div></section></div>
          <div className="bottom-grid"><section className="panel progress-panel"><div className="panel-head"><div><h3>Target administrasi pembelajaran</h3><p>Periode November 2026</p></div><TrendingUp size={18} className="trend"/></div><div className="progress-line"><div><span>Jurnal mengajar terkumpul</span><b>86%</b></div><div className="track"><i style={{width:"86%"}}/></div></div><div className="progress-line"><div><span>Modul ajar tervalidasi</span><b>72%</b></div><div className="track"><i style={{width:"72%"}}/></div></div></section><section className="quote-card"><div className="quote-mark">“</div><p>Pendidikan yang baik bukan hanya tentang apa yang diajarkan, tetapi juga tentang bagaimana setiap anak diberi ruang untuk bertumbuh.</p><small>RUANGGURU · TMS</small></section></div>
          <footer>© 2026 TMS · Sistem Manajemen Guru <span>Privasi &nbsp;·&nbsp; Pusat Bantuan &nbsp;·&nbsp; Versi 0.1.0</span></footer>
        </div>
      </section>
    </main>
  );
}
