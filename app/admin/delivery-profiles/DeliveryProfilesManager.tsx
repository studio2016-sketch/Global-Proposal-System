"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";

type Profile={
 brand_id:string;
 brand_name:string;
 delivery_mode:"RESEND"|"EXTERNAL"|"DISABLED";
 from_name:string|null;
 from_email:string|null;
 reply_to_email:string|null;
 complete_for_delivery:boolean;
 relationship_type:string|null;
 ownership_claimed:boolean|null;
 may_bind_brand:boolean|null;
 governance_notes:string|null;
};

export default function DeliveryProfilesManager({initial}:{initial:Profile[]}){
 const router=useRouter();
 const [profiles,setProfiles]=useState(initial);
 const [busy,setBusy]=useState<string|null>(null);
 const [error,setError]=useState("");

 function patch(id:string,key:keyof Profile,value:any){
  setProfiles(profiles.map(p=>p.brand_id===id?{...p,[key]:value}:p));
 }

 async function save(p:Profile){
  setBusy(p.brand_id);setError("");
  const r=await fetch("/api/admin/delivery-profiles/"+encodeURIComponent(p.brand_id),{
   method:"PUT",
   headers:{"content-type":"application/json"},
   body:JSON.stringify({
    deliveryMode:p.delivery_mode,
    fromName:p.from_name||"",
    fromEmail:p.from_email||"",
    replyToEmail:p.reply_to_email||"",
    completeForDelivery:p.complete_for_delivery
   })
  });
  const d=await r.json();
  if(r.ok){router.refresh()}else setError(d.error||"Unable to save delivery profile");
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
      <h2>{p.delivery_mode}</h2>
      <p className="muted">{p.relationship_type==="EXTERNAL_PARTNER"?"External Partner · No Williams ownership claimed":"Controlled Brand"}</p>
     </div>
     <span className="status">{p.complete_for_delivery?"DELIVERY ENABLED":"DELIVERY BLOCKED"}</span>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:12}}>
     <label>Delivery mode
      <select value={p.delivery_mode} onChange={e=>patch(p.brand_id,"delivery_mode",e.target.value as Profile["delivery_mode"])}>
       <option value="DISABLED">Disabled</option>
       <option value="RESEND">Resend</option>
       <option value="EXTERNAL">External / partner-managed</option>
      </select>
     </label>
     <label>Sender name<input placeholder="Studio2016" value={p.from_name||""} onChange={e=>patch(p.brand_id,"from_name",e.target.value)}/></label>
     <label>Sender email<input type="email" placeholder="proposals@example.com" value={p.from_email||""} onChange={e=>patch(p.brand_id,"from_email",e.target.value)}/></label>
     <label>Reply-to email<input type="email" placeholder="hello@example.com" value={p.reply_to_email||""} onChange={e=>patch(p.brand_id,"reply_to_email",e.target.value)}/></label>
    </div>

    <p className="privateNote">WGOS will never fall back to another brand's sender identity. The sender domain must also be verified by the transactional email provider before this profile should be enabled.</p>
    {p.governance_notes&&<p className="privateNote">{p.governance_notes}</p>}

    <label style={{display:"flex",gap:8,alignItems:"center",marginTop:12}}>
     <input type="checkbox" disabled={externalBlocked} checked={p.complete_for_delivery} onChange={e=>patch(p.brand_id,"complete_for_delivery",e.target.checked)}/>
     Sender identity verified and complete for delivery
    </label>
    {externalBlocked&&<p className="privateNote">Delivery enablement is disabled because WGOS has no recorded authority to send as this external partner.</p>}

    <button className="primary" style={{marginTop:14}} disabled={busy===p.brand_id} onClick={()=>save(p)}>{busy===p.brand_id?"Saving…":"Save Delivery Profile →"}</button>
   </section>;
  })}
 </div>;
}
