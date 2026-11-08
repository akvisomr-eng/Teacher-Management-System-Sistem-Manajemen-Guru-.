import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthenticatedUser } from "@/db/connection";

export const dynamic = "force-dynamic";

const roles = new Set(["tenant_owner", "tenant_admin", "principal", "vice_principal", "school_operator"]);
const resourceSchema = z.enum(["teachers", "students"]);
const teacherCreate = z.object({
  fullName: z.string().trim().min(2).max(180),
  employeeNumber: z.string().trim().max(50).optional().default(""),
  education: z.string().trim().max(80).optional().default("")
});
const studentCreate = z.object({
  fullName: z.string().trim().min(2).max(180),
  studentNumber: z.string().trim().max(50).optional().default(""),
  birthDate: z.string().date().optional().or(z.literal(""))
});
const updateSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().trim().min(2).max(180).optional(),
  employeeNumber: z.string().trim().max(50).optional(),
  education: z.string().trim().max(80).optional(),
  studentNumber: z.string().trim().max(50).optional(),
  birthDate: z.string().date().optional().or(z.literal("")),
  status: z.string().trim().min(1).max(30).optional()
}).refine((data) => Object.keys(data).some((key) => key !== "id"), "Tidak ada perubahan.");

type Context = { params: Promise<{ resource: string }> };

async function authorize(resource: string, work: (tx: any, tenantId: string, schoolId: string, userId: string) => Promise<Response>) {
  const parsed = resourceSchema.safeParse(resource);
  if (!parsed.success) return NextResponse.json({ error: "Modul tidak ditemukan." }, { status: 404 });
  try {
    return await withAuthenticatedUser(async (tx, _user, profile) => {
      const memberships = await tx`
        SELECT tenant_id, school_id, role FROM memberships
        WHERE user_id = ${profile.id} AND school_id IS NOT NULL
        ORDER BY created_at ASC LIMIT 1
      `;
      const membership = memberships[0] as { tenant_id: string; school_id: string; role: string } | undefined;
      if (!membership || !roles.has(membership.role)) {
        return NextResponse.json({ error: "Anda tidak memiliki izin mengelola data sekolah." }, { status: 403 });
      }
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
    const rows = resource === "teachers"
      ? await tx`SELECT id, full_name, employee_number, education, employment_status AS status, created_at FROM teachers WHERE tenant_id = ${tenantId} AND school_id = ${schoolId} ORDER BY full_name ASC LIMIT 500`
      : await tx`SELECT id, full_name, student_number, birth_date, status, created_at FROM students WHERE tenant_id = ${tenantId} AND school_id = ${schoolId} ORDER BY full_name ASC LIMIT 500`;
    return NextResponse.json({ data: rows });
  });
}

export async function POST(request: Request, { params }: Context) {
  const { resource } = await params;
  const body = await request.json().catch(() => null);
  const parsed = resource === "teachers" ? teacherCreate.safeParse(body) : resource === "students" ? studentCreate.safeParse(body) : null;
  if (!parsed || !parsed.success) return NextResponse.json({ error: "Data tidak valid. Periksa nama dan kolom yang wajib diisi." }, { status: 400 });
  return authorize(resource, async (tx, tenantId, schoolId, userId) => {
    const data = parsed.data;
    const rows = resource === "teachers"
      ? await tx`INSERT INTO teachers (tenant_id, school_id, full_name, employee_number, education) VALUES (${tenantId}, ${schoolId}, ${data.fullName}, ${data.employeeNumber || null}, ${data.education || null}) RETURNING id, full_name, employee_number, education, employment_status AS status, created_at`
      : await tx`INSERT INTO students (tenant_id, school_id, full_name, student_number, birth_date) VALUES (${tenantId}, ${schoolId}, ${data.fullName}, ${data.studentNumber || null}, ${data.birthDate ? new Date(data.birthDate).toISOString() : null}) RETURNING id, full_name, student_number, birth_date, status, created_at`;
    await tx`INSERT INTO audit_logs (tenant_id, school_id, actor_user_id, action, resource_type, resource_id) VALUES (${tenantId}, ${schoolId}, ${userId}, ${resource.slice(0, -1)}.created, ${resource.slice(0, -1)}, ${rows[0].id})`;
    return NextResponse.json({ data: rows[0] }, { status: 201 });
  });
}

export async function PATCH(request: Request, { params }: Context) {
  const { resource } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success || !resourceSchema.safeParse(resource).success) return NextResponse.json({ error: "Perubahan data tidak valid." }, { status: 400 });
  const { id, ...changes } = parsed.data;
  return authorize(resource, async (tx, tenantId, schoolId, userId) => {
    let rows;
    if (resource === "teachers") {
      const status = changes.status;
      if (status && !["active", "inactive", "leave"].includes(status)) return NextResponse.json({ error: "Status guru tidak valid." }, { status: 400 });
      rows = await tx`UPDATE teachers SET full_name = COALESCE(${changes.fullName ?? null}, full_name), employee_number = CASE WHEN ${changes.employeeNumber !== undefined} THEN NULLIF(${changes.employeeNumber ?? ""}, '') ELSE employee_number END, education = CASE WHEN ${changes.education !== undefined} THEN NULLIF(${changes.education ?? ""}, '') ELSE education END, employment_status = COALESCE(${status ?? null}, employment_status) WHERE id = ${id} AND tenant_id = ${tenantId} AND school_id = ${schoolId} RETURNING id, full_name, employee_number, education, employment_status AS status, created_at`;
    } else {
      const status = changes.status;
      if (status && !["active", "inactive", "graduated", "transferred"].includes(status)) return NextResponse.json({ error: "Status siswa tidak valid." }, { status: 400 });
      rows = await tx`UPDATE students SET full_name = COALESCE(${changes.fullName ?? null}, full_name), student_number = CASE WHEN ${changes.studentNumber !== undefined} THEN NULLIF(${changes.studentNumber ?? ""}, '') ELSE student_number END, birth_date = CASE WHEN ${changes.birthDate !== undefined} THEN ${changes.birthDate ? new Date(changes.birthDate).toISOString() : null}::timestamptz ELSE birth_date END, status = COALESCE(${status ?? null}, status) WHERE id = ${id} AND tenant_id = ${tenantId} AND school_id = ${schoolId} RETURNING id, full_name, student_number, birth_date, status, created_at`;
    }
    if (!rows.length) return NextResponse.json({ error: "Data tidak ditemukan." }, { status: 404 });
    await tx`INSERT INTO audit_logs (tenant_id, school_id, actor_user_id, action, resource_type, resource_id) VALUES (${tenantId}, ${schoolId}, ${userId}, ${resource.slice(0, -1)}.updated, ${resource.slice(0, -1)}, ${id})`;
    return NextResponse.json({ data: rows[0] });
  });
}
