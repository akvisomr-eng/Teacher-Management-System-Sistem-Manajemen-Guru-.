import { NextResponse } from "next/server";
import type { TransactionSql } from "postgres";
import { withAuthenticatedUser } from "@/db/connection";

export const dynamic = "force-dynamic";
type DbTx = TransactionSql<Record<string, never>>;

async function withTeacher(work: (tx: DbTx, teacher: { teacher_id: string; tenant_id: string; school_id: string }) => Promise<Response>) {
  try {
    return await withAuthenticatedUser(async (tx, _user, profile) => {
      const memberships = await tx`
        SELECT tenant_id, school_id, role FROM memberships
        WHERE user_id = ${profile.id} AND role = 'teacher' AND school_id IS NOT NULL
        ORDER BY created_at ASC LIMIT 2
      `;
      if (memberships.length !== 1) {
        return NextResponse.json({ error: "Akun guru harus memiliki tepat satu penempatan aktif." }, { status: 403 });
      }
      const membership = memberships[0];
      await tx`SELECT set_config('app.tenant_id', ${membership.tenant_id}, true)`;
      const rows = await tx`
        SELECT t.id AS teacher_id, t.tenant_id, t.school_id
        FROM teachers t
        WHERE t.user_id = ${profile.id} AND t.tenant_id = ${membership.tenant_id}
          AND t.school_id = ${membership.school_id} AND t.employment_status = 'active'
        LIMIT 2
      `;
      if (rows.length !== 1) {
        return NextResponse.json({ error: "Akun guru belum tertaut ke tepat satu data induk guru aktif." }, { status: 403 });
      }
      return work(tx, rows[0] as { teacher_id: string; tenant_id: string; school_id: string });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Permintaan gagal.";
    const status = message === "UNAUTHENTICATED" ? 401 : message.includes("DATABASE_URL") ? 503 : 500;
    return NextResponse.json({ error: status === 500 ? "Data akademik belum dapat dimuat." : message }, { status });
  }
}

export async function GET() {
  return withTeacher(async (tx, teacher) => {
    const assignments = await tx`
      SELECT ta.id AS assignment_id, c.id AS class_id, c.name AS class_name,
        c.grade_level, s.id AS subject_id, s.name AS subject_name,
        ay.id AS academic_year_id, ay.name AS academic_year_name,
        (c.homeroom_teacher_id = ${teacher.teacher_id}) AS is_homeroom
      FROM teaching_assignments ta
      JOIN classes c ON c.id = ta.class_id AND c.tenant_id = ta.tenant_id AND c.school_id = ta.school_id
      JOIN subjects s ON s.id = ta.subject_id AND s.tenant_id = ta.tenant_id AND s.school_id = ta.school_id
      JOIN academic_years ay ON ay.id = ta.academic_year_id AND ay.tenant_id = ta.tenant_id AND ay.school_id = ta.school_id
      WHERE ta.tenant_id = ${teacher.tenant_id} AND ta.school_id = ${teacher.school_id}
        AND ta.teacher_id = ${teacher.teacher_id} AND ay.is_active = true
      ORDER BY c.name, s.name
    `;

    const classes = await tx`
      SELECT DISTINCT c.id AS class_id, c.name AS class_name, c.grade_level,
        ay.id AS academic_year_id, ay.name AS academic_year_name,
        (c.homeroom_teacher_id = ${teacher.teacher_id}) AS is_homeroom
      FROM classes c
      JOIN academic_years ay ON ay.id = c.academic_year_id
        AND ay.tenant_id = c.tenant_id AND ay.school_id = c.school_id
      LEFT JOIN teaching_assignments ta ON ta.class_id = c.id
        AND ta.tenant_id = c.tenant_id AND ta.school_id = c.school_id
        AND ta.academic_year_id = ay.id AND ta.teacher_id = ${teacher.teacher_id}
      WHERE c.tenant_id = ${teacher.tenant_id} AND c.school_id = ${teacher.school_id}
        AND c.status = 'active' AND ay.is_active = true
        AND (c.homeroom_teacher_id = ${teacher.teacher_id} OR ta.id IS NOT NULL)
      ORDER BY c.name
    `;

    const students = await tx`
      SELECT st.id AS student_id, st.student_number, st.full_name,
        c.id AS class_id, c.name AS class_name, c.grade_level
      FROM student_enrollments se
      JOIN students st ON st.id = se.student_id
        AND st.tenant_id = se.tenant_id AND st.school_id = se.school_id
      JOIN classes c ON c.id = se.class_id
        AND c.tenant_id = se.tenant_id AND c.school_id = se.school_id
      JOIN academic_years ay ON ay.id = se.academic_year_id
        AND ay.tenant_id = se.tenant_id AND ay.school_id = se.school_id
      WHERE se.tenant_id = ${teacher.tenant_id} AND se.school_id = ${teacher.school_id}
        AND se.status = 'active' AND st.status = 'active' AND ay.is_active = true
        AND (c.homeroom_teacher_id = ${teacher.teacher_id} OR EXISTS (
          SELECT 1 FROM teaching_assignments ta
          WHERE ta.tenant_id = se.tenant_id AND ta.school_id = se.school_id
            AND ta.class_id = c.id AND ta.academic_year_id = ay.id
            AND ta.teacher_id = ${teacher.teacher_id}
        ))
      ORDER BY c.name, st.full_name
    `;

    const assessments = await tx`
      SELECT a.id AS assessment_id, a.title, a.assessment_type, a.max_score,
        a.due_at, a.status, c.id AS class_id, c.name AS class_name,
        s.name AS subject_name, ay.name AS academic_year_name,
        ar.id AS result_id, ar.student_id, st.full_name AS student_name,
        ar.score, ar.feedback, ar.graded_at
      FROM assessments a
      JOIN teaching_assignments ta ON ta.id = a.assignment_id
        AND ta.tenant_id = a.tenant_id AND ta.school_id = a.school_id
      JOIN classes c ON c.id = ta.class_id
        AND c.tenant_id = ta.tenant_id AND c.school_id = ta.school_id
      JOIN subjects s ON s.id = ta.subject_id
        AND s.tenant_id = ta.tenant_id AND s.school_id = ta.school_id
      JOIN academic_years ay ON ay.id = ta.academic_year_id
        AND ay.tenant_id = ta.tenant_id AND ay.school_id = ta.school_id
      LEFT JOIN assessment_results ar ON ar.assessment_id = a.id
        AND ar.tenant_id = a.tenant_id AND ar.school_id = a.school_id
      LEFT JOIN students st ON st.id = ar.student_id
        AND st.tenant_id = ar.tenant_id AND st.school_id = ar.school_id
      WHERE a.tenant_id = ${teacher.tenant_id} AND a.school_id = ${teacher.school_id}
        AND ta.teacher_id = ${teacher.teacher_id} AND ay.is_active = true
      ORDER BY a.created_at DESC, st.full_name
      LIMIT 2000
    `;

    return NextResponse.json({
      academicYear: assignments[0]?.academic_year_name ?? classes[0]?.academic_year_name ?? null,
      assignments, classes, students, assessments
    }, { headers: { "Cache-Control": "private, no-store" } });
  });
}
