import { NextResponse } from "next/server";
import type { TransactionSql } from "postgres";
import { z } from "zod";
import { withAuthenticatedUser } from "@/db/connection";

export const dynamic = "force-dynamic";

const itemSchema = z.object({
  id: z.string().uuid(),
  itemType: z.enum(["lesson_plan","teaching_journal","learning_material","assessment_draft","reflection","personal_note"]),
  title: z.string().trim().min(1).max(200),
  content: z.record(z.string(), z.unknown()).refine(value => JSON.stringify(value).length <= 100_000, "Ukuran dokumen melebihi batas 100 KB."),
  schemaVersion: z.number().int().min(1).max(100),
  clientUpdatedAt: z.string().datetime()
});
const syncSchema = z.object({ items: z.array(itemSchema).min(1).max(25) });

type DbTx = TransactionSql<Record<string, never>>;
type TeacherIdentity = { teacher_id: string; tenant_id: string; school_id: string; full_name: string; role: string; scope: Record<string, unknown>; school_name: string };
type Profile = { id: string; email: string; full_name: string };

async function withTeacher(work: (tx: DbTx, teacher: TeacherIdentity, profile: Profile) => Promise<Response>) {
  try {
    return await withAuthenticatedUser(async (tx, _user, profile) => {
      const memberships = await tx`
        SELECT tenant_id, school_id, role, scope
        FROM memberships
        WHERE user_id = ${profile.id} AND role = 'teacher' AND school_id IS NOT NULL
        ORDER BY created_at ASC LIMIT 2
      `;
      if (memberships.length !== 1) {
        return NextResponse.json({ error: memberships.length ? "Akun guru memiliki lebih dari satu penempatan aktif. Hubungi operator sekolah." : "Akun ini belum memiliki penempatan guru aktif. Hubungi operator sekolah." }, { status: 403 });
      }
      const membership = memberships[0];
      await tx`SELECT set_config('app.tenant_id', ${membership.tenant_id}, true)`;
      const rows = await tx`
        SELECT t.id AS teacher_id, t.tenant_id, t.school_id, t.full_name,
               ${membership.role}::varchar AS role, ${tx.json(membership.scope as never)}::jsonb AS scope, s.name AS school_name
        FROM teachers t
        JOIN schools s ON s.id = t.school_id AND s.tenant_id = t.tenant_id
        WHERE t.user_id = ${profile.id} AND t.tenant_id = ${membership.tenant_id}
          AND t.school_id = ${membership.school_id} AND t.employment_status = 'active'
        ORDER BY t.created_at ASC LIMIT 2
      `;
      if (rows.length !== 1) {
        return NextResponse.json({ error: "Akun guru belum ditautkan ke satu data induk guru aktif pada sekolah ini." }, { status: 403 });
      }
      return work(tx, rows[0] as TeacherIdentity, profile);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Permintaan gagal.";
    const status = message === "UNAUTHENTICATED" ? 401 : message.includes("DATABASE_URL") ? 503 : 500;
    return NextResponse.json({ error: status === 500 ? "Terjadi kesalahan pada ruang kerja guru." : message }, { status });
  }
}

export async function GET() {
  return withTeacher(async (tx, teacher, profile) => {
    const rows = await tx`
      SELECT id, item_type, title, content, schema_version, client_updated_at, created_at, updated_at, archived_at
      FROM teacher_workspace_items
      WHERE tenant_id = ${teacher.tenant_id} AND school_id = ${teacher.school_id}
        AND teacher_id = ${teacher.teacher_id} AND owner_user_id = ${profile.id}
      ORDER BY updated_at DESC LIMIT 500
    `;
    return NextResponse.json({ teacher: { id: teacher.teacher_id, name: teacher.full_name, school: teacher.school_name }, items: rows });
  });
}

export async function POST(request: Request) {
  const parsed = syncSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Paket sinkronisasi tidak valid." }, { status: 400 });
  return withTeacher(async (tx, teacher, profile) => {
    const accepted: Array<{ id: string; updated_at: string }> = [];
    const conflicts: Array<Record<string, unknown>> = [];
    for (const item of parsed.data.items) {
      const rows = await tx`
        INSERT INTO teacher_workspace_items
          (id, tenant_id, school_id, teacher_id, owner_user_id, item_type, title, content, schema_version, client_updated_at)
        VALUES
          (${item.id}, ${teacher.tenant_id}, ${teacher.school_id}, ${teacher.teacher_id}, ${profile.id},
           ${item.itemType}, ${item.title}, ${tx.json(item.content as never)}, ${item.schemaVersion}, ${item.clientUpdatedAt})
        ON CONFLICT (id) DO UPDATE SET
          item_type = EXCLUDED.item_type, title = EXCLUDED.title, content = EXCLUDED.content,
          schema_version = EXCLUDED.schema_version, client_updated_at = EXCLUDED.client_updated_at,
          updated_at = now()
        WHERE teacher_workspace_items.tenant_id = EXCLUDED.tenant_id
          AND teacher_workspace_items.school_id = EXCLUDED.school_id
          AND teacher_workspace_items.teacher_id = EXCLUDED.teacher_id
          AND teacher_workspace_items.owner_user_id = EXCLUDED.owner_user_id
          AND teacher_workspace_items.client_updated_at <= EXCLUDED.client_updated_at
        RETURNING id, updated_at
      `;
      if (rows[0]) {
        accepted.push(rows[0] as { id: string; updated_at: string });
      } else {
        const current = await tx`
          SELECT id, item_type, title, content, schema_version, client_updated_at
          FROM teacher_workspace_items
          WHERE id = ${item.id} AND tenant_id = ${teacher.tenant_id}
            AND school_id = ${teacher.school_id} AND teacher_id = ${teacher.teacher_id}
            AND owner_user_id = ${profile.id} LIMIT 1
        `;
        if (current[0]) conflicts.push(current[0]);
      }
    }
    await tx`
      INSERT INTO audit_logs (tenant_id, school_id, actor_user_id, action, resource_type, metadata)
      VALUES (${teacher.tenant_id}, ${teacher.school_id}, ${profile.id}, 'teacher_workspace.sync', 'teacher_workspace_items',
        ${tx.json({ received: parsed.data.items.length, accepted: accepted.length })})
    `;
    return NextResponse.json({ accepted: accepted.length, received: parsed.data.items.length, items: accepted, conflicts });
  });
}
