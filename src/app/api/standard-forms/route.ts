import { NextResponse } from "next/server";
import type { TransactionSql } from "postgres";
import { z } from "zod";
import { withAuthenticatedUser } from "@/db/connection";

export const dynamic = "force-dynamic";
type DbTx = TransactionSql<Record<string, never>>;
const managerRoles = new Set(["tenant_owner","tenant_admin","principal","vice_principal","school_operator"]);
const moduleSchema = z.enum(["teachers","students","academic","curriculum","assignments","teaching","assessments","reports","forms"]);
const createSchema = z.object({
  moduleKey: moduleSchema,
  schemaKey: z.string().trim().min(3).max(100).regex(/^[a-z][a-z0-9_.-]+$/),
  schemaVersion: z.number().int().min(1).max(1000).default(1),
  referenceVersion: z.string().trim().min(1).max(80).default("internal-v1"),
  title: z.string().trim().min(2).max(200),
  recordData: z.record(z.string(), z.unknown())
});

async function withSchool(work:(tx:DbTx,tenantId:string,schoolId:string,userId:string)=>Promise<Response>){
  try {
    return await withAuthenticatedUser(async(tx,_user,profile)=>{
      const memberships=await tx`SELECT tenant_id,school_id,role FROM memberships WHERE user_id=${profile.id} AND school_id IS NOT NULL ORDER BY created_at ASC LIMIT 1`;
      const membership=memberships[0] as {tenant_id:string;school_id:string;role:string}|undefined;
      if(!membership || !managerRoles.has(membership.role)) return NextResponse.json({error:"Anda tidak memiliki izin mengelola data administrasi sekolah."},{status:403});
      await tx`SELECT set_config('app.tenant_id',${membership.tenant_id},true)`;
      return work(tx,membership.tenant_id,membership.school_id,profile.id);
    });
  } catch(error) {
    const message=error instanceof Error?error.message:"Permintaan gagal.";
    const status=message==="UNAUTHENTICATED"?401:message.includes("DATABASE_URL")?503:500;
    return NextResponse.json({error:status===500?"Terjadi kesalahan saat mengakses arsip formulir standar.":message},{status});
  }
}

export async function GET(request:Request){
  const url=new URL(request.url);
  const parsed=moduleSchema.safeParse(url.searchParams.get("module"));
  if(!parsed.success) return NextResponse.json({error:"Modul tidak valid."},{status:400});
  return withSchool(async(tx,tenantId,schoolId)=>{
    const rows=await tx`SELECT id,module_key,schema_key,schema_version,reference_version,title,status,record_data,created_at,updated_at FROM standard_module_records WHERE tenant_id=${tenantId} AND school_id=${schoolId} AND module_key=${parsed.data} ORDER BY updated_at DESC LIMIT 250`;
    return NextResponse.json({data:rows});
  });
}

export async function POST(request:Request){
  const parsed=createSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success) return NextResponse.json({error:parsed.error.issues[0]?.message??"Data formulir tidak valid."},{status:400});
  return withSchool(async(tx,tenantId,schoolId,userId)=>{
    const d=parsed.data;
    const rows=await tx`INSERT INTO standard_module_records(tenant_id,school_id,module_key,schema_key,schema_version,reference_version,title,record_data,created_by,updated_by) VALUES(${tenantId},${schoolId},${d.moduleKey},${d.schemaKey},${d.schemaVersion},${d.referenceVersion},${d.title},${tx.json(d.recordData as never)},${userId},${userId}) RETURNING id,module_key,schema_key,schema_version,reference_version,title,status,record_data,created_at,updated_at`;
    await tx`INSERT INTO audit_logs(tenant_id,school_id,actor_user_id,action,resource_type,resource_id,metadata) VALUES(${tenantId},${schoolId},${userId},'standard_form_record.created','standard_module_record',${rows[0].id},${tx.json({moduleKey:d.moduleKey,schemaKey:d.schemaKey,schemaVersion:d.schemaVersion,referenceVersion:d.referenceVersion})})`;
    return NextResponse.json({data:rows[0]},{status:201});
  });
}
