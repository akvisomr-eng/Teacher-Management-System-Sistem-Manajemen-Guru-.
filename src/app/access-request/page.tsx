import Link from "next/link";
import { GraduationCap, ShieldCheck } from "lucide-react";

type Role = "teacher" | "principal" | "vice_principal" | "school_operator";
const roleNames: Record<Role, string> = {
  teacher: "Guru",
  principal: "Kepala Sekolah",
  vice_principal: "Wakil Kepala Sekolah",
  school_operator: "Operator Sekolah"
};

export default async function AccessRequestPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const params = await searchParams;
  const role = (params.role && params.role in roleNames ? params.role : "teacher") as Role;
  return (
    <main className="onboarding-shell">
      <section className="onboarding-card">
        <div className="onboarding-brand"><div className="brand-mark"><GraduationCap size={22}/></div><div><b>TMS<span>+</span></b><small>MANAGEMENT SYSTEM</small></div></div>
        <div className="auth-card-eyebrow">EMAIL TERVERIFIKASI</div>
        <h1>Selangkah lagi menuju workspace sekolah.</h1>
        <p className="onboarding-intro">Pendaftaran akun untuk peran <strong>{roleNames[role]}</strong> berhasil diverifikasi. Demi menjaga keamanan data sekolah, akun belum otomatis menjadi anggota sekolah.</p>
        <div className="auth-registration-hint">
          <ShieldCheck size={18}/>
          <div><strong>Akses memerlukan undangan atau kode sekolah</strong><p>Hubungi administrator sekolah untuk mendapatkan undangan atau kode akses guru. Setelah akses disetujui, masuk kembali menggunakan email dan kata sandi yang telah didaftarkan.</p></div>
        </div>
        <Link className="auth-submit access-request-link" href="/auth/sign-in">Kembali ke halaman masuk</Link>
        <div className="auth-privacy"><ShieldCheck size={14}/> Akun terverifikasi tidak otomatis memperoleh akses ke data sekolah.</div>
      </section>
    </main>
  );
}
