import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthenticatedUser } from "@/db/connection";

export const dynamic = "force-dynamic";

const onboardingSchema = z.object({
  tenantName: z.string().trim().min(2).max(140),
  schoolName: z.string().trim().min(2).max(180),
  level: z.enum(["PAUD", "SD", "SMP", "SMA", "SMK", "SLB", "MA", "KESETARAAN"]),
  npsn: z.union([z.string().regex(/^\d{8}$/), z.literal("")]).optional()
});

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70);
}

export async function POST(request: Request) {
  const parsed = onboardingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Periksa kembali nama organisasi, sekolah, jenjang, dan NPSN (8 digit)." }, { status: 400 });
  }

  try {
    const result = await withAuthenticatedUser(async (tx, user, profile) => {
      const existing = await tx`SELECT tenant_id FROM memberships WHERE user_id = ${profile.id} LIMIT 1`;
      if (existing.length) return { alreadyConfigured: true };

      const tenantId = randomUUID();
      const schoolId = randomUUID();
      const { tenantName, schoolName, level, npsn } = parsed.data;
      const slug = `${slugify(tenantName) || "sekolah"}-${randomUUID().slice(0, 8)}`;

      await tx`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
      await tx`INSERT INTO tenants (id, name, slug) VALUES (${tenantId}, ${tenantName}, ${slug})`;
      await tx`
        INSERT INTO schools (id, tenant_id, name, npsn, level)
        VALUES (${schoolId}, ${tenantId}, ${schoolName}, ${npsn || null}, ${level})
      `;
      await tx`
        INSERT INTO memberships (tenant_id, school_id, user_id, role, scope)
        VALUES (${tenantId}, ${schoolId}, ${profile.id}, 'tenant_admin', '{"scope":"school"}'::jsonb)
      `;

      const now = new Date();
      const startYear = now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
      const startsOn = new Date(Date.UTC(startYear, 6, 1));
      const endsOn = new Date(Date.UTC(startYear + 1, 5, 30, 23, 59, 59));
      await tx`
        INSERT INTO academic_years (tenant_id, school_id, name, starts_on, ends_on, is_active)
        VALUES (${tenantId}, ${schoolId}, ${`${startYear}/${startYear + 1}`}, ${startsOn.toISOString()}, ${endsOn.toISOString()}, true)
      `;
      await tx`
        INSERT INTO audit_logs (tenant_id, school_id, actor_user_id, action, resource_type, resource_id)
        VALUES (${tenantId}, ${schoolId}, ${profile.id}, 'school.onboarded', 'school', ${schoolId})
      `;
      return { alreadyConfigured: false, tenantId, schoolId, tenantName, schoolName, role: "tenant_admin", user: user.email };
    });

    if (result.alreadyConfigured) {
      return NextResponse.json({ error: "Akun ini sudah terhubung ke organisasi sekolah." }, { status: 409 });
    }
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Onboarding gagal.";
    const status = message === "UNAUTHENTICATED" ? 401 : message.includes("DATABASE_URL") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
