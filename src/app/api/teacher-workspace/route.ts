import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthenticatedUser } from "@/db/connection";

export const dynamic = "force-dynamic";

const itemSchema = z.object({
  id: z.string().uuid(),
  itemType: z.enum(["lesson_plan","teaching_journal","learning_material","assessment_draft","reflection","personal_note"]),
  title: z.string().trim().min(1).max(200),
  content: z.record(z.string(), z.unknown()),
  schemaVersion: z.number().int().min(1).max(100),
  clientUpdatedAt: z.string().datetime()
});
const syncSchema = z.object({ items: z.array(itemSchema).min(1).max(100) });

async function withTeacher(work: (tx: any, teacher: any, profile: any) => Promise<Response>) {
  try {
    return await withAuthenticatedUser(async (tx, _user, profile) => {
      const rows = await tx`
        SELECT t.id AS teacher_id, t.tenant_id, t.school_id, t.full_name,
               m.role, m.scope, s.name AS school_name
        FROM teachers t
        JOIN memberships m ON m.user_id = t.user_id
          AND m.tenant_id = t.tenant_id AND m.school_id = t.school_id
        JOIN schools s ON s.id = t.school_id AND s.tenant_id = t.tenant_id
        WHERE t.user_id = ${profile.id} AND m.role = 'teacher'
          AND t.employment_status = 'active'
        ORDER BY t.created_at ASC LIMIT 2
      `;
      if (rows.length !== 1) {
        return NextResponse.json({ error: rows.length ? "Akun guru memiliki lebih dari satu penempatan aktif. Hubungi operator sekolah." : "Akun ini belum ditautkan ke data induk guru oleh operator sekolah." }, { status: 403 });
      }
      const teacher = rows[0];
      await tx`SELECT set_config('app.tenant_id', ${teacher.tenant_id}, true)`;
      return work(tx, teacher, profile);
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
    const accepted = [];
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
      if (rows[0]) accepted.push(rows[0]);
    }
    await tx`
      INSERT INTO audit_logs (tenant_id, school_id, actor_user_id, action, resource_type, metadata)
      VALUES (${teacher.tenant_id}, ${teacher.school_id}, ${profile.id}, 'teacher_workspace.sync', 'teacher_workspace_items',
        ${tx.json({ received: parsed.data.items.length, accepted: accepted.length })})
    `;
    return NextResponse.json({ accepted: accepted.length, received: parsed.data.items.length, items: accepted });
  });
}
