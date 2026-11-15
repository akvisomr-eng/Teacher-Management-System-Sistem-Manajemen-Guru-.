import { NextResponse } from "next/server";
import type { TransactionSql } from "postgres";
import { z } from "zod";
import { withAuthenticatedUser } from "@/db/connection";

export const dynamic = "force-dynamic";

type DbTx = TransactionSql<Record<string, never>>;
const managerRoles = new Set(["tenant_owner", "tenant_admin", "principal", "vice_principal", "school_operator"]);
const teacherRoles = new Set(["teacher", "homeroom_teacher"]);
const reportTypeSchema = z.enum(["teachers", "students", "classes", "gradebook"]);

type Work = (tx: DbTx, tenantId: string, schoolId: string, userId: string, teacherId: string | null) => Promise<Response>;

async function authorize(work: Work) {
  try {
    return await withAuthenticatedUser(async (tx, _user, profile) => {
      const memberships = await tx`SELECT tenant_id, school_id, role FROM memberships WHERE user_id = ${profile.id} AND school_id IS NOT NULL ORDER BY created_at ASC LIMIT 1`;
      const membership = memberships[0] as { tenant_id: string; school_id: string; role: string } | undefined;
      if (!membership || (!managerRoles.has(membership.role) && !teacherRoles.has(membership.role))) {
        return NextResponse.json({ error: "Anda tidak memiliki izin mengakses laporan." }, { status: 403 });
      }
      await tx`SELECT set_config('app.tenant_id', ${membership.tenant_id}, true)`;
      let teacherId: string | null = null;
      if (teacherRoles.has(membership.role)) {
        const rows = await tx`SELECT id FROM teachers WHERE user_id = ${profile.id} AND tenant_id = ${membership.tenant_id} AND school_id = ${membership.school_id} AND employment_status = 'active' LIMIT 1`;
        teacherId = (rows[0]?.id as string | undefined) ?? null;
        if (!teacherId) return NextResponse.json({ error: "Akun guru belum ditautkan ke profil guru sekolah." }, { status: 403 });
      }
      return work(tx, membership.tenant_id, membership.school_id, profile.id, teacherId);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Permintaan gagal.";
    const status = message === "UNAUTHENTICATED" ? 401 : message.includes("DATABASE_URL") ? 503 : 500;
    return NextResponse.json({ error: status === 500 ? "Terjadi kesalahan saat membuat laporan." : message }, { status });
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsedType = reportTypeSchema.safeParse(url.searchParams.get("type") ?? "students");
  if (!parsedType.success) return NextResponse.json({ error: "Jenis laporan tidak dikenal." }, { status: 400 });
  const type = parsedType.data;
  const classId = url.searchParams.get("classId") || null;
  const academicYearId = url.searchParams.get("academicYearId") || null;
  if (classId && !z.string().uuid().safeParse(classId).success) return NextResponse.json({ error: "ID kelas tidak valid." }, { status: 400 });
  if (academicYearId && !z.string().uuid().safeParse(academicYearId).success) return NextResponse.json({ error: "ID tahun ajaran tidak valid." }, { status: 400 });

  return authorize(async (tx, tenantId, schoolId, userId, teacherId) => {
    if (teacherId && type === "teachers") {
      return NextResponse.json({ error: "Direktori seluruh guru hanya tersedia untuk pengelola sekolah." }, { status: 403 });
    }

    let data: readonly (object | undefined)[];
    if (type === "teachers") {
      data = await tx`
        SELECT t.id AS row_id, t.employee_number, t.full_name, t.employment_status, t.education,
               COUNT(DISTINCT a.id)::int AS teaching_assignments,
               COUNT(DISTINCT c.id)::int AS classes_taught
        FROM teachers t
        LEFT JOIN teaching_assignments a ON a.teacher_id = t.id AND a.tenant_id = t.tenant_id AND a.school_id = t.school_id
        LEFT JOIN classes c ON c.id = a.class_id AND c.tenant_id = a.tenant_id AND c.school_id = a.school_id
        WHERE t.tenant_id = ${tenantId} AND t.school_id = ${schoolId}
        GROUP BY t.id
        ORDER BY t.full_name
      `;
    } else if (type === "students") {
      data = await tx`
        SELECT st.id AS row_id, st.student_number, st.full_name AS student_name, st.status,
               c.name AS class_name, c.grade_level, ay.name AS academic_year
        FROM students st
        LEFT JOIN LATERAL (
          SELECT e.* FROM student_enrollments e
          WHERE e.student_id = st.id AND e.tenant_id = st.tenant_id AND e.school_id = st.school_id
            AND e.status = 'active'
            AND (${academicYearId}::uuid IS NULL OR e.academic_year_id = ${academicYearId}::uuid)
            AND (${teacherId}::uuid IS NULL OR EXISTS (
              SELECT 1 FROM teaching_assignments ta
              WHERE ta.class_id = e.class_id AND ta.academic_year_id = e.academic_year_id
                AND ta.teacher_id = ${teacherId}::uuid AND ta.tenant_id = e.tenant_id AND ta.school_id = e.school_id
            ))
          ORDER BY e.created_at DESC LIMIT 1
        ) e ON TRUE
        LEFT JOIN classes c ON c.id = e.class_id AND c.tenant_id = e.tenant_id AND c.school_id = e.school_id
        LEFT JOIN academic_years ay ON ay.id = e.academic_year_id AND ay.tenant_id = e.tenant_id AND ay.school_id = e.school_id
        WHERE st.tenant_id = ${tenantId} AND st.school_id = ${schoolId}
        ORDER BY st.full_name
      `;
    } else if (type === "classes") {
      data = await tx`
        SELECT c.id AS row_id, c.name AS class_name, c.grade_level, ay.name AS academic_year,
               t.full_name AS homeroom_teacher,
               COUNT(e.id) FILTER (WHERE e.status = 'active')::int AS student_count,
               c.status
        FROM classes c
        JOIN academic_years ay ON ay.id = c.academic_year_id AND ay.tenant_id = c.tenant_id AND ay.school_id = c.school_id
        LEFT JOIN teachers t ON t.id = c.homeroom_teacher_id AND t.tenant_id = c.tenant_id AND t.school_id = c.school_id
        LEFT JOIN student_enrollments e ON e.class_id = c.id AND e.tenant_id = c.tenant_id AND e.school_id = c.school_id
        WHERE c.tenant_id = ${tenantId} AND c.school_id = ${schoolId}
          AND (${academicYearId}::uuid IS NULL OR c.academic_year_id = ${academicYearId}::uuid)
          AND (${teacherId}::uuid IS NULL OR EXISTS (
            SELECT 1 FROM teaching_assignments ta
            WHERE ta.class_id = c.id AND ta.academic_year_id = c.academic_year_id
              AND ta.teacher_id = ${teacherId}::uuid AND ta.tenant_id = c.tenant_id AND ta.school_id = c.school_id
          ))
        GROUP BY c.id, ay.name, t.full_name
        ORDER BY c.grade_level, c.name
      `;
    } else {
      data = await tx`
        SELECT r.id AS row_id, c.name AS class_name, c.grade_level, s.name AS subject_name,
               t.full_name AS teacher_name, a.title AS assessment_title,
               a.assessment_type, st.student_number, st.full_name AS student_name,
               r.score, a.max_score,
               CASE WHEN a.max_score > 0 AND r.score IS NOT NULL
                 THEN ROUND((r.score::numeric / a.max_score::numeric) * 100, 2)
                 ELSE NULL END AS percentage,
               r.feedback, r.graded_at
        FROM assessment_results r
        JOIN assessments a ON a.id = r.assessment_id AND a.tenant_id = r.tenant_id AND a.school_id = r.school_id
        JOIN teaching_assignments x ON x.id = a.assignment_id AND x.tenant_id = a.tenant_id AND x.school_id = a.school_id
        JOIN classes c ON c.id = x.class_id AND c.tenant_id = x.tenant_id AND c.school_id = x.school_id
        JOIN subjects s ON s.id = x.subject_id AND s.tenant_id = x.tenant_id AND s.school_id = x.school_id
        JOIN teachers t ON t.id = x.teacher_id AND t.tenant_id = x.tenant_id AND t.school_id = x.school_id
        JOIN students st ON st.id = r.student_id AND st.tenant_id = r.tenant_id AND st.school_id = r.school_id
        WHERE r.tenant_id = ${tenantId} AND r.school_id = ${schoolId}
          AND (${classId}::uuid IS NULL OR c.id = ${classId}::uuid)
          AND (${academicYearId}::uuid IS NULL OR x.academic_year_id = ${academicYearId}::uuid)
          AND (${teacherId}::uuid IS NULL OR x.teacher_id = ${teacherId}::uuid)
        ORDER BY c.grade_level, c.name, s.name, st.full_name, a.title
      `;
    }

    await tx`INSERT INTO audit_logs (tenant_id, school_id, actor_user_id, action, resource_type, resource_id, metadata) VALUES (${tenantId}, ${schoolId}, ${userId}, 'report.generated', 'report', ${type}, ${tx.json({ count: data.length, classId, academicYearId })})`;
    return NextResponse.json({
      reportType: type,
      generatedAt: new Date().toISOString(),
      count: data.length,
      data
    });
  });
}
