import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthenticatedUser } from "@/db/connection";
import { searchTeacherKnowledge } from "@/lib/teacher-knowledge";
import { searchAdditionalTeacherKnowledge } from "@/lib/teacher-knowledge-extra";

export const dynamic = "force-dynamic";

const schema = z.object({ query: z.string().trim().min(3).max(500) });

export async function POST(request: Request) {
  const raw = await request.text().catch(() => "");
  if (raw.length > 1200) return NextResponse.json({ error: "Pertanyaan terlalu panjang." }, { status: 413 });
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "Format permintaan tidak valid." }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Tuliskan pertanyaan minimal 3 karakter." }, { status: 400 });

  try {
    return await withAuthenticatedUser(async (tx, user, profile) => {
      const account = await tx`SELECT status, auth_user_id FROM users WHERE id = ${profile.id} LIMIT 1`;
      if (account.length !== 1 || account[0].status !== "active" || account[0].auth_user_id !== user.id) {
        return NextResponse.json({ error: "Akun pengguna belum aktif atau sesi tidak cocok." }, { status: 403 });
      }
      const memberships = await tx`
        SELECT tenant_id, school_id FROM memberships
        WHERE user_id = ${profile.id} AND role = 'teacher' AND school_id IS NOT NULL
        ORDER BY created_at ASC LIMIT 2
      `;
      if (memberships.length !== 1) return NextResponse.json({ error: "Akun harus memiliki tepat satu penempatan guru aktif." }, { status: 403 });
      await tx`SELECT set_config('app.tenant_id', ${memberships[0].tenant_id}, true)`;
      const teachers = await tx`
        SELECT id FROM teachers
        WHERE user_id = ${profile.id} AND tenant_id = ${memberships[0].tenant_id}
          AND school_id = ${memberships[0].school_id} AND employment_status = 'active'
        LIMIT 2
      `;
      if (teachers.length !== 1) return NextResponse.json({ error: "Akun belum tertaut ke satu data induk guru aktif." }, { status: 403 });

      const results = [...searchTeacherKnowledge(parsed.data.query), ...searchAdditionalTeacherKnowledge(parsed.data.query)]
        .sort((a, b) => b.relevance - a.relevance)
        .filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index)
        .slice(0, 5);
      if (!results.length) return NextResponse.json({
        answer: "Belum ditemukan materi yang cukup relevan dalam basis pengetahuan lokal TMS. Coba gunakan istilah yang lebih spesifik, misalnya asesmen formatif, pembelajaran mendalam, diferensiasi, atau Kurikulum 2025.",
        results: [], mode: "local_knowledge_search_v2", sourceCount: 0
      });
      const answer = results.slice(0, 3).map((item, index) =>
        `${index + 1}. ${item.title}\n${item.summary}\n\nLangkah praktis:\n${item.guidance.slice(0, 3).map((step) => `- ${step}`).join("\n")}`
      ).join("\n\n---\n\n");
      return NextResponse.json({
        answer,
        results: results.map(({ id, title, category, summary, source, relevance }) => ({ id, title, category, summary, source, relevance })),
        mode: "local_knowledge_search",
        sourceCount: results.length,
        generatedLocally: true
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "UNAUTHENTICATED" ? 401 : message.includes("DATABASE_URL") ? 503 : 500;
    return NextResponse.json({ error: status === 401 ? "Silakan login kembali." : "Basis pengetahuan lokal tidak dapat diakses. Coba lagi nanti." }, { status });
  }
}
