import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthenticatedUser } from "@/db/connection";

export const dynamic = "force-dynamic";
const allowedRoles = new Set(["tenant_owner","tenant_admin","principal","vice_principal","school_operator"]);
const fieldSchema = z.object({
  id: z.string().min(1).max(80),
  key: z.string().regex(/^[a-z][a-z0-9_]{1,59}$/),
  label: z.string().trim().min(1).max(120),
  type: z.enum(["text","textarea","number","date","email","phone","select","checkbox"]),
  required: z.boolean().default(false),
  options: z.array(z.string().trim().min(1).max(100)).max(50).optional().default([])
});
const createSchema = z.object({
  name: z.string().trim().min(3).max(180),
  description: z.string().trim().max(1000).optional().default(""),
  moduleKey: z.enum(["students","teachers","classes","admissions","academics","general"]),
  fields: z.array(fieldSchema).min(1).max(80)
}).refine(v => new Set(v.fields.map(f=>f.key)).size === v.fields.length, "Nama kunci kolom tidak boleh duplikat.");
const updateSchema = createSchema.extend({id:z.string().uuid(),status:z.enum(["draft","published","archived"]).optional()});

async function withSchool(work:(tx:any,tenantId:string,schoolId:string,userId:string)=>Promise<Response>){
  try{
    return await withAuthenticatedUser(async(tx,_user,profile)=>{
      const memberships=await tx`SELECT tenant_id,school_id,role FROM memberships WHERE user_id=${profile.id} AND school_id IS NOT NULL ORDER BY created_at ASC LIMIT 1`;
      const m=memberships[0] as {tenant_id:string;school_id:string;role:string}|undefined;
      if(!m||!allowedRoles.has(m.role))return NextResponse.json({error:"Anda tidak memiliki izin mengelola formulir sekolah."},{status:403});
      await tx`SELECT set_config('app.tenant_id',${m.tenant_id},true)`;
      return work(tx,m.tenant_id,m.school_id,profile.id);
    });
  }catch(error){
    const message=error instanceof Error?error.message:"Permintaan gagal.";
    const status=message==="UNAUTHENTICATED"?401:message.includes("DATABASE_URL")?503:500;
    return NextResponse.json({error:status===500?"Terjadi kesalahan saat mengakses pembuat formulir.":message},{status});
  }
}
export async function GET(request:Request){
  const moduleKey=new URL(request.url).searchParams.get("module");
  return withSchool(async(tx,tenantId,schoolId)=>{
    const rows=await tx`SELECT id,name,description,module_key,form_version,status,fields,settings,created_at,updated_at FROM custom_form_templates WHERE tenant_id=${tenantId} AND school_id=${schoolId} AND (${moduleKey}::text IS NULL OR module_key=${moduleKey}) ORDER BY updated_at DESC LIMIT 300`;
    return NextResponse.json({data:rows});
  });
}
export async function POST(request:Request){
  const parsed=createSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:parsed.error.issues[0]?.message??"Definisi formulir tidak valid."},{status:400});
  return withSchool(async(tx,tenantId,schoolId,userId)=>{
    const d=parsed.data;
    const rows=await tx`INSERT INTO custom_form_templates(tenant_id,school_id,name,description,module_key,fields,created_by,updated_by) VALUES(${tenantId},${schoolId},${d.name},${d.description||null},${d.moduleKey},${JSON.stringify(d.fields)}::jsonb,${userId},${userId}) RETURNING id,name,description,module_key,form_version,status,fields,created_at,updated_at`;
    await tx`INSERT INTO audit_logs(tenant_id,school_id,actor_user_id,action,resource_type,resource_id) VALUES(${tenantId},${schoolId},${userId},'custom_form.created','custom_form',${rows[0].id})`;
    return NextResponse.json({data:rows[0]},{status:201});
  });
}
export async function PATCH(request:Request){
  const parsed=updateSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:parsed.error.issues[0]?.message??"Perubahan formulir tidak valid."},{status:400});
  return withSchool(async(tx,tenantId,schoolId,userId)=>{
    const d=parsed.data;
    const rows=await tx`UPDATE custom_form_templates SET name=${d.name},description=${d.description||null},module_key=${d.moduleKey},fields=${JSON.stringify(d.fields)}::jsonb,form_version=form_version+1,status=COALESCE(${d.status??null},status),updated_by=${userId} WHERE id=${d.id} AND tenant_id=${tenantId} AND school_id=${schoolId} RETURNING id,name,description,module_key,form_version,status,fields,created_at,updated_at`;
    if(!rows.length)return NextResponse.json({error:"Formulir tidak ditemukan."},{status:404});
    await tx`INSERT INTO audit_logs(tenant_id,school_id,actor_user_id,action,resource_type,resource_id) VALUES(${tenantId},${schoolId},${userId},'custom_form.updated','custom_form',${d.id})`;
    return NextResponse.json({data:rows[0]});
  });
}
