import "server-only";
import { NextResponse } from "next/server";
import postgres from "postgres";

export const dynamic = "force-dynamic";

const connectionString = process.env.DATABASE_URL;
const authConfigured = Boolean(
  process.env.NEON_AUTH_BASE_URL &&
  process.env.NEON_AUTH_COOKIE_SECRET &&
  process.env.NEXT_PUBLIC_NEON_AUTH_URL
);
let client: ReturnType<typeof postgres> | undefined;

export async function GET() {
  if (!connectionString || !authConfigured) {
    return NextResponse.json({
      status: "degraded",
      checks: {
        database: connectionString ? "configured" : "missing",
        auth: authConfigured ? "configured" : "missing"
      },
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }

  try {
    client ??= postgres(connectionString, { max: 1, prepare: false, connect_timeout: 5, idle_timeout: 10 });
    await client`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      checks: { database: "connected", auth: "configured" },
      timestamp: new Date().toISOString()
    });
  } catch {
    return NextResponse.json({
      status: "degraded",
      checks: { database: "unavailable", auth: "configured" },
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}
