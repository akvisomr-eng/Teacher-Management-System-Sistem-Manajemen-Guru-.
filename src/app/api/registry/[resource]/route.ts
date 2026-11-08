import { NextResponse } from "next/server";
import type { TransactionSql } from "postgres";
import { z } from "zod";
import { withAuthenticatedUser } from "@/db/connection";

export const dynamic = "force-dynamic";

type DbTx = TransactionSql<Record<string, never>>;
const roles = new Set(["tenant_owner", "tenant_admin", "principal", "vice_principal", "school_operator"]);
const resourceSchema = z.enum(["teachers", "students", "classes", "subjects"]);
const teacherCreate = z.object({
  fullName: z.string().trim().min(2).max(180),
  employeeNumber: z.string().trim().max(50).optional().default(""),
  education: z.string().trim().max(80).optional().default("")
});
const studentProfileSchema = z.object({
  birthPlace: z.string().trim().max(100).optional().default(""),
  gender: z.enum(["L", "P", ""]).optional().default(""),
  religion: z.string().trim().max(40).optional().default(""),
  nik: z.string().trim().max(16).optional().default(""),
  familyCardNumber: z.string().trim().max(16).optional().default(""),
  address: z.string().trim().max(500).optional().default(""),
  province: z.string().trim().max(100).optional().default(""),
  city: z.string().trim().max(100).optional().default(""),
  district: z.string().trim().max(100).optional().default(""),
  village: z.string().trim().max(100).optional().default(""),
  postalCode: z.string().trim().max(10).optional().default(""),
  fatherName: z.string().trim().max(180).optional().default(""),
  fatherNik: z.string().trim().max(16).optional().default(""),
  fatherPhone: z.string().trim().max(30).optional().default(""),
  motherName: z.string().trim().max(180).optional().default(""),
  motherNik: z.string().trim().max(16).optional().default(""),
  motherPhone: z.string().trim().max(30).optional().default(""),
  guardianName: z.string().trim().max(180).optional().default(""),
  guardianRelation: z.string().trim().max(60).optional().default(""),
  guardianPhone: z.string().trim().max(30).optional().default(""),
  previousSchool: z.string().trim().max(180).optional().default(""),
  admissionDate: z.string().date().optional().or(z.literal("")),
  childOrder: z.number().int().min(1).max(30).nullable().optional(),
  siblingsCount: z.number().int().min(0).max(30).nullable().optional(),
  transportMode: z.string().trim().max(80).optional().default("")
});
const studentCreate = z.object({
  fullName: z.string().trim().min(2).max(180),
  studentNumber: z.string().trim().max(50).optional().default(""),
  birthDate: z.string().date().optional().or(z.literal("")),
  profile: studentProfileSchema.partial().default({})
});
const classCreate = z.object({
  name: z.string().trim().min(1).max(100),
  gradeLevel: z.string().trim().min(1).max(50),
  academicYearId: z.string().uuid(),
  homeroomTeacherId: z.string().uuid().optional().or(z.literal(""))
});
const subjectCreate = z.object({
  name: z.string().trim().min(2).max(140),
  code: z.string().trim().max(40).optional().default(""),
  category: z.string().trim().max(80).optional().default("")
});
const updateSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().trim().min(2).max(180).optional(),
  employeeNumber: z.string().trim().max(50).optional(),
  education: z.string().trim().max(80).optional(),
  studentNumber: z.string().trim().max(50).optional(),
  birthDate: z.string().date().optional().or(z.literal("")),
  profile: studentProfileSchema.partial().optional(),
  status: z.string().trim().min(1).max(30).optional(),
  name: z.string().trim().min(1).max(140).optional(),
  gradeLevel: z.string().trim().min(1).max(50).optional(),
  homeroomTeacherId: z.string().uuid().optional().or(z.literal("")),
  code: z.string().trim().max(40).optional(),
  category: z.string().trim().max(80).optional(),
  isActive: z.boolean().optional()
}).refine((data) => Object.keys(data).some((key) => key !== "id"), "Tidak ada perubahan.");

type Context = { params: Promise<{ resource: string }> };
type Work = (tx: DbTx, tenantId: string, schoolId: string, userId: string) => Promise<Response>;

async function authorize(resource: string, work: Work) {
  if (!resourceSchema.safeParse(resource).success) return NextResponse.json({ error: "Modul tidak ditemukan." }, { status: 404 });
  try {
    return await withAuthenticatedUser(async (tx, _user, profile) => {
      const memberships = await tx`
        SELECT tenant_id, school_id, role FROM memberships
        WHERE user_id = ${profile.id} AND school_id IS NOT NULL
        ORDER BY created_at ASC LIMIT 1
      `;
      const membership = memberships[0] as { tenant_id: string; school_id: string; role: string } | undefined;
      if (!membership || !roles.has(membership.role)) return NextResponse.json({ error: "Anda tidak memiliki izin mengelola data sekolah." }, { status: 403 });
      await tx`SELECT set_config('app.tenant_id', ${membership.tenant_id}, true)`;
      return work(tx, membership.tenant_id, membership.school_id, profile.id);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Permintaan gagal.";
    const status = message === "UNAUTHENTICATED" ? 401 : message.includes("DATABASE_URL") ? 503 : 500;
    return NextResponse.json({ error: status === 500 ? "Terjadi kesalahan saat mengakses data sekolah." : message }, { status });
  }
}

export async function GET(_request: Request, { params }: Context) {
  const { resource } = await params;
  return authorize(resource, async (tx, tenantId, schoolId) => {
    if (resource === "teachers") {
      const rows = await tx`SELECT id, full_name, employee_number, education, employment_status AS status, created_at FROM teachers WHERE tenant_id = ${tenantId} AND school_id = ${schoolId} ORDER BY full_name ASC LIMIT 500`;
      return NextResponse.json({ data: rows });
    }
    if (resource === "students") {
      const rows = await tx`SELECT id, full_name, student_number, birth_date, profile, status, created_at FROM students WHERE tenant_id = ${tenantId} AND school_id = ${schoolId} ORDER BY full_name ASC LIMIT 500`;
      return NextResponse.json({ data: rows });
    }
    if (resource === "classes") {
      const [rows, academicYears, teachers] = await Promise.all([
        tx`SELECT c.id, c.name, c.grade_level, c.status, c.created_at, c.academic_year_id, ay.name AS academic_year_name, c.homeroom_teacher_id, t.full_name AS homeroom_teacher_name FROM classes c JOIN academic_years ay ON ay.id = c.academic_year_id AND ay.tenant_id = c.tenant_id AND ay.school_id = c.school_id LEFT JOIN teachers t ON t.id = c.homeroom_teacher_id AND t.tenant_id = c.tenant_id AND t.school_id = c.school_id WHERE c.tenant_id = ${tenantId} AND c.school_id = ${schoolId} ORDER BY ay.starts_on DESC, c.grade_level, c.name LIMIT 500`,
        tx`SELECT id, name FROM academic_years WHERE tenant_id = ${tenantId} AND school_id = ${schoolId} ORDER BY starts_on DESC`,
        tx`SELECT id, full_name FROM teachers WHERE tenant_id = ${tenantId} AND school_id = ${schoolId} AND employment_status = 'active' ORDER BY full_name`
      ]);
      return NextResponse.json({ data: rows, options: { academicYears, teachers } });
    }
    const rows = await tx`SELECT id, code, name, category, is_active, created_at FROM subjects WHERE tenant_id = ${tenantId} AND school_id = ${schoolId} ORDER BY name LIMIT 500`;
    return NextResponse.json({ data: rows });
  });
}

export async function POST(request: Request, { params }: Context) {
  const { resource } = await params;
  const body: unknown = await request.json().catch(() => null);
  if (resource === "teachers") {
    const parsed = teacherCreate.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Data guru tidak valid. Nama lengkap wajib diisi." }, { status: 400 });
    return authorize(resource, async (tx, tenantId, schoolId, userId) => {
      const data = parsed.data;
      const rows = await tx`INSERT INTO teachers (tenant_id, school_id, full_name, employee_number, education) VALUES (${tenantId}, ${schoolId}, ${data.fullName}, ${data.employeeNumber || null}, ${data.education || null}) RETURNING id, full_name, employee_number, education, employment_status AS status, created_at`;
      await tx`INSERT INTO audit_logs (tenant_id, school_id, actor_user_id, action, resource_type, resource_id) VALUES (${tenantId}, ${schoolId}, ${userId}, 'teacher.created', 'teacher', ${rows[0].id})`;
      return NextResponse.json({ data: rows[0] }, { status: 201 });
    });
  }
  if (resource === "students") {
    const parsed = studentCreate.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Data siswa tidak valid. Nama lengkap wajib diisi." }, { status: 400 });
    return authorize(resource, async (tx, tenantId, schoolId, userId) => {
      const data = parsed.data;
      const rows = await tx`INSERT INTO students (tenant_id, school_id, full_name, student_number, birth_date, profile) VALUES (${tenantId}, ${schoolId}, ${data.fullName}, ${data.studentNumber || null}, ${data.birthDate ? new Date(data.birthDate).toISOString() : null}, ${JSON.stringify(data.profile)}::jsonb) RETURNING id, full_name, student_number, birth_date, profile, status, created_at`;
      await tx`INSERT INTO audit_logs (tenant_id, school_id, actor_user_id, action, resource_type, resource_id) VALUES (${tenantId}, ${schoolId}, ${userId}, 'student.created', 'student', ${rows[0].id})`;
      return NextResponse.json({ data: rows[0] }, { status: 201 });
    });
  }
  if (resource === "classes") {
    const parsed = classCreate.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Lengkapi nama kelas, tingkat, dan tahun ajaran." }, { status: 400 });
    return authorize(resource, async (tx, tenantId, schoolId, userId) => {
      const data = parsed.data;
      const rows = await tx`INSERT INTO classes (tenant_id, school_id, academic_year_id, name, grade_level, homeroom_teacher_id) VALUES (${tenantId}, ${schoolId}, ${data.academicYearId}, ${data.name}, ${data.gradeLevel}, ${data.homeroomTeacherId || null}) RETURNING id, name, grade_level, status, academic_year_id, homeroom_teacher_id, created_at`;
      await tx`INSERT INTO audit_logs (tenant_id, school_id, actor_user_id, action, resource_type, resource_id) VALUES (${tenantId}, ${schoolId}, ${userId}, 'class.created', 'class', ${rows[0].id})`;
      return NextResponse.json({ data: rows[0] }, { status: 201 });
    });
  }
  if (resource === "subjects") {
    const parsed = subjectCreate.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Nama mata pelajaran wajib diisi." }, { status: 400 });
    return authorize(resource, async (tx, tenantId, schoolId, userId) => {
      const data = parsed.data;
      const rows = await tx`INSERT INTO subjects (tenant_id, school_id, code, name, category) VALUES (${tenantId}, ${schoolId}, ${data.code || null}, ${data.name}, ${data.category || null}) RETURNING id, code, name, category, is_active, created_at`;
      await tx`INSERT INTO audit_logs (tenant_id, school_id, actor_user_id, action, resource_type, resource_id) VALUES (${tenantId}, ${schoolId}, ${userId}, 'subject.created', 'subject', ${rows[0].id})`;
      return NextResponse.json({ data: rows[0] }, { status: 201 });
    });
  }
  return NextResponse.json({ error: "Modul tidak ditemukan." }, { status: 404 });
}

export async function PATCH(request: Request, { params }: Context) {
  const { resource } = await params;
  if (!resourceSchema.safeParse(resource).success) return NextResponse.json({ error: "Modul tidak ditemukan." }, { status: 404 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Perubahan data tidak valid." }, { status: 400 });
  const { id, ...changes } = parsed.data;
  return authorize(resource, async (tx, tenantId, schoolId, userId) => {
    let rows;
    if (resource === "teachers") {
      const status = changes.status;
      if (status && !["active", "inactive", "leave"].includes(status)) return NextResponse.json({ error: "Status guru tidak valid." }, { status: 400 });
      rows = await tx`UPDATE teachers SET full_name = COALESCE(${changes.fullName ?? null}, full_name), employee_number = CASE WHEN ${changes.employeeNumber !== undefined} THEN NULLIF(${changes.employeeNumber ?? ""}, '') ELSE employee_number END, education = CASE WHEN ${changes.education !== undefined} THEN NULLIF(${changes.education ?? ""}, '') ELSE education END, employment_status = COALESCE(${status ?? null}, employment_status) WHERE id = ${id} AND tenant_id = ${tenantId} AND school_id = ${schoolId} RETURNING id, full_name, employee_number, education, employment_status AS status, created_at`;
    } else if (resource === "students") {
      const status = changes.status;
      if (status && !["active", "inactive", "graduated", "transferred"].includes(status)) return NextResponse.json({ error: "Status siswa tidak valid." }, { status: 400 });
      rows = await tx`UPDATE students SET full_name = COALESCE(${changes.fullName ?? null}, full_name), student_number = CASE WHEN ${changes.studentNumber !== undefined} THEN NULLIF(${changes.studentNumber ?? ""}, '') ELSE student_number END, birth_date = CASE WHEN ${changes.birthDate !== undefined} THEN ${changes.birthDate ? new Date(changes.birthDate).toISOString() : null}::timestamptz ELSE birth_date END, profile = CASE WHEN ${changes.profile !== undefined} THEN profile || ${JSON.stringify(changes.profile ?? {})}::jsonb ELSE profile END, status = COALESCE(${status ?? null}, status) WHERE id = ${id} AND tenant_id = ${tenantId} AND school_id = ${schoolId} RETURNING id, full_name, student_number, birth_date, profile, status, created_at`;
    } else if (resource === "classes") {
      const status = changes.status;
      if (status && !["active", "inactive"].includes(status)) return NextResponse.json({ error: "Status kelas tidak valid." }, { status: 400 });
      rows = await tx`UPDATE classes SET name = COALESCE(${changes.name ?? null}, name), grade_level = COALESCE(${changes.gradeLevel ?? null}, grade_level), homeroom_teacher_id = CASE WHEN ${changes.homeroomTeacherId !== undefined} THEN ${changes.homeroomTeacherId || null}::uuid ELSE homeroom_teacher_id END, status = COALESCE(${status ?? null}, status) WHERE id = ${id} AND tenant_id = ${tenantId} AND school_id = ${schoolId} RETURNING id, name, grade_level, status, academic_year_id, homeroom_teacher_id, created_at`;
    } else {
      rows = await tx`UPDATE subjects SET name = COALESCE(${changes.name ?? null}, name), code = CASE WHEN ${changes.code !== undefined} THEN NULLIF(${changes.code ?? ""}, '') ELSE code END, category = CASE WHEN ${changes.category !== undefined} THEN NULLIF(${changes.category ?? ""}, '') ELSE category END, is_active = COALESCE(${changes.isActive ?? null}, is_active) WHERE id = ${id} AND tenant_id = ${tenantId} AND school_id = ${schoolId} RETURNING id, code, name, category, is_active, created_at`;
    }
    if (!rows.length) return NextResponse.json({ error: "Data tidak ditemukan." }, { status: 404 });
    const resourceType = resource === "teachers" ? "teacher" : resource === "students" ? "student" : resource === "classes" ? "class" : "subject";
    await tx`INSERT INTO audit_logs (tenant_id, school_id, actor_user_id, action, resource_type, resource_id) VALUES (${tenantId}, ${schoolId}, ${userId}, ${resourceType + ".updated"}, ${resourceType}, ${id})`;
    return NextResponse.json({ data: rows[0] });
  });
}
