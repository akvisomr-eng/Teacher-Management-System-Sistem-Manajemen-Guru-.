import Link from "next/link";

export const metadata = { title: "Login Administrator | TMS" };

export default function AdminSignInPage() {
  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "linear-gradient(135deg,#f4f6ff 0%,#eef5ff 52%,#f8fafc 100%)", fontFamily: "Arial,sans-serif", color: "#17233d" }}>
    <section style={{ width: "100%", maxWidth: 520, padding: 36, borderRadius: 22, background: "#fff", boxShadow: "0 24px 70px rgba(31,48,89,.10)", border: "1px solid #e6eaf2" }}>
      <div style={{ color: "#4f46e5", fontWeight: 800, letterSpacing: 1.5, fontSize: 12 }}>TMS · ADMINISTRATION</div>
      <h1 style={{ fontSize: 30, margin: "24px 0 8px", letterSpacing: -1 }}>Portal Administrator</h1>
      <p style={{ color: "#64748b", lineHeight: 1.65, margin: "0 0 24px" }}>Masuk untuk mengelola data sekolah, guru, peserta didik, kegiatan akademik, dan laporan. Gunakan akun administrator atau operator sekolah yang telah diberikan akses.</p>
      <Link href="/auth/sign-in?callbackURL=%2F" style={{ display: "block", textAlign: "center", background: "#5145cd", color: "#fff", padding: "14px 18px", borderRadius: 11, fontWeight: 700, textDecoration: "none" }}>Masuk sebagai administrator</Link>
      <div style={{ marginTop: 24, padding: 16, borderRadius: 12, background: "#f8fafc", color: "#64748b", fontSize: 13, lineHeight: 1.6 }}>
        <b style={{ color: "#334155" }}>Bukan administrator?</b><br/>Guru menggunakan portal khusus untuk jurnal, perangkat ajar, asesmen, refleksi, dan ruang kerja pribadi.
        <div style={{ marginTop: 10 }}><Link href="/teacher/sign-in" style={{ color: "#5145cd", fontWeight: 700, textDecoration: "none" }}>Buka Login Guru →</Link></div>
      </div>
      <p style={{ color: "#94a3b8", fontSize: 11, marginTop: 24, textAlign: "center" }}>Satu akun TMS · Hak akses ditentukan oleh peran dan keanggotaan sekolah.</p>
    </section>
  </main>;
}
