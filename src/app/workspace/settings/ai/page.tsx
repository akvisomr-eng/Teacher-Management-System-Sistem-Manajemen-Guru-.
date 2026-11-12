import { redirect } from "next/navigation";
import Link from "next/link";
import { withAuthenticatedUser } from "@/db/connection";

export const dynamic = "force-dynamic";

const adminRoles = ["tenant_owner", "tenant_admin", "principal", "vice_principal", "school_operator"];

export default async function AiSettingsPage() {
  let access: { allowed: boolean; role: string } = { allowed: false, role: "" };
  try {
    access = await withAuthenticatedUser(async (tx, _user, profile) => {
      const memberships = await tx`
        SELECT role FROM memberships WHERE user_id = ${profile.id}
        ORDER BY created_at ASC
      `;
      const membership = memberships.find((item) => adminRoles.includes(item.role));
      return { allowed: Boolean(membership), role: membership?.role ?? "" };
    });
  } catch {
    redirect("/admin/sign-in");
  }
  if (!access.allowed) redirect("/teacher");

  const enabledFlag = process.env.TMS_AI_ENABLED === "true";
  const budgetApproved = process.env.TMS_AI_BUDGET_APPROVED === "true";
  const gatewayCredential = Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN);
  const modelConfigured = Boolean(process.env.TMS_AI_MODEL);
  const ready = enabledFlag && budgetApproved && gatewayCredential && modelConfigured;

  const checks = [
    ["TMS_AI_ENABLED", enabledFlag, "Fitur AI diizinkan pada environment server"],
    ["TMS_AI_BUDGET_APPROVED", budgetApproved, "Persetujuan anggaran AI tercatat"],
    ["AI_GATEWAY_API_KEY / VERCEL_OIDC_TOKEN", gatewayCredential, "Kredensial Gateway tersedia (nilai rahasia tidak ditampilkan)"],
    ["TMS_AI_MODEL", modelConfigured, "ID model Gateway tersedia"]
  ] as const;

  return <main style={{maxWidth:900,margin:"32px auto",padding:"0 22px",fontFamily:"Arial,sans-serif",color:"#17233d"}}>
    <Link href="/" style={{color:"#6254d9",textDecoration:"none"}}>← Kembali ke Dashboard Admin</Link>
    <header style={{margin:"24px 0"}}>
      <small style={{letterSpacing:1.5,color:"#6254d9",fontWeight:700}}>TMS • PENGATURAN SISTEM</small>
      <h1 style={{fontSize:30,margin:"8px 0"}}>Pengaturan Asisten AI</h1>
      <p style={{color:"#65708a",lineHeight:1.6}}>Diagnostik konfigurasi AI Gateway untuk Asisten AI Guru. Halaman ini hanya dapat dibuka oleh administrator/operator sekolah.</p>
    </header>
    <section style={{border:"1px solid #e3e8f1",borderRadius:14,padding:22,background:"white"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
        <h2 style={{margin:0,fontSize:20}}>Status integrasi</h2>
        <span style={{padding:"7px 11px",borderRadius:20,fontWeight:700,fontSize:13,background:ready?"#e8f7ee":"#fff4e5",color:ready?"#176b3a":"#8a5412"}}>{ready?"Siap dikonfigurasi":"Belum aktif"}</span>
      </div>
      <p style={{color:"#65708a",fontSize:14,lineHeight:1.6}}>Peran saat ini: <b>{access.role}</b>. Status berikut dibaca langsung dari environment server saat halaman dimuat.</p>
      <div style={{display:"grid",gap:12,marginTop:18}}>
        {checks.map(([key,ok,description])=><div key={key} style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"center",padding:"12px 0",borderTop:"1px solid #edf0f5"}}>
          <div><b style={{fontSize:14}}>{key}</b><div style={{fontSize:13,color:"#65708a",marginTop:4}}>{description}</div></div>
          <span style={{whiteSpace:"nowrap",fontSize:13,fontWeight:700,color:ok?"#176b3a":"#9a5a19"}}>{ok?"Tersedia":"Belum tersedia"}</span>
        </div>)}
      </div>
    </section>
    <section style={{marginTop:16,border:"1px solid #e3e8f1",borderRadius:14,padding:22,background:"#f8f9fc"}}>
      <h2 style={{fontSize:18,marginTop:0}}>Cara aktivasi yang aman</h2>
      <ol style={{lineHeight:1.8,color:"#46516a",paddingLeft:22}}>
        <li>Siapkan akses AI Gateway dan tentukan model yang sesuai. Periksa harga per token serta batas pengeluaran terlebih dahulu.</li>
        <li>Tambahkan kredensial Gateway sebagai environment variable rahasia di pengaturan proyek Vercel. Jangan menaruh API key di halaman ini, browser, atau kode sumber.</li>
        <li>Atur <code>TMS_AI_MODEL</code> dengan ID model resmi yang tersedia pada AI Gateway.</li>
        <li><code>TMS_AI_ENABLED</code> dan <code>TMS_AI_BUDGET_APPROVED</code> harus sama-sama <code>true</code> agar permintaan dapat berjalan.</li>
        <li>Setelah perubahan environment, lakukan redeploy dan uji dengan satu permintaan terkontrol.</li>
      </ol>
      <p style={{fontSize:13,color:"#8a5412",background:"#fff4e5",padding:13,borderRadius:8,lineHeight:1.6,marginBottom:0}}><b>Pengendalian biaya:</b> Asisten menjalankan dua panggilan model untuk setiap permintaan. AI tetap nonaktif secara default. Jangan menyetujui anggaran atau mengaktifkan fitur sebelum biaya dan sumber pembayaran disetujui. TMS tidak mengubah environment Vercel dari halaman ini.</p>
    </section>
    <p style={{fontSize:12,color:"#8790a3",marginTop:18}}>Diagnostik tidak menampilkan nilai kredensial, tidak menyimpan API key, dan tidak mengubah konfigurasi server.</p>
  </main>;
}
