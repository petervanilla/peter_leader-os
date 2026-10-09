import postgres from "npm:postgres@3.4.7";

const dbUrl=Deno.env.get("SUPABASE_DB_URL");
if(!dbUrl) throw new Error("SUPABASE_DB_URL_MISSING");
const sql=postgres(dbUrl,{prepare:false,max:2,idle_timeout:5});

const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"content-type",
  "Access-Control-Allow-Methods":"GET,POST,OPTIONS",
  "Cache-Control":"no-store, max-age=0",
  "Pragma":"no-cache",
  "X-Content-Type-Options":"nosniff"
};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json; charset=utf-8"}});
const tokenHash=async(token:string)=>{
  const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token));
  return Array.from(new Uint8Array(d)).map((b)=>b.toString(16).padStart(2,"0")).join("");
};
const clip=(value:unknown,max:number)=>String(value??"").trim().slice(0,max);

async function lookup(token:string){
  if(!token||token.length<30||token.length>200)return null;
  const hash=await tokenHash(token);
  const rows=await sql`
    select request_id,safe_snapshot,proposal,comment,status,expires_at,submitted_at
    from leader_os.people_preference_confirmation_requests
    where token_hash=${hash}
    limit 1
  `;
  const row=rows[0];
  if(!row)return null;
  if((row.status==="ACTIVE"||row.status==="SUBMITTED")&&new Date(row.expires_at).getTime()<=Date.now()){
    await sql`
      update leader_os.people_preference_confirmation_requests
      set status='EXPIRED',updated_at=clock_timestamp()
      where request_id=${row.request_id}::uuid
    `;
    row.status="EXPIRED";
  }
  return row;
}
const publicShape=(row:any)=>({
  status:row.status,
  expiresAt:row.expires_at,
  submittedAt:row.submitted_at,
  preference:row.proposal??row.safe_snapshot??{},
  personName:String(row.safe_snapshot?.personName??"").slice(0,120),
  role:String(row.safe_snapshot?.role??"").slice(0,120),
  comment:row.status==="SUBMITTED"?String(row.comment??"").slice(0,1200):""
});

Deno.serve(async(req)=>{
  try{
    if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
    if(req.method==="GET"){
      const url=new URL(req.url);
      const token=url.searchParams.get("token")??"";
      const row=await lookup(token);
      if(!row)return json({error:"INVALID_OR_EXPIRED_LINK"},404);
      return json({confirmation:publicShape(row)});
    }
    if(req.method==="POST"){
      const body=await req.json().catch(()=>null);
      if(!body||typeof body!=="object")return json({error:"INVALID_JSON"},400);
      const token=String(body.token??"");
      const row=await lookup(token);
      if(!row)return json({error:"INVALID_OR_EXPIRED_LINK"},404);
      if(!["ACTIVE","SUBMITTED"].includes(row.status))return json({error:"REQUEST_NOT_EDITABLE",status:row.status},409);
      const autonomy=clip(body.autonomyPreference,24).toUpperCase();
      if(!new Set(["","GUIDE","COACH","SUPPORT","DELEGATE"]).has(autonomy))return json({error:"INVALID_AUTONOMY_PREFERENCE"},400);
      const proposal={
        instructionPreference:clip(body.instructionPreference,500),
        autonomyPreference:autonomy,
        checkpointPreference:clip(body.checkpointPreference,300),
        feedbackPreference:clip(body.feedbackPreference,300),
        reportingPreference:clip(body.reportingPreference,300),
        communicationPreference:clip(body.communicationPreference,300),
        focusPreference:clip(body.focusPreference,300),
        availabilityPreference:clip(body.availabilityPreference,300)
      };
      const comment=clip(body.comment,1200);
      const updated=await sql`
        update leader_os.people_preference_confirmation_requests
        set proposal=${sql.json(proposal)}::jsonb,
            comment=${comment},
            status='SUBMITTED',
            submitted_at=clock_timestamp(),
            updated_at=clock_timestamp()
        where request_id=${row.request_id}::uuid
          and status in ('ACTIVE','SUBMITTED')
        returning request_id,status,expires_at,submitted_at
      `;
      if(!updated[0])return json({error:"REQUEST_NOT_EDITABLE"},409);
      return json({ok:true,status:"SUBMITTED",submittedAt:updated[0].submitted_at});
    }
    return json({error:"METHOD_NOT_ALLOWED"},405);
  }catch(error){
    console.error("leader-os-people-confirm",error);
    return json({error:"INTERNAL_ERROR"},500);
  }
});