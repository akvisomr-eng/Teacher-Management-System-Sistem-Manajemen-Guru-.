import { redirect } from "next/navigation";
import { withAuthenticatedUser } from "@/db/connection";
import { TeachingWorkspace } from "@/components/teaching-workspace";

export const dynamic = "force-dynamic";

export default async function TeacherActivitiesPage() {
  let access = false;
  try {
    access = await withAuthenticatedUser(async (tx, _user, profile) => {
      const memberships = await tx`
        SELECT tenant_id, school_id FROM memberships
        WHERE user_id = ${profile.id} AND role = 'teacher' AND school_id IS NOT NULL
        ORDER BY created_at ASC LIMIT 2
      `;
      if (memberships.length !== 1) return false;
      const membership = memberships[0];
      await tx`SELECT set_config('app.tenant_id', ${membership.tenant_id}, true)`;
      const teachers = await tx`
        SELECT id FROM teachers
        WHERE user_id = ${profile.id} AND tenant_id = ${membership.tenant_id}
          AND school_id = ${membership.school_id} AND employment_status = 'active'
        LIMIT 2
      `;
      return teachers.length === 1;
    });
  } catch {
    redirect("/auth/sign-in?redirectTo=%2Fteacher%2Factivities");
  }
  if (!access) redirect("/teacher");
  return <TeachingWorkspace teacherMode />;
}
