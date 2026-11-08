import { NextResponse } from "next/server";
import type { TransactionSql } from "postgres";
import { z } from "zod";
import { withAuthenticatedUser } from "@/db/connection";

export const dynamic = "force-dynamic";

type DbTx = TransactionSql<Record<string, never>>;
const roles = new Set(["tenant_owner", "tenant_admin", "principal", "vice_principal", "school_operator"]);
const resourceSchema = z.enum(["assignments", "enrollments"]);
const assignmentCreate = z.object({
  academicYearId: z.string().uuid(),
  classId: z.string().uuid(),
  subjectId: z.string().uuid(),
  teacherId: z.string().uuid()
});
const enrollmentCreate = z.object({
  academicYearId: z.string().uuid(),
  classId: z.string().uuid(),
  studentId: z.string().uuid()
});
const updateEnrollment = z.object({
  id: z.string().uuid(),
  status: z.enum(["active", "completed", "transferred", "withdrawn"])
});

type Context = { params: Promise<{ resource: string }> };
type Work = (tx: DbTx, tenantId: string, schoolId: string, userId: string) => Promise<Response>;

async function authorize(resource: string, work: Work) {
  if (!resourceSchema.safeParse(resource).success) return NextResponse.json({ error: "Modul akademik tidak ditemukan." }, { status: 404 });
  try {
    return await withAuthenticatedUser(async (tx, _user, profile) => {
      const memberships = await tx`
        SELECT tenant_id, school_id, role FROM memberships
        WHERE user_id = ${profile.id} AND school_id IS NOT NULL
        ORDER BY created_at ASC LIMIT 1
      `;
      const membership = memberships[0] as { tenant_id: string; school_id: string; role: string } | undefined;
      if (!membership || !roles.has(membership.role)) return NextResponse.json({ error: "Anda tidak memiliki izin mengelola data akademik." }, { status: 403 });
      await tx`SELECT set_config('app.tenant_id', ${membership.tenant_id}, true)`;
      return work(tx, membership.tenant_id, membership.school_id, profile.id);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Permintaan gagal.";
    const status = message === "UNAUTHENTICATED" ? 401 : message.includes("DATABASE_URL") ? 503 : 500;
    return NextResponse.json({ error: status === 500 ? "Terjadi kesalahan saat mengakses data akademik." : message }, { status });
  }
}

export async function GET(_request: Request, { params }: Context) {
  const { resource } = await params;
  return authorize(resource, async (tx, tenantId, schoolId) => {
    if (resource === "assignments") {
      const [data, classes, subjects, teachers, academicYears] = await Promise.all([
        tx`SELECT a.id, a.created_at, a.academic_year_id, ay.name AS academic_year_name, a.class_id, c.name AS class_name, c.grade_level, a.subject_id, s.name AS subject_name, s.code AS subject_code, a.teacher_id, t.full_name AS teacher_name FROM teaching_assignments a JOIN academic_years ay ON ay.id = a.academic_year_id AND ay.tenant_id = a.tenant_id AND ay.school_id = a.school_id JOIN classes c ON c.id = a.class_id AND c.tenant_id = a.tenant_id AND c.school_id = a.school_id JOIN subjects s ON s.id = a.subject_id AND s.tenant_id = a.tenant_id AND s.school_id = a.school_id JOIN teachers t ON t.id = a.teacher_id AND t.tenant_id = a.tenant_id AND t.school_id = a.school_id WHERE a.tenant_id = ${tenantId} AND a.school_id = ${schoolId} ORDER BY ay.starts_on DESC, c.name, s.name LIMIT 1000`,
        tx`SELECT id, name, grade_level, academic_year_id FROM classes WHERE tenant_id = ${tenantId} AND school_id = ${schoolId} AND status = 'active' ORDER BY grade_level, name`,
        tx`SELECT id, name, code FROM subjects WHERE tenant_id = ${tenantId} AND school_id = ${schoolId} AND is_active = true ORDER BY name`,
        tx`SELECT id, full_name FROM teachers WHERE tenant_id = ${tenantId} AND school_id = ${schoolId} AND employment_status = 'active' ORDER BY full_name`,
        tx`SELECT id, name FROM academic_years WHERE tenant_id = ${tenantId} AND school_id = ${schoolId} ORDER BY starts_on DESC`
      ]);
      return NextResponse.json({ data, options: { classes, subjects, teachers, academicYears } });
    }
    const [data, students, classes, academicYears] = await Promise.all([
      tx`SELECT e.id, e.status, e.created_at, e.academic_year_id, ay.name AS academic_year_name, e.student_id, st.full_name AS student_name, st.student_number, e.class_id, c.name AS class_name, c.grade_level FROM student_enrollments e JOIN academic_years ay ON ay.id = e.academic_year_id AND ay.tenant_id = e.tenant_id AND ay.school_id = e.school_id JOIN students st ON st.id = e.student_id AND st.tenant_id = e.tenant_id AND st.school_id = e.school_id JOIN classes c ON c.id = e.class_id AND c.tenant_id = e.tenant_id AND c.school_id = e.school_id WHERE e.tenant_id = ${tenantId} AND e.school_id = ${schoolId} ORDER BY ay.starts_on DESC, c.name, st.full_name LIMIT 2000`,
      tx`SELECT id, full_name, student_number FROM students WHERE tenant_id = ${tenantId} AND school_id = ${schoolId} AND status = 'active' ORDER BY full_name`,
      tx`SELECT id, name, grade_level, academic_year_id FROM classes WHERE tenant_id = ${tenantId} AND school_id = ${schoolId} AND status = 'active' ORDER BY grade_level, name`,
      tx`SELECT id, name FROM academic_years WHERE tenant_id = ${tenantId} AND school_id = ${schoolId} ORDER BY starts_on DESC`
    ]);
    return NextResponse.json({ data, options: { students, classes, academicYears } });
  });
}

export async function POST(request: Request, { params }: Context) {
  const { resource } = await params;
  const body: unknown = await request.json().catch(() => null);
  if (resource === "assignments") {
    const parsed = assignmentCreate.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Pilih tahun ajaran, kelas, mata pelajaran, dan guru." }, { status: 400 });
    return authorize(resource, async (tx, tenantId, schoolId, userId) => {
      const data = parsed.data;
      const [classRows, subjectRows, teacherRows, duplicateRows] = await Promise.all([
        tx`SELECT id FROM classes WHERE id = ${data.classId} AND academic_year_id = ${data.academicYearId} AND tenant_id = ${tenantId} AND school_id = ${schoolId} AND status = 'active'`,
        tx`SELECT id FROM subjects WHERE id = ${data.subjectId} AND tenant_id = ${tenantId} AND school_id = ${schoolId} AND is_active = true`,
        tx`SELECT id FROM teachers WHERE id = ${data.teacherId} AND tenant_id = ${tenantId} AND school_id = ${schoolId} AND employment_status = 'active'`,
        tx`SELECT id FROM teaching_assignments WHERE tenant_id = ${tenantId} AND school_id = ${schoolId} AND academic_year_id = ${data.academicYearId} AND class_id = ${data.classId} AND subject_id = ${data.subjectId} AND teacher_id = ${data.teacherId}`
      ]);
      if (!classRows.length || !subjectRows.length || !teacherRows.length) return NextResponse.json({ error: "Kombinasi kelas, tahun ajaran, mapel, atau guru tidak valid." }, { status: 400 });
      if (duplicateRows.length) return NextResponse.json({ error: "Penugasan yang sama sudah terdaftar." }, { status: 409 });
      const rows = await tx`INSERT INTO teaching_assignments (tenant_id, school_id, class_id, subject_id, teacher_id, academic_year_id) VALUES (${tenantId}, ${schoolId}, ${data.classId}, ${data.subjectId}, ${data.teacherId}, ${data.academicYearId}) RETURNING id, class_id, subject_id, teacher_id, academic_year_id, created_at`;
      await tx`INSERT INTO audit_logs (tenant_id, school_id, actor_user_id, action, resource_type, resource_id) VALUES (${tenantId}, ${schoolId}, ${userId}, 'teaching_assignment.created', 'teaching_assignment', ${rows[0].id})`;
      return NextResponse.json({ data: rows[0] }, { status: 201 });
    });
  }
  if (resource === "enrollments") {
    const parsed = enrollmentCreate.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Pilih tahun ajaran, siswa, dan kelas." }, { status: 400 });
    return authorize(resource, async (tx, tenantId, schoolId, userId) => {
      const data = parsed.data;
      const [classRows, studentRows, duplicateRows] = await Promise.all([
        tx`SELECT id FROM classes WHERE id = ${data.classId} AND academic_year_id = ${data.academicYearId} AND tenant_id = ${tenantId} AND school_id = ${schoolId} AND status = 'active'`,
        tx`SELECT id FROM students WHERE id = ${data.studentId} AND tenant_id = ${tenantId} AND school_id = ${schoolId} AND status = 'active'`,
        tx`SELECT id FROM student_enrollments WHERE tenant_id = ${tenantId} AND school_id = ${schoolId} AND academic_year_id = ${data.academicYearId} AND student_id = ${data.studentId}`
      ]);
      if (!classRows.length || !studentRows.length) return NextResponse.json({ error: "Siswa atau kelas tidak valid." }, { status: 400 });
      if (duplicateRows.length) return NextResponse.json({ error: "Siswa sudah terdaftar pada tahun ajaran ini." }, { status: 409 });
      const rows = await tx`INSERT INTO student_enrollments (tenant_id, school_id, student_id, class_id, academic_year_id) VALUES (${tenantId}, ${schoolId}, ${data.studentId}, ${data.classId}, ${data.academicYearId}) RETURNING id, student_id, class_id, academic_year_id, status, created_at`;
      await tx`INSERT INTO audit_logs (tenant_id, school_id, actor_user_id, action, resource_type, resource_id) VALUES (${tenantId}, ${schoolId}, ${userId}, 'student_enrollment.created', 'student_enrollment', ${rows[0].id})`;
      return NextResponse.json({ data: rows[0] }, { status: 201 });
    });
  }
  return NextResponse.json({ error: "Modul akademik tidak ditemukan." }, { status: 404 });
}

export async function PATCH(request: Request, { params }: Context) {
  const { resource } = await params;
  if (resource !== "enrollments") return NextResponse.json({ error: "Perubahan penugasan tidak didukung." }, { status: 405 });
  const parsed = updateEnrollment.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Perubahan status siswa tidak valid." }, { status: 400 });
  return authorize(resource, async (tx, tenantId, schoolId, userId) => {
    const rows = await tx`UPDATE student_enrollments SET status = ${parsed.data.status} WHERE id = ${parsed.data.id} AND tenant_id = ${tenantId} AND school_id = ${schoolId} RETURNING id, status, student_id, class_id, academic_year_id`;
    if (!rows.length) return NextResponse.json({ error: "Pendaftaran siswa tidak ditemukan." }, { status: 404 });
    await tx`INSERT INTO audit_logs (tenant_id, school_id, actor_user_id, action, resource_type, resource_id) VALUES (${tenantId}, ${schoolId}, ${userId}, 'student_enrollment.updated', 'student_enrollment', ${parsed.data.id})`;
    return NextResponse.json({ data: rows[0] });
  });
}
