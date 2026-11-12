import { redirect } from "next/navigation";
import { withAuthenticatedUser } from "@/db/connection";
import TeacherAiAssistant from "@/components/teacher-ai-assistant";

export const dynamic = "force-dynamic";

export default async function TeacherAiPage() {
  let allowed = false;
  try {
    allowed = await withAuthenticatedUser(async (tx, user, profile) => {
      const account = await tx`
        SELECT status, auth_user_id FROM users WHERE id = ${profile.id} LIMIT 1
      `;
      if (account.length !== 1 || account[0].status !== "active" || account[0].auth_user_id !== user.id) return false;
      const memberships = await tx`
        SELECT tenant_id, school_id FROM memberships
        WHERE user_id = ${profile.id} AND role = 'teacher' AND school_id IS NOT NULL
        ORDER BY created_at ASC LIMIT 2
      `;
      if (memberships.length !== 1) return false;
      await tx`SELECT set_config('app.tenant_id', ${memberships[0].tenant_id}, true)`;
      const rows = await tx`
        SELECT t.id
        FROM memberships m
        JOIN teachers t ON t.user_id = m.user_id
          AND t.tenant_id = m.tenant_id AND t.school_id = m.school_id
          AND t.employment_status = 'active'
        WHERE m.user_id = ${profile.id} AND m.role = 'teacher' AND m.school_id IS NOT NULL
        LIMIT 2
      `;
      return rows.length === 1;
    });
  } catch {
    redirect("/teacher/sign-in");
  }
  if (!allowed) redirect("/teacher/sign-in");
  return <TeacherAiAssistant />;
}
