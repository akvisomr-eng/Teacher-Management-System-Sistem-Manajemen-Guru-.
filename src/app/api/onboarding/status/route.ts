import { NextResponse } from "next/server";
import { withAuthenticatedUser } from "@/db/connection";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await withAuthenticatedUser(async (tx, user, profile) => {
      const memberships = await tx`
        SELECT tenant_id, school_id, role
        FROM memberships
        WHERE user_id = ${profile.id}
        ORDER BY created_at ASC
      `;
      const items = [];
      for (const membership of memberships) {
        await tx`SELECT set_config('app.tenant_id', ${membership.tenant_id}, true)`;
        const [school] = await tx`
          SELECT s.name AS school_name, t.name AS tenant_name
          FROM schools s JOIN tenants t ON t.id = s.tenant_id
          WHERE s.id = ${membership.school_id}
          LIMIT 1
        `;
        items.push({ ...membership, schoolName: school?.school_name ?? "Sekolah", tenantName: school?.tenant_name ?? "Organisasi" });
      }
      return { user: { name: user.name, email: user.email }, memberships: items };
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memeriksa status akun.";
    const status = message === "UNAUTHENTICATED" ? 401 : message.includes("DATABASE_URL") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
