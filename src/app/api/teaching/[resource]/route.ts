import { NextResponse } from "next/server";
import type { TransactionSql } from "postgres";
import { z } from "zod";
import { withAuthenticatedUser } from "@/db/connection";

export const dynamic = "force-dynamic";

type DbTx = TransactionSql<Record<string, never>>;
const managerRoles = new Set(["tenant_owner", "tenant_admin", "principal", "vice_principal", "school_operator"]);
const teacherRoles = new Set(["teacher", "homeroom_teacher"]);
const resourceSchema = z.enum(["plans", "journals"]);
const databaseUuidSchema = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "ID harus berupa UUID PostgreSQL yang valid.");
const planCreate = z.object({
  title: z.string().trim().min(3).max(200),
  subject: z.string().trim().max(120).optional().default(""),
  gradeLevel: z.string().trim().max(50).optional().default(""),
  teacherId: databaseUuidSchema.optional().or(z.literal("")),
  objectives: z.string().trim().max(5000).optional().default(""),
  activities: z.string().trim().max(8000).optional().default(""),
  assessment: z.string().trim().max(5000).optional().default("")
});
const journalCreate = z.object({
  assignmentId: databaseUuidSchema,
  journalDate: z.string().date(),
  topic: z.string().trim().min(3).max(200),
  reflection: z.string().trim().max(10000).optional().default("")
});
const planUpdate = z.object({ id: databaseUuidSchema, status: z.enum(["draft", "submitted", "approved", "revision"]) });
const journalUpdate = z.object({ id: databaseUuidSchema, status: z.enum(["draft", "submitted", "reviewed"]) });

type Context = { params: Promise<{ resource: string }> };
type Work = (tx: DbTx, tenantId: string, schoolId: string, userId: string, teacherId: string | null, role: string) => Promise<Response>;

async function authorize(resource: string, work: Work) {
  if (!resourceSchema.safeParse(resource).success) return NextResponse.json({ error: "Modul pembelajaran tidak ditemukan." }, { status: 404 });
  try {
    return await withAuthenticatedUser(async (tx, _user, profile) => {
      const memberships = await tx`
        SELECT tenant_id, school_id, role FROM memberships
        WHERE user_id = ${profile.id} AND school_id IS NOT NULL
          AND role IN ('tenant_owner','tenant_admin','principal','vice_principal','school_operator','teacher','homeroom_teacher')
        ORDER BY created_at ASC LIMIT 2
      `;
      if (memberships.length !== 1) {
        return NextResponse.json({ error: "Akun harus memiliki tepat satu penempatan sekolah yang berwenang untuk aktivitas pembelajaran." }, { status: 403 });
      }
      const membership = memberships[0] as { tenant_id: string; school_id: string; role: string };
      await tx`SELECT set_config('app.tenant_id', ${membership.tenant_id}, true)`;
      let teacherId: string | null = null;
      if (teacherRoles.has(membership.role)) {
        const teacherRows = await tx`SELECT id FROM teachers WHERE user_id = ${profile.id} AND tenant_id = ${membership.tenant_id} AND school_id = ${membership.school_id} AND employment_status = 'active' LIMIT 1`;
        teacherId = (teacherRows[0]?.id as string | undefined) ?? null;
        if (!teacherId) return NextResponse.json({ error: "Akun guru belum ditautkan ke profil guru sekolah." }, { status: 403 });
      }
      return work(tx, membership.tenant_id, membership.school_id, profile.id, teacherId, membership.role);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Permintaan gagal.";
    const status = message === "UNAUTHENTICATED" ? 401 : message.includes("DATABASE_URL") ? 503 : 500;
    return NextResponse.json({ error: status === 500 ? "Terjadi kesalahan saat mengakses aktivitas pembelajaran." : message }, { status });
  }
}

export async function GET(_request: Request, { params }: Context) {
  const { resource } = await params;
  return authorize(resource, async (tx, tenantId, schoolId, _userId, teacherId, role) => {
    if (resource === "plans") {
      const data = teacherId
        ? await tx`SELECT p.id, p.title, p.subject, p.grade_level, p.status, p.content, p.created_at, t.full_name AS teacher_name FROM teaching_plans p LEFT JOIN teachers t ON t.id = p.teacher_id AND t.tenant_id = p.tenant_id AND t.school_id = p.school_id WHERE p.tenant_id = ${tenantId} AND p.school_id = ${schoolId} AND p.teacher_id = ${teacherId} ORDER BY p.created_at DESC LIMIT 500`
        : await tx`SELECT p.id, p.title, p.subject, p.grade_level, p.status, p.content, p.created_at, t.full_name AS teacher_name FROM teaching_plans p LEFT JOIN teachers t ON t.id = p.teacher_id AND t.tenant_id = p.tenant_id AND t.school_id = p.school_id WHERE p.tenant_id = ${tenantId} AND p.school_id = ${schoolId} ORDER BY p.created_at DESC LIMIT 500`;
      const teachers = managerRoles.has(role)
        ? await tx`SELECT id, full_name FROM teachers WHERE tenant_id = ${tenantId} AND school_id = ${schoolId} AND employment_status = 'active' ORDER BY full_name`
        : [];
      return NextResponse.json({ data, options: { teachers }, permissions: { canReview: managerRoles.has(role) } });
    }
    const [data, assignments] = await Promise.all([
      teacherId
        ? tx`SELECT j.id, j.journal_date, j.topic, j.reflection, j.status, j.created_at, j.assignment_id, j.teacher_id, t.full_name AS teacher_name, c.name AS class_name, s.name AS subject_name FROM teaching_journals j JOIN teaching_assignments a ON a.id = j.assignment_id AND a.tenant_id = j.tenant_id AND a.school_id = j.school_id JOIN teachers t ON t.id = j.teacher_id AND t.tenant_id = j.tenant_id AND t.school_id = j.school_id JOIN classes c ON c.id = a.class_id AND c.tenant_id = a.tenant_id AND c.school_id = a.school_id JOIN subjects s ON s.id = a.subject_id AND s.tenant_id = a.tenant_id AND s.school_id = a.school_id WHERE j.tenant_id = ${tenantId} AND j.school_id = ${schoolId} AND j.teacher_id = ${teacherId} ORDER BY j.journal_date DESC LIMIT 1000`
        : tx`SELECT j.id, j.journal_date, j.topic, j.reflection, j.status, j.created_at, j.assignment_id, j.teacher_id, t.full_name AS teacher_name, c.name AS class_name, s.name AS subject_name FROM teaching_journals j JOIN teaching_assignments a ON a.id = j.assignment_id AND a.tenant_id = j.tenant_id AND a.school_id = j.school_id JOIN teachers t ON t.id = j.teacher_id AND t.tenant_id = j.tenant_id AND t.school_id = j.school_id JOIN classes c ON c.id = a.class_id AND c.tenant_id = a.tenant_id AND c.school_id = a.school_id JOIN subjects s ON s.id = a.subject_id AND s.tenant_id = a.tenant_id AND s.school_id = a.school_id WHERE j.tenant_id = ${tenantId} AND j.school_id = ${schoolId} ORDER BY j.journal_date DESC LIMIT 1000`,
      teacherId
        ? tx`SELECT a.id, c.name AS class_name, s.name AS subject_name FROM teaching_assignments a JOIN classes c ON c.id = a.class_id AND c.tenant_id = a.tenant_id AND c.school_id = a.school_id JOIN subjects s ON s.id = a.subject_id AND s.tenant_id = a.tenant_id AND s.school_id = a.school_id WHERE a.tenant_id = ${tenantId} AND a.school_id = ${schoolId} AND a.teacher_id = ${teacherId} ORDER BY c.name, s.name`
        : tx`SELECT a.id, c.name AS class_name, s.name AS subject_name, t.full_name AS teacher_name FROM teaching_assignments a JOIN classes c ON c.id = a.class_id AND c.tenant_id = a.tenant_id AND c.school_id = a.school_id JOIN subjects s ON s.id = a.subject_id AND s.tenant_id = a.tenant_id AND s.school_id = a.school_id JOIN teachers t ON t.id = a.teacher_id AND t.tenant_id = a.tenant_id AND t.school_id = a.school_id WHERE a.tenant_id = ${tenantId} AND a.school_id = ${schoolId} ORDER BY c.name, s.name`
    ]);
    return NextResponse.json({ data, options: { assignments }, permissions: { canReview: managerRoles.has(role) } });
  });
}

export async function POST(request: Request, { params }: Context) {
  const { resource } = await params;
  const body: unknown = await request.json().catch(() => null);
  if (resource === "plans") {
    const parsed = planCreate.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Judul rencana ajar wajib diisi dengan benar." }, { status: 400 });
    return authorize(resource, async (tx, tenantId, schoolId, userId, teacherId) => {
      const data = parsed.data;
      const targetTeacherId = teacherId ?? (data.teacherId || null);
      if (targetTeacherId) {
        const teacherRows = await tx`SELECT id FROM teachers WHERE id = ${targetTeacherId} AND tenant_id = ${tenantId} AND school_id = ${schoolId} AND employment_status = 'active' LIMIT 1`;
        if (!teacherRows.length) return NextResponse.json({ error: "Guru yang dipilih tidak terdaftar pada sekolah ini." }, { status: 400 });
      }
      const content = { objectives: data.objectives, activities: data.activities, assessment: data.assessment };
      const rows = await tx`INSERT INTO teaching_plans (tenant_id, school_id, teacher_id, title, subject, grade_level, content) VALUES (${tenantId}, ${schoolId}, ${targetTeacherId}, ${data.title}, ${data.subject || null}, ${data.gradeLevel || null}, ${JSON.stringify(content)}::jsonb) RETURNING id, title, subject, grade_level, status, created_at`;
      await tx`INSERT INTO audit_logs (tenant_id, school_id, actor_user_id, action, resource_type, resource_id) VALUES (${tenantId}, ${schoolId}, ${userId}, 'teaching_plan.created', 'teaching_plan', ${rows[0].id})`;
      return NextResponse.json({ data: rows[0] }, { status: 201 });
    });
  }
  if (resource === "journals") {
    const parsed = journalCreate.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Pilih penugasan dan tanggal, lalu isi topik jurnal." }, { status: 400 });
    return authorize(resource, async (tx, tenantId, schoolId, userId, teacherId) => {
      const assignmentRows = await tx`SELECT teacher_id FROM teaching_assignments WHERE id = ${parsed.data.assignmentId} AND tenant_id = ${tenantId} AND school_id = ${schoolId} LIMIT 1`;
      const assignedTeacherId = assignmentRows[0]?.teacher_id as string | undefined;
      if (!assignedTeacherId) return NextResponse.json({ error: "Penugasan tidak ditemukan pada sekolah ini." }, { status: 400 });
      if (teacherId && teacherId !== assignedTeacherId) return NextResponse.json({ error: "Guru hanya dapat mencatat jurnal untuk penugasannya sendiri." }, { status: 403 });
      const rows = await tx`INSERT INTO teaching_journals (tenant_id, school_id, assignment_id, teacher_id, journal_date, topic, reflection) VALUES (${tenantId}, ${schoolId}, ${parsed.data.assignmentId}, ${assignedTeacherId}, ${new Date(parsed.data.journalDate).toISOString()}, ${parsed.data.topic}, ${parsed.data.reflection || null}) RETURNING id, journal_date, topic, reflection, status, created_at`;
      await tx`INSERT INTO audit_logs (tenant_id, school_id, actor_user_id, action, resource_type, resource_id) VALUES (${tenantId}, ${schoolId}, ${userId}, 'teaching_journal.created', 'teaching_journal', ${rows[0].id})`;
      return NextResponse.json({ data: rows[0] }, { status: 201 });
    });
  }
  return NextResponse.json({ error: "Modul pembelajaran tidak ditemukan." }, { status: 404 });
}

export async function PATCH(request: Request, { params }: Context) {
  const { resource } = await params;
  const body: unknown = await request.json().catch(() => null);
  if (resource === "plans") {
    const parsed = planUpdate.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Status rencana ajar tidak valid." }, { status: 400 });
    return authorize(resource, async (tx, tenantId, schoolId, userId, teacherId, role) => {
      if (teacherId && parsed.data.status !== "submitted") return NextResponse.json({ error: "Guru hanya dapat mengajukan rencana ajar untuk ditinjau." }, { status: 403 });
      if (managerRoles.has(role) && !["approved", "revision"].includes(parsed.data.status)) return NextResponse.json({ error: "Pengelola hanya dapat menyetujui atau meminta revisi rencana yang diajukan." }, { status: 400 });
      const rows = teacherId
        ? await tx`UPDATE teaching_plans SET status = 'submitted' WHERE id = ${parsed.data.id} AND tenant_id = ${tenantId} AND school_id = ${schoolId} AND teacher_id = ${teacherId} AND status IN ('draft','revision') RETURNING id, status`
        : await tx`UPDATE teaching_plans SET status = ${parsed.data.status} WHERE id = ${parsed.data.id} AND tenant_id = ${tenantId} AND school_id = ${schoolId} AND status = 'submitted' RETURNING id, status`;
      if (!rows.length) return NextResponse.json({ error: "Rencana ajar tidak ditemukan atau statusnya sudah berubah. Muat ulang data dan periksa alur persetujuan." }, { status: 409 });
      await tx`INSERT INTO audit_logs (tenant_id, school_id, actor_user_id, action, resource_type, resource_id) VALUES (${tenantId}, ${schoolId}, ${userId}, 'teaching_plan.status_changed', 'teaching_plan', ${parsed.data.id})`;
      return NextResponse.json({ data: rows[0] });
    });
  }
  if (resource === "journals") {
    const parsed = journalUpdate.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Status jurnal tidak valid." }, { status: 400 });
    return authorize(resource, async (tx, tenantId, schoolId, userId, teacherId, role) => {
      if (teacherId && parsed.data.status !== "submitted") return NextResponse.json({ error: "Guru hanya dapat mengajukan jurnal untuk ditinjau." }, { status: 403 });
      if (managerRoles.has(role) && parsed.data.status !== "reviewed") return NextResponse.json({ error: "Pengelola hanya dapat menandai jurnal yang diajukan sebagai telah ditinjau." }, { status: 400 });
      const rows = teacherId
        ? await tx`UPDATE teaching_journals SET status = 'submitted' WHERE id = ${parsed.data.id} AND tenant_id = ${tenantId} AND school_id = ${schoolId} AND teacher_id = ${teacherId} AND status = 'draft' RETURNING id, status`
        : await tx`UPDATE teaching_journals SET status = 'reviewed' WHERE id = ${parsed.data.id} AND tenant_id = ${tenantId} AND school_id = ${schoolId} AND status = 'submitted' RETURNING id, status`;
      if (!rows.length) return NextResponse.json({ error: "Jurnal tidak ditemukan atau statusnya sudah berubah. Muat ulang data dan periksa alur peninjauan." }, { status: 409 });
      await tx`INSERT INTO audit_logs (tenant_id, school_id, actor_user_id, action, resource_type, resource_id) VALUES (${tenantId}, ${schoolId}, ${userId}, 'teaching_journal.status_changed', 'teaching_journal', ${parsed.data.id})`;
      return NextResponse.json({ data: rows[0] });
    });
  }
  return NextResponse.json({ error: "Modul pembelajaran tidak ditemukan." }, { status: 404 });
}
