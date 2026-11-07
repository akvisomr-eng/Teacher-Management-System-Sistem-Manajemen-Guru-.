"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, ShieldCheck } from "lucide-react";
import { authClient } from "@/lib/auth/client";

type Mode = "sign-in" | "sign-up";
type Props = { initialMode: Mode };

export function AuthForm({ initialMode }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [step, setStep] = useState<"form" | "verify">("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      if (step === "verify") {
        const result = await authClient.emailOtp.verifyEmail({ email, otp });
        if (result.error) throw new Error(result.error.message || "Kode verifikasi tidak valid.");
        setMessage("Email berhasil diverifikasi. Mengarahkan ke workspace...");
        router.replace("/");
        router.refresh();
        return;
      }
      if (mode === "sign-up") {
        const result = await authClient.signUp.email({ name, email, password });
        if (result.error) throw new Error(result.error.message || "Pendaftaran gagal.");
        setStep("verify");
        setMessage("Kode verifikasi telah dikirim ke email Anda. Periksa kotak masuk dan folder spam.");
      } else {
        const result = await authClient.signIn.email({ email, password });
        if (result.error) throw new Error(result.error.message || "Email atau kata sandi tidak sesuai.");
        router.replace("/");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan. Silakan coba kembali.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-decoration"><div className="auth-decoration-orb orb-one"/><div className="auth-decoration-orb orb-two"/><div className="auth-brand"><div className="brand-mark"><GraduationCap size={22}/></div><div><b>ruang<span>guru</span></b><small>MANAGEMENT SYSTEM</small></div></div><div className="auth-pitch"><span className="auth-kicker">SATU PLATFORM · SELURUH EKOSISTEM SEKOLAH</span><h1>Guru hebat,<br/>sekolah <em>bertumbuh.</em></h1><p>Kelola pembelajaran, kembangkan potensi guru, dan bangun pengalaman pendidikan yang lebih bermakna.</p><div className="auth-trust"><ShieldCheck size={16}/> Identitas terlindungi dengan verifikasi email</div></div><div className="auth-decoration-foot">TMS · SISTEM MANAJEMEN GURU</div></div>
      <div className="auth-main"><div className="auth-card"><div className="auth-mobile-brand"><div className="brand-mark"><GraduationCap size={20}/></div><b>ruang<span>guru</span></b></div><div className="auth-card-eyebrow">{step === "verify" ? "VERIFIKASI AKUN" : "SELAMAT DATANG DI TMS"}</div><h2>{step === "verify" ? "Periksa email Anda" : mode === "sign-in" ? "Masuk ke workspace" : "Buat akun sekolah"}</h2><p className="auth-description">{step === "verify" ? `Masukkan kode verifikasi yang dikirim ke ${email}.` : mode === "sign-in" ? "Gunakan akun terdaftar untuk melanjutkan aktivitas sekolah." : "Daftarkan akun administrator untuk mulai menyiapkan workspace."}</p>
      <form onSubmit={submit}>
        {step === "verify" ? <label>Kode verifikasi<input value={otp} onChange={e=>setOtp(e.target.value)} inputMode="numeric" autoComplete="one-time-code" placeholder="Masukkan kode OTP" required/></label> : <>
          {mode === "sign-up" && <label>Nama lengkap<input value={name} onChange={e=>setName(e.target.value)} autoComplete="name" placeholder="Nama administrator" required/></label>}
          <label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" placeholder="nama@sekolah.id" required/></label>
          <label>Kata sandi<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==="sign-in"?"current-password":"new-password"} placeholder="Minimal 8 karakter" minLength={8} required/></label>
        </>}
        {error && <div className="auth-error" role="alert">{error}</div>}
        {message && <div className="auth-message" role="status">{message}</div>}
        <button className="auth-submit" type="submit" disabled={busy}>{busy ? "Memproses..." : step === "verify" ? "Verifikasi dan lanjutkan" : mode === "sign-in" ? "Masuk ke workspace" : "Daftar dan verifikasi email"}</button>
      </form>
      {step === "verify" ? <button className="auth-switch" onClick={()=>{setStep("form");setMessage("");setOtp("");}}>Kembali ke formulir</button> : <div className="auth-switch">{mode === "sign-in" ? "Belum memiliki akun?" : "Sudah memiliki akun?"} <button onClick={()=>{setMode(mode==="sign-in"?"sign-up":"sign-in");setError("");setMessage("");}}>{mode==="sign-in"?"Daftar sekarang":"Masuk"}</button></div>}
      <div className="auth-privacy"><ShieldCheck size={14}/> Akun diverifikasi melalui email. Akses fitur mengikuti peran dan sekolah Anda.</div></div><footer className="auth-footer">© 2026 TMS · Sistem Manajemen Guru <span>Privasi · Bantuan</span></footer></div>
    </main>
  );
}
