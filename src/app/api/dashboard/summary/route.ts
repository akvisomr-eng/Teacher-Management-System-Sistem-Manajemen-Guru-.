import { NextResponse } from "next/server";
import { withAuthenticatedUser } from "@/db/connection";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await withAuthenticatedUser(async (tx, user, profile) => {
      const memberships = await tx`
        SELECT tenant_id, school_id, role
        FROM memberships
        WHERE user_id = ${profile.id}
        ORDER BY created_at ASC
      `;
      if (!memberships.length) return { needsOnboarding: true, user: { name: user.name, email: user.email } };

      const adminRoles = ["tenant_owner", "tenant_admin", "principal", "vice_principal", "school_operator"];
      const membership = memberships.find((item) => adminRoles.includes(item.role));
      if (!membership) {
        const isTeacher = memberships.some((item) => item.role === "teacher");
        return {
          accessDenied: true,
          error: isTeacher ? "Akun ini terdaftar sebagai guru. Gunakan Portal Guru." : "Akun ini tidak memiliki hak akses administrator.",
          portal: isTeacher ? "teacher" : "admin"
        };
      }
      await tx`SELECT set_config('app.tenant_id', ${membership.tenant_id}, true)`;
      const schoolId = membership.school_id;
      const [schoolInfo] = await tx`
        SELECT s.name AS school_name, t.name AS tenant_name
        FROM schools s
        JOIN tenants t ON t.id = s.tenant_id
        WHERE s.id = ${schoolId}
        LIMIT 1
      `;
      const [counts] = await tx`
        SELECT
          (SELECT count(*)::int FROM teachers WHERE tenant_id = ${membership.tenant_id} AND school_id = ${schoolId} AND employment_status = 'active') AS teachers,
          (SELECT count(*)::int FROM students WHERE tenant_id = ${membership.tenant_id} AND school_id = ${schoolId} AND status = 'active') AS students,
          (SELECT count(*)::int FROM classes WHERE tenant_id = ${membership.tenant_id} AND school_id = ${schoolId} AND status = 'active') AS classes,
          (SELECT count(*)::int FROM teaching_journals WHERE tenant_id = ${membership.tenant_id} AND school_id = ${schoolId}) AS journals,
          (SELECT count(*)::int FROM teaching_plans WHERE tenant_id = ${membership.tenant_id} AND school_id = ${schoolId}) AS teaching_plans
      `;
      const activityRows = await tx`
        SELECT action, resource_type, created_at
        FROM audit_logs
        WHERE tenant_id = ${membership.tenant_id} AND school_id = ${schoolId}
        ORDER BY created_at DESC
        LIMIT 5
      `;
      return {
        needsOnboarding: false,
        user: { name: user.name, email: user.email },
        school: { tenantId: membership.tenant_id, schoolId, role: membership.role, schoolName: schoolInfo?.school_name ?? "Sekolah", tenantName: schoolInfo?.tenant_name ?? "Organisasi" },
        counts,
        activities: activityRows
      };
    });
    if ("accessDenied" in result && result.accessDenied) {
      return NextResponse.json({ error: result.error, portal: result.portal }, { status: 403 });
    }
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memuat ringkasan.";
    const status = message === "UNAUTHENTICATED" ? 401 : message.includes("DATABASE_URL") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
