import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthenticatedUser } from "@/db/connection";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  role: z.enum(["teacher", "principal", "vice_principal", "school_operator", "administrator"])
});

const roleMap = {
  teacher: ["teacher"],
  principal: ["principal"],
  vice_principal: ["vice_principal"],
  school_operator: ["school_operator"],
  administrator: ["tenant_owner", "tenant_admin"]
} as const;

const redirectMap = {
  teacher: "/teacher",
  principal: "/",
  vice_principal: "/",
  school_operator: "/",
  administrator: "/"
} as const;

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Pilihan jabatan tidak valid." }, { status: 400 });
  }

  try {
    const result = await withAuthenticatedUser(async (tx, _user, profile) => {
      const roles = roleMap[parsed.data.role];
      const memberships = await tx`
        SELECT id
        FROM memberships
        WHERE user_id = ${profile.id}
          AND role = ANY(${[...roles]}::varchar[])
          AND school_id IS NOT NULL
        ORDER BY created_at ASC
        LIMIT 1
      `;
      if (!memberships.length) {
        return { ok: false as const };
      }
      return { ok: true as const, redirectTo: redirectMap[parsed.data.role] };
    });
    if (!result.ok) {
      return NextResponse.json({
        error: "Akun ini belum memiliki akses untuk jabatan yang dipilih. Pilih jabatan yang sesuai atau hubungi operator sekolah."
      }, { status: 403 });
    }
    return NextResponse.json({ redirectTo: result.redirectTo });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "UNAUTHENTICATED" ? 401 : message.includes("DATABASE_URL") ? 503 : 500;
    return NextResponse.json({
      error: status === 401 ? "Sesi login berakhir. Silakan masuk kembali."
        : status === 503 ? "Layanan database belum siap. Coba kembali nanti."
        : "Tidak dapat memeriksa hak akses. Silakan coba kembali."
    }, { status });
  }
}
