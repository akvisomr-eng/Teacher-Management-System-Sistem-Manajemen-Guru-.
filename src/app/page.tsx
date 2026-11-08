"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import {
  BookOpenCheck, CalendarDays, ChevronDown, GraduationCap,
  LayoutDashboard, Menu, Search, Settings2, ShieldCheck,
  Users, X, ClipboardCheck, Sparkles, TrendingUp, Bell, CircleHelp, BarChart3
} from "lucide-react";

const nav = [
  { label: "Ringkasan", icon: LayoutDashboard, href: "/" },
  { label: "Data Guru", icon: Users, href: "/workspace/teachers" },
  { label: "Data Siswa", icon: GraduationCap, href: "/workspace/students" },
  { label: "Kelas & Mapel", icon: BookOpenCheck, href: "/workspace/academic" },
  { label: "Pusat Kurikulum", icon: BookOpenCheck, href: "/workspace/curriculum" },
  { label: "Penugasan", icon: ClipboardCheck, href: "/workspace/assignments" },
  { label: "Rencana & Jurnal", icon: BookOpenCheck, href: "/workspace/teaching" },
  { label: "Asesmen & Nilai", icon: ClipboardCheck, href: "/workspace/assessments" },
  { label: "Pusat Laporan", icon: BarChart3, href: "/workspace/reports" }
] as const;





type DashboardSummary = {
  needsOnboarding: boolean;
  user: { name: string | null; email: string };
  school: { tenantId: string; schoolId: string; role: string; schoolName: string; tenantName: string };
  counts: { teachers: number; students: number; classes: number; journals: number; teaching_plans: number };
  activities: { action: string; resource_type: string; created_at: string }[];
};

type ActivityItem = { title: string; person: string; time: string; tag: string };

export default function Home() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("Ringkasan");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loadError, setLoadError] = useState("");
  const { data: session } = authClient.useSession();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/dashboard/summary", { cache: "no-store" })
      .then(async response => {
        const data = await response.json();
        if (response.status === 401) { router.replace("/auth/sign-in"); return; }
        if (!response.ok) throw new Error(data.error || "Tidak dapat memuat data sekolah.");
        if (data.needsOnboarding) { router.replace("/onboarding"); return; }
        if (cancelled) return;
        setSummary(data);
        setActivities((data.activities ?? []).map((item: DashboardSummary["activities"][number]) => ({
          title: item.action.replaceAll(".", " "),
          person: session?.user?.name ?? session?.user?.email ?? "Pengguna sekolah",
          time: new Date(item.created_at).toLocaleString("id-ID"),
          tag: item.resource_type
        })));
      })
      .catch(error => { if (!cancelled) setLoadError(error instanceof Error ? error.message : "Gagal memuat ringkasan."); });
    return () => { cancelled = true; };
  }, [router, session?.user?.email, session?.user?.name]);

  const metrics = [
    { label: "Total Guru", value: summary ? String(summary.counts.teachers) : "—", detail: "Guru aktif di sekolah", icon: Users, tone: "violet" },
    { label: "Peserta Didik", value: summary ? summary.counts.students.toLocaleString("id-ID") : "—", detail: "Siswa aktif", icon: GraduationCap, tone: "blue" },
    { label: "Kelas Aktif", value: summary ? String(summary.counts.classes) : "—", detail: "Tahun ajaran berjalan", icon: BookOpenCheck, tone: "mint" },
    { label: "Jurnal Mengajar", value: summary ? String(summary.counts.journals) : "—", detail: "Catatan pembelajaran", icon: ClipboardCheck, tone: "amber" }
  ];
  return (
    <main className="shell">
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="brand"><div className="brand-mark"><GraduationCap size={22}/></div><div><b>TMS<span>+</span></b><small>MANAGEMENT SYSTEM</small></div><button className="close-menu" onClick={() => setMenuOpen(false)} aria-label="Tutup menu"><X size={18}/></button></div>
        <div className="school-switch"><div className="school-avatar">SN</div><div className="school-name"><b>{summary?.school.schoolName ?? "Workspace sekolah"}</b><small>{summary?.school.tenantName ?? "Organisasi"}</small></div><ChevronDown size={16}/></div>
        <div className="nav-caption">MENU UTAMA</div>
        <nav>{nav.map(item => <button key={item.label} className={`nav-item ${activeNav === item.label ? "selected" : ""}`} onClick={() => {setActiveNav(item.label);setMenuOpen(false);router.push(item.href);}}><item.icon size={18}/><span>{item.label}</span></button>)}</nav>
        <div className="sidebar-bottom"><div className="nav-caption">PREFERENSI</div><button className="nav-item" onClick={() => setActiveNav("Pengaturan")}><Settings2 size={18}/><span>Pengaturan</span></button><div className="help-card"><div className="help-icon"><CircleHelp size={18}/></div><b>Butuh bantuan?</b><p>Pusat panduan penggunaan TMS.</p><button onClick={() => setActiveNav("Pusat Bantuan")}>Buka pusat bantuan <span>→</span></button></div><div className="profile"><div className="profile-avatar">{(session?.user?.name ?? "A").slice(0,2).toUpperCase()}</div><div><b>{session?.user?.name ?? session?.user?.email ?? "Pengguna"}</b><small>{summary?.school.role ?? "Memuat peran"}</small></div><button className="signout-button" title="Keluar" aria-label="Keluar" onClick={async () => { await authClient.signOut(); router.replace("/auth/sign-in"); router.refresh(); }}>Keluar</button></div></div>
      </aside>
      {menuOpen && <button className="scrim" aria-label="Tutup navigasi" onClick={() => setMenuOpen(false)}/>}
      <section className="main-area">
        <header className="topbar"><div className="top-left"><button className="menu-toggle" onClick={() => setMenuOpen(true)} aria-label="Buka menu"><Menu size={20}/></button><div className="crumb">Workspace <span>/</span> <b>{activeNav}</b></div></div><div className="top-actions"><div className="searchbox"><Search size={16}/><input aria-label="Cari" placeholder="Cari data, menu, atau bantuan..."/><kbd>⌘ K</kbd></div><button className="icon-button notification" aria-label="Notifikasi"><Bell size={19}/><i/></button><div className="top-avatar">AM</div></div></header>
        <div className="content">
          <div className="welcome-row"><div><div className="eyebrow">WORKSPACE AKADEMIK</div><h1>Selamat datang, {session?.user?.name?.split(" ")[0] ?? "Admin"}! <span>✦</span></h1><p>Berikut ringkasan aktivitas akademik sekolah Anda hari ini.</p></div><button className="period-button"><CalendarDays size={16}/> Tahun Ajaran Aktif <ChevronDown size={15}/></button></div>
          <div className="notice"><div className="notice-icon"><ShieldCheck size={19}/></div><div><b>{loadError ? "Koneksi data perlu diperiksa" : "Workspace sekolah Anda"}</b><p>{loadError || `Data ditampilkan dalam lingkup ${summary?.school.schoolName ?? "sekolah"}. Akses dibatasi berdasarkan keanggotaan dan peran.`}</p></div><button aria-label="Tutup informasi" onClick={(e) => e.currentTarget.parentElement?.remove()}><X size={17}/></button></div>
          <div className="section-heading"><div><h2>Ringkasan sekolah</h2><p>Pantau indikator utama kegiatan akademik.</p></div><button className="text-action">Lihat laporan <span>→</span></button></div>
          <div className="metric-grid">{metrics.map(m => <article className="metric-card" key={m.label}><div className="metric-top"><span>{m.label}</span><div className={`metric-icon ${m.tone}`}><m.icon size={19}/></div></div><strong>{m.value}</strong><small>{m.detail}</small></article>)}</div>
          <div className="dashboard-grid"><section className="panel"><div className="panel-head"><div><h3>Aktivitas terbaru</h3><p>Pembaruan dari seluruh unit sekolah</p></div><button className="dots">•••</button></div><div className="activity-list">{activities.length ? activities.map((a,i)=><div className="activity" key={a.title + i}><div className={`activity-dot dot-${i}`}/><div className="activity-copy"><b>{a.title}</b><span>{a.person}</span></div><div className="activity-meta"><small>{a.time}</small><em>{a.tag}</em></div></div>) : <div className="empty-activity">Belum ada aktivitas tercatat. Pembaruan sekolah akan muncul di sini setelah mulai digunakan.</div>}</div><button className="panel-link">Lihat semua aktivitas <span>→</span></button></section>
          <section className="panel ai-panel"><div className="ai-orb"><Sparkles size={23}/></div><div className="ai-label">TMS INTELLIGENCE</div><h3>Asisten Guru AI</h3><p>Bantu guru merancang pembelajaran, menyusun asesmen, dan menyiapkan materi dengan lebih efisien.</p><button className="ai-button" disabled>Segera hadir <span>·</span></button><div className="ai-foot"><span><span className="live-dot"/> Dirancang dengan kontrol guru</span><span>Beta</span></div></section></div>
          <div className="bottom-grid"><section className="panel progress-panel"><div className="panel-head"><div><h3>Aktivitas pembelajaran</h3><p>Rekap dari basis data sekolah</p></div><TrendingUp size={18} className="trend"/></div><div className="progress-line"><div><span>Jurnal mengajar tercatat</span><b>{summary?.counts.journals ?? "—"}</b></div></div><div className="progress-line"><div><span>Perangkat ajar tersimpan</span><b>{summary?.counts.teaching_plans ?? "—"}</b></div></div></section><section className="quote-card"><div className="quote-mark">“</div><p>Pendidikan yang baik bukan hanya tentang apa yang diajarkan, tetapi juga tentang bagaimana setiap anak diberi ruang untuk bertumbuh.</p><small>TMS · SISTEM MANAJEMEN GURU</small></section></div>
          <footer>© 2026 TMS · Sistem Manajemen Guru <span>{summary?.school.role ?? "Akses terbatas"} &nbsp;·&nbsp; Versi 0.1.0</span></footer>
        </div>
      </section>
    </main>
  );
}
