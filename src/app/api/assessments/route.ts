import { NextResponse } from "next/server";
import type { TransactionSql } from "postgres";
import { z } from "zod";
import { withAuthenticatedUser } from "@/db/connection";

export const dynamic = "force-dynamic";

type DbTx = TransactionSql<Record<string, never>>;
const managerRoles = new Set(["tenant_owner", "tenant_admin", "principal", "vice_principal", "school_operator"]);
const teacherRoles = new Set(["teacher", "homeroom_teacher"]);
const createSchema = z.object({
  assignmentId: z.string().uuid(),
  title: z.string().trim().min(3).max(180),
  assessmentType: z.string().trim().min(2).max(40),
  maxScore: z.number().int().min(1).max(1000).default(100),
  dueAt: z.string().max(40).optional().default("").refine(value => !value || !Number.isNaN(Date.parse(value)), "Tanggal tidak valid.")
});
const updateSchema = z.object({ id: z.string().uuid(), status: z.enum(["draft", "published", "closed"]) });

type Work = (tx: DbTx, tenantId: string, schoolId: string, userId: string, teacherId: string | null, role: string) => Promise<Response>;

async function authorize(work: Work) {
  try {
    return await withAuthenticatedUser(async (tx, _user, profile) => {
      const memberships = await tx`SELECT tenant_id, school_id, role FROM memberships WHERE user_id = ${profile.id} AND school_id IS NOT NULL ORDER BY created_at ASC LIMIT 1`;
      const membership = memberships[0] as { tenant_id: string; school_id: string; role: string } | undefined;
      if (!membership || (!managerRoles.has(membership.role) && !teacherRoles.has(membership.role))) return NextResponse.json({ error: "Anda tidak memiliki izin mengelola asesmen." }, { status: 403 });
      await tx`SELECT set_config('app.tenant_id', ${membership.tenant_id}, true)`;
      let teacherId: string | null = null;
      if (teacherRoles.has(membership.role)) {
        const rows = await tx`SELECT id FROM teachers WHERE user_id = ${profile.id} AND tenant_id = ${membership.tenant_id} AND school_id = ${membership.school_id} AND employment_status = 'active' LIMIT 1`;
        teacherId = (rows[0]?.id as string | undefined) ?? null;
        if (!teacherId) return NextResponse.json({ error: "Akun guru belum ditautkan ke profil guru sekolah." }, { status: 403 });
      }
      return work(tx, membership.tenant_id, membership.school_id, profile.id, teacherId, membership.role);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Permintaan gagal.";
    const status = message === "UNAUTHENTICATED" ? 401 : message.includes("DATABASE_URL") ? 503 : 500;
    return NextResponse.json({ error: status === 500 ? "Terjadi kesalahan saat mengakses asesmen." : message }, { status });
  }
}

export async function GET() {
  return authorize(async (tx, tenantId, schoolId, _userId, teacherId, role) => {
    const data = teacherId
      ? await tx`SELECT a.id, a.title, a.assessment_type, a.max_score, a.due_at, a.status, a.created_at, a.assignment_id, c.name AS class_name, c.grade_level, s.name AS subject_name, t.full_name AS teacher_name FROM assessments a JOIN teaching_assignments x ON x.id = a.assignment_id AND x.tenant_id = a.tenant_id AND x.school_id = a.school_id JOIN classes c ON c.id = x.class_id AND c.tenant_id = x.tenant_id AND c.school_id = x.school_id JOIN subjects s ON s.id = x.subject_id AND s.tenant_id = x.tenant_id AND s.school_id = x.school_id JOIN teachers t ON t.id = x.teacher_id AND t.tenant_id = x.tenant_id AND t.school_id = x.school_id WHERE a.tenant_id = ${tenantId} AND a.school_id = ${schoolId} AND x.teacher_id = ${teacherId} ORDER BY a.created_at DESC LIMIT 1000`
      : await tx`SELECT a.id, a.title, a.assessment_type, a.max_score, a.due_at, a.status, a.created_at, a.assignment_id, c.name AS class_name, c.grade_level, s.name AS subject_name, t.full_name AS teacher_name FROM assessments a JOIN teaching_assignments x ON x.id = a.assignment_id AND x.tenant_id = a.tenant_id AND x.school_id = a.school_id JOIN classes c ON c.id = x.class_id AND c.tenant_id = x.tenant_id AND c.school_id = x.school_id JOIN subjects s ON s.id = x.subject_id AND s.tenant_id = x.tenant_id AND s.school_id = x.school_id JOIN teachers t ON t.id = x.teacher_id AND t.tenant_id = x.tenant_id AND t.school_id = x.school_id WHERE a.tenant_id = ${tenantId} AND a.school_id = ${schoolId} ORDER BY a.created_at DESC LIMIT 1000`;
    const assignments = teacherId
      ? await tx`SELECT a.id, c.name AS class_name, c.grade_level, s.name AS subject_name FROM teaching_assignments a JOIN classes c ON c.id = a.class_id AND c.tenant_id = a.tenant_id AND c.school_id = a.school_id JOIN subjects s ON s.id = a.subject_id AND s.tenant_id = a.tenant_id AND s.school_id = a.school_id WHERE a.tenant_id = ${tenantId} AND a.school_id = ${schoolId} AND a.teacher_id = ${teacherId} ORDER BY c.name, s.name`
      : await tx`SELECT a.id, c.name AS class_name, c.grade_level, s.name AS subject_name, t.full_name AS teacher_name FROM teaching_assignments a JOIN classes c ON c.id = a.class_id AND c.tenant_id = a.tenant_id AND c.school_id = a.school_id JOIN subjects s ON s.id = a.subject_id AND s.tenant_id = a.tenant_id AND s.school_id = a.school_id JOIN teachers t ON t.id = a.teacher_id AND t.tenant_id = a.tenant_id AND t.school_id = a.school_id WHERE a.tenant_id = ${tenantId} AND a.school_id = ${schoolId} ORDER BY c.name, s.name`;
    return NextResponse.json({ data, options: { assignments }, permissions: { canPublish: managerRoles.has(role) } });
  });
}

export async function POST(request: Request) {
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Lengkapi penugasan, judul, jenis, dan nilai maksimum asesmen." }, { status: 400 });
  return authorize(async (tx, tenantId, schoolId, userId, teacherId) => {
    const data = parsed.data;
    const assignment = await tx`SELECT teacher_id FROM teaching_assignments WHERE id = ${data.assignmentId} AND tenant_id = ${tenantId} AND school_id = ${schoolId} LIMIT 1`;
    const assignedTeacherId = assignment[0]?.teacher_id as string | undefined;
    if (!assignedTeacherId) return NextResponse.json({ error: "Penugasan tidak ditemukan pada sekolah ini." }, { status: 400 });
    if (teacherId && teacherId !== assignedTeacherId) return NextResponse.json({ error: "Guru hanya dapat membuat asesmen untuk penugasannya sendiri." }, { status: 403 });
    const rows = await tx`INSERT INTO assessments (tenant_id, school_id, assignment_id, title, assessment_type, max_score, due_at) VALUES (${tenantId}, ${schoolId}, ${data.assignmentId}, ${data.title}, ${data.assessmentType}, ${data.maxScore}, ${data.dueAt ? new Date(data.dueAt).toISOString() : null}) RETURNING id, title, assessment_type, max_score, due_at, status, assignment_id, created_at`;
    await tx`INSERT INTO audit_logs (tenant_id, school_id, actor_user_id, action, resource_type, resource_id) VALUES (${tenantId}, ${schoolId}, ${userId}, 'assessment.created', 'assessment', ${rows[0].id})`;
    return NextResponse.json({ data: rows[0] }, { status: 201 });
  });
}

export async function PATCH(request: Request) {
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Perubahan status asesmen tidak valid." }, { status: 400 });
  return authorize(async (tx, tenantId, schoolId, userId, _teacherId, role) => {
    if (!managerRoles.has(role)) return NextResponse.json({ error: "Hanya pengelola sekolah yang dapat menerbitkan atau menutup asesmen." }, { status: 403 });
    const rows = await tx`UPDATE assessments SET status = ${parsed.data.status} WHERE id = ${parsed.data.id} AND tenant_id = ${tenantId} AND school_id = ${schoolId} RETURNING id, status`;
    if (!rows.length) return NextResponse.json({ error: "Asesmen tidak ditemukan." }, { status: 404 });
    await tx`INSERT INTO audit_logs (tenant_id, school_id, actor_user_id, action, resource_type, resource_id) VALUES (${tenantId}, ${schoolId}, ${userId}, 'assessment.status_changed', 'assessment', ${parsed.data.id})`;
    return NextResponse.json({ data: rows[0] });
  });
}
