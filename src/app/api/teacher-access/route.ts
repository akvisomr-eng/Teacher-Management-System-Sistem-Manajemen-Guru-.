import { NextResponse } from "next/server";
import type { TransactionSql } from "postgres";
import { z } from "zod";
import { withAuthenticatedUser } from "@/db/connection";

export const dynamic = "force-dynamic";
type DbTx = TransactionSql<Record<string, never>>;
const managerRoles = ["tenant_owner", "tenant_admin", "principal", "vice_principal", "school_operator"] as const;
const databaseUuidSchema = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "ID harus berupa UUID PostgreSQL yang valid.");
const linkSchema = z.object({
  teacherId: databaseUuidSchema,
  email: z.string().trim().email().max(254)
});

const knownErrors = [
  ["TEACHER_ACCOUNT_NOT_READY", "Akun belum terdaftar. Minta guru membuat akun melalui halaman Login Guru terlebih dahulu.", 409],
  ["TEACHER_RECORD_NOT_FOUND", "Data guru tidak ditemukan pada sekolah ini.", 404],
  ["ACCOUNT_HAS_NON_TEACHER_ROLE", "Akun tersebut sudah memiliki peran non-guru pada sekolah ini. Gunakan akun guru pribadi yang terpisah.", 409],
  ["ACCOUNT_ALREADY_LINKED_TO_ANOTHER_TEACHER", "Akun tersebut sudah terhubung ke data guru lain.", 409],
  ["TEACHER_ALREADY_LINKED_TO_DIFFERENT_ACCOUNT", "Data guru sudah terhubung ke akun lain.", 409],
  ["FORBIDDEN_TEACHER_ACCOUNT_LINK", "Akses pengelola sekolah diperlukan.", 403]
] as const;

function errorText(error: unknown): string {
  const seen = new Set<unknown>();
  const parts: string[] = [];
  const visit = (value: unknown, depth: number) => {
    if (!value || depth > 5 || seen.has(value)) return;
    if (typeof value === "string") {
      parts.push(value);
      return;
    }
    if (typeof value !== "object") return;
    seen.add(value);
    const record = value as Record<string, unknown>;
    for (const key of ["message", "detail", "hint", "code"]) {
      if (typeof record[key] === "string") parts.push(record[key] as string);
    }
    visit(record.cause, depth + 1);
    visit(record.originalError, depth + 1);
  };
  visit(error, 0);
  return parts.join(" | ");
}

function knownErrorResponse(error: unknown): Response | null {
  const diagnostic = errorText(error);
  const match = knownErrors.find(([code]) => diagnostic.includes(code));
  return match ? NextResponse.json({ error: match[1] }, { status: match[2] }) : null;
}

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
    const known = knownErrorResponse(error);
    if (known) return known;
    const diagnostic = errorText(error);
    const status = diagnostic.includes("UNAUTHENTICATED") ? 401 : diagnostic.includes("DATABASE_URL") ? 503 : 500;
    // Never log request bodies, email addresses, tokens, or database detail strings.
    console.error("[teacher-access] request failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      databaseCode: (() => {
        const match = diagnostic.match(/(?:^|\\| )(23[0-9A-Z]{3}|P[0-9A-Z]{4})(?:\\||$)/);
        return match?.[1] ?? null;
      })()
    });
    const message = status === 401 ? "Sesi login berakhir. Silakan masuk kembali." : status === 503 ? "Layanan database belum siap. Coba kembali nanti." : "Terjadi kesalahan saat mengelola akses guru. Kode: TA-500.";
    return NextResponse.json({ error: message }, { status });
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
      return NextResponse.json({ data: rows[0] }, { status: 200 });
    } catch (error) {
      const known = knownErrorResponse(error);
      if (known) return known;
      throw error;
    }
  });
}
