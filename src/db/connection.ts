import "server-only";
import postgres, { type TransactionSql } from "postgres";
import { auth } from "@/lib/auth/server";

const connectionString = process.env.DATABASE_URL;
type DbTx = TransactionSql<Record<string, never>>;

function getClient() {
  if (!connectionString) throw new Error("DATABASE_URL belum dikonfigurasi.");
  return postgres(connectionString, { max: 5, prepare: false });
}

type DbClient = ReturnType<typeof postgres>;
let client: DbClient | undefined;
function database() {
  client ??= getClient();
  return client;
}

export type AuthProfile = { id: string; email: string; full_name: string };
export type AuthenticatedUser = { id: string; email: string; name: string | null };

export async function withAuthenticatedUser<T>(
  work: (tx: DbTx, user: AuthenticatedUser, profile: AuthProfile) => Promise<T>
): Promise<T> {
  const { data: session } = await auth.getSession();
  if (!session?.user) throw new Error("UNAUTHENTICATED");

  const result = await database().begin(async (tx) => {
    await tx`SELECT set_config('app.auth_user_id', ${session.user.id}, true)`;
    const profiles = await tx`
      INSERT INTO users (auth_user_id, email, full_name)
      VALUES (${session.user.id}, ${session.user.email}, ${session.user.name ?? session.user.email})
      ON CONFLICT (email) DO UPDATE
        SET full_name = EXCLUDED.full_name,
            auth_user_id = EXCLUDED.auth_user_id,
            updated_at = now()
      RETURNING id, email, full_name
    `;
    const profile = profiles[0] as AuthProfile | undefined;
    if (!profile) throw new Error("USER_PROFILE_UNAVAILABLE");
    return work(tx, session.user, profile);
  });
  return result as T;
}

export async function withTenantContext<T>(
  tenantId: string,
  work: (tx: DbTx, user: AuthenticatedUser, profile: AuthProfile, membership: { tenant_id: string; school_id: string | null; role: string }) => Promise<T>
): Promise<T> {
  return withAuthenticatedUser(async (tx, user, profile) => {
    await tx`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    const memberships = await tx`
      SELECT tenant_id, school_id, role
      FROM memberships
      WHERE tenant_id = ${tenantId} AND user_id = ${profile.id}
      LIMIT 1
    `;
    const membership = memberships[0] as { tenant_id: string; school_id: string | null; role: string } | undefined;
    if (!membership) throw new Error("FORBIDDEN_TENANT");
    return work(tx, user, profile, membership);
  });
}
