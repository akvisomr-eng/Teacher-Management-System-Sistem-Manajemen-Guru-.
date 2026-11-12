import { redirect } from "next/navigation";
import { withAuthenticatedUser } from "@/db/connection";
import TeacherDesk from "@/components/teacher-desk";

export const dynamic = "force-dynamic";

export default async function TeacherPage() {
  let result: {
    identity: { teacherId: string; name: string; school: string } | null;
    accessMessage: string;
  };
  try {
    result = await withAuthenticatedUser(async (tx, _user, profile) => {
      const memberships = await tx`
        SELECT tenant_id, school_id, role FROM memberships
        WHERE user_id = ${profile.id} AND school_id IS NOT NULL
        ORDER BY created_at ASC LIMIT 5
      `;
      const teacherMemberships = memberships.filter((membership) => membership.role === "teacher");
      if (teacherMemberships.length !== 1) {
        const isOperator = memberships.some((membership) => ["tenant_owner", "tenant_admin", "principal", "vice_principal", "school_operator"].includes(membership.role));
        return {
          identity: null,
          accessMessage: isOperator
            ? "Akun ini terdaftar sebagai operator atau administrator sekolah, bukan sebagai akun guru. Buka Data Guru untuk menautkan email akun masing-masing guru."
            : "Akun ini belum memiliki penempatan guru aktif. Minta operator sekolah menautkan email akun Anda ke data induk guru.",
        };
      }
      const membership = teacherMemberships[0];
      await tx`SELECT set_config('app.tenant_id', ${membership.tenant_id}, true)`;
      const rows = await tx`
        SELECT t.id AS teacher_id, t.full_name, s.name AS school_name
        FROM teachers t
        JOIN schools s ON s.id = t.school_id AND s.tenant_id = t.tenant_id
        WHERE t.user_id = ${profile.id} AND t.tenant_id = ${membership.tenant_id}
          AND t.school_id = ${membership.school_id} AND t.employment_status = 'active'
        ORDER BY t.created_at ASC LIMIT 2
      `;
      if (rows.length !== 1) {
        return {
          identity: null,
          accessMessage: "Akun guru belum ditautkan ke tepat satu data induk guru aktif. Hubungi operator sekolah.",
        };
      }
      return {
        identity: { teacherId: rows[0].teacher_id, name: rows[0].full_name, school: rows[0].school_name },
        accessMessage: "",
      };
    });
  } catch {
    redirect("/teacher/sign-in");
  }

  if (!result.identity) {
    return <main style={{maxWidth:640,margin:"12vh auto",padding:32,fontFamily:"sans-serif",background:"#fff",borderRadius:18}}>
      <h1>Ruang Kerja Guru</h1>
      <p>{result.accessMessage}</p>
      <a href="/workspace/teachers">Kembali ke TMS</a>
    </main>;
  }
  return <TeacherDesk identity={result.identity} />;
}
