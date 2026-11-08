import Link from "next/link";
import { redirect } from "next/navigation";
import { withAuthenticatedUser } from "@/db/connection";
import TeacherDesk from "@/components/teacher-desk";

export const dynamic = "force-dynamic";

export default async function TeacherPage() {
  let identity: { teacherId: string; name: string; school: string } | null = null;
  try {
    identity = await withAuthenticatedUser(async (tx, _user, profile) => {
      const rows = await tx`
        SELECT t.id AS teacher_id, t.full_name, s.name AS school_name
        FROM teachers t
        JOIN memberships m ON m.user_id = t.user_id AND m.tenant_id = t.tenant_id AND m.school_id = t.school_id
        JOIN schools s ON s.id = t.school_id AND s.tenant_id = t.tenant_id
        WHERE t.user_id = ${profile.id} AND m.role = 'teacher' AND t.employment_status = 'active'
        ORDER BY t.created_at ASC LIMIT 2
      `;
      if (rows.length !== 1) return null;
      return { teacherId: rows[0].teacher_id, name: rows[0].full_name, school: rows[0].school_name };
    });
  } catch {
    redirect("/auth/sign-in?redirectTo=%2Fteacher");
  }

  if (!identity) {
    return <main style={{maxWidth:640,margin:"12vh auto",padding:32,fontFamily:"sans-serif",background:"#fff",borderRadius:18}}>
      <h1>Ruang Kerja Guru</h1>
      <p>Akun ini belum memiliki penautan identitas guru yang aktif. Minta operator sekolah menautkan akun pribadi Anda ke data induk guru.</p>
      <Link href="/workspace">Kembali ke TMS</Link>
    </main>;
  }
  return <TeacherDesk identity={identity} />;
}
