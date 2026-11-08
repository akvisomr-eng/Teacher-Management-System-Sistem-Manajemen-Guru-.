"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, GraduationCap, ShieldCheck } from "lucide-react";
import { authClient } from "@/lib/auth/client";

type Mode = "sign-in" | "sign-up" | "reset-password";
type Step = "form" | "verify" | "forgot" | "reset";
type Props = { initialMode: Mode };

export function AuthForm({ initialMode }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>(initialMode === "reset-password" ? "sign-in" : initialMode);
  const [step, setStep] = useState<Step>(initialMode === "reset-password" ? "reset" : "form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      if (step === "forgot") {
        const result = await authClient.requestPasswordReset({
          email,
          redirectTo: `${window.location.origin}/auth/reset-password`
        });
        if (result.error) throw new Error(result.error.message || "Permintaan reset kata sandi gagal.");
        setMessage("Jika email tersebut terdaftar, tautan untuk mengatur ulang kata sandi telah dikirim. Periksa kotak masuk dan folder spam.");
        return;
      }
      if (step === "reset") {
        const token = searchParams.get("token");
        if (!token) throw new Error("Tautan reset tidak valid atau sudah kedaluwarsa. Silakan minta tautan baru.");
        const result = await authClient.resetPassword({ newPassword: password, token });
        if (result.error) throw new Error(result.error.message || "Kata sandi baru gagal disimpan.");
        setMessage("Kata sandi berhasil diperbarui. Silakan masuk menggunakan kata sandi baru.");
        setPassword("");
        setStep("form");
        setMode("sign-in");
        router.replace("/auth/sign-in");
        router.refresh();
        return;
      }
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

  const isReset = step === "reset";
  const isPasswordStep = step === "form" || isReset;

  return (
    <main className="auth-shell">
      <div className="auth-decoration"><div className="auth-decoration-orb orb-one"/><div className="auth-decoration-orb orb-two"/><div className="auth-brand"><div className="brand-mark"><GraduationCap size={22}/></div><div><b>TMS<span>+</span></b><small>MANAGEMENT SYSTEM</small></div></div><div className="auth-pitch"><span className="auth-kicker">SATU PLATFORM · SELURUH EKOSISTEM SEKOLAH</span><h1>Guru hebat,<br/>sekolah <em>bertumbuh.</em></h1><p>Kelola pembelajaran, kembangkan potensi guru, dan bangun pengalaman pendidikan yang lebih bermakna.</p><div className="auth-trust"><ShieldCheck size={16}/> Identitas terlindungi dengan verifikasi email</div></div><div className="auth-decoration-foot">TMS · SISTEM MANAJEMEN GURU</div></div>
      <div className="auth-main"><div className="auth-card"><div className="auth-mobile-brand"><div className="brand-mark"><GraduationCap size={20}/></div><b>TMS<span>+</span></b></div><div className="auth-card-eyebrow">{step === "verify" ? "VERIFIKASI AKUN" : step === "forgot" ? "PEMULIHAN AKUN" : isReset ? "KATA SANDI BARU" : "SELAMAT DATANG DI TMS"}</div><h2>{step === "verify" ? "Periksa email Anda" : step === "forgot" ? "Lupa kata sandi?" : isReset ? "Buat kata sandi baru" : mode === "sign-in" ? "Masuk ke workspace" : "Buat akun sekolah"}</h2><p className="auth-description">{step === "verify" ? `Masukkan kode verifikasi yang dikirim ke ${email}.` : step === "forgot" ? "Masukkan alamat email yang Anda gunakan saat mendaftar. Kami akan mengirimkan tautan pemulihan ke email tersebut." : isReset ? "Gunakan kata sandi baru minimal 8 karakter untuk mengamankan akun Anda." : mode === "sign-in" ? "Gunakan akun terdaftar untuk melanjutkan aktivitas sekolah." : "Daftarkan akun administrator untuk mulai menyiapkan workspace."}</p>
      <form onSubmit={submit}>
        {step === "verify" ? <label>Kode verifikasi<input value={otp} onChange={e=>setOtp(e.target.value)} inputMode="numeric" autoComplete="one-time-code" placeholder="Masukkan kode OTP" required/></label> : step === "forgot" ? <label>Email terdaftar<input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" placeholder="nama@sekolah.id" required/></label> : <>
          {mode === "sign-up" && step === "form" && <label>Nama lengkap<input value={name} onChange={e=>setName(e.target.value)} autoComplete="name" placeholder="Nama administrator" required/></label>}
          {step === "form" && <label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" placeholder="nama@sekolah.id" required/></label>}
          <label>{isReset ? "Kata sandi baru" : "Kata sandi"}<span className="auth-password-field"><input type={showPassword ? "text" : "password"} value={password} onChange={e=>setPassword(e.target.value)} autoComplete={isReset ? "new-password" : mode==="sign-in" ? "current-password" : "new-password"} placeholder="Minimal 8 karakter" minLength={8} required/><button className="auth-password-toggle" type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"} aria-pressed={showPassword}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></span></label>
        </>}
        {error && <div className="auth-error" role="alert">{error}</div>}
        {message && <div className="auth-message" role="status">{message}</div>}
        <button className="auth-submit" type="submit" disabled={busy}>{busy ? "Memproses..." : step === "verify" ? "Verifikasi dan lanjutkan" : step === "forgot" ? "Kirim tautan pemulihan" : isReset ? "Simpan kata sandi baru" : mode === "sign-in" ? "Masuk ke workspace" : "Daftar dan verifikasi email"}</button>
      </form>
      {step === "verify" ? <button className="auth-switch" onClick={()=>{setStep("form");setMessage("");setOtp("");}}>Kembali ke formulir</button> : step === "forgot" ? <button className="auth-switch" onClick={()=>{setStep("form");setMessage("");setError("");}}>Kembali ke masuk</button> : isReset ? <button className="auth-switch" onClick={()=>router.replace("/auth/sign-in")}>Kembali ke masuk</button> : <>{mode === "sign-in" && <button className="auth-forgot" type="button" onClick={()=>{setStep("forgot");setMessage("");setError("");}}>Lupa kata sandi?</button>}<div className="auth-switch">{mode === "sign-in" ? "Belum memiliki akun?" : "Sudah memiliki akun?"} <button onClick={()=>{setMode(mode==="sign-in"?"sign-up":"sign-in");setError("");setMessage("");}}>{mode==="sign-in"?"Daftar sekarang":"Masuk"}</button></div></>}
      <div className="auth-privacy"><ShieldCheck size={14}/> Akun diverifikasi melalui email. Akses fitur mengikuti peran dan sekolah Anda.</div></div><footer className="auth-footer">© 2026 TMS · Sistem Manajemen Guru <span>Privasi · Bantuan</span></footer></div>
    </main>
  );
}
