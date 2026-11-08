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
  recordData: z.record(z.string(), z.unknown()),
  linkedEntityType: z.enum(["teacher","student"]).optional(),
  linkedEntityId: z.string().uuid().optional()
}).refine((data) => Boolean(data.linkedEntityType) === Boolean(data.linkedEntityId), "Pilih jenis dan ID data induk secara bersamaan.");
const reviewSchema = z.object({ id: z.string().uuid(), action: z.enum(["submit","approve","reject","archive"]), reviewNote: z.string().trim().max(2000).optional().default("") });

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
    const [rows, teachers, students]=await Promise.all([
      tx`SELECT id,module_key,schema_key,schema_version,reference_version,title,status,record_data,linked_entity_type,linked_entity_id,review_note,created_at,updated_at FROM standard_module_records WHERE tenant_id=${tenantId} AND school_id=${schoolId} AND module_key=${parsed.data} ORDER BY updated_at DESC LIMIT 250`,
      parsed.data==="teachers" ? tx`SELECT id,full_name,employee_number FROM teachers WHERE tenant_id=${tenantId} AND school_id=${schoolId} ORDER BY full_name LIMIT 500` : Promise.resolve([]),
      parsed.data==="students" ? tx`SELECT id,full_name,student_number FROM students WHERE tenant_id=${tenantId} AND school_id=${schoolId} ORDER BY full_name LIMIT 500` : Promise.resolve([])
    ]);
    return NextResponse.json({data:rows,masterOptions:parsed.data==="teachers"?teachers:parsed.data==="students"?students:[]});
  });
}

export async function POST(request:Request){
  const parsed=createSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success) return NextResponse.json({error:parsed.error.issues[0]?.message??"Data formulir tidak valid."},{status:400});
  return withSchool(async(tx,tenantId,schoolId,userId)=>{
    const d=parsed.data;
    if(d.linkedEntityType==="teacher") { const found=await tx`SELECT id FROM teachers WHERE id=${d.linkedEntityId!} AND tenant_id=${tenantId} AND school_id=${schoolId}`; if(!found.length)return NextResponse.json({error:"Data guru induk tidak ditemukan pada sekolah ini."},{status:404}); }
    if(d.linkedEntityType==="student") { const found=await tx`SELECT id FROM students WHERE id=${d.linkedEntityId!} AND tenant_id=${tenantId} AND school_id=${schoolId}`; if(!found.length)return NextResponse.json({error:"Data siswa induk tidak ditemukan pada sekolah ini."},{status:404}); }
    const rows=await tx`INSERT INTO standard_module_records(tenant_id,school_id,module_key,schema_key,schema_version,reference_version,title,record_data,linked_entity_type,linked_entity_id,created_by,updated_by) VALUES(${tenantId},${schoolId},${d.moduleKey},${d.schemaKey},${d.schemaVersion},${d.referenceVersion},${d.title},${tx.json(d.recordData as never)},${d.linkedEntityType??null},${d.linkedEntityId??null},${userId},${userId}) RETURNING id,module_key,schema_key,schema_version,reference_version,title,status,record_data,linked_entity_type,linked_entity_id,review_note,created_at,updated_at`;
    await tx`INSERT INTO audit_logs(tenant_id,school_id,actor_user_id,action,resource_type,resource_id,metadata) VALUES(${tenantId},${schoolId},${userId},'standard_form_record.created','standard_module_record',${rows[0].id},${tx.json({moduleKey:d.moduleKey,schemaKey:d.schemaKey,schemaVersion:d.schemaVersion,referenceVersion:d.referenceVersion})})`;
    return NextResponse.json({data:rows[0]},{status:201});
  });
}


export async function PATCH(request:Request){
  const parsed=reviewSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:parsed.error.issues[0]?.message??"Aksi tidak valid."},{status:400});
  return withSchool(async(tx,tenantId,schoolId,userId)=>{
    const d=parsed.data;
    const current=await tx\`SELECT id,status,module_key FROM standard_module_records WHERE id=${d.id} AND tenant_id=${tenantId} AND school_id=${schoolId} FOR UPDATE\`;
    if(!current.length)return NextResponse.json({error:"Arsip formulir tidak ditemukan."},{status:404});
    const status=String(current[0].status);
    const allowed=d.action==="submit"?status==="draft":d.action==="approve"||d.action==="reject"?status==="submitted":status==="approved"||status==="rejected";
    if(!allowed)return NextResponse.json({error:"Perubahan status tidak sesuai alur. Draf dapat diajukan; pengajuan dapat disetujui/ditolak; arsip final dapat diarsipkan."},{status:409});
    const next=d.action==="submit"?"submitted":d.action==="approve"?"approved":d.action==="reject"?"rejected":"archived";
    const rows=await tx\`UPDATE standard_module_records SET status=${next},review_note=${d.reviewNote||null},reviewed_by=CASE WHEN ${d.action==="approve"||d.action==="reject"} THEN ${userId}::uuid ELSE reviewed_by END,reviewed_at=CASE WHEN ${d.action==="approve"||d.action==="reject"} THEN now() ELSE reviewed_at END,updated_by=${userId} WHERE id=${d.id} AND tenant_id=${tenantId} AND school_id=${schoolId} RETURNING id,status,review_note,reviewed_by,reviewed_at,updated_at\`;
    await tx\`INSERT INTO audit_logs(tenant_id,school_id,actor_user_id,action,resource_type,resource_id,metadata) VALUES(${tenantId},${schoolId},${userId},${"standard_form_record."+d.action},'standard_module_record',${d.id},${tx.json({from:status,to:next,note:d.reviewNote})})\`;
    return NextResponse.json({data:rows[0]});
  });
}
