import { NextResponse } from "next/server";
import type { TransactionSql } from "postgres";
import { z } from "zod";
import { withAuthenticatedUser } from "@/db/connection";

export const dynamic = "force-dynamic";

type DbTx = TransactionSql<Record<string, never>>;
const managerRoles = new Set(["tenant_owner", "tenant_admin", "principal", "vice_principal", "school_operator"]);
const teacherRoles = new Set(["teacher", "homeroom_teacher"]);
const resultSchema = z.object({
  studentId: z.string().uuid(),
  score: z.number().int().min(0).max(1000),
  feedback: z.string().trim().max(5000).optional().default("")
});
type Context = { params: Promise<{ id: string }> };
type Work = (tx: DbTx, tenantId: string, schoolId: string, userId: string, teacherId: string | null) => Promise<Response>;

async function authorize(work: Work) {
  try {
    return await withAuthenticatedUser(async (tx, _user, profile) => {
      const memberships = await tx`SELECT tenant_id, school_id, role FROM memberships WHERE user_id = ${profile.id} AND school_id IS NOT NULL ORDER BY created_at ASC LIMIT 1`;
      const membership = memberships[0] as { tenant_id: string; school_id: string; role: string } | undefined;
      if (!membership || (!managerRoles.has(membership.role) && !teacherRoles.has(membership.role))) return NextResponse.json({ error: "Anda tidak memiliki izin mengelola nilai." }, { status: 403 });
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
    return NextResponse.json({ error: status === 500 ? "Terjadi kesalahan saat mengakses nilai." : message }, { status });
  }
}

async function loadAssessment(tx: DbTx, id: string, tenantId: string, schoolId: string, teacherId: string | null) {
  const rows = teacherId
    ? await tx`SELECT a.id, a.title, a.assessment_type, a.max_score, a.status, a.assignment_id, x.teacher_id, x.class_id, x.academic_year_id, c.name AS class_name, c.grade_level, s.name AS subject_name FROM assessments a JOIN teaching_assignments x ON x.id = a.assignment_id AND x.tenant_id = a.tenant_id AND x.school_id = a.school_id JOIN classes c ON c.id = x.class_id AND c.tenant_id = x.tenant_id AND c.school_id = x.school_id JOIN subjects s ON s.id = x.subject_id AND s.tenant_id = x.tenant_id AND s.school_id = x.school_id WHERE a.id = ${id} AND a.tenant_id = ${tenantId} AND a.school_id = ${schoolId} AND x.teacher_id = ${teacherId} LIMIT 1`
    : await tx`SELECT a.id, a.title, a.assessment_type, a.max_score, a.status, a.assignment_id, x.teacher_id, x.class_id, x.academic_year_id, c.name AS class_name, c.grade_level, s.name AS subject_name FROM assessments a JOIN teaching_assignments x ON x.id = a.assignment_id AND x.tenant_id = a.tenant_id AND x.school_id = a.school_id JOIN classes c ON c.id = x.class_id AND c.tenant_id = x.tenant_id AND c.school_id = x.school_id JOIN subjects s ON s.id = x.subject_id AND s.tenant_id = x.tenant_id AND s.school_id = x.school_id WHERE a.id = ${id} AND a.tenant_id = ${tenantId} AND a.school_id = ${schoolId} LIMIT 1`;
  return rows[0] as { id: string; title: string; assessment_type: string; max_score: number; status: string; assignment_id: string; teacher_id: string; class_id: string; academic_year_id: string; class_name: string; grade_level: string; subject_name: string } | undefined;
}

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "ID asesmen tidak valid." }, { status: 400 });
  return authorize(async (tx, tenantId, schoolId, _userId, teacherId) => {
    const assessment = await loadAssessment(tx, id, tenantId, schoolId, teacherId);
    if (!assessment) return NextResponse.json({ error: "Asesmen tidak ditemukan." }, { status: 404 });
    const students = await tx`
      SELECT st.id AS student_id, st.full_name, st.student_number, r.id AS result_id, r.score, r.feedback, r.graded_at
      FROM student_enrollments e
      JOIN students st ON st.id = e.student_id AND st.tenant_id = e.tenant_id AND st.school_id = e.school_id
      LEFT JOIN assessment_results r ON r.assessment_id = ${id} AND r.student_id = st.id AND r.tenant_id = e.tenant_id AND r.school_id = e.school_id
      WHERE e.tenant_id = ${tenantId} AND e.school_id = ${schoolId}
        AND e.class_id = ${assessment.class_id} AND e.academic_year_id = ${assessment.academic_year_id}
        AND e.status = 'active'
      ORDER BY st.full_name
    `;
    return NextResponse.json({ assessment, data: students });
  });
}

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "ID asesmen tidak valid." }, { status: 400 });
  const parsed = resultSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Nilai harus berupa angka valid dan umpan balik maksimal 5.000 karakter." }, { status: 400 });
  return authorize(async (tx, tenantId, schoolId, userId, teacherId) => {
    const assessment = await loadAssessment(tx, id, tenantId, schoolId, teacherId);
    if (!assessment) return NextResponse.json({ error: "Asesmen tidak ditemukan atau bukan bagian dari penugasan Anda." }, { status: 404 });
    if (assessment.status === "closed") return NextResponse.json({ error: "Asesmen telah ditutup dan tidak menerima perubahan nilai." }, { status: 409 });
    if (parsed.data.score > assessment.max_score) return NextResponse.json({ error: `Nilai tidak boleh melebihi ${assessment.max_score}.` }, { status: 400 });
    const enrollment = await tx`SELECT id FROM student_enrollments WHERE tenant_id = ${tenantId} AND school_id = ${schoolId} AND student_id = ${parsed.data.studentId} AND class_id = ${assessment.class_id} AND academic_year_id = ${assessment.academic_year_id} AND status = 'active' LIMIT 1`;
    if (!enrollment.length) return NextResponse.json({ error: "Siswa tidak terdaftar pada kelas dan tahun ajaran asesmen ini." }, { status: 400 });
    const rows = await tx`
      INSERT INTO assessment_results (tenant_id, school_id, assessment_id, student_id, score, feedback, graded_at)
      VALUES (${tenantId}, ${schoolId}, ${id}, ${parsed.data.studentId}, ${parsed.data.score}, ${parsed.data.feedback || null}, now())
      ON CONFLICT (assessment_id, student_id)
      DO UPDATE SET score = EXCLUDED.score, feedback = EXCLUDED.feedback, graded_at = now()
      RETURNING id, assessment_id, student_id, score, feedback, graded_at
    `;
    await tx`INSERT INTO audit_logs (tenant_id, school_id, actor_user_id, action, resource_type, resource_id) VALUES (${tenantId}, ${schoolId}, ${userId}, 'assessment_result.upserted', 'assessment_result', ${rows[0].id})`;
    return NextResponse.json({ data: rows[0] }, { status: 201 });
  });
}
