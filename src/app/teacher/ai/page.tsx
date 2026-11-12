import { redirect } from "next/navigation";
import { withAuthenticatedUser } from "@/db/connection";
import TeacherAiAssistant from "@/components/teacher-ai-assistant";

export const dynamic = "force-dynamic";

export default async function TeacherAiPage() {
  let allowed = false;
  try {
    allowed = await withAuthenticatedUser(async (tx, _user, profile) => {
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
