import Link from "next/link";
export const metadata = { title: "Login Guru | TMS Teacher Desk" };
export default function TeacherSignInPage() {
  return <main style={{maxWidth:520,margin:"12vh auto",padding:32,fontFamily:"Arial,sans-serif",background:"#fff",borderRadius:18,color:"#17233d"}}>
    <small style={{letterSpacing:2,color:"#6254d9",fontWeight:700}}>TMS • TEACHER DESK</small>
    <h1>Login Guru</h1>
    <p>Gunakan akun pribadi yang diberikan atau diaktifkan oleh operator sekolah. Setiap guru harus menggunakan akun sendiri; akun bersama tidak diperbolehkan.</p>
    <Link href="/auth/sign-in?callbackURL=%2Fteacher" style={{display:"inline-block",background:"#6254d9",color:"white",padding:"12px 18px",borderRadius:9,textDecoration:"none"}}>Masuk sebagai guru</Link>
    <p style={{fontSize:12,color:"#78839a",marginTop:20}}>Jika akun belum terhubung ke data induk guru, hubungi operator sekolah. Hak akses ditentukan oleh penempatan dan akun guru di TMS.</p>
  </main>;
}
