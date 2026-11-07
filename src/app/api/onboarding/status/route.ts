import { NextResponse } from "next/server";
import { withAuthenticatedUser } from "@/db/connection";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await withAuthenticatedUser(async (tx, user, profile) => {
      const rows = await tx`
        SELECT m.tenant_id, m.school_id, m.role, s.name AS school_name, t.name AS tenant_name
        FROM memberships m
        JOIN schools s ON s.id = m.school_id
        JOIN tenants t ON t.id = m.tenant_id
        WHERE m.user_id = ${profile.id}
        ORDER BY t.created_at ASC
      `;
      return { user: { name: user.name, email: user.email }, memberships: rows };
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memeriksa status akun.";
    const status = message === "UNAUTHENTICATED" ? 401 : message.includes("DATABASE_URL") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
