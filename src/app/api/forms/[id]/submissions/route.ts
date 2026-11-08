import {NextResponse} from "next/server";
import {z} from "zod";
import type {TransactionSql} from "postgres";
import {withAuthenticatedUser} from "@/db/connection";
export const dynamic="force-dynamic";
type DbTx=TransactionSql<Record<string,never>>;
type Ctx={params:Promise<{id:string}>};
const roles=new Set(["tenant_owner","tenant_admin","principal","vice_principal","school_operator"]);
async function scoped(work:(tx:DbTx,tenantId:string,schoolId:string,userId:string)=>Promise<Response>){
 try{return await withAuthenticatedUser(async(tx,_user,profile)=>{
  const rows=await tx`SELECT tenant_id,school_id,role FROM memberships WHERE user_id=${profile.id} AND school_id IS NOT NULL ORDER BY created_at ASC LIMIT 1`;
  const m=rows[0] as {tenant_id:string;school_id:string;role:string}|undefined;
  if(!m||!roles.has(m.role))return NextResponse.json({error:"Akses formulir tidak diizinkan."},{status:403});
  await tx`SELECT set_config('app.tenant_id',${m.tenant_id},true)`;
  return work(tx,m.tenant_id,m.school_id,profile.id);
 });}catch(e){const message=e instanceof Error?e.message:"Permintaan gagal.";const status=message==="UNAUTHENTICATED"?401:message.includes("DATABASE_URL")?503:500;return NextResponse.json({error:status===500?"Gagal mengakses formulir.":message},{status});}
}
export async function GET(_request:Request,{params}:Ctx){
 const {id}=await params;
 return scoped(async(tx,tenantId,schoolId)=>{
  const forms=await tx`SELECT id,name,description,module_key,form_version,status,fields FROM custom_form_templates WHERE id=${id} AND tenant_id=${tenantId} AND school_id=${schoolId} LIMIT 1`;
  if(!forms.length)return NextResponse.json({error:"Formulir tidak ditemukan."},{status:404});
  const submissions=await tx`SELECT id,form_version,status,created_at,submission_data FROM custom_form_submissions WHERE form_id=${id} AND tenant_id=${tenantId} AND school_id=${schoolId} ORDER BY created_at DESC LIMIT 100`;
  return NextResponse.json({form:forms[0],submissions});
 });
}
export async function POST(request:Request,{params}:Ctx){
 const {id}=await params;const body=await request.json().catch(()=>null);
 if(!body||typeof body!=="object"||Array.isArray(body)||!body.values||typeof body.values!=="object"||Array.isArray(body.values))return NextResponse.json({error:"Isi formulir tidak valid."},{status:400});
 return scoped(async(tx,tenantId,schoolId,userId)=>{
  const forms=await tx`SELECT id,name,module_key,form_version,status,fields FROM custom_form_templates WHERE id=${id} AND tenant_id=${tenantId} AND school_id=${schoolId} LIMIT 1`;
  const form=forms[0] as {id:string;name:string;module_key:string;form_version:number;status:string;fields:{key:string;label:string;type:string;required:boolean;options?:string[]}[]}|undefined;
  if(!form||form.status!=="published")return NextResponse.json({error:"Formulir belum diterbitkan atau tidak ditemukan."},{status:404});
  const values=body.values as Record<string,unknown>;
  for(const field of form.fields){
   const value=values[field.key];
   if(field.required&&(value===undefined||value===null||value===""))return NextResponse.json({error:`Kolom ${field.label} wajib diisi.`},{status:400});
   if(value!==undefined&&value!==null&&value!==""&&field.type==="select"&&field.options?.length&&!field.options.includes(String(value)))return NextResponse.json({error:`Pilihan untuk ${field.label} tidak valid.`},{status:400});
   if(value!==undefined&&value!==null&&value!==""&&field.type==="number"&&!Number.isFinite(Number(value)))return NextResponse.json({error:`Kolom ${field.label} harus berupa angka.`},{status:400});
  }
  const allowed=new Set(form.fields.map(f=>f.key));const clean=Object.fromEntries(Object.entries(values).filter(([key])=>allowed.has(key)));
  const rows=await tx`INSERT INTO custom_form_submissions(tenant_id,school_id,form_id,form_version,record_type,submission_data,submitted_by) VALUES(${tenantId},${schoolId},${id},${form.form_version},${form.module_key},${JSON.stringify(clean)}::jsonb,${userId}) RETURNING id,status,created_at`;
  await tx`INSERT INTO audit_logs(tenant_id,school_id,actor_user_id,action,resource_type,resource_id) VALUES(${tenantId},${schoolId},${userId},'custom_form.submitted','custom_form_submission',${rows[0].id})`;
  return NextResponse.json({data:rows[0]},{status:201});
 });
}
