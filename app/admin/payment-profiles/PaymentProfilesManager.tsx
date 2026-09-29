"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";

type Profile={
 brand_id:string;
 brand_name:string;
 payment_mode:"DIRECT_STRIPE_ACCOUNT"|"STRIPE_CONNECT"|"EXTERNAL"|"DISABLED";
 currency:string;
 stripe_account_id:string|null;
 secret_env_var:string|null;
 webhook_secret_env_var:string|null;
 statement_descriptor:string|null;
 complete_for_payment:boolean;
 relationship_type:string|null;
 ownership_claimed:boolean|null;
 may_bind_brand:boolean|null;
 governance_notes:string|null;
};

export default function PaymentProfilesManager({initial}:{initial:Profile[]}){
 const router=useRouter();
 const [profiles,setProfiles]=useState(initial);
 const [busy,setBusy]=useState<string|null>(null);
 const [error,setError]=useState("");

 function patch(id:string,key:keyof Profile,value:any){
  setProfiles(profiles.map(p=>p.brand_id===id?{...p,[key]:value}:p));
 }

 async function save(p:Profile){
  setBusy(p.brand_id);setError("");
  const r=await fetch("/api/admin/payment-profiles/"+encodeURIComponent(p.brand_id),{
   method:"PUT",
   headers:{"content-type":"application/json"},
   body:JSON.stringify({
    paymentMode:p.payment_mode,
    currency:p.currency,
    stripeAccountId:p.stripe_account_id||"",
    secretEnvVar:p.secret_env_var||"",
    webhookSecretEnvVar:p.webhook_secret_env_var||"",
    statementDescriptor:p.statement_descriptor||"",
    completeForPayment:p.complete_for_payment
   })
  });
  const d=await r.json();
  if(r.ok){router.refresh()}else setError(d.error||"Unable to save payment profile");
  setBusy(null);
 }

 return <div style={{display:"grid",gap:18}}>
  {error&&<p className="muted">{error}</p>}
  {profiles.map(p=>{
   const externalBlocked=p.relationship_type==="EXTERNAL_PARTNER"&&p.may_bind_brand!==true;
   return <section className="adminPanel" key={p.brand_id}>
    <div style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"center"}}>
     <div>
      <p className="eyebrow">{p.brand_name}</p>
      <h2>{p.payment_mode}</h2>
      <p className="muted">{p.relationship_type==="EXTERNAL_PARTNER"?"External Partner · No Williams ownership claimed":"Controlled Brand"}</p>
     </div>
     <span className="status">{p.complete_for_payment?"PAYMENT ENABLED":"PAYMENT BLOCKED"}</span>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:12}}>
     <label>Payment mode
      <select value={p.payment_mode} onChange={e=>patch(p.brand_id,"payment_mode",e.target.value as Profile["payment_mode"])}>
       <option value="DISABLED">Disabled</option>
       <option value="DIRECT_STRIPE_ACCOUNT">Direct Stripe account</option>
       <option value="STRIPE_CONNECT">Stripe Connect (reserved)</option>
       <option value="EXTERNAL">External / partner-managed</option>
      </select>
     </label>
     <label>Currency<input value={p.currency||"USD"} onChange={e=>patch(p.brand_id,"currency",e.target.value.toUpperCase())}/></label>
     <label>Stripe account ID<input placeholder="acct_... (optional reference)" value={p.stripe_account_id||""} onChange={e=>patch(p.brand_id,"stripe_account_id",e.target.value)}/></label>
     <label>Secret-key environment variable<input placeholder="STRIPE_SECRET_KEY_STUDIO2016" value={p.secret_env_var||""} onChange={e=>patch(p.brand_id,"secret_env_var",e.target.value.toUpperCase())}/></label>
     <label>Webhook-secret environment variable<input placeholder="STRIPE_WEBHOOK_SECRET_STUDIO2016" value={p.webhook_secret_env_var||""} onChange={e=>patch(p.brand_id,"webhook_secret_env_var",e.target.value.toUpperCase())}/></label>
     <label>Statement descriptor<input maxLength={22} placeholder="STUDIO2016" value={p.statement_descriptor||""} onChange={e=>patch(p.brand_id,"statement_descriptor",e.target.value)}/></label>
    </div>

    <p className="privateNote">Webhook endpoint: /api/webhooks/stripe/{p.brand_id}. Actual Stripe keys and webhook secrets belong only in Vercel environment variables; WGOS stores their variable names, never the credentials.</p>
    {p.governance_notes&&<p className="privateNote">{p.governance_notes}</p>}

    <label style={{display:"flex",gap:8,alignItems:"center",marginTop:12}}>
     <input type="checkbox" disabled={externalBlocked} checked={p.complete_for_payment} onChange={e=>patch(p.brand_id,"complete_for_payment",e.target.checked)}/>
     Payment routing verified and complete
    </label>
    {externalBlocked&&<p className="privateNote">Payment enablement is disabled because WGOS has no recorded authority to administer this external partner's payments.</p>}

    <button className="primary" style={{marginTop:14}} disabled={busy===p.brand_id} onClick={()=>save(p)}>{busy===p.brand_id?"Saving…":"Save Payment Profile →"}</button>
   </section>
  }))}
 </div>;
}
