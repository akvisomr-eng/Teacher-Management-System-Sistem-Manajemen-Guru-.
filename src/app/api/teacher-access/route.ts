import { NextResponse } from "next/server";
import type { TransactionSql } from "postgres";
import { z } from "zod";
import { withAuthenticatedUser } from "@/db/connection";

export const dynamic = "force-dynamic";
type DbTx = TransactionSql<Record<string, never>>;
const managerRoles = ["tenant_owner","tenant_admin","principal","vice_principal","school_operator"] as const;
const linkSchema = z.object({
  teacherId: z.string().uuid(),
  email: z.string().trim().email().max(254)
});

async function withSchoolManager(work: (tx: DbTx, tenantId: string, schoolId: string, userId: string) => Promise<Response>) {
  try {
    return await withAuthenticatedUser(async (tx, _user, profile) => {
      const rows = await tx`
        SELECT tenant_id, school_id FROM memberships
        WHERE user_id = ${profile.id} AND role = ANY(${managerRoles}::varchar[])
          AND school_id IS NOT NULL
        ORDER BY created_at ASC LIMIT 1
      `;
      const membership = rows[0] as { tenant_id: string; school_id: string } | undefined;
      if (!membership) return NextResponse.json({ error: "Akses khusus pengelola sekolah diperlukan." }, { status: 403 });
      await tx`SELECT set_config('app.tenant_id', ${membership.tenant_id}, true)`;
      return work(tx, membership.tenant_id, membership.school_id, profile.id);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Permintaan gagal.";
    const status = message === "UNAUTHENTICATED" ? 401 : message.includes("DATABASE_URL") ? 503 : 500;
    return NextResponse.json({ error: status === 500 ? "Terjadi kesalahan saat mengelola akses guru." : message }, { status });
  }
}

export async function GET() {
  return withSchoolManager(async (tx, tenantId, schoolId) => {
    const rows = await tx`
      SELECT id, full_name, employee_number, (user_id IS NOT NULL) AS account_linked
      FROM teachers
      WHERE tenant_id = ${tenantId} AND school_id = ${schoolId}
      ORDER BY full_name ASC LIMIT 500
    `;
    return NextResponse.json({ teachers: rows });
  });
}

export async function POST(request: Request) {
  const parsed = linkSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tautan akun tidak valid." }, { status: 400 });
  return withSchoolManager(async (tx, tenantId, schoolId) => {
    try {
      const rows = await tx`
        SELECT teacher_id, account_email
        FROM public.tms_link_teacher_account(${tenantId}, ${schoolId}, ${parsed.data.teacherId}, ${parsed.data.email})
      `;
      await tx`
        INSERT INTO audit_logs(tenant_id, school_id, actor_user_id, action, resource_type, resource_id, metadata)
        VALUES(${tenantId}, ${schoolId}, (SELECT id FROM users WHERE auth_user_id = tms_current_auth_user_id() LIMIT 1),
          'teacher_access.linked_by_manager', 'teacher', ${parsed.data.teacherId},
          ${tx.json({ email: parsed.data.email.toLowerCase() })})
      `;
      return NextResponse.json({ data: rows[0] }, { status: 200 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("TEACHER_ACCOUNT_NOT_READY")) return NextResponse.json({ error: "Akun belum terdaftar. Minta guru membuat akun melalui halaman Login Guru terlebih dahulu." }, { status: 409 });
      if (message.includes("TEACHER_RECORD_NOT_FOUND")) return NextResponse.json({ error: "Data guru tidak ditemukan pada sekolah ini." }, { status: 404 });
      if (message.includes("ACCOUNT_HAS_NON_TEACHER_ROLE")) return NextResponse.json({ error: "Akun tersebut sudah memiliki peran non-guru pada sekolah ini. Gunakan akun guru pribadi yang terpisah." }, { status: 409 });
      if (message.includes("ACCOUNT_ALREADY_LINKED")) return NextResponse.json({ error: "Akun tersebut sudah terhubung ke data guru lain." }, { status: 409 });
      if (message.includes("TEACHER_ALREADY_LINKED")) return NextResponse.json({ error: "Data guru sudah terhubung ke akun lain." }, { status: 409 });
      if (message.includes("FORBIDDEN")) return NextResponse.json({ error: "Akses pengelola sekolah diperlukan." }, { status: 403 });
      throw error;
    }
  });
}
