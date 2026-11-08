import { NextResponse } from "next/server";
import type { TransactionSql } from "postgres";
import { z } from "zod";
import { withAuthenticatedUser } from "@/db/connection";

export const dynamic = "force-dynamic";

type DbTx = TransactionSql<Record<string, never>>;
const managerRoles = new Set(["tenant_owner", "tenant_admin", "principal", "vice_principal", "school_operator"]);

const outcomeSchema = z.object({
  code: z.string().trim().min(1).max(40),
  title: z.string().trim().min(2).max(240),
  description: z.string().max(2000).default(""),
  phase: z.string().trim().max(50).default("")
});
const subjectGuideSchema = z.object({
  subject: z.string().trim().min(2).max(120),
  notes: z.string().max(5000).default("")
});
const definitionSchema = z.object({
  description: z.string().max(5000).default(""),
  learningOutcomes: z.array(outcomeSchema).max(500).default([]),
  subjectGuides: z.array(subjectGuideSchema).max(200).default([]),
  assessmentPrinciples: z.string().max(5000).default("")
});
const createSchema = z.object({
  name: z.string().trim().min(3).max(160),
  framework: z.string().trim().min(2).max(100),
  definition: definitionSchema.optional(),
  cloneFromId: z.string().uuid().optional()
});
const updateSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(["update", "publish", "archive"]),
  definition: definitionSchema.optional()
}).refine(value => value.action !== "update" || value.definition !== undefined, "Tidak ada perubahan untuk disimpan.");

type Work = (tx: DbTx, tenantId: string, schoolId: string, userId: string) => Promise<Response>;

async function authorize(work: Work) {
  try {
    return await withAuthenticatedUser(async (tx, _user, profile) => {
      const memberships = await tx`SELECT tenant_id, school_id, role FROM memberships WHERE user_id = ${profile.id} AND school_id IS NOT NULL ORDER BY created_at ASC LIMIT 1`;
      const membership = memberships[0] as { tenant_id: string; school_id: string; role: string } | undefined;
      if (!membership || !managerRoles.has(membership.role)) {
        return NextResponse.json({ error: "Anda tidak memiliki izin mengelola kurikulum sekolah." }, { status: 403 });
      }
      await tx`SELECT set_config('app.tenant_id', ${membership.tenant_id}, true)`;
      return work(tx, membership.tenant_id, membership.school_id, profile.id);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Permintaan gagal.";
    const status = message === "UNAUTHENTICATED" ? 401 : message.includes("DATABASE_URL") ? 503 : 500;
    return NextResponse.json({ error: status === 500 ? "Terjadi kesalahan saat mengakses kurikulum." : message }, { status });
  }
}

export async function GET() {
  return authorize(async (tx, tenantId, schoolId) => {
    const data = await tx`
      SELECT id, name, framework, version, status, definition, created_at
      FROM curriculum_versions
      WHERE tenant_id = ${tenantId} AND (school_id = ${schoolId} OR school_id IS NULL)
      ORDER BY name ASC, version DESC, created_at DESC
      LIMIT 1000
    `;
    return NextResponse.json({ data });
  });
}

export async function POST(request: Request) {
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Nama dan kerangka kurikulum wajib diisi dengan benar." }, { status: 400 });

  return authorize(async (tx, tenantId, schoolId, userId) => {
    const input = parsed.data;
    await tx`SELECT pg_advisory_xact_lock(hashtext(${tenantId + ":" + schoolId + ":" + input.name + ":" + input.framework}))`;

    let definition: z.infer<typeof definitionSchema> = input.definition ?? {
      description: "",
      learningOutcomes: [],
      subjectGuides: [],
      assessmentPrinciples: ""
    };
    if (input.cloneFromId) {
      const source = await tx`
        SELECT name, framework, definition FROM curriculum_versions
        WHERE id = ${input.cloneFromId} AND tenant_id = ${tenantId}
          AND (school_id = ${schoolId} OR school_id IS NULL)
        LIMIT 1
      `;
      if (!source.length) return NextResponse.json({ error: "Versi sumber kurikulum tidak ditemukan." }, { status: 404 });
      const sourceDefinition = definitionSchema.safeParse(source[0].definition);
      if (!sourceDefinition.success) return NextResponse.json({ error: "Struktur versi sumber tidak valid untuk diduplikasi." }, { status: 409 });
      definition = input.definition ?? sourceDefinition.data;
    }

    const versions = await tx`
      SELECT COALESCE(MAX(version), 0) + 1 AS next_version
      FROM curriculum_versions
      WHERE tenant_id = ${tenantId} AND school_id = ${schoolId}
        AND name = ${input.name} AND framework = ${input.framework}
    `;
    const version = Number(versions[0].next_version);
    const rows = await tx`
      INSERT INTO curriculum_versions (tenant_id, school_id, name, framework, version, status, definition)
      VALUES (${tenantId}, ${schoolId}, ${input.name}, ${input.framework}, ${version}, 'draft', ${tx.json(definition)})
      RETURNING id, name, framework, version, status, definition, created_at
    `;
    await tx`INSERT INTO audit_logs (tenant_id, school_id, actor_user_id, action, resource_type, resource_id) VALUES (${tenantId}, ${schoolId}, ${userId}, 'curriculum.created', 'curriculum_version', ${rows[0].id})`;
    return NextResponse.json({ data: rows[0] }, { status: 201 });
  });
}

export async function PATCH(request: Request) {
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Perubahan kurikulum tidak valid." }, { status: 400 });

  return authorize(async (tx, tenantId, schoolId, userId) => {
    const input = parsed.data;
    const existing = await tx`
      SELECT id, name, framework, version, status, definition
      FROM curriculum_versions
      WHERE id = ${input.id} AND tenant_id = ${tenantId} AND school_id = ${schoolId}
      LIMIT 1
    `;
    if (!existing.length) return NextResponse.json({ error: "Versi kurikulum sekolah tidak ditemukan." }, { status: 404 });
    const current = existing[0];

    if (input.action === "update") {
      if (current.status !== "draft") return NextResponse.json({ error: "Versi yang sudah diterbitkan tidak dapat diubah. Buat versi baru untuk melakukan revisi." }, { status: 409 });
      const currentDefinition = definitionSchema.safeParse(current.definition);
      if (!currentDefinition.success) return NextResponse.json({ error: "Struktur kurikulum saat ini tidak valid." }, { status: 409 });
      const definition = input.definition ?? currentDefinition.data;
      const rows = await tx`
        UPDATE curriculum_versions
        SET definition = ${tx.json(definition)}
        WHERE id = ${input.id} AND tenant_id = ${tenantId} AND school_id = ${schoolId} AND status = 'draft'
        RETURNING id, name, framework, version, status, definition, created_at
      `;
      if (!rows.length) return NextResponse.json({ error: "Versi kurikulum berubah atau tidak lagi berstatus draf." }, { status: 409 });
      await tx`INSERT INTO audit_logs (tenant_id, school_id, actor_user_id, action, resource_type, resource_id) VALUES (${tenantId}, ${schoolId}, ${userId}, 'curriculum.updated', 'curriculum_version', ${input.id})`;
      return NextResponse.json({ data: rows[0] });
    }

    if (input.action === "publish") {
      if (current.status !== "draft") return NextResponse.json({ error: "Hanya versi draf yang dapat diterbitkan." }, { status: 409 });
      const definition = definitionSchema.safeParse(current.definition);
      if (!definition.success || definition.data.learningOutcomes.length === 0) {
        return NextResponse.json({ error: "Tambahkan minimal satu capaian pembelajaran sebelum menerbitkan kurikulum." }, { status: 400 });
      }
      const rows = await tx`
        UPDATE curriculum_versions SET status = 'published'
        WHERE id = ${input.id} AND tenant_id = ${tenantId} AND school_id = ${schoolId} AND status = 'draft'
        RETURNING id, name, framework, version, status, definition, created_at
      `;
      if (!rows.length) return NextResponse.json({ error: "Versi kurikulum berubah atau tidak lagi berstatus draf." }, { status: 409 });
      await tx`INSERT INTO audit_logs (tenant_id, school_id, actor_user_id, action, resource_type, resource_id) VALUES (${tenantId}, ${schoolId}, ${userId}, 'curriculum.published', 'curriculum_version', ${input.id})`;
      return NextResponse.json({ data: rows[0] });
    }

    if (current.status !== "published") return NextResponse.json({ error: "Hanya kurikulum terbit yang dapat diarsipkan." }, { status: 409 });
    const rows = await tx`
      UPDATE curriculum_versions SET status = 'archived'
      WHERE id = ${input.id} AND tenant_id = ${tenantId} AND school_id = ${schoolId} AND status = 'published'
      RETURNING id, name, framework, version, status, definition, created_at
    `;
    if (!rows.length) return NextResponse.json({ error: "Versi kurikulum berubah atau tidak lagi berstatus terbit." }, { status: 409 });
    await tx`INSERT INTO audit_logs (tenant_id, school_id, actor_user_id, action, resource_type, resource_id) VALUES (${tenantId}, ${schoolId}, ${userId}, 'curriculum.archived', 'curriculum_version', ${input.id})`;
    return NextResponse.json({ data: rows[0] });
  });
}
